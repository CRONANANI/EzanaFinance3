-- Add sub_role column to org_members for granular permissions
ALTER TABLE public.org_members
  ADD COLUMN IF NOT EXISTS sub_role TEXT;

-- Add event deliverables table
CREATE TABLE IF NOT EXISTS public.org_event_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.org_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_type TEXT DEFAULT 'pdf',
  file_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'uploaded', 'approved')),
  assigned_to UUID REFERENCES auth.users(id),
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.org_event_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read deliverables" ON public.org_event_deliverables
  FOR SELECT USING (
    event_id IN (
      SELECT e.id FROM public.org_events e
      JOIN public.org_members m ON m.org_id = e.org_id
      WHERE m.user_id = auth.uid() AND m.is_active = true
    )
  );

CREATE POLICY "Managers write deliverables" ON public.org_event_deliverables
  FOR ALL USING (
    event_id IN (
      SELECT e.id FROM public.org_events e
      JOIN public.org_members m ON m.org_id = e.org_id
      WHERE m.user_id = auth.uid() AND m.role IN ('executive', 'portfolio_manager') AND m.is_active = true
    )
  )
  WITH CHECK (
    event_id IN (
      SELECT e.id FROM public.org_events e
      JOIN public.org_members m ON m.org_id = e.org_id
      WHERE m.user_id = auth.uid() AND m.role IN ('executive', 'portfolio_manager') AND m.is_active = true
    )
  );
