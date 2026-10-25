-- QA ORG-12: position imports (CSV + brokerage-connect) upsert on the natural
-- key (org_id, team_id, ticker, source, unified_account_id) instead of
-- inserting duplicates on every re-import.
--
-- team_id and unified_account_id are NULL-able (CSV rows have no account; a
-- team is optional), so the index is NULLS NOT DISTINCT (Postgres 15+; live
-- is 17.x): two CSV rows for the same ticker with a null team still collide,
-- and PostgREST's on_conflict=org_id,team_id,ticker,source,unified_account_id
-- infers this index. It must NOT be partial: ON CONFLICT (cols) cannot infer
-- a partial index without its predicate, which PostgREST cannot send.
--
-- Live check (2026-10-25, read-only): 17 rows, all source = 'manual', zero
-- duplicate groups, no foreign keys reference org_positions.id. The dedupe
-- below is therefore a no-op today; it exists so the migration also applies
-- cleanly on any environment that already holds duplicate imports.
--
-- Apply order: apply this migration BEFORE deploying the code that upserts
-- with onConflict (src/lib/org-position-import.js); without the index those
-- imports fail with 42P10 ("no unique or exclusion constraint matching").
-- Small table: a plain (transactional) CREATE INDEX is fine.

-- Guarded on the table existing so the migration is a no-op (not an error)
-- in partial schemas such as the local SQL test harness.
do $$
begin
  if to_regclass('public.org_positions') is null then
    raise notice 'org_positions missing; skipping ORG-12 import key';
    return;
  end if;

  -- 1) Dedupe: keep one row per key. Prefer a live row (is_active), then the
  --    newest (updated_at, created_at, id); delete the rest. PARTITION BY
  --    groups NULLs together, matching NULLS NOT DISTINCT below.
  with ranked as (
    select
      id,
      row_number() over (
        partition by org_id, team_id, ticker, source, unified_account_id
        order by is_active desc, updated_at desc, created_at desc, id desc
      ) as rn
    from public.org_positions
  )
  delete from public.org_positions p
  using ranked r
  where p.id = r.id
    and r.rn > 1;

  -- 2) The unique key the import upserts target.
  create unique index if not exists org_positions_import_key
    on public.org_positions (org_id, team_id, ticker, source, unified_account_id)
    nulls not distinct;

  comment on index public.org_positions_import_key is
    'QA ORG-12: idempotent position imports (CSV / brokerage-connect upsert on this key).';
end
$$;
