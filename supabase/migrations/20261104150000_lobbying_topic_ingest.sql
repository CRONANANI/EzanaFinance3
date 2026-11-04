-- Topic-level lobbying ingest cursor (Nov 2026).
-- One row per (topic, year, LDA text-search phrase). The ingest-lobbying-topics
-- cron walks LDA filings whose specific issues match the phrase, upserts them
-- into lobbying_filings, and records progress here. Sonar answers a topic
-- question ("who is lobbying hardest on AI regulation") from issue text only
-- once every phrase for the requested years is complete.
create table if not exists public.lobbying_topic_ingest (
  topic        text        not null,
  year         int         not null check (year between 1999 and 2100),
  query        text        not null,
  last_page    int         not null default 0,
  rows_fetched int         not null default 0,
  total_count  int,
  complete     boolean     not null default false,
  last_status  text,
  updated_at   timestamptz not null default now(),
  primary key (topic, year, query)
);

create index if not exists lobbying_topic_ingest_topic_complete_idx
  on public.lobbying_topic_ingest (topic, complete);

alter table public.lobbying_topic_ingest enable row level security;
-- No policies: only the service role (cron and Sonar server code) reads or writes.
revoke all on public.lobbying_topic_ingest from anon, authenticated;
