-- Month-end currency rates against the US dollar, for the Sanctions page's
-- sanctions-versus-currency card. usd_rate is units of the currency per one
-- US dollar at the last trading day of the month, so a rising rate is a
-- weakening currency. Filled by /api/cron/ingest-fx-monthly from FMP's FX
-- end-of-day prices. Additive and idempotent. Service role only: RLS is on
-- and no policy grants anon or authenticated access.

create table if not exists public.fx_monthly (
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  month date not null,
  usd_rate numeric not null check (usd_rate > 0),
  source text not null default 'fmp',
  updated_at timestamptz not null default now(),
  primary key (currency, month)
);

alter table public.fx_monthly enable row level security;
