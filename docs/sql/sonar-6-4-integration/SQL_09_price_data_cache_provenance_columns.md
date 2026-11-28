# SQL 09 (proposal): provenance columns on `price_data_cache`

**Not required now, and nothing reads these columns yet.** Run it only when the price-contract migration is approved (step 3 of the price plan in `docs/SONAR_6_4_INTEGRATION_COMPATIBILITY.md`). The columns are additive and nullable: no writer or reader breaks, and existing rows stay null, which the contract reads as "unknown".

**Why:** the cache's writers disagree on what `close` means.
- FMP end-of-day rows hold the unadjusted close, with FMP's adjusted close in `adj_close`.
- Alpaca rows from `sync-award-prices` (`adjustment=all`) hold the *adjusted* close in `close`.
- Quant-universe rows copy `close` into `adj_close`.
- Screen-price rows store an FMP *quote* as a close.

Today no row records which of these it is.

```sql
alter table public.price_data_cache
  add column if not exists source text,            -- 'fmp_eod' | 'alpaca_bars' | 'fmp_quote' | ...
  add column if not exists close_adjustment text,  -- 'unadjusted' | 'adjusted' | 'unknown'
  add column if not exists currency text,          -- ISO 4217
  add column if not exists contract_version text;  -- 'price-contract-v1'

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'price_data_cache_close_adjustment_check') then
    alter table public.price_data_cache
      add constraint price_data_cache_close_adjustment_check
      check (close_adjustment is null or close_adjustment in ('unadjusted', 'adjusted', 'unknown'));
  end if;
end;
$$;
```

Rollback:

```sql
alter table public.price_data_cache
  drop constraint if exists price_data_cache_close_adjustment_check,
  drop column if exists source,
  drop column if exists close_adjustment,
  drop column if exists currency,
  drop column if exists contract_version;
```
