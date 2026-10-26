-- Prediction markets API (Oct 26). One row per event, refreshed by the
-- index-prediction-markets cron (refresh_prediction_events). Read only;
-- served by the Ezana API through the service role.
--
-- Applied by hand in the Supabase SQL editor (prediction-markets-api-SQL.md,
-- the same statements); kept here so the repo records it. Safe to re-run: the
-- read model is dropped and rebuilt from prediction_market_index (no market
-- rows change). Guarded on prediction_market_index existing, since that table
-- predates the migrations folder and is absent from fresh test databases.

do $mig$
begin
  if to_regclass('public.prediction_market_index') is null then
    raise notice 'prediction_market_index missing; skipping prediction_events_mat';
    return;
  end if;

  execute 'drop materialized view if exists public.prediction_events_mat';

  execute $sql$
    create materialized view public.prediction_events_mat as
    select
      m.event_key,
      min(m.platform)                                              as platform,
      max(m.event_title)                                           as title,
      max(m.category)                                              as category,
      min(m.tag_ids)                                               as tag_ids,
      max(m.recurrence)                                            as recurrence,
      count(*)                                                     as markets,
      count(*) filter (where m.status = 'active')                  as active_markets,
      case when bool_or(m.status = 'active') then 'active' else max(m.status) end as status,
      max(m.volume_unit)                                           as volume_unit,
      sum(m.volume)                                                as volume,
      sum(m.volume_24h)                                            as volume_24h,
      sum(m.volume_norm)                                           as volume_norm,
      max(m.end_date)                                              as ends_at,
      max(m.indexed_at)                                            as updated_at,
      (array_agg(m.market_id     order by m.probability desc nulls last)
         filter (where m.status = 'active'))[1]                    as leading_market_id,
      (array_agg(m.outcome_label order by m.probability desc nulls last)
         filter (where m.status = 'active'))[1]                    as leading_outcome,
      (array_agg(m.probability   order by m.probability desc nulls last)
         filter (where m.status = 'active'))[1]                    as leading_probability
    from public.prediction_market_index m
    where m.event_key is not null
    group by m.event_key
  $sql$;

  -- Unique key (needed for REFRESH ... CONCURRENTLY) and the list sorts.
  execute 'create unique index prediction_events_mat_key on public.prediction_events_mat (event_key)';
  execute 'create index prediction_events_mat_vol24 on public.prediction_events_mat (status, volume_24h desc nulls last, event_key)';
  execute 'create index prediction_events_mat_vol on public.prediction_events_mat (status, volume desc nulls last, event_key)';
  execute 'create index prediction_events_mat_ends on public.prediction_events_mat (status, ends_at, event_key)';

  -- Only the server reads it.
  execute 'revoke all on public.prediction_events_mat from anon, authenticated';
  execute 'grant select on public.prediction_events_mat to service_role';

  -- Event pages read every outcome of one event, including closed ones.
  execute 'create index if not exists prediction_market_index_event_all_idx
    on public.prediction_market_index (event_key, probability desc nulls last)
    where event_key is not null';
  -- Movers sort by the change columns among active markets.
  execute 'create index if not exists prediction_market_index_change_24h_idx
    on public.prediction_market_index (status, price_change_24h)
    where price_change_24h is not null';
  execute 'create index if not exists prediction_market_index_change_7d_idx
    on public.prediction_market_index (status, change_7d)
    where change_7d is not null';
end
$mig$;

-- Called by the cron after it upserts markets. Concurrent, so API reads never
-- block. (The body resolves the view at call time, so this is safe to create
-- before the view exists.)
create or replace function public.refresh_prediction_events()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.prediction_events_mat;
end;
$$;
revoke all on function public.refresh_prediction_events() from public, anon, authenticated;
grant execute on function public.refresh_prediction_events() to service_role;

notify pgrst, 'reload schema';
