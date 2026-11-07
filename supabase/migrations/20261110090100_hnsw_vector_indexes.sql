-- Vector indexes: IVFFlat -> HNSW (Nov 2026).
-- IVFFlat with lists=100 was built on near-empty tables (help 145 rows, echo 32,
-- notes 41, echo chunks 0 on 2026-11-07); its clusters are fixed at build time
-- and recall degrades as rows are added. HNSW (as on polymarket_market_index)
-- keeps recall without rebuilds. Same opclass (cosine), so the match_* RPCs
-- (order by embedding <=> q limit k) use it unchanged.
set maintenance_work_mem = '128MB';

drop index if exists public.idx_hca_embedding;
create index if not exists idx_hca_embedding_hnsw
  on public.help_center_articles using hnsw (embedding vector_cosine_ops);

drop index if exists public.echo_articles_embedding_idx;
create index if not exists echo_articles_embedding_hnsw
  on public.echo_articles using hnsw (embedding vector_cosine_ops);

drop index if exists public.idx_eac_embedding;
create index if not exists idx_eac_embedding_hnsw
  on public.echo_article_chunks using hnsw (embedding vector_cosine_ops);

drop index if exists public.org_research_notes_embedding_idx;
create index if not exists org_research_notes_embedding_hnsw
  on public.org_research_notes using hnsw (embedding vector_cosine_ops);
