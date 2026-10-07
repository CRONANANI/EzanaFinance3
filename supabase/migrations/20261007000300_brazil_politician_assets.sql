-- 20261007000300_brazil_politician_assets.sql
-- Brazilian officeholders' declared assets (declaração de bens), from the
-- Superior Electoral Court's (TSE) open data: consulta_cand_<year>.zip for the
-- candidate, bem_candidato_<year>.zip for each declared asset. The same CDN
-- files the electionsBR R package reads. Loaded by
-- scripts/ingest-tse-assets.mjs.
--
-- What is stored: elected candidates for President, Governor, Senator and
-- federal, state and district deputy, plus the same people's filings from an
-- earlier election (so the tracker can show the change). No CPF and no birth
-- date: person_key is a SHA-256 of the normalised name and birth date, used
-- only to link one person's filings across elections. Public read: these are
-- public records published by the TSE.

create table if not exists public.br_candidates (
  ano_eleicao   smallint    not null,
  sq_candidato  text        not null,
  cd_eleicao    text,
  turno         smallint,
  person_key    text        not null,
  nm_candidato  text        not null,
  nm_urna       text,
  nr_candidato  text,
  cargo         text        not null,   -- DS_CARGO as filed, upper case
  sg_uf         text        not null,   -- 'BR' for President
  nm_ue         text,
  sg_partido    text,
  nm_partido    text,
  situacao      text,                   -- DS_SIT_TOT_TURNO as filed
  elected       boolean     not null default false,
  total_assets  numeric     not null default 0,
  asset_count   integer     not null default 0,
  synced_at     timestamptz not null default now(),
  primary key (ano_eleicao, sq_candidato)
);
create index if not exists br_candidates_person_idx on public.br_candidates (person_key, ano_eleicao);
create index if not exists br_candidates_year_elected_idx
  on public.br_candidates (ano_eleicao, elected, total_assets desc);

create table if not exists public.br_candidate_assets (
  ano_eleicao     smallint not null,
  sq_candidato    text     not null,
  nr_ordem        integer  not null,
  cd_tipo         text,
  ds_tipo         text,
  ds_bem          text,
  valor           numeric,
  dt_atualizacao  date,
  primary key (ano_eleicao, sq_candidato, nr_ordem),
  foreign key (ano_eleicao, sq_candidato)
    references public.br_candidates (ano_eleicao, sq_candidato) on delete cascade
);

alter table public.br_candidates       enable row level security;
alter table public.br_candidate_assets enable row level security;
drop policy if exists "public read br_candidates" on public.br_candidates;
create policy "public read br_candidates" on public.br_candidates for select using (true);
drop policy if exists "public read br_candidate_assets" on public.br_candidate_assets;
create policy "public read br_candidate_assets" on public.br_candidate_assets for select using (true);
grant select on public.br_candidates, public.br_candidate_assets to anon, authenticated;

-- Each filing with the same person's previous filing, for the change.
create or replace view public.br_candidates_v
with (security_invoker = true) as
select c.*,
       p.ano_eleicao   as prev_ano,
       p.total_assets  as prev_total_assets,
       p.cargo         as prev_cargo,
       case when p.total_assets > 0
            then round((c.total_assets / p.total_assets - 1) * 100, 1)
       end             as change_pct
from public.br_candidates c
left join lateral (
  select q.ano_eleicao, q.total_assets, q.cargo
  from public.br_candidates q
  where q.person_key = c.person_key and q.ano_eleicao < c.ano_eleicao
  order by q.ano_eleicao desc
  limit 1
) p on true;
grant select on public.br_candidates_v to anon, authenticated;

-- Totals from the itemised assets, after a load.
create or replace function public.br_refresh_totals(p_year integer)
returns integer
language sql
security definer
set search_path = public
as $$
  with t as (
    select sq_candidato, coalesce(sum(valor), 0) as total, count(*)::int as n
    from br_candidate_assets
    where ano_eleicao = p_year
    group by sq_candidato
  ),
  u as (
    update br_candidates c
       set total_assets = coalesce(t.total, 0),
           asset_count  = coalesce(t.n, 0)
      from br_candidates c2
      left join t on t.sq_candidato = c2.sq_candidato
     where c.ano_eleicao = p_year
       and c2.ano_eleicao = c.ano_eleicao
       and c2.sq_candidato = c.sq_candidato
    returning 1
  )
  select count(*)::int from u;
$$;
revoke all on function public.br_refresh_totals(integer) from public, anon, authenticated;
grant execute on function public.br_refresh_totals(integer) to service_role;
