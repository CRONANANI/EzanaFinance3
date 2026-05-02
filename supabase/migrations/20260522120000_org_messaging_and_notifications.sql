-- ═══════════════════════════════════════════════════════════════════
-- Org messaging, content shares, and notification management.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.org_direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_member_id UUID NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  recipient_member_id UUID NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  subject TEXT,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  attachment_kind TEXT CHECK (attachment_kind IN (
    'news_event', 'chart', 'earnings_analysis', 'model',
    'watchlist_ticker', 'position_flag', 'isr_event', 'document'
  )),
  attachment_ref TEXT,
  attachment_label TEXT,
  attachment_meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_dm_recipient ON public.org_direct_messages(recipient_member_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_dm_sender ON public.org_direct_messages(sender_member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_dm_org ON public.org_direct_messages(org_id);

CREATE TABLE IF NOT EXISTS public.org_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_member_id UUID NOT NULL REFERENCES public.org_members(id) ON DELETE CASCADE,
  notification_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  managed_by UUID REFERENCES public.org_members(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_member_id, notification_key)
);

CREATE INDEX IF NOT EXISTS idx_org_notif_prefs_member ON public.org_notification_preferences(org_member_id);

ALTER TABLE public.org_direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read own dms" ON public.org_direct_messages FOR SELECT USING (
  sender_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
  OR recipient_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "members send dms" ON public.org_direct_messages FOR INSERT WITH CHECK (
  sender_member_id IN (
    SELECT id FROM public.org_members
    WHERE user_id = auth.uid() AND is_active = true AND org_id = org_direct_messages.org_id
  )
  AND recipient_member_id IN (
    SELECT om2.id FROM public.org_members om2
    WHERE om2.org_id = org_direct_messages.org_id AND om2.is_active = true
  )
);

CREATE POLICY "members update own received dms" ON public.org_direct_messages FOR UPDATE USING (
  recipient_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "members read own notif prefs" ON public.org_notification_preferences FOR SELECT USING (
  org_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "supervisors read subordinate notif prefs" ON public.org_notification_preferences FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.org_members sup
    INNER JOIN public.org_members sub ON sub.id = org_notification_preferences.org_member_id
    WHERE sup.user_id = auth.uid() AND sup.is_active = true AND sub.is_active = true AND sup.org_id = sub.org_id
      AND (
        (sup.role = 'executive' AND sub.role = 'portfolio_manager')
        OR (sup.role = 'portfolio_manager' AND sub.role = 'analyst' AND sup.team_id IS NOT DISTINCT FROM sub.team_id)
      )
  )
);

CREATE POLICY "members insert own notif prefs" ON public.org_notification_preferences FOR INSERT WITH CHECK (
  org_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "members update own notif prefs" ON public.org_notification_preferences FOR UPDATE USING (
  org_member_id IN (SELECT id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "supervisors insert subordinate notif prefs" ON public.org_notification_preferences FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.org_members sup
    INNER JOIN public.org_members sub ON sub.id = org_notification_preferences.org_member_id
    WHERE sup.user_id = auth.uid() AND sup.is_active = true AND sub.is_active = true AND sup.org_id = sub.org_id
      AND (
        (sup.role = 'executive' AND sub.role = 'portfolio_manager')
        OR (sup.role = 'portfolio_manager' AND sub.role = 'analyst' AND sup.team_id IS NOT DISTINCT FROM sub.team_id)
      )
  )
);

CREATE POLICY "supervisors update subordinate notif prefs" ON public.org_notification_preferences FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.org_members sup
    INNER JOIN public.org_members sub ON sub.id = org_notification_preferences.org_member_id
    WHERE sup.user_id = auth.uid() AND sup.is_active = true AND sub.is_active = true AND sup.org_id = sub.org_id
      AND (
        (sup.role = 'executive' AND sub.role = 'portfolio_manager')
        OR (sup.role = 'portfolio_manager' AND sub.role = 'analyst' AND sup.team_id IS NOT DISTINCT FROM sub.team_id)
      )
  )
);
