-- For The Quants: Model Library community tier votes (Nov 2026).
--
-- One row per user per model. tier is 5 (S) down to 1 (D).
-- Users read and write only their own rows (RLS). The board reads the
-- aggregate through quant_model_vote_summary(), which returns counts and
-- averages only, never who voted for what.
--
-- Safe to run more than once.

create table if not exists public.quant_model_votes (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  model_id   text        not null check (char_length(model_id) between 1 and 40),
  tier       smallint    not null check (tier between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, model_id)
);

create index if not exists quant_model_votes_model_idx
  on public.quant_model_votes (model_id);

alter table public.quant_model_votes enable row level security;

revoke all on table public.quant_model_votes from anon;
grant select, insert, update, delete on table public.quant_model_votes to authenticated;

drop policy if exists "quant_model_votes_select_own" on public.quant_model_votes;
create policy "quant_model_votes_select_own" on public.quant_model_votes
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "quant_model_votes_insert_own" on public.quant_model_votes;
create policy "quant_model_votes_insert_own" on public.quant_model_votes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "quant_model_votes_update_own" on public.quant_model_votes;
create policy "quant_model_votes_update_own" on public.quant_model_votes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "quant_model_votes_delete_own" on public.quant_model_votes;
create policy "quant_model_votes_delete_own" on public.quant_model_votes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Aggregate for the community board. Security definer so it can count across
-- users, but it exposes only model_id, vote count and average tier.
create or replace function public.quant_model_vote_summary()
returns table (model_id text, votes bigint, avg_tier numeric)
language sql
stable
security definer
set search_path = public
as $$
  select v.model_id,
         count(*)::bigint                as votes,
         round(avg(v.tier)::numeric, 3)  as avg_tier
  from public.quant_model_votes v
  group by v.model_id
$$;

revoke all on function public.quant_model_vote_summary() from public;
revoke all on function public.quant_model_vote_summary() from anon;
grant execute on function public.quant_model_vote_summary() to authenticated;
