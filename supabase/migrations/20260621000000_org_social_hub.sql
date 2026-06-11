-- Phase 2: social & team hub. Additive + idempotent.

-- 5. Research library: persistent analyst notes/theses, taggable, survive across cohorts
CREATE TABLE IF NOT EXISTS public.org_research_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  ticker TEXT,
  sector TEXT,
  tags TEXT[] DEFAULT '{}',
  visibility TEXT DEFAULT 'org' CHECK (visibility IN ('org','team','private')),
  team_id UUID REFERENCES public.org_teams(id) ON DELETE SET NULL,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_research_notes_org ON public.org_research_notes(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_notes_ticker ON public.org_research_notes(ticker);
CREATE INDEX IF NOT EXISTS idx_research_notes_sector ON public.org_research_notes(sector);

-- 6. Threaded discussion on positions (per-holding comment threads)
CREATE TABLE IF NOT EXISTS public.org_position_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.org_teams(id) ON DELETE SET NULL,
  ticker TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  parent_id UUID REFERENCES public.org_position_threads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_position_threads_org_ticker ON public.org_position_threads(org_id, ticker, created_at);
CREATE INDEX IF NOT EXISTS idx_position_threads_parent ON public.org_position_threads(parent_id);

-- 7. Reactions (generic — attaches to posts, notes, threads, pitches by target_type+target_id)
CREATE TABLE IF NOT EXISTS public.org_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post','note','thread','pitch')),
  target_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_reactions_target ON public.org_reactions(target_type, target_id);

-- 7. Mentions (resolved @mentions, drive notifications)
CREATE TABLE IF NOT EXISTS public.org_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  seen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mentions_user ON public.org_mentions(mentioned_user_id, seen);

-- 9. Recognition badges (outcome-tied, awarded by managers/advisors)
CREATE TABLE IF NOT EXISTS public.org_recognition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  awarded_by UUID REFERENCES auth.users(id),
  badge_type TEXT NOT NULL,
  title TEXT NOT NULL,
  reason TEXT,
  period TEXT,
  auto_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recognition_org ON public.org_recognition(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recognition_recipient ON public.org_recognition(recipient_id);

-- 10. Meeting mode sessions (live investment-committee meetings + recorded minutes)
CREATE TABLE IF NOT EXISTS public.org_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','closed')),
  started_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  agenda JSONB DEFAULT '[]'::jsonb,
  minutes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meetings_org ON public.org_meetings(org_id, created_at DESC);

-- ===== RLS =====
ALTER TABLE public.org_research_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_position_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_recognition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_meetings ENABLE ROW LEVEL SECURITY;

-- READ: any active member. (research notes additionally hide 'private' from non-authors.)
DROP POLICY IF EXISTS "members read notes" ON public.org_research_notes;
CREATE POLICY "members read notes" ON public.org_research_notes FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  AND (visibility <> 'private' OR author_id = auth.uid())
);
DROP POLICY IF EXISTS "members write own notes" ON public.org_research_notes;
CREATE POLICY "members write own notes" ON public.org_research_notes FOR ALL USING (
  author_id = auth.uid()
  AND org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
) WITH CHECK (
  author_id = auth.uid()
  AND org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);
DROP POLICY IF EXISTS "managers moderate notes" ON public.org_research_notes;
CREATE POLICY "managers moderate notes" ON public.org_research_notes FOR UPDATE USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);
-- Managers/advisors can also remove notes in their org (author delete is covered
-- by the "members write own notes" FOR ALL policy above).
DROP POLICY IF EXISTS "managers delete notes" ON public.org_research_notes;
CREATE POLICY "managers delete notes" ON public.org_research_notes FOR DELETE USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
);

DROP POLICY IF EXISTS "members read threads" ON public.org_position_threads;
CREATE POLICY "members read threads" ON public.org_position_threads FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "members write own threads" ON public.org_position_threads;
CREATE POLICY "members write own threads" ON public.org_position_threads FOR INSERT WITH CHECK (
  author_id = auth.uid() AND org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "authors delete own threads" ON public.org_position_threads;
CREATE POLICY "authors delete own threads" ON public.org_position_threads FOR DELETE USING (author_id = auth.uid());

DROP POLICY IF EXISTS "members read reactions" ON public.org_reactions;
CREATE POLICY "members read reactions" ON public.org_reactions FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "members own reactions" ON public.org_reactions;
CREATE POLICY "members own reactions" ON public.org_reactions FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users read own mentions" ON public.org_mentions;
CREATE POLICY "users read own mentions" ON public.org_mentions FOR SELECT USING (mentioned_user_id = auth.uid());
DROP POLICY IF EXISTS "members create mentions" ON public.org_mentions;
CREATE POLICY "members create mentions" ON public.org_mentions FOR INSERT WITH CHECK (
  author_id = auth.uid() AND org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "users update own mentions" ON public.org_mentions;
CREATE POLICY "users update own mentions" ON public.org_mentions FOR UPDATE USING (mentioned_user_id = auth.uid());

DROP POLICY IF EXISTS "members read recognition" ON public.org_recognition;
CREATE POLICY "members read recognition" ON public.org_recognition FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "managers award recognition" ON public.org_recognition;
CREATE POLICY "managers award recognition" ON public.org_recognition FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true));

DROP POLICY IF EXISTS "members read meetings" ON public.org_meetings;
CREATE POLICY "members read meetings" ON public.org_meetings FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true));
DROP POLICY IF EXISTS "managers run meetings" ON public.org_meetings;
CREATE POLICY "managers run meetings" ON public.org_meetings FOR ALL USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true)
) WITH CHECK (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role IN ('executive','portfolio_manager') AND is_active = true));

NOTIFY pgrst, 'reload schema';
