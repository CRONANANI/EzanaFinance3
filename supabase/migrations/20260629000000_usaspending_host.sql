-- Hosted USAspending federal contract awards.
--
-- The scheduled cron (/api/cron/ingest-usaspending) upserts a bounded slice of
-- current-fiscal-year federal CONTRACT awards (types A/B/C/D) so the public
-- Government Contracts page reads from Supabase instead of calling USAspending
-- live on every request (fast, reliable, rate-limit-free). The live-fetch route
-- and the static sample remain as the fallback chain.
--
-- Amounts are stored NUMERIC and dates as real DATE — never pre-formatted
-- strings; formatting happens at render. The CHECK constraints are a
-- defense-in-depth backstop for the cron's own validation: they make the
-- "$48B / 1993" class of bad row impossible to persist (amount must be > 0 and
-- ≤ $50B, action_date must be ≥ 2000-01-01).

CREATE TABLE IF NOT EXISTS public.usaspending_contract_awards (
  generated_award_id   TEXT PRIMARY KEY,            -- generated_unique_award_id (natural key + detail link)
  award_id_piid        TEXT,                        -- human-readable PIID ("Award ID")
  recipient_name       TEXT NOT NULL,
  award_amount         NUMERIC NOT NULL CHECK (award_amount > 0 AND award_amount <= 50000000000),
  awarding_agency      TEXT,
  awarding_sub_agency  TEXT,
  funding_agency       TEXT,
  action_date          DATE NOT NULL CHECK (action_date >= DATE '2000-01-01'),
  award_type           TEXT,
  ticker               TEXT,                         -- resolved public-contractor symbol, else NULL (never fabricated)
  fiscal_year          INTEGER,
  raw                  JSONB,                        -- source row, for the detail view / debugging
  synced_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usaspending_awards_amount
  ON public.usaspending_contract_awards (award_amount DESC);
CREATE INDEX IF NOT EXISTS idx_usaspending_awards_action_date
  ON public.usaspending_contract_awards (action_date DESC);

ALTER TABLE public.usaspending_contract_awards ENABLE ROW LEVEL SECURITY;

-- Public read: this is public federal-spending data rendered on a public page.
DROP POLICY IF EXISTS "public read usaspending_contract_awards" ON public.usaspending_contract_awards;
CREATE POLICY "public read usaspending_contract_awards" ON public.usaspending_contract_awards
  FOR SELECT USING (true);

-- Writes only via the service role (the ingest cron uses getAdminClient).
-- No anon / authenticated writes.
DROP POLICY IF EXISTS "service role writes usaspending_contract_awards" ON public.usaspending_contract_awards;
CREATE POLICY "service role writes usaspending_contract_awards" ON public.usaspending_contract_awards
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

GRANT SELECT ON public.usaspending_contract_awards TO anon, authenticated;
