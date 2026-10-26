-- Sonar v2: trigram indexes for the contracts retriever.
--
-- The retriever matches `ILIKE '%term%'` on recipient_name and
-- awarding_agency. The existing btree indexes cannot serve a leading
-- wildcard, so every ping scanned the 106k-row awards table (0.4 to 3.3s
-- idle, past the 15s retriever window under disk IO). Trigram GIN indexes
-- serve those patterns directly; the partial ticker index serves the
-- ticker lookups.
--
-- Additive and idempotent. Plain CREATE INDEX (not CONCURRENTLY) so it can
-- run as one script in the SQL Editor; on 106k rows each build takes
-- seconds and only blocks writes to this table (the nightly ingest) while
-- it runs. Guarded so a database without the table is a no-op.

create extension if not exists pg_trgm with schema public;

do $$
begin
  if to_regclass('public.usaspending_contract_awards') is null then
    raise notice 'usaspending_contract_awards missing; skipping contracts trigram indexes';
    return;
  end if;

  execute 'create index if not exists idx_usac_recipient_name_trgm
             on public.usaspending_contract_awards
             using gin (recipient_name public.gin_trgm_ops)';

  execute 'create index if not exists idx_usac_awarding_agency_trgm
             on public.usaspending_contract_awards
             using gin (awarding_agency public.gin_trgm_ops)';

  execute 'create index if not exists idx_usac_ticker
             on public.usaspending_contract_awards (ticker)
             where ticker is not null';

  execute 'analyze public.usaspending_contract_awards';
end
$$;
