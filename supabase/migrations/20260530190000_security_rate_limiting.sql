-- Persistent rate limiting + security audit log extensions

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_hit_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_expires ON public.rate_limit_buckets(expires_at);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rate_limit_buckets'
      AND policyname = 'service role rate limit access'
  ) THEN
    CREATE POLICY "service role rate limit access"
      ON public.rate_limit_buckets FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

ALTER TABLE public.security_audit_log
  ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS endpoint TEXT;

CREATE INDEX IF NOT EXISTS idx_sec_audit_created ON public.security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_audit_event_type ON public.security_audit_log(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_audit_ip ON public.security_audit_log(ip_address, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'security_audit_log'
      AND policyname = 'service role audit log access'
  ) THEN
    CREATE POLICY "service role audit log access"
      ON public.security_audit_log FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limit_buckets WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cleanup_old_security_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.security_audit_log
  WHERE created_at < now() - INTERVAL '90 days'
    AND severity != 'critical';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
