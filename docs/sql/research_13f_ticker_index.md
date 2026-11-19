# SQL: index for the US Equities "Ownership & Flows" tab

`/api/research/company/[symbol]?part=ownership` reads `ezq_13f_holdings`, a view over
`sec_13f_holdings` that filters on `upper(ticker)` and `put_call is null`. Without an
index Postgres scans all ~1.6M holdings rows for every page (about 1.7 seconds each).
This partial expression index turns it into an index scan. Safe to run more than once.
Run it in the Supabase SQL Editor (CONCURRENTLY cannot run inside a transaction block,
so run it on its own).

```sql
create index concurrently if not exists sec_13f_holdings_upper_ticker_long_idx
  on public.sec_13f_holdings (upper(ticker))
  where put_call is null;
```
