-- Sanctions & Trade Policy: server-side aggregates and search.
--
-- Depends on 20261014120000_sanctions_listing_dates.sql (OFAC publication
-- dates) and 20261015120000_sanctions_research.sql (aliases, identifiers,
-- links). Apply those first.
--
-- Date semantics, used everywhere below:
--   listed_on   OFAC's own publication date for the entry (SDN_ADVANCED.XML,
--               earliest EntryEvent). A calendar date, no time zone.
--   first_seen  the day Ezana first loaded the row. Never used as a
--               designation date.
--   removed_on  the first daily load in which the entry was absent from
--               OFAC's file. An observed removal, not OFAC's own delisting
--               date.
-- Windows are calendar days ending today (UTC, the database clock):
-- "last 30 days" = listed_on between current_date - 29 and current_date.
--
-- Counts are LISTING RECORDS (one OFAC entry number each). A record can sit
-- under several programs and several countries, so breakdowns by those keys
-- overlap; totals never add breakdowns together.
--
-- Activity counts include records removed since tracking began (they were
-- still published on their date). Records OFAC removed BEFORE tracking began
-- are not in any current OFAC file, so history undercounts them; the page
-- says so.
--
-- All functions: SECURITY DEFINER, service role only.

-- Headline numbers for the KPI row.
create or replace function public.sanctions_kpis()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with e as (
    select e.ent_num, e.removed_on, d.listed_on
    from public.sanctions_entries e
    left join public.sanctions_listing_dates d on d.ent_num = e.ent_num
  )
  select jsonb_build_object(
    'today', current_date,
    'active', count(*) filter (where removed_on is null),
    'active_dated', count(*) filter (where removed_on is null and listed_on is not null),
    'listed_30', count(*) filter (where listed_on between current_date - 29 and current_date),
    'listed_prev_30', count(*) filter (where listed_on between current_date - 59 and current_date - 30),
    'listed_90', count(*) filter (where listed_on between current_date - 89 and current_date),
    'listed_365', count(*) filter (where listed_on between current_date - 364 and current_date),
    'removed_observed', count(*) filter (where removed_on is not null),
    'removed_30', count(*) filter (where removed_on between current_date - 29 and current_date),
    'earliest_listed', min(listed_on),
    'latest_listed', max(listed_on)
  )
  from e;
$$;

-- Monthly new listings. p_months > 0: that many calendar months ending with
-- the current month; null or 0: every month from the earliest listing date.
-- Months with no listings return 0 (a true zero: the dates cover every
-- current entry). Returns no rows when no listing dates are loaded.
create or replace function public.sanctions_activity(
  p_months integer default 24,
  p_country text default null,
  p_program text default null,
  p_type text default null
)
returns table (month date, listings integer)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select
      case
        when coalesce(p_months, 0) > 0
          then (date_trunc('month', current_date) - make_interval(months => least(p_months, 600) - 1))::date
        else (select date_trunc('month', min(listed_on))::date from public.sanctions_listing_dates)
      end as start_m,
      date_trunc('month', current_date)::date as end_m
  ),
  months as (
    select generate_series(b.start_m, b.end_m, interval '1 month')::date as m
    from bounds b
    where b.start_m is not null
      and exists (select 1 from public.sanctions_listing_dates)
  ),
  hits as (
    select date_trunc('month', d.listed_on)::date as m, count(*)::integer as n
    from public.sanctions_entries e
    join public.sanctions_listing_dates d on d.ent_num = e.ent_num
    cross join bounds b
    where d.listed_on >= b.start_m
      and d.listed_on <= current_date
      and (p_country is null or e.countries @> array[p_country])
      and (p_program is null or e.programs @> array[p_program])
      and (p_type is null or e.entry_type = p_type)
    group by 1
  )
  select months.m, coalesce(hits.n, 0)
  from months
  left join hits on hits.m = months.m
  order by 1;
$$;

-- What made up the listings in a window, by one key: 'program', 'country'
-- or 'type'. Program and country keys OVERLAP (a record counts under each of
-- its programs or countries); 'type' is exclusive. Listings with no address
-- country count under '(none)'.
create or replace function public.sanctions_activity_breakdown(
  p_dim text,
  p_from date,
  p_to date,
  p_country text default null,
  p_program text default null,
  p_type text default null,
  p_limit integer default 8
)
returns table (key text, listings integer)
language sql
stable
security definer
set search_path = public
as $$
  select k as key, count(*)::integer as listings
  from public.sanctions_entries e
  join public.sanctions_listing_dates d on d.ent_num = e.ent_num
  cross join lateral unnest(
    case p_dim
      when 'program' then case when cardinality(e.programs) = 0 then array['(none)'] else e.programs end
      when 'country' then case when cardinality(e.countries) = 0 then array['(none)'] else e.countries end
      else array[coalesce(e.entry_type, 'entity')]
    end
  ) as k
  where p_dim in ('program', 'country', 'type')
    and d.listed_on between p_from and p_to
    and (p_country is null or e.countries @> array[p_country])
    and (p_program is null or e.programs @> array[p_program])
    and (p_type is null or e.entry_type = p_type)
  group by 1
  order by 2 desc, 1
  limit greatest(1, least(coalesce(p_limit, 8), 50));
$$;

-- New listings per target jurisdiction: p_targets maps a jurisdiction to the
-- program codes aimed at it, e.g. {"Iran": ["IRAN", "IFSR"]}. A record under
-- several of a jurisdiction's programs counts once for it.
-- recent = last p_days days; prior = the p_days before that.
create or replace function public.sanctions_target_activity(
  p_targets jsonb,
  p_days integer default 365
)
returns table (target text, recent integer, prior integer)
language sql
stable
security definer
set search_path = public
as $$
  with t as (
    select key as target, array(select jsonb_array_elements_text(value)) as codes
    from jsonb_each(coalesce(p_targets, '{}'::jsonb))
    where jsonb_typeof(value) = 'array'
  ),
  w as (select greatest(7, least(coalesce(p_days, 365), 3650)) as days)
  select
    t.target,
    count(*) filter (where d.listed_on > current_date - w.days)::integer,
    count(*) filter (
      where d.listed_on <= current_date - w.days and d.listed_on > current_date - 2 * w.days
    )::integer
  from t
  cross join w
  join public.sanctions_entries e on e.programs && t.codes
  join public.sanctions_listing_dates d on d.ent_num = e.ent_num
  where d.listed_on > current_date - 2 * w.days
    and d.listed_on <= current_date
  group by t.target;
$$;

-- The listings explorer. Every filter is optional and they combine with AND.
--   p_q          name or alias contains (case-insensitive)
--   p_ident      identifier (IMO, passport, tax ID, ...) equals or starts with,
--                compared on letters and digits only
--   p_from/p_to  OFAC listing date range (records without a date drop out)
--   p_secondary  true: OFAC states a secondary sanctions risk
--   p_has_links  true: OFAC notes at least one "Linked To" party
--   p_linked_to  the record named exactly this, or records OFAC notes as
--                linked to it
-- Ordered by OFAC listing date, newest first, then name. total is the full
-- match count for pagination.
create or replace function public.sanctions_search(
  p_q text default null,
  p_ident text default null,
  p_type text default null,
  p_country text default null,
  p_program text default null,
  p_from date default null,
  p_to date default null,
  p_secondary boolean default null,
  p_has_links boolean default null,
  p_linked_to text default null,
  p_offset integer default 0,
  p_limit integer default 25
)
returns table (
  ent_num integer,
  name text,
  entry_type text,
  programs text[],
  countries text[],
  localities text[],
  first_seen date,
  listed_on date,
  secondary_risk text,
  matched_alias text,
  ident_label text,
  ident_value text,
  link_count integer,
  total bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with p as (
    select
      nullif(trim(p_q), '') as q,
      nullif(upper(regexp_replace(coalesce(p_ident, ''), '[^[:alnum:]]', '', 'g')), '') as ident,
      public.sanctions_norm(p_linked_to) as lt
  ),
  alias_hits as (
    select distinct a.ent_num
    from public.sanctions_aliases a, p
    where p.q is not null and a.alt_name ilike '%' || p.q || '%'
  ),
  base as (
    select e.*, d.listed_on
    from public.sanctions_entries e
    cross join p
    left join public.sanctions_listing_dates d on d.ent_num = e.ent_num
    where e.removed_on is null
      and (p_type is null or e.entry_type = p_type)
      and (p_country is null or e.countries @> array[p_country])
      and (p_program is null or e.programs @> array[p_program])
      and (p_from is null or d.listed_on >= p_from)
      and (p_to is null or d.listed_on <= p_to)
      and (p_secondary is null or (e.secondary_risk is not null) = p_secondary)
      and (
        p_has_links is null
        or exists (select 1 from public.sanctions_links l where l.ent_num = e.ent_num) = p_has_links
      )
      and (
        p.q is null
        or e.name ilike '%' || p.q || '%'
        or e.ent_num in (select ent_num from alias_hits)
      )
      and (
        p.ident is null
        or exists (
          select 1 from public.sanctions_identifiers i
          where i.ent_num = e.ent_num and i.value_norm like p.ident || '%'
        )
      )
      and (
        p.lt is null
        or public.sanctions_norm(e.name) = p.lt
        or exists (
          select 1 from public.sanctions_links l
          where l.ent_num = e.ent_num and l.linked_norm = p.lt
        )
      )
  )
  select
    b.ent_num,
    b.name,
    b.entry_type,
    b.programs,
    b.countries,
    b.localities,
    b.first_seen,
    b.listed_on,
    b.secondary_risk,
    case
      when p.q is not null and b.name not ilike '%' || p.q || '%' then (
        select a.alt_name from public.sanctions_aliases a
        where a.ent_num = b.ent_num and a.alt_name ilike '%' || p.q || '%'
        order by a.source, a.alt_name
        limit 1
      )
    end,
    i.label,
    i.value,
    (select count(*)::integer from public.sanctions_links l where l.ent_num = b.ent_num),
    count(*) over ()
  from base b
  cross join p
  left join lateral (
    select x.label, x.value
    from public.sanctions_identifiers x
    where x.ent_num = b.ent_num
    order by
      case x.kind
        when 'imo' then 0 when 'dob' then 1 when 'established' then 2
        when 'msn' then 3 when 'tail' then 4 when 'passport' then 5
        when 'national_id' then 6 when 'tax_id' then 7 when 'registration' then 8
        else 9
      end,
      x.is_alt,
      x.id
    limit 1
  ) i on true
  order by b.listed_on desc nulls last, b.name asc
  offset greatest(coalesce(p_offset, 0), 0)
  limit least(greatest(coalesce(p_limit, 25), 1), 500);
$$;

-- Coverage measures for the Data integrity card. Explicit numerators and
-- denominators; nulls mean "not measurable yet", never zero.
create or replace function public.sanctions_coverage()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with a as (
    select e.*, d.listed_on
    from public.sanctions_entries e
    left join public.sanctions_listing_dates d on d.ent_num = e.ent_num
    where e.removed_on is null
  )
  select jsonb_build_object(
    'active', (select count(*) from a),
    'with_country', (select count(*) from a where cardinality(countries) > 0),
    'with_listing_date', (select count(*) from a where listed_on is not null),
    'parsed', (select count(*) from a where parser_version is not null),
    'with_identifier', (
      select count(*) from a
      where exists (select 1 from public.sanctions_identifiers i where i.ent_num = a.ent_num)
    ),
    'with_unparsed', (select count(*) from a where coalesce(remarks_unparsed, '') <> ''),
    'with_links', (
      select count(*) from a
      where exists (select 1 from public.sanctions_links l where l.ent_num = a.ent_num)
    ),
    'with_secondary_risk', (select count(*) from a where secondary_risk is not null),
    'with_alias', (
      select count(*) from a
      where exists (select 1 from public.sanctions_aliases s where s.ent_num = a.ent_num)
    ),
    'truncated_remarks', (select count(*) from a where length(remarks) >= 1000),
    'truncated_restored', (select count(*) from a where length(remarks) >= 1000 and remarks_full is not null),
    'earliest_listed', (select min(listed_on) from a),
    'latest_listed', (select max(listed_on) from a),
    'baseline', (select min(first_seen) from public.sanctions_entries)
  );
$$;

-- One record's relations, resolved with the same normaliser the links use:
--   links       each "Linked To" name this record carries, with the active
--               records whose name normalises to it (0, 1 or several:
--               a shared name is not proof of the same party)
--   linked_from active records whose "Linked To" notes name this record
create index if not exists idx_sanctions_name_norm
  on public.sanctions_entries (public.sanctions_norm(name));

create or replace function public.sanctions_relations(p_ent integer)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select ent_num, name from public.sanctions_entries where ent_num = p_ent
  )
  select jsonb_build_object(
    'links', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', l.linked_name,
        'matches', coalesce((
          select jsonb_agg(jsonb_build_object('id', e.ent_num, 'name', e.name, 'type', e.entry_type) order by e.ent_num)
          from public.sanctions_entries e
          where e.removed_on is null and public.sanctions_norm(e.name) = l.linked_norm
        ), '[]'::jsonb)
      ) order by l.linked_name)
      from public.sanctions_links l
      where l.ent_num = p_ent
    ), '[]'::jsonb),
    'linked_from', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.ent_num, 'name', e.name, 'type', e.entry_type) order by e.name)
      from me
      join public.sanctions_links l on l.linked_norm = public.sanctions_norm(me.name)
      join public.sanctions_entries e on e.ent_num = l.ent_num and e.removed_on is null
      where l.ent_num <> me.ent_num
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.sanctions_relations(integer) from public, anon, authenticated;
grant execute on function public.sanctions_relations(integer) to service_role;

revoke all on function public.sanctions_kpis() from public, anon, authenticated;
revoke all on function public.sanctions_activity(integer, text, text, text) from public, anon, authenticated;
revoke all on function public.sanctions_activity_breakdown(text, date, date, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.sanctions_target_activity(jsonb, integer) from public, anon, authenticated;
revoke all on function public.sanctions_search(text, text, text, text, text, date, date, boolean, boolean, text, integer, integer) from public, anon, authenticated;
revoke all on function public.sanctions_coverage() from public, anon, authenticated;

grant execute on function public.sanctions_kpis() to service_role;
grant execute on function public.sanctions_activity(integer, text, text, text) to service_role;
grant execute on function public.sanctions_activity_breakdown(text, date, date, text, text, text, integer) to service_role;
grant execute on function public.sanctions_target_activity(jsonb, integer) to service_role;
grant execute on function public.sanctions_search(text, text, text, text, text, date, date, boolean, boolean, text, integer, integer) to service_role;
grant execute on function public.sanctions_coverage() to service_role;
