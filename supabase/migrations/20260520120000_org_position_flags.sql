-- ═══════════════════════════════════════════════════════════════════
-- Org Position Flags — supervisor → subordinate flag system for the
-- mock trading feature. Tracks green/red flags on portfolio positions,
-- attachments to user's pinned items, and threaded messages.
-- ═══════════════════════════════════════════════════════════════════

-- Per-member permission overrides (extends PERMISSION_TIERS defaults).
CREATE TABLE IF NOT EXISTS public.org_member_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_member_id UUID NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  granted_by UUID REFERENCES public.org_members(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_member_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_org_member_permissions_member ON public.org_member_permissions(org_member_id);

CREATE TABLE IF NOT EXISTS public.org_position_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.org_teams(id) ON DELETE SET NULL,
  ticker TEXT NOT NULL,

  raiser_member_id UUID NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  recipient_member_id UUID REFERENCES public.org_members(id) ON DELETE SET NULL,

  flag_color TEXT NOT NULL CHECK (flag_color IN ('green', 'red')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'escalated')),
  resolved_by UUID REFERENCES public.org_members(id),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,

  position_shares NUMERIC,
  position_avg_cost NUMERIC,
  position_current_price NUMERIC,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_flags_recipient ON public.org_position_flags(recipient_member_id, status);
CREATE INDEX IF NOT EXISTS idx_org_flags_raiser ON public.org_position_flags(raiser_member_id);
CREATE INDEX IF NOT EXISTS idx_org_flags_team ON public.org_position_flags(team_id, ticker);
CREATE INDEX IF NOT EXISTS idx_org_flags_open ON public.org_position_flags(org_id, status) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS public.org_flag_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES public.org_position_flags(id) ON DELETE CASCADE,
  attachment_kind TEXT NOT NULL CHECK (attachment_kind IN ('pinned_card', 'saved_chart', 'saved_model', 'saved_news', 'document')),
  attachment_ref TEXT NOT NULL,
  attachment_label TEXT,
  attachment_meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_flag_attachments_flag ON public.org_flag_attachments(flag_id);

CREATE TABLE IF NOT EXISTS public.org_flag_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL REFERENCES public.org_position_flags(id) ON DELETE CASCADE,
  author_member_id UUID NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_flag_messages_flag ON public.org_flag_messages(flag_id, created_at);

ALTER TABLE public.org_position_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_flag_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_flag_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_member_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read own flags" ON public.org_position_flags FOR SELECT USING (
  raiser_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  OR recipient_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "members create own flags" ON public.org_position_flags FOR INSERT WITH CHECK (
  raiser_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "members update flags they are part of" ON public.org_position_flags FOR UPDATE USING (
  raiser_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  OR recipient_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "read attachments for visible flags" ON public.org_flag_attachments FOR SELECT USING (
  flag_id IN (
    SELECT id FROM public.org_position_flags
    WHERE raiser_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
       OR recipient_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  )
);

CREATE POLICY "members add attachments to own flags" ON public.org_flag_attachments FOR INSERT WITH CHECK (
  flag_id IN (
    SELECT id FROM public.org_position_flags
    WHERE raiser_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  )
);

CREATE POLICY "read messages for visible flags" ON public.org_flag_messages FOR SELECT USING (
  flag_id IN (
    SELECT id FROM public.org_position_flags
    WHERE raiser_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
       OR recipient_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  )
);

CREATE POLICY "members post messages on visible flags" ON public.org_flag_messages FOR INSERT WITH CHECK (
  author_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  AND flag_id IN (
    SELECT id FROM public.org_position_flags
    WHERE raiser_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
       OR recipient_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  )
);

CREATE POLICY "members read own permission overrides" ON public.org_member_permissions FOR SELECT USING (
  org_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "exec pm manage org member permissions" ON public.org_member_permissions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.org_members mgr
    INNER JOIN public.org_members target ON target.org_id = mgr.org_id AND target.id = org_member_permissions.org_member_id
    WHERE mgr.user_id = auth.uid() AND mgr.is_active = true
    AND mgr.role IN ('executive', 'portfolio_manager')
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.org_members mgr
    INNER JOIN public.org_members target ON target.org_id = mgr.org_id AND target.id = org_member_permissions.org_member_id
    WHERE mgr.user_id = auth.uid() AND mgr.is_active = true
    AND mgr.role IN ('executive', 'portfolio_manager')
  )
);

CREATE OR REPLACE FUNCTION public.update_org_flag_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_org_flags_updated_at ON public.org_position_flags;
CREATE TRIGGER trg_org_flags_updated_at
  BEFORE UPDATE ON public.org_position_flags
  FOR EACH ROW EXECUTE PROCEDURE public.update_org_flag_updated_at();
