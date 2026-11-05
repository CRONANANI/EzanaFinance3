-- Deep research step 3, part D (Nov 2026): who holds the stock, who lobbies
-- with the company, and who competes with it.
--
--   1. filer_style_patterns / filer_style_overrides and sonar_13f_style_trend:
--      13F holders grouped by manager type (from the manager's name, with
--      manual overrides), and up to eight complete quarters of holders and
--      reported value. Fills in as the 13F backfill loads history.
--   2. industry_associations and sonar_lobbying_associations: lobbying by the
--      trade groups a company belongs to, from the same Senate LDA filings.
--   3. competitive_products: dated, sourced competitor product milestones,
--      shown only once approved.
--   4. lobbying_client_tickers rows for NVIDIA's two LDA client names.
--
-- Functions are plpgsql so they can be created before the tables they read
-- exist (the migration test applies every migration to an empty database).

-- ── 1. Manager types ────────────────────────────────────────────────────

create table if not exists public.filer_style_patterns (
  id bigserial primary key,
  pattern text not null unique,          -- case-insensitive POSIX regex on filer_name
  style text not null check (style in (
    'index_heavy', 'pension_sovereign', 'insurer', 'bank_wealth', 'hedge_quant', 'active'
  )),
  priority int not null default 100,     -- lower wins
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.filer_style_overrides (
  cik text primary key,                  -- 10-digit, as in titans_13f_filers
  style text not null check (style in (
    'index_heavy', 'pension_sovereign', 'insurer', 'bank_wealth', 'hedge_quant', 'active', 'unclassified'
  )),
  note text,
  updated_at timestamptz not null default now()
);

alter table public.filer_style_patterns enable row level security;
alter table public.filer_style_overrides enable row level security;
revoke all on public.filer_style_patterns, public.filer_style_overrides from anon, authenticated;

insert into public.filer_style_patterns (pattern, style, priority, note) values
  ('^blackrock', 'index_heavy', 10, 'Largest index fund sponsor; also runs active funds'),
  ('^vanguard', 'index_heavy', 10, null),
  ('^state street', 'index_heavy', 10, null),
  ('^geode capital', 'index_heavy', 10, null),
  ('^northern trust', 'index_heavy', 20, null),
  ('^charles schwab investment', 'index_heavy', 20, null),
  ('retirement system|pension|teachers|public employees|state board of administration|ap-fonden|norges bank|investment board|superannuation', 'pension_sovereign', 30, null),
  ('life insurance|insurance co|assurance|^allianz|^equitable holdings|^manufacturers life', 'insurer', 40, null),
  ('^citadel|^millennium management|^renaissance technologies|^two sigma|^d\.? ?e\.? shaw|^jane street|^susquehanna|^bridgewater|^aqr capital|^point72|^balyasny|^capstone investment|^capitolis', 'hedge_quant', 40, null),
  ('^morgan stanley|^bank of america|^jpmorgan|^wells fargo|^ubs |^goldman sachs|^royal bank of canada|^lpl financial|^ameriprise|^raymond james|^td waterhouse|^envestnet|wealth|trust co|private bank|^banque|bank international', 'bank_wealth', 50, null),
  ('^fmr|^fidelity|^capital research|^capital world|^capital international|^t\. ?rowe|^price t rowe|^jennison|^wellington management|^neuberger berman|^pictet|^aberdeen|^fayez sarofim|^invesco|^franklin resources|^dodge & cox', 'active', 60, null)
on conflict (pattern) do nothing;

/** Holders of one ticker by manager type, and the reported-holder trend. */
create or replace function public.sonar_13f_style_trend(p_ticker text)
returns jsonb
language plpgsql stable
security definer
set search_path = public
as $$
begin
  return (
with filed as (select period, count(*) n from public.titans_13f_filers group by 1),
complete as (
  select period, n from filed where n >= 0.5 * (select max(n) from filed)
  order by period desc limit 8
),
latest as (select max(period) p from complete),
raw as (
  select period, cik, sum(coalesce(sh_shares, shares))::numeric shares, sum(value_usd)::numeric value_usd
    from public.titans_13f_positions
   where ticker = upper(p_ticker) and coalesce(put_call, '') = ''
     and period in (select period from complete)
   group by 1, 2
),
px as (
  select period, percentile_cont(0.5) within group (order by value_usd / nullif(shares, 0)) med
    from raw where shares > 0 group by 1
),
pos as (
  select r.* from raw r join px using (period)
   where r.shares > 0 and r.value_usd / r.shares between 0.4 * px.med and 2.5 * px.med
),
names as (
  select f.cik, f.filer_name from public.titans_13f_filers f where f.period = (select p from latest)
),
styled as (
  select p.cik, p.value_usd,
         coalesce(o.style, (
           select s.style from public.filer_style_patterns s
            where n.filer_name ~* s.pattern order by s.priority, s.id limit 1
         ), 'unclassified') style
    from pos p
    left join names n on n.cik = p.cik
    left join public.filer_style_overrides o on o.cik = p.cik
   where p.period = (select p from latest)
),
tot as (select sum(value_usd) v from styled),
mix as (
  select style, count(*) holders, sum(value_usd) value_usd from styled group by 1
)
select jsonb_build_object(
  'ticker', upper(p_ticker),
  'period', (select p from latest),
  'style_mix', (select coalesce(jsonb_agg(jsonb_build_object(
      'style', m.style, 'holders', m.holders, 'value_usd', m.value_usd,
      'share', case when tot.v > 0 then m.value_usd / tot.v end) order by m.value_usd desc), '[]'::jsonb)
    from mix m, tot),
  'index_heavy_share', (select case when tot.v > 0 then
      coalesce((select value_usd from mix where style = 'index_heavy'), 0) / tot.v end from tot),
  'trend', (select coalesce(jsonb_agg(jsonb_build_object(
      'period', c.period, 'filers', c.n, 'holders', coalesce(q.holders, 0),
      'shares', q.shares, 'value_usd', q.value_usd) order by c.period), '[]'::jsonb)
    from complete c
    left join (select period, count(*) holders, sum(shares) shares, sum(value_usd) value_usd
                 from pos group by 1) q using (period))
)
);
end;
$$;

revoke all on function public.sonar_13f_style_trend(text) from public, anon, authenticated;
grant execute on function public.sonar_13f_style_trend(text) to service_role;

-- ── 2. Industry associations ────────────────────────────────────────────

create table if not exists public.industry_associations (
  id bigserial primary key,
  association text not null,
  lobbying_client_name text not null unique,   -- as it appears in lobbying_filings.client_name
  member_tickers text[] not null default '{}',
  members_source_url text not null,
  verified_at date not null,
  created_at timestamptz not null default now()
);
create index if not exists industry_associations_members_gin
  on public.industry_associations using gin (member_tickers);
alter table public.industry_associations enable row level security;
revoke all on public.industry_associations from anon, authenticated;

insert into public.industry_associations
  (association, lobbying_client_name, member_tickers, members_source_url, verified_at)
values (
  'Semiconductor Industry Association',
  'SEMICONDUCTOR INDUSTRY ASSOCIATION',
  array['NVDA', 'AMD', 'INTC', 'QCOM', 'MU', 'AVGO', 'TXN', 'ADI', 'MRVL'],
  'https://www.semiconductors.org/about/members/',
  '2026-11-04'
)
on conflict (lobbying_client_name) do nothing;

/** Lobbying reported by the associations a ticker belongs to. Quarterly
    reports only; an amended report replaces the original for the same
    registrant and quarter; a self-filing client counts only its own filings
    (outside firms' fees are already in its total), as sonar_lobbying_by_tickers. */
create or replace function public.sonar_lobbying_associations(p_ticker text, p_from int, p_to int)
returns jsonb
language plpgsql stable
security definer
set search_path = public
as $$
begin
  return (
with a as (
  select * from public.industry_associations where upper(p_ticker) = any (member_tickers)
),
f0 as (
  select a.id aid, lf.registrant_name, lf.filing_year, lf.quarter, lf.amount, lf.issues, lf.dt_posted,
         upper(lf.registrant_name) = upper(lf.client_name) self
    from public.lobbying_filings lf join a on upper(lf.client_name) = upper(a.lobbying_client_name)
   where lf.filing_year between p_from and p_to
     and coalesce(lf.is_registration, false) = false
),
f1 as (
  select distinct on (aid, upper(registrant_name), filing_year, quarter) *
    from f0 order by aid, upper(registrant_name), filing_year, quarter, dt_posted desc
),
flag as (select aid, bool_or(self) self_filed from f1 group by 1),
g as (select f1.* from f1 join flag using (aid) where f1.amount > 0 and ((not flag.self_filed) or f1.self)),
iss as (
  select g.aid, i ->> 'display' issue, count(*) n
    from g, jsonb_array_elements(coalesce(g.issues, '[]'::jsonb)) i group by 1, 2
)
select coalesce(jsonb_agg(x order by x.total_amount desc nulls last), '[]'::jsonb) from (
  select a.association, a.lobbying_client_name client_name, a.member_tickers members,
         a.members_source_url, a.verified_at,
         (select sum(amount) from g where g.aid = a.id) total_amount,
         (select count(*) from g where g.aid = a.id) filings,
         (select jsonb_object_agg(filing_year, amt) from (
            select filing_year, sum(amount) amt from g where g.aid = a.id group by 1) y) by_year,
         (select array_agg(issue order by n desc) from (
            select issue, n from iss where iss.aid = a.id order by n desc limit 6) s) top_issues
    from a
) x
);
end;
$$;

revoke all on function public.sonar_lobbying_associations(text, int, int) from public, anon, authenticated;
grant execute on function public.sonar_lobbying_associations(text, int, int) to service_role;

-- ── 3. Competitive products ─────────────────────────────────────────────

create table if not exists public.competitive_products (
  id bigserial primary key,
  company text not null,
  company_ticker text,                       -- null for private companies
  product text not null,
  kind text not null check (kind in ('custom_accelerator', 'merchant_gpu', 'domestic_alternative', 'other')),
  competes_with text[] not null default '{}',
  milestone_date date not null,
  statement text not null,                   -- one sourced, dated sentence
  source_url text not null,
  source_title text not null,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (company, product, milestone_date)
);
create index if not exists competitive_products_competes_gin
  on public.competitive_products using gin (competes_with);
alter table public.competitive_products enable row level security;
revoke all on public.competitive_products from anon, authenticated;

insert into public.competitive_products
  (company, company_ticker, product, kind, competes_with, milestone_date, statement, source_url, source_title, review_status)
values
  ('Alphabet', 'GOOGL', 'Ironwood TPU', 'custom_accelerator', array['NVDA', 'AMD'], '2025-11-06',
   'Google Cloud announced that Ironwood, its seventh-generation TPU, would become generally available in the coming weeks.',
   'https://cloud.google.com/blog/products/compute/ironwood-tpus-and-new-axion-based-vms-for-your-ai-workloads/',
   'Google Cloud blog', 'approved'),
  ('Amazon', 'AMZN', 'Trainium3', 'custom_accelerator', array['NVDA', 'AMD'], '2025-12-02',
   'AWS made EC2 Trn3 UltraServers generally available, running Trainium3, which AWS calls its first 3nm AI chip.',
   'https://press.aboutamazon.com/2025/12/trainium3-ultraservers-now-available-enabling-customers-to-train-and-deploy-ai-models-faster-at-lower-cost',
   'Amazon press release', 'approved'),
  ('Microsoft', 'MSFT', 'Maia 200', 'custom_accelerator', array['NVDA', 'AMD'], '2026-01-26',
   'Microsoft introduced Maia 200, an inference accelerator built on a 3-nanometer process, rolling out first in Azure US regions.',
   'https://news.microsoft.com/source/emea/2026/01/microsoft-introduces-maia-200-new-inference-accelerator-enhances-ai-performance-in-azure/',
   'Microsoft Source', 'approved'),
  ('AMD', 'AMD', 'Instinct MI350 Series', 'merchant_gpu', array['NVDA'], '2025-06-12',
   'AMD introduced the Instinct MI350 Series (MI350X and MI355X) with 288 GB of HBM3E, and said the MI400 Series is coming in 2026.',
   'https://www.amd.com/en/blogs/2025/amd-instinct-mi350-series-and-beyond-accelerating-the-future-of-ai-and-hpc.html',
   'AMD blog', 'approved'),
  ('Meta', 'META', 'MTIA (second generation)', 'custom_accelerator', array['NVDA', 'AMD'], '2024-04-10',
   'Meta introduced the next generation of its MTIA accelerator, already serving ranking and recommendation models in production.',
   'https://ai.meta.com/blog/next-generation-meta-training-inference-accelerator-AI-MTIA/',
   'Meta AI blog', 'approved'),
  ('Huawei', null, 'Ascend 950 series', 'domestic_alternative', array['NVDA', 'AMD'], '2025-09-18',
   'Huawei set out an Ascend roadmap: the 950PR in Q1 2026, the 950DT in Q4 2026, the 960 in Q4 2027 and the 970 in Q4 2028.',
   'https://www.huawei.com/en/news/2025/9/hc-xu-keynote-speech',
   'Huawei Connect 2025 keynote', 'approved')
on conflict (company, product, milestone_date) do nothing;

-- ── 4. NVIDIA's LDA client names ────────────────────────────────────────

-- Guarded: the table comes from an earlier migration that a partial test
-- database may not have.
do $$
begin
  if to_regclass('public.lobbying_client_tickers') is not null then
    insert into public.lobbying_client_tickers (client_name, ticker, exchange, company_label, verified, match_method, source)
    values
      ('NVIDIA CORPORATION', 'NVDA', 'NASDAQ', 'NVIDIA Corporation', true, 'manual', 'sonar_deep_research'),
      ('NVIDIA', 'NVDA', 'NASDAQ', 'NVIDIA Corporation', true, 'manual', 'sonar_deep_research')
    on conflict (client_name) do nothing;
  end if;
end;
$$;
