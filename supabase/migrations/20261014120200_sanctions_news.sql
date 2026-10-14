-- Sanctions news by country, for the pulsing dots on the Sanctions map.
-- /api/cron/ingest-sanctions-news stores recent sanctions headlines from
-- Marketaux with the countries each one names (matched against the OFAC
-- country names). Rows older than 60 days are pruned by the same cron.
-- Additive and idempotent. Service role only: RLS is on and no policy grants
-- anon or authenticated access.

create table if not exists public.sanctions_news (
  id text primary key,
  title text not null,
  url text not null,
  source text,
  published_at timestamptz not null,
  countries text[] not null default '{}',
  summary text,
  synced_at timestamptz not null default now()
);

create index if not exists sanctions_news_published_idx
  on public.sanctions_news (published_at desc);
create index if not exists sanctions_news_countries_idx
  on public.sanctions_news using gin (countries);

alter table public.sanctions_news enable row level security;
