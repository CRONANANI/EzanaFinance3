-- ============================================================================
-- Meetings redesign (2a: recording library + AI analysis) — Phase 1.
-- ADDITIVE ONLY. NOT yet applied — written for review (the handoff gates Phase 1
-- on the Finding-1 decision + migration approval).
--
-- org_meetings is genuinely Supabase-backed. This extends it + adds five child
-- tables. The status CHECK stays scheduled|live|closed unchanged — the design's
-- "Completed" maps to the existing 'closed'. Whether the live-meeting HOSTING
-- feature is removed (Finding 1, option a) is a CODE decision handled in Phase
-- 2/3, not a schema change, so 'live' is left in the enum here (additive-safe).
-- recorder credentials must NEVER be returned to the client (API concern).
-- ============================================================================

-- ── Extend org_meetings ─────────────────────────────────────────────────────
ALTER TABLE public.org_meetings
  ADD COLUMN IF NOT EXISTS category         text DEFAULT 'general',
     -- ic | sector | general | exec | education
  ADD COLUMN IF NOT EXISTS scheduled_at     timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at         timestamptz,
  ADD COLUMN IF NOT EXISTS location         text,
  ADD COLUMN IF NOT EXISTS team_id          uuid,          -- sector meetings
  ADD COLUMN IF NOT EXISTS quorum_pct       smallint,
  ADD COLUMN IF NOT EXISTS recording_url    text,          -- storage path
  ADD COLUMN IF NOT EXISTS recording_source text,          -- zoom | otter | fireflies | read_ai | upload
  ADD COLUMN IF NOT EXISTS transcript       text,
  ADD COLUMN IF NOT EXISTS ai_summary       text,
  ADD COLUMN IF NOT EXISTS analysis_status  text DEFAULT 'none',
     -- none | transcribing | analyzing | ready  ← drives the queue chips
  ADD COLUMN IF NOT EXISTS pitch_id         uuid;          -- linked pitch (IC)

-- ── Attendees + RSVP ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_meeting_attendees (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.org_meetings(id) ON DELETE CASCADE,
  org_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id  uuid NOT NULL,
  rsvp       text DEFAULT 'pending' CHECK (rsvp IN ('pending','yes','no','maybe')),
  attended   boolean,                     -- set post-hoc from the transcript/roster
  created_at timestamptz DEFAULT now(),
  UNIQUE (meeting_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting ON public.org_meeting_attendees(meeting_id);

-- ── Sentiment by attendee TIER (from the AI analysis) ───────────────────────
CREATE TABLE IF NOT EXISTS public.org_meeting_sentiment (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.org_meetings(id) ON DELETE CASCADE,
  org_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tier       text NOT NULL,               -- exec | portfolio_manager | analyst
  score      numeric NOT NULL CHECK (score BETWEEN -1 AND 1),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meeting_sentiment_meeting ON public.org_meeting_sentiment(meeting_id);

-- ── Deliverables discussed ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_meeting_deliverables (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.org_meetings(id) ON DELETE CASCADE,
  org_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind       text NOT NULL,   -- model | memo | report | deck | sheet | primer | news | earnings_call
  label      text NOT NULL,
  note_id    uuid,            -- → org_research_notes when it's a library doc
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meeting_deliverables_meeting ON public.org_meeting_deliverables(meeting_id);

-- ── IC live vote (quorum-gated; one per member) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_meeting_votes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id      uuid NOT NULL REFERENCES public.org_meetings(id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  voter_member_id uuid NOT NULL,
  vote            text NOT NULL CHECK (vote IN ('buy','pass','abstain')),
  created_at      timestamptz DEFAULT now(),
  UNIQUE (meeting_id, voter_member_id)
);
CREATE INDEX IF NOT EXISTS idx_meeting_votes_meeting ON public.org_meeting_votes(meeting_id);

-- ── Recorder integrations (⚙ popover) — credentials NEVER exposed to client ──
CREATE TABLE IF NOT EXISTS public.org_recorder_integrations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider    text NOT NULL CHECK (provider IN ('zoom','otter','fireflies','read_ai')),
  enabled     boolean DEFAULT false,
  credentials jsonb,                       -- opaque; API must never SELECT this to the client
  created_at  timestamptz DEFAULT now(),
  UNIQUE (org_id, provider)
);

-- ── RLS — mirror org_meetings (members read own org; managers write) ────────
ALTER TABLE public.org_meeting_attendees     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_meeting_sentiment     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_meeting_deliverables  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_meeting_votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_recorder_integrations ENABLE ROW LEVEL SECURITY;

-- attendees: members read own org; a member writes their OWN rsvp; managers all.
DROP POLICY IF EXISTS "read meeting attendees" ON public.org_meeting_attendees;
CREATE POLICY "read meeting attendees" ON public.org_meeting_attendees FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "write meeting attendees" ON public.org_meeting_attendees;
CREATE POLICY "write meeting attendees" ON public.org_meeting_attendees FOR ALL USING (
  member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

-- sentiment: members read; managers write (written by the analysis step).
DROP POLICY IF EXISTS "read meeting sentiment" ON public.org_meeting_sentiment;
CREATE POLICY "read meeting sentiment" ON public.org_meeting_sentiment FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "managers write meeting sentiment" ON public.org_meeting_sentiment;
CREATE POLICY "managers write meeting sentiment" ON public.org_meeting_sentiment FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

-- deliverables: members read; managers write.
DROP POLICY IF EXISTS "read meeting deliverables" ON public.org_meeting_deliverables;
CREATE POLICY "read meeting deliverables" ON public.org_meeting_deliverables FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "managers write meeting deliverables" ON public.org_meeting_deliverables;
CREATE POLICY "managers write meeting deliverables" ON public.org_meeting_deliverables FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

-- votes: members read; a member casts their OWN vote; managers all.
DROP POLICY IF EXISTS "read meeting votes" ON public.org_meeting_votes;
CREATE POLICY "read meeting votes" ON public.org_meeting_votes FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "cast meeting vote" ON public.org_meeting_votes;
CREATE POLICY "cast meeting vote" ON public.org_meeting_votes FOR ALL USING (
  voter_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  voter_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  OR org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

-- recorder integrations: managers only (read + write). credentials must be
-- stripped in the API layer — RLS gates the row, not the column.
DROP POLICY IF EXISTS "managers manage recorders" ON public.org_recorder_integrations;
CREATE POLICY "managers manage recorders" ON public.org_recorder_integrations FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);
