-- Ensure login_attempts is service-role only (matches rate_limit_buckets pattern)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'login_attempts'
      AND policyname = 'service role login attempts access'
  ) THEN
    CREATE POLICY "service role login attempts access"
      ON public.login_attempts FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;
