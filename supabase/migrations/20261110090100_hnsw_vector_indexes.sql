-- Vector indexes: IVFFlat -> HNSW (Nov 2026).
-- IVFFlat with lists=100 was built on near-empty tables (help 145 rows, echo 32,
-- notes 41, echo chunks 0 on 2026-11-07); its clusters are fixed at build time
-- and recall degrades as rows are added. HNSW (as on polymarket_market_index)
-- keeps recall without rebuilds. Same opclass (cosine), so the match_* RPCs
-- (order by embedding <=> q limit k) use it unchanged.
-- Each index is guarded on its table and embedding column, so the migration also
-- applies (as a no-op) to a database that does not have those tables yet, such as
-- the CI stub. Idempotent: drop if exists, create if not exists.
set maintenance_work_mem = '128MB';

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('help_center_articles', 'idx_hca_embedding', 'idx_hca_embedding_hnsw'),
      ('echo_articles', 'echo_articles_embedding_idx', 'echo_articles_embedding_hnsw'),
      ('echo_article_chunks', 'idx_eac_embedding', 'idx_eac_embedding_hnsw'),
      ('org_research_notes', 'org_research_notes_embedding_idx', 'org_research_notes_embedding_hnsw')
    ) as v(tbl, old_idx, new_idx)
  loop
    if to_regclass('public.' || t.tbl) is not null
       and exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = t.tbl and column_name = 'embedding'
       )
    then
      execute format('drop index if exists public.%I', t.old_idx);
      execute format(
        'create index if not exists %I on public.%I using hnsw (embedding vector_cosine_ops)',
        t.new_idx, t.tbl
      );
    end if;
  end loop;
end
$$;
