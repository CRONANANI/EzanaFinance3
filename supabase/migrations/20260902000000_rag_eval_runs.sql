-- RAG evaluation runs (RAG_SYSTEM.md §3 Phase 2). Each harness invocation persists
-- its config + metrics so later phases can show before/after deltas. Service-role
-- only: no anon/authenticated policies, no grants.
create table if not exists public.rag_eval_runs (
  id           bigint generated always as identity primary key,
  git_sha      text,
  config       jsonb not null,          -- { mode: 'naive'|'full', rerank, rewrite, ... }
  metrics      jsonb not null,          -- { hitRate: {k1,k3,k6}, mrr, ndcg10, emptyStatePrecision, cases, failures[] }
  ran_at       timestamptz not null default now()
);
alter table public.rag_eval_runs enable row level security;
-- service-role only: no anon/authenticated policies, no grants.
