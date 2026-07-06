-- Curated map: lobbying client legal name → public stock ticker.
-- Only VERIFIED public companies live here; a filing is "public" iff its
-- client_name matches a row here. Unmatched clients (trade assocs, law firms,
-- private cos) correctly show no ticker. NO fuzzy guessing — human-verified.
CREATE TABLE IF NOT EXISTS public.lobbying_client_tickers (
  client_name   TEXT PRIMARY KEY,        -- UPPERCASE, matches lobbying_filings.client_name
  ticker        TEXT NOT NULL,           -- e.g. LUMN
  exchange      TEXT,                    -- NYSE|NASDAQ (optional)
  company_label TEXT,                    -- display name, e.g. "Lumen Technologies"
  verified      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lobbying_client_tickers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read lct" ON public.lobbying_client_tickers;
CREATE POLICY "public read lct" ON public.lobbying_client_tickers FOR SELECT USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.lobbying_client_tickers FROM anon, authenticated;
GRANT SELECT ON public.lobbying_client_tickers TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_lct_ticker ON public.lobbying_client_tickers (ticker);

-- Verified public matches drawn from the real top-clients export (Step 1). Each
-- client_name is the exact stored (uppercase) value so the join matches; each
-- ticker was individually confirmed. LLC/Inc subsidiaries map to their public
-- parent's ticker (e.g. RIVIAN AUTOMOTIVE, LLC → RIVN).
INSERT INTO public.lobbying_client_tickers (client_name, ticker, exchange, company_label) VALUES
  ('LUMEN TECHNOLOGIES, INC.', 'LUMN', 'NYSE', 'Lumen Technologies'),
  ('MICROSOFT CORPORATION', 'MSFT', 'NASDAQ', 'Microsoft'),
  ('COMCAST CORPORATION', 'CMCSA', 'NASDAQ', 'Comcast'),
  ('UNITEDHEALTH GROUP, INC.', 'UNH', 'NYSE', 'UnitedHealth Group'),
  ('VALERO ENERGY CORPORATION', 'VLO', 'NYSE', 'Valero Energy'),
  ('CONOCOPHILLIPS', 'COP', 'NYSE', 'ConocoPhillips'),
  ('APPLIED MATERIALS, INC', 'AMAT', 'NASDAQ', 'Applied Materials'),
  ('CONSTELLATION BRANDS, INC.', 'STZ', 'NYSE', 'Constellation Brands'),
  ('CARNIVAL CORPORATION', 'CCL', 'NYSE', 'Carnival'),
  ('PACCAR INC', 'PCAR', 'NASDAQ', 'PACCAR'),
  ('TRANSDIGM GROUP, INC.', 'TDG', 'NYSE', 'TransDigm Group'),
  ('AMERICAN AIRLINES, INC.', 'AAL', 'NASDAQ', 'American Airlines'),
  ('RIVIAN AUTOMOTIVE, LLC', 'RIVN', 'NASDAQ', 'Rivian Automotive'),
  ('VIRGIN GALACTIC, LLC', 'SPCE', 'NYSE', 'Virgin Galactic'),
  ('LANTHEUS HOLDINGS, INC.', 'LNTH', 'NASDAQ', 'Lantheus Holdings'),
  ('ARDELYX, INC.', 'ARDX', 'NASDAQ', 'Ardelyx'),
  ('COHERUS BIOSCIENCES, INC.', 'CHRS', 'NASDAQ', 'Coherus BioSciences'),
  ('CASTLE BIOSCIENCES, INC.', 'CSTL', 'NASDAQ', 'Castle Biosciences'),
  ('BAUSCH HEALTH COMPANIES', 'BHC', 'NYSE', 'Bausch Health'),
  ('DAVITA INC.', 'DVA', 'NYSE', 'DaVita'),
  ('DAVITA', 'DVA', 'NYSE', 'DaVita'),
  ('LABORATORY CORPORATION OF AMERICA HOLDINGS', 'LH', 'NYSE', 'Labcorp'),
  ('HEALTHPEAK PROPERTIES, INC. FKA PHYSICIANS REALTY TRUST', 'DOC', 'NYSE', 'Healthpeak Properties'),
  ('TRINET GROUP INC.', 'TNET', 'NYSE', 'TriNet Group'),
  ('ZIONS BANCORP', 'ZION', 'NASDAQ', 'Zions Bancorporation'),
  ('IQVIA', 'IQV', 'NYSE', 'IQVIA Holdings'),
  ('OLD DOMINION FREIGHT LINE, INC.', 'ODFL', 'NASDAQ', 'Old Dominion Freight Line'),
  ('WERNER ENTERPRISES', 'WERN', 'NASDAQ', 'Werner Enterprises'),
  ('BROWN-FORMAN CORPORATION', 'BF.B', 'NYSE', 'Brown-Forman')
ON CONFLICT (client_name) DO UPDATE
  SET ticker = excluded.ticker,
      exchange = excluded.exchange,
      company_label = excluded.company_label,
      verified = true;

-- ── NEEDS HUMAN CONFIRMATION (NOT inserted) ──────────────────────────────────
-- Uncertain / indirect mappings from the Step-1 export — the parent is public
-- but the filing entity is a foreign/subsidiary or a non-US listing, so no clean
-- US ticker for a live price. Promote manually if you confirm the intended symbol:
--   ('SASOL CHEMICALS USA LLC', ...)          -- parent Sasol Ltd trades as SSL (ADR); US LLC is a subsidiary
--   ('ESSILORLUXOTTICA USA INC.', ...)        -- EssilorLuxottica lists in Paris (EL.PA); US OTC ESLOY only
--   ('GOTION INC.', ...)                       -- Gotion High-Tech lists in Shenzhen (002074); US arm private
-- Clearly private (deliberately omitted): TIKTOK INC. (ByteDance), INSPIRE BRANDS
-- (Roark), KPMG LLP / COHNREZNICK LLP (partnerships), CUBIC CORPORATION
-- (taken private 2021), GAINWELL TECHNOLOGIES, ZELIS, GUNVOR GROUP, LEGO SYSTEMS.
