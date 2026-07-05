-- Congress.gov API — hosted legislative data.
--
-- The scheduled cron (/api/cron/ingest-congress) incrementally syncs current-
-- Congress bills (+ actions, subjects), recent committee meetings/hearings, and
-- House roll-call votes from api.congress.gov into these tables. The dataset
-- pages then read from Supabase (Supabase-first) instead of hitting the keyed
-- API on every request (fast, reliable, and well under the 5,000 req/hr cap).
--
-- `stage` is derived by a documented state machine (src/lib/congress/stage.js).
-- `model_probability` + `model_features` are written by the structural passage
-- model (src/lib/congress/passage-model.js). Amounts are NUMERIC, dates DATE.
-- No mock rows are ever written — honest empty states pre-ingestion.

CREATE TABLE IF NOT EXISTS public.congress_bills (
  id                  TEXT PRIMARY KEY,             -- `${congress}-${type}-${number}` (lowercased type)
  congress            INTEGER NOT NULL,
  type                TEXT NOT NULL,                -- hr, s, hjres, sjres, hconres, sconres, hres, sres
  number              INTEGER NOT NULL,
  title               TEXT,
  policy_area         TEXT,                         -- one per bill
  latest_action_text  TEXT,
  latest_action_date  DATE,
  sponsor_bioguide    TEXT,
  sponsor_party       TEXT,                         -- D / R / I
  cosponsor_count     INTEGER DEFAULT 0,
  cosponsor_dem       INTEGER DEFAULT 0,
  cosponsor_rep       INTEGER DEFAULT 0,
  cbo_estimate        NUMERIC,                      -- aggregate CBO $ where present, else NULL
  introduced_date     DATE,
  update_date         DATE,                         -- source updateDate (incremental cursor)
  stage               TEXT,                         -- introduced|committee|reported|floor|passed_chamber|passed_both|law
  model_probability   NUMERIC CHECK (model_probability IS NULL OR (model_probability >= 0 AND model_probability <= 1)),
  model_features      JSONB,                        -- explainability breakdown
  raw                 JSONB,
  synced_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_congress_bills_update ON public.congress_bills (update_date DESC);
CREATE INDEX IF NOT EXISTS idx_congress_bills_policy ON public.congress_bills (policy_area);
CREATE INDEX IF NOT EXISTS idx_congress_bills_stage ON public.congress_bills (stage);

CREATE TABLE IF NOT EXISTS public.congress_bill_subjects (
  bill_id   TEXT NOT NULL REFERENCES public.congress_bills (id) ON DELETE CASCADE,
  subject   TEXT NOT NULL,
  PRIMARY KEY (bill_id, subject)
);
CREATE INDEX IF NOT EXISTS idx_congress_subjects_subject ON public.congress_bill_subjects (subject);

CREATE TABLE IF NOT EXISTS public.congress_bill_actions (
  bill_id      TEXT NOT NULL REFERENCES public.congress_bills (id) ON DELETE CASCADE,
  action_date  DATE,
  action_code  TEXT,
  text         TEXT,
  seq          INTEGER NOT NULL,
  PRIMARY KEY (bill_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_congress_actions_bill ON public.congress_bill_actions (bill_id);

CREATE TABLE IF NOT EXISTS public.congress_votes (
  id           TEXT PRIMARY KEY,                    -- roll-call natural key
  congress     INTEGER,
  chamber      TEXT,                                -- House (Senate votes are NOT in this API)
  bill_id      TEXT REFERENCES public.congress_bills (id) ON DELETE SET NULL,
  vote_date    DATE,
  question     TEXT,
  result       TEXT,
  yea_total    INTEGER,
  nay_total    INTEGER,
  yea_dem      INTEGER,
  yea_rep      INTEGER,
  nay_dem      INTEGER,
  nay_rep      INTEGER,
  raw          JSONB,
  synced_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_congress_votes_bill ON public.congress_votes (bill_id);

CREATE TABLE IF NOT EXISTS public.congress_meetings (
  event_id      TEXT PRIMARY KEY,
  chamber       TEXT,
  committee     TEXT,
  meeting_date  DATE,
  title         TEXT,
  related_bills TEXT[],                             -- bill ids
  document_urls TEXT[],
  raw           JSONB,
  synced_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_congress_meetings_date ON public.congress_meetings (meeting_date DESC);

-- ── RLS: public read (public legislative data on public pages), service-role write ──
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'congress_bills','congress_bill_subjects','congress_bill_actions',
    'congress_votes','congress_meetings'
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
