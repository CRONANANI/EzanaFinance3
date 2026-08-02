-- Phase 4 (personalization): org-level attention aggregates, k-anonymous.
-- Applied MANUALLY in the Supabase SQL Editor. Rows are written ONLY by the
-- org-interest-aggregates cron (service role) and ONLY when at least K distinct
-- members contribute to a (dimension, value) — see the cron for the K floor.
-- Members who turned personalization off are excluded upstream.
create table if not exists public.org_interest_aggregates (
  org_id uuid not null references public.organizations(id) on delete cascade,
  dimension text not null,
  value text not null,
  score numeric not null default 0,
  member_count integer not null default 0,
  computed_at timestamptz not null default now(),
  primary key (org_id, dimension, value)
);

create index if not exists org_interest_aggregates_org_dim_idx
  on public.org_interest_aggregates (org_id, dimension, score desc);

alter table public.org_interest_aggregates enable row level security;

-- Any active member of the org may read its aggregates; the API route further
-- restricts this to managers. Writes are service-role only (no write policy).
drop policy if exists org_interest_aggregates_member_read on public.org_interest_aggregates;
create policy org_interest_aggregates_member_read
  on public.org_interest_aggregates
  for select
  using (
    exists (
      select 1 from public.org_members m
      where m.org_id = org_interest_aggregates.org_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );
