-- Industry registry for the Sonar Industry Layout
-- (sonar-query-understanding-industry-layout.md, Part C).
--
-- NOT executed by the implementer. Noah applies it by hand in the SQL Editor.
-- Additive and idempotent; safe to run more than once.
--
-- What is seeded: industries, value-chain stages, stage links, and companies
-- whose business model is stated in their own annual report (10-K / 20-F),
-- each with its EDGAR filing-list source_url. What is NOT seeded: any number.
-- industry_metrics, industry_facilities and industry_risks start empty and
-- are entered from primary sources (source_url + as_of + scope + measure
-- type) through /admin/industries. Until then every component shows its
-- "Not yet sourced for this industry" state.
--
-- RLS: read for anon + authenticated (facilities, metrics and risks only once
-- review_status = 'approved'); writes are service role only.

create table if not exists public.industries (
  id text primary key,
  label text not null,
  synonyms text[] not null default '{}',
  gics_codes text[] not null default '{}',
  naics_codes text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.industry_stages (
  id text primary key,
  industry_id text not null references public.industries (id) on delete cascade,
  ord int not null,
  label text not null,
  description text,
  is_upstream_input boolean not null default false
);
create index if not exists industry_stages_industry_idx on public.industry_stages (industry_id, ord);

create table if not exists public.industry_stage_links (
  from_stage text not null references public.industry_stages (id) on delete cascade,
  to_stage text not null references public.industry_stages (id) on delete cascade,
  primary key (from_stage, to_stage)
);

create table if not exists public.industry_companies (
  id uuid primary key default gen_random_uuid(),
  industry_id text not null references public.industries (id) on delete cascade,
  stage_id text not null references public.industry_stages (id) on delete cascade,
  company_name text not null,
  ticker text,
  business_model text,          -- fabless | idm | foundry | equipment | materials | eda_ip | osat | prime | supplier
  hq_country text,              -- ISO-2
  is_public boolean not null default true,
  source_url text not null,
  as_of date not null,
  unique (industry_id, stage_id, company_name)
);
create index if not exists industry_companies_ticker_idx on public.industry_companies (ticker);

create table if not exists public.industry_facilities (
  id uuid primary key default gen_random_uuid(),
  industry_id text not null references public.industries (id) on delete cascade,
  stage_id text references public.industry_stages (id) on delete set null,
  company_name text not null,
  ticker text,
  project_group text,           -- phases of one project share a group
  city text,
  state_code text,
  country text not null default 'US',
  lat numeric,
  lng numeric,
  activity text,                -- e.g. leading-edge logic, memory, packaging
  status text,                  -- announced | under_construction | operational | paused | cancelled
  incentive_type text,
  announced_investment_usd numeric,
  source_url text not null,
  as_of date not null,
  review_status text not null default 'pending',  -- pending | approved
  created_at timestamptz not null default now()
);
create index if not exists industry_facilities_industry_idx on public.industry_facilities (industry_id, state_code);

create table if not exists public.industry_metrics (
  id uuid primary key default gen_random_uuid(),
  industry_id text not null references public.industries (id) on delete cascade,
  metric text not null,         -- industry_sales | global_sales_share | market_share | end_market_share | employment | rd_spend | ...
  dimension jsonb not null default '{}'::jsonb,
  value numeric not null,
  unit text not null,           -- usd | pct | people | count | ...
  measure_type text not null check (measure_type in ('observed', 'estimated', 'forecast', 'announced')),
  scope text not null,
  period text,
  source_name text not null,
  source_url text not null,
  as_of date not null,
  review_status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists industry_metrics_industry_idx on public.industry_metrics (industry_id, metric);

create table if not exists public.industry_risks (
  id uuid primary key default gen_random_uuid(),
  industry_id text not null references public.industries (id) on delete cascade,
  stage_id text references public.industry_stages (id) on delete set null,
  risk_type text,
  title text not null,
  evidence text not null,
  exposure text,
  substitutes text,
  confidence text not null check (confidence in ('documented', 'inferred')),
  source_url text not null,
  as_of date not null,
  review_status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- RLS
alter table public.industries enable row level security;
alter table public.industry_stages enable row level security;
alter table public.industry_stage_links enable row level security;
alter table public.industry_companies enable row level security;
alter table public.industry_facilities enable row level security;
alter table public.industry_metrics enable row level security;
alter table public.industry_risks enable row level security;

do $$ begin
  create policy "industries read" on public.industries for select to anon, authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "industry_stages read" on public.industry_stages for select to anon, authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "industry_stage_links read" on public.industry_stage_links for select to anon, authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "industry_companies read" on public.industry_companies for select to anon, authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "industry_facilities read approved" on public.industry_facilities
    for select to anon, authenticated using (review_status = 'approved');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "industry_metrics read approved" on public.industry_metrics
    for select to anon, authenticated using (review_status = 'approved');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "industry_risks read approved" on public.industry_risks
    for select to anon, authenticated using (review_status = 'approved');
exception when duplicate_object then null; end $$;

revoke insert, update, delete on
  public.industries, public.industry_stages, public.industry_stage_links,
  public.industry_companies, public.industry_facilities, public.industry_metrics,
  public.industry_risks
from anon, authenticated;

-- Seed: structure and filing-verified companies only (src/lib/sonar/industries.js).

insert into public.industries (id, label, synonyms, gics_codes, naics_codes) values
  ('semiconductors', 'Semiconductors', array['chips','chipmakers','semis','semiconductor']::text[], array['453010']::text[], array['334413','333242']::text[]),
  ('aerospace_defense', 'Aerospace & Defense', array['aerospace','defense','defence']::text[], array['201010']::text[], array['336411','336414']::text[])
on conflict (id) do update set label = excluded.label, synonyms = excluded.synonyms, gics_codes = excluded.gics_codes, naics_codes = excluded.naics_codes;

insert into public.industry_stages (id, industry_id, ord, label, description, is_upstream_input) values
  ('semis.design', 'semiconductors', 1, 'Chip design, EDA and IP', 'Fabless designers, EDA software and licensable IP.', false),
  ('semis.equipment', 'semiconductors', 2, 'Manufacturing equipment', 'Lithography, deposition, etch, inspection and test tools.', true),
  ('semis.materials', 'semiconductors', 3, 'Materials and chemicals', 'Wafers, gases, specialty chemicals and consumables.', true),
  ('semis.fabrication', 'semiconductors', 4, 'Wafer fabrication', 'Integrated device manufacturers and foundries.', false),
  ('semis.packaging', 'semiconductors', 5, 'Assembly, packaging and test', 'Outsourced and in-house back-end assembly, packaging and test.', false),
  ('semis.distribution', 'semiconductors', 6, 'Systems and end markets', 'Distribution into data center, consumer, communications, auto, industrial and government systems.', false),
  ('ad.primes', 'aerospace_defense', 1, 'Prime contractors and integration', 'System design and final integration.', false),
  ('ad.propulsion', 'aerospace_defense', 2, 'Propulsion', 'Engines and propulsion systems.', true),
  ('ad.electronics', 'aerospace_defense', 3, 'Avionics and electronics', 'Sensors, avionics, communications and mission systems.', true),
  ('ad.structures', 'aerospace_defense', 4, 'Structures and components', 'Airframe structures, components and materials.', false),
  ('ad.services', 'aerospace_defense', 5, 'Sustainment and services', 'Maintenance, repair, overhaul and services.', false)
on conflict (id) do update set ord = excluded.ord, label = excluded.label, description = excluded.description, is_upstream_input = excluded.is_upstream_input;

insert into public.industry_stage_links (from_stage, to_stage) values
  ('semis.design', 'semis.fabrication'),
  ('semis.equipment', 'semis.fabrication'),
  ('semis.equipment', 'semis.packaging'),
  ('semis.materials', 'semis.fabrication'),
  ('semis.materials', 'semis.packaging'),
  ('semis.fabrication', 'semis.packaging'),
  ('semis.packaging', 'semis.distribution'),
  ('ad.propulsion', 'ad.primes'),
  ('ad.electronics', 'ad.primes'),
  ('ad.structures', 'ad.primes'),
  ('ad.primes', 'ad.services')
on conflict do nothing;

insert into public.industry_companies (industry_id, stage_id, company_name, ticker, business_model, hq_country, is_public, source_url, as_of) values
  ('semiconductors', 'semis.design', 'NVIDIA', 'NVDA', 'fabless', 'US', true, 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=NVDA&type=10-K&dateb=&owner=include&count=10', '2026-10-24'),
  ('semiconductors', 'semis.design', 'Advanced Micro Devices', 'AMD', 'fabless', 'US', true, 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=AMD&type=10-K&dateb=&owner=include&count=10', '2026-10-24'),
  ('semiconductors', 'semis.design', 'Qualcomm', 'QCOM', 'fabless', 'US', true, 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=QCOM&type=10-K&dateb=&owner=include&count=10', '2026-10-24'),
  ('semiconductors', 'semis.design', 'Broadcom', 'AVGO', 'fabless', 'US', true, 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=AVGO&type=10-K&dateb=&owner=include&count=10', '2026-10-24'),
  ('semiconductors', 'semis.design', 'Marvell Technology', 'MRVL', 'fabless', 'US', true, 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=MRVL&type=10-K&dateb=&owner=include&count=10', '2026-10-24'),
  ('semiconductors', 'semis.design', 'Synopsys', 'SNPS', 'eda_ip', 'US', true, 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=SNPS&type=10-K&dateb=&owner=include&count=10', '2026-10-24'),
  ('semiconductors', 'semis.design', 'Cadence Design Systems', 'CDNS', 'eda_ip', 'US', true, 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=CDNS&type=10-K&dateb=&owner=include&count=10', '2026-10-24'),
  ('semiconductors', 'semis.equipment', 'Applied Materials', 'AMAT', 'equipment', 'US', true, 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=AMAT&type=10-K&dateb=&owner=include&count=10', '2026-10-24'),
  ('semiconductors', 'semis.equipment', 'Lam Research', 'LRCX', 'equipment', 'US', true, 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=LRCX&type=10-K&dateb=&owner=include&count=10', '2026-10-24'),
  ('semiconductors', 'semis.equipment', 'KLA', 'KLAC', 'equipment', 'US', true, 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=KLAC&type=10-K&dateb=&owner=include&count=10', '2026-10-24'),
  ('semiconductors', 'semis.equipment', 'Teradyne', 'TER', 'equipment', 'US', true, 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=TER&type=10-K&dateb=&owner=include&count=10', '2026-10-24'),
  ('semiconductors', 'semis.materials', 'Entegris', 'ENTG', 'materials', 'US', true, 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=ENTG&type=10-K&dateb=&owner=include&count=10', '2026-10-24'),
  ('semiconductors', 'semis.fabrication', 'Intel', 'INTC', 'idm', 'US', true, 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=INTC&type=10-K&dateb=&owner=include&count=10', '2026-10-24'),
  ('semiconductors', 'semis.fabrication', 'Texas Instruments', 'TXN', 'idm', 'US', true, 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=TXN&type=10-K&dateb=&owner=include&count=10', '2026-10-24'),
  ('semiconductors', 'semis.fabrication', 'Micron Technology', 'MU', 'idm', 'US', true, 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=MU&type=10-K&dateb=&owner=include&count=10', '2026-10-24'),
  ('semiconductors', 'semis.fabrication', 'Analog Devices', 'ADI', 'idm', 'US', true, 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=ADI&type=10-K&dateb=&owner=include&count=10', '2026-10-24'),
  ('semiconductors', 'semis.fabrication', 'Microchip Technology', 'MCHP', 'idm', 'US', true, 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=MCHP&type=10-K&dateb=&owner=include&count=10', '2026-10-24'),
  ('semiconductors', 'semis.fabrication', 'Taiwan Semiconductor Manufacturing', 'TSM', 'foundry', 'TW', true, 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=TSM&type=20-F&dateb=&owner=include&count=10', '2026-10-24'),
  ('semiconductors', 'semis.packaging', 'Amkor Technology', 'AMKR', 'osat', 'US', true, 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=AMKR&type=10-K&dateb=&owner=include&count=10', '2026-10-24')
on conflict (industry_id, stage_id, company_name) do update set ticker = excluded.ticker, business_model = excluded.business_model, hq_country = excluded.hq_country, source_url = excluded.source_url, as_of = excluded.as_of;
