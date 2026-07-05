-- Senate Lobbying Disclosure Act (LDA) — hosted lobbying-filings cache.
--
-- The scheduled cron (/api/cron/ingest-lobbying) pulls recent + current-year
-- filings from lda.gov into lobbying_filings, and refreshes the filter
-- vocabularies (issue areas, government entities, filing types) into
-- lobbying_constants. The /datasets/government/lobbying page reads Supabase
-- first, with the keyed API as a live fallback, so the page is fast and stays
-- under the 120 req/min LDA cap.
--
-- Amounts are NUMERIC (USD); issues/entities/lobbyists are JSONB so the exact
-- source structure is preserved for the table + drill-down. No mock rows are
-- ever written — honest empty states pre-ingestion.

CREATE TABLE IF NOT EXISTS public.lobbying_filings (
  uuid                TEXT PRIMARY KEY,           -- filing_uuid
  filing_year         INTEGER,
  filing_period       TEXT,
  dt_posted           TIMESTAMPTZ,
  amount              NUMERIC,                    -- income OR expenses (USD)
  filing_type         TEXT,
  registrant_name     TEXT,
  registrant_id       INTEGER,
  client_name         TEXT,
  client_id           INTEGER,
  client_description  TEXT,
  issues              JSONB,                      -- [{code, display}]
  entities            JSONB,                      -- ["Senate", "House of Representatives", ...]
  lobbyists           JSONB,                      -- [{id, name, coveredPosition, revolvingDoor}]
  lobbyist_count      INTEGER DEFAULT 0,
  document_url        TEXT,
  synced_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lobbying_year ON public.lobbying_filings (filing_year);
CREATE INDEX IF NOT EXISTS idx_lobbying_posted ON public.lobbying_filings (dt_posted DESC);
CREATE INDEX IF NOT EXISTS idx_lobbying_amount ON public.lobbying_filings (filing_year, amount DESC);
CREATE INDEX IF NOT EXISTS idx_lobbying_client ON public.lobbying_filings (client_name);
CREATE INDEX IF NOT EXISTS idx_lobbying_registrant ON public.lobbying_filings (registrant_name);
-- GIN indexes so the issue / entity JSONB filters can push to the DB.
CREATE INDEX IF NOT EXISTS idx_lobbying_issues ON public.lobbying_filings USING GIN (issues);
CREATE INDEX IF NOT EXISTS idx_lobbying_entities ON public.lobbying_filings USING GIN (entities);

-- Filter vocabularies (issue areas / government entities / filing types).
-- kind = 'issue' | 'entity' | 'filing_type'. Refreshed rarely.
CREATE TABLE IF NOT EXISTS public.lobbying_constants (
  kind        TEXT NOT NULL,
  value       TEXT NOT NULL,
  label       TEXT NOT NULL,
  synced_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, value)
);

-- ── RLS: public read (public disclosure data on a public page), service-role write ──
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['lobbying_filings','lobbying_constants'] LOOP
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
