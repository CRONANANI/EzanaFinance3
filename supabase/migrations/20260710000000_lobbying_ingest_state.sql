-- Lobbying ETL hardening — resumable per-quarter ingest cursor + a normalized
-- `quarter` column on lobbying_filings so coverage can be counted per quarter.
--
-- The ingest cron (ingest-lobbying) walks each (year, quarter) to completeness
-- across runs (LDA files tens of thousands of filings per quarter, far more than
-- one 120/min run can pull), persisting its cursor here so a later run resumes
-- instead of re-sampling the newest 300. Idempotent: filings upsert on
-- filing_uuid, so re-runs and amendments overwrite rather than duplicate.

-- Per-filing quarter (q1..q4) derived from filing_period, for per-quarter counts.
ALTER TABLE public.lobbying_filings
  ADD COLUMN IF NOT EXISTS quarter TEXT;
CREATE INDEX IF NOT EXISTS idx_lobbying_year_quarter
  ON public.lobbying_filings (filing_year, quarter);

-- Best-effort backfill of `quarter` from the stored filing_period label,
-- mirroring src/lib/lobbying/period.js normalizeQuarter().
UPDATE public.lobbying_filings SET quarter = CASE
  WHEN filing_period ~* '(first|1st|q1|quarter[ _]?1|q[ _]?1)'                 THEN 'q1'
  WHEN filing_period ~* '(second|2nd|q2|quarter[ _]?2|q[ _]?2|mid[-_ ]?year)' THEN 'q2'
  WHEN filing_period ~* '(third|3rd|q3|quarter[ _]?3|q[ _]?3)'                THEN 'q3'
  WHEN filing_period ~* '(fourth|4th|q4|quarter[ _]?4|q[ _]?4|year[-_ ]?end)' THEN 'q4'
  ELSE NULL END
WHERE quarter IS NULL AND filing_period IS NOT NULL;

-- Resumable ingest cursor + per-run status, one row per (year, quarter).
CREATE TABLE IF NOT EXISTS public.lobbying_ingest_state (
  year              INTEGER NOT NULL,
  quarter           TEXT NOT NULL,               -- q1|q2|q3|q4
  period_code       TEXT,                         -- LDA filter value, e.g. first_quarter
  total_count       INTEGER,                      -- API-reported total for this year+quarter
  last_page         INTEGER NOT NULL DEFAULT 0,   -- last page fetched during backfill
  complete          BOOLEAN NOT NULL DEFAULT FALSE,
  phase             TEXT NOT NULL DEFAULT 'backfill', -- backfill | incremental
  last_seen_posted  TIMESTAMPTZ,                  -- newest dt_posted seen (incremental cursor)
  rows_upserted     INTEGER NOT NULL DEFAULT 0,   -- cumulative rows upserted for this y+q
  last_run_at       TIMESTAMPTZ,
  last_status       TEXT,                         -- ok | failed | idle
  last_reason       TEXT,                         -- validation/skip reason when not ok
  last_delta        INTEGER NOT NULL DEFAULT 0,   -- rows upserted on the most recent run
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (year, quarter)
);

-- RLS: public read (the observability readout is a subtle operational footer),
-- service-role write (same pattern as the other lobbying/cache tables).
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['lobbying_ingest_state'] LOOP
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
