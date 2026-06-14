-- Phase 3: audit log + governance settings. Additive, RLS enabled.

CREATE TABLE IF NOT EXISTS public.org_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  detail JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_org_audit_org ON public.org_audit_log(org_id, created_at DESC);
ALTER TABLE public.org_audit_log ENABLE ROW LEVEL SECURITY;
-- READ: executives only. WRITE: server-side only (service role), no client inserts.
DROP POLICY IF EXISTS "executives read audit" ON public.org_audit_log;
CREATE POLICY "executives read audit" ON public.org_audit_log FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND role = 'executive' AND is_active = true)
);

CREATE TABLE IF NOT EXISTS public.org_governance_settings (
  org_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  students_see_peer_scorecards BOOLEAN DEFAULT false,
  students_see_class_grade_distribution BOOLEAN DEFAULT false,
  who_can_export_reports TEXT DEFAULT 'exec_pm_advisor' CHECK (who_can_export_reports IN ('exec_advisor','exec_pm_advisor')),
  grading_visible_to_students BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.org_governance_settings ENABLE ROW LEVEL SECURITY;
-- READ: any active member (the flags govern what each member can see). WRITE: service role (exec/advisor checked in API).
DROP POLICY IF EXISTS "members read governance" ON public.org_governance_settings;
CREATE POLICY "members read governance" ON public.org_governance_settings FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)
);

NOTIFY pgrst, 'reload schema';
