-- Phase E: record WHICH benchmark a snapshot's return was measured against,
-- and how it was derived, so the UI can label the figure honestly instead of
-- hardcoding "S&P 500".
ALTER TABLE public.org_fund_snapshots
  ADD COLUMN IF NOT EXISTS benchmark_symbol TEXT,
  ADD COLUMN IF NOT EXISTS benchmark_source TEXT;  -- 'index' | 'pitch_proxy' | null

COMMENT ON COLUMN public.org_fund_snapshots.benchmark_source IS
  'index = real price return of benchmark_symbol over the period; pitch_proxy = legacy average of org_pitch_hindsight benchmark returns; null = unavailable.';
