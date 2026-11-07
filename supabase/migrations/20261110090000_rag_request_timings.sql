-- Per-request RAG latency telemetry (Nov 2026).
-- One row per /api/sonar/query ping or /api/help-center/ask question:
-- total time, time to first streamed answer text, and ms per pipeline stage.
-- Written fire-and-forget by src/lib/rag/request-timer.js with the service role.
-- No query text, no user id, no IP: timings only.
create table if not exists public.rag_request_timings (
  id bigint generated always as identity primary key,
  surface text not null
    check (surface in ('sonar-query', 'help-center')),
  total_ms integer not null check (total_ms >= 0),
  first_byte_ms integer check (first_byte_ms is null or first_byte_ms >= 0),
  stages jsonb not null default '{}'::jsonb,
  cache_hit boolean not null default false,
  streamed boolean not null default false,
  degraded text,
  created_at timestamptz not null default now()
);

comment on table public.rag_request_timings is
  'Per-request latency for Sonar quick answer and help-center RAG. stages = { stage_name: ms }. Service role only.';

create index if not exists rag_request_timings_surface_created_idx
  on public.rag_request_timings (surface, created_at desc);

alter table public.rag_request_timings enable row level security;
-- Service role only: no policies, no grants to anon or authenticated.
revoke all on public.rag_request_timings from anon, authenticated;
