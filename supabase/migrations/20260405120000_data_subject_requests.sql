-- GDPR / privacy: user-initiated data subject requests (access, rectification, erasure, etc.)

CREATE TABLE IF NOT EXISTS public.data_subject_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  request_type text NOT NULL
    CHECK (request_type IN (
      'access_copy',
      'rectification',
      'erasure',
      'restrict_processing',
      'portability',
      'other'
    )),
  details text,
  account_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_subject_requests_user_id
  ON public.data_subject_requests (user_id);

CREATE INDEX IF NOT EXISTS idx_data_subject_requests_created_at
  ON public.data_subject_requests (created_at DESC);

COMMENT ON TABLE public.data_subject_requests IS
  'User-submitted privacy requests (view/edit/delete personal data). Filled via app API; processed by staff.';

ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;

-- No policies: rows are written/read only via service-role API routes.

CREATE OR REPLACE FUNCTION public.set_data_subject_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_data_subject_requests_updated_at ON public.data_subject_requests;
CREATE TRIGGER trg_data_subject_requests_updated_at
  BEFORE UPDATE ON public.data_subject_requests
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_data_subject_requests_updated_at();
