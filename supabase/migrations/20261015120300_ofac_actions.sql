-- OFAC Recent Actions (https://ofac.treasury.gov/recent-actions/), the
-- Treasury's own dated notices, for the Sanctions page's official actions
-- feed. Filled by /api/cron/ingest-ofac-actions from the public listing
-- pages. Only what the notice listing states is stored: its date (from the
-- notice URL), its title and its link. kinds and program_hints are derived
-- from the title text by src/lib/sanctions/actions.js and are labelled as
-- such on the page. Additive and idempotent. Service role only.

create table if not exists public.ofac_actions (
  id text primary key,            -- the notice slug, e.g. '20261013' or '20261013_33'
  action_date date not null,
  title text not null,
  url text not null,
  kinds text[] not null default '{}',
  program_hints text[] not null default '{}',
  synced_at timestamptz not null default now()
);

create index if not exists ofac_actions_date_idx
  on public.ofac_actions (action_date desc);

alter table public.ofac_actions enable row level security;
