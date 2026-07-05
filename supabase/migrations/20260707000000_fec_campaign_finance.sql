-- FEC OpenFEC API — hosted campaign-finance cache.
--
-- The scheduled cron (/api/cron/ingest-fec) refreshes a small set of per-member
-- campaign-finance aggregates from api.open.fec.gov into these tables, keyed by
-- bioguide_id + cycle. The /datasets/political campaign-finance cards read from
-- Supabase (Supabase-first), with the keyed API as a live fallback, so the page
-- is fast and stays well under the FEC ~1,000 req/hr limit. Revalidate ≥6h.
--
-- All money columns are NUMERIC (USD), all field names mirror the OpenFEC
-- CandidateTotal / ScheduleABySize / ScheduleAByState schemas. Aggregated
-- donor/outside/spending breakdowns live in JSONB so the exact source rows are
-- preserved. No mock rows are ever written — honest empty states pre-ingestion.

-- ── Per-candidate financial totals (CandidateTotal schema) ──
CREATE TABLE IF NOT EXISTS public.fec_candidate_totals (
  bioguide_id                         TEXT NOT NULL,
  cycle                               INTEGER NOT NULL,
  candidate_id                        TEXT,               -- resolved FEC candidate id
  id_source                           TEXT,               -- 'directory' | 'search'
  name                                TEXT,
  party                               TEXT,               -- D / R / I (from directory)
  office                              TEXT,               -- H / S
  state                               TEXT,
  receipts                            NUMERIC,            -- raised
  disbursements                       NUMERIC,            -- spent
  cash_on_hand_end_period             NUMERIC,
  individual_itemized_contributions   NUMERIC,
  other_political_committee_contributions NUMERIC,        -- PAC money
  debts_owed_by_committee             NUMERIC,
  has_raised_funds                    BOOLEAN,
  coverage_start_date                 DATE,
  coverage_end_date                   DATE,
  size_buckets                        JSONB,              -- ScheduleABySize [{size,total,count}]
  top_states                          JSONB,              -- ScheduleAByState [{state,state_full,total,count}]
  synced_at                           TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bioguide_id, cycle)
);
CREATE INDEX IF NOT EXISTS idx_fec_totals_cycle ON public.fec_candidate_totals (cycle, receipts DESC);
CREATE INDEX IF NOT EXISTS idx_fec_totals_office ON public.fec_candidate_totals (cycle, office);

-- ── Per-candidate donor aggregates (by_employer / by_occupation) ──
CREATE TABLE IF NOT EXISTS public.fec_candidate_donors (
  bioguide_id   TEXT NOT NULL,
  cycle         INTEGER NOT NULL,
  candidate_id  TEXT,
  by_employer   JSONB,   -- [{employer,total,count}]
  by_occupation JSONB,   -- [{occupation,total,count}]
  synced_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bioguide_id, cycle)
);

-- ── Per-candidate outside money (Schedule E + communication costs) ──
CREATE TABLE IF NOT EXISTS public.fec_candidate_outside (
  bioguide_id            TEXT NOT NULL,
  cycle                  INTEGER NOT NULL,
  candidate_id           TEXT,
  support_total          NUMERIC,   -- independent expenditures FOR (support)
  oppose_total           NUMERIC,   -- independent expenditures AGAINST (oppose)
  communication_cost     NUMERIC,   -- communication costs total
  by_committee           JSONB,     -- [{committee_id,committee_name,support_oppose_indicator,total}]
  spending_by_purpose    JSONB,     -- ScheduleBByPurpose [{purpose,total,count}]
  synced_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bioguide_id, cycle)
);

-- ── RLS: public read (public campaign-finance data on a public page), service-role write ──
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fec_candidate_totals','fec_candidate_donors','fec_candidate_outside'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "public read %1$s" ON public.%1$I;', t);
    EXECUTE format('CREATE POLICY "public read %1$s" ON public.%1$I FOR SELECT USING (true);', t);
    EXECUTE format('DROP POLICY IF EXISTS "service writes %1$s" ON public.%1$I;', t);
    EXECUTE format(
      'CREATE POLICY "service writes %1$s" ON public.%1$I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'');',
      t
    );
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated;', t);
  END LOOP;
END $$;
