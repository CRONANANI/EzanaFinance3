-- Org stock pitch pipeline + archive (institutional memory)

CREATE TABLE IF NOT EXISTS public.org_pitches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.org_teams(id) ON DELETE SET NULL,
  ticker TEXT NOT NULL,
  company_name TEXT,
  pitch_type TEXT NOT NULL CHECK (pitch_type IN ('long', 'short', 'pair', 'options')),
  analyst_member_id UUID NOT NULL REFERENCES public.org_members(id),
  approving_pm_member_id UUID REFERENCES public.org_members(id),
  stage TEXT NOT NULL DEFAULT 'idea' CHECK (stage IN (
    'idea', 'research_approved', 'research_in_progress',
    'pm_review', 'committee_scheduled', 'committee_vote', 'decision'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'accepted', 'rejected', 'watchlist', 'deferred', 'withdrawn'
  )),
  thesis_short TEXT NOT NULL,
  thesis_full TEXT,
  why_now TEXT,
  catalysts JSONB DEFAULT '[]'::jsonb,
  risks JSONB DEFAULT '[]'::jsonb,
  target_price NUMERIC,
  current_price_at_submission NUMERIC,
  expected_return_pct NUMERIC,
  time_horizon TEXT CHECK (time_horizon IN ('1m', '3m', '6m', '12m', '24m', 'long-term')),
  committee_meeting_at TIMESTAMPTZ,
  committee_meeting_id UUID,
  decision TEXT CHECK (decision IN ('accepted', 'rejected', 'watchlist', 'deferred')),
  decision_at TIMESTAMPTZ,
  decision_rationale TEXT,
  vote_yes_count INTEGER DEFAULT 0,
  vote_no_count INTEGER DEFAULT 0,
  vote_abstain_count INTEGER DEFAULT 0,
  position_size_pct NUMERIC,
  monitor_member_id UUID REFERENCES public.org_members(id),
  research_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_org_pitches_org ON public.org_pitches(org_id, stage);
CREATE INDEX IF NOT EXISTS idx_org_pitches_team ON public.org_pitches(team_id, stage);
CREATE INDEX IF NOT EXISTS idx_org_pitches_analyst ON public.org_pitches(analyst_member_id);
CREATE INDEX IF NOT EXISTS idx_org_pitches_ticker ON public.org_pitches(org_id, ticker);
CREATE INDEX IF NOT EXISTS idx_org_pitches_decision ON public.org_pitches(org_id, decision) WHERE decision IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_org_pitches_status ON public.org_pitches(org_id, status);

CREATE TABLE IF NOT EXISTS public.org_pitch_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID NOT NULL REFERENCES public.org_pitches(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  actor_member_id UUID REFERENCES public.org_members(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_pitch_history_pitch ON public.org_pitch_stage_history(pitch_id, created_at);

CREATE TABLE IF NOT EXISTS public.org_pitch_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID NOT NULL REFERENCES public.org_pitches(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('model', 'memo', 'deck', 'one_pager', 'supporting', 'other')),
  title TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by_member_id UUID REFERENCES public.org_members(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  pinned_attachment_ref TEXT
);

CREATE INDEX IF NOT EXISTS idx_org_pitch_deliverables_pitch ON public.org_pitch_deliverables(pitch_id);

CREATE TABLE IF NOT EXISTS public.org_pitch_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID NOT NULL REFERENCES public.org_pitches(id) ON DELETE CASCADE,
  voter_member_id UUID NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('yes', 'no', 'abstain')),
  rationale TEXT NOT NULL,
  conviction_level INTEGER CHECK (conviction_level BETWEEN 1 AND 5),
  recused BOOLEAN DEFAULT FALSE,
  recusal_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (pitch_id, voter_member_id)
);

CREATE INDEX IF NOT EXISTS idx_org_pitch_votes_pitch ON public.org_pitch_votes(pitch_id);

CREATE TABLE IF NOT EXISTS public.org_pitch_discussion_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID NOT NULL REFERENCES public.org_pitches(id) ON DELETE CASCADE,
  author_member_id UUID NOT NULL REFERENCES public.org_members(id),
  parent_message_id UUID REFERENCES public.org_pitch_discussion_messages(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_pitch_discussion_pitch ON public.org_pitch_discussion_messages(pitch_id, created_at);

CREATE TABLE IF NOT EXISTS public.org_pitch_hindsight (
  pitch_id UUID PRIMARY KEY REFERENCES public.org_pitches(id) ON DELETE CASCADE,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  current_price NUMERIC,
  price_at_decision NUMERIC,
  return_pct NUMERIC,
  benchmark_return_pct NUMERIC,
  alpha_pct NUMERIC,
  max_drawdown_pct NUMERIC,
  current_state TEXT CHECK (current_state IN ('outperforming', 'underperforming', 'roughly_inline'))
);

ALTER TABLE public.org_pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_pitch_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_pitch_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_pitch_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_pitch_discussion_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_pitch_hindsight ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read pitches" ON public.org_pitches FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "org members read pitch history" ON public.org_pitch_stage_history FOR SELECT USING (
  pitch_id IN (
    SELECT id FROM public.org_pitches
    WHERE org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  )
);

CREATE POLICY "org members read deliverables" ON public.org_pitch_deliverables FOR SELECT USING (
  pitch_id IN (
    SELECT id FROM public.org_pitches
    WHERE org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  )
);

CREATE POLICY "org members read votes" ON public.org_pitch_votes FOR SELECT USING (
  pitch_id IN (
    SELECT id FROM public.org_pitches
    WHERE org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  )
);

CREATE POLICY "org members read discussion" ON public.org_pitch_discussion_messages FOR SELECT USING (
  pitch_id IN (
    SELECT id FROM public.org_pitches
    WHERE org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  )
);

CREATE POLICY "org members read hindsight" ON public.org_pitch_hindsight FOR SELECT USING (
  pitch_id IN (
    SELECT id FROM public.org_pitches
    WHERE org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  )
);
