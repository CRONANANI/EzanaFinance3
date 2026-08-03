-- Phase B: price provenance for org holdings. `last_priced_at` records when
-- the daily cron (or any future refresher) last set current_price, powering
-- staleness checks and the upcoming Fund Data Health card.
ALTER TABLE public.org_positions
  ADD COLUMN IF NOT EXISTS last_priced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_org_positions_active_ticker
  ON public.org_positions (ticker) WHERE is_active = true;
