-- Sonar analysts, phase 3 (Nov 2026): the organization research methodology.
--
-- One row per org: how the fund wants Sonar's analysts to research a
-- company (preferred valuation methods, the report sections the director
-- must fill, the default horizon, whether scenarios and a red team are
-- required, review rules, assumption overrides and the output format).
-- Members read their own org's row (RLS, auth_org_ids()); executives write
-- it through PUT /api/org/research-methodology with the service role.
--
-- This table was created in production by hand before this file existed.
-- The file mirrors production exactly (columns, defaults, checks, foreign
-- keys, RLS, the read policy and the revoked write grants) and is guarded by
-- to_regclass, so it is a no-op where the table already exists and builds an
-- identical table everywhere else.

do $$
begin
  if to_regclass('public.org_research_methodology') is null then
    create table public.org_research_methodology (
      org_id uuid primary key references public.organizations(id) on delete cascade,
      valuation_methods text[] not null default array['dcf', 'comparables']::text[],
      required_sections text[] not null default array['financials', 'risks', 'industry']::text[],
      horizon_months integer not null default 36
        check (horizon_months >= 3 and horizon_months <= 120),
      scenarios_required boolean not null default true,
      red_team_required boolean not null default false,
      review_rules jsonb not null default '{}'::jsonb,
      assumption_overrides jsonb not null default '{}'::jsonb,
      output_format text not null default 'ic_memo'
        check (output_format = any (array['ic_memo', 'research_note', 'one_pager']::text[])),
      notes text,
      updated_by uuid references auth.users(id) on delete set null,
      updated_at timestamptz not null default now()
    );

    alter table public.org_research_methodology enable row level security;

    create policy org_research_methodology_read
      on public.org_research_methodology
      for select
      to authenticated
      using (org_id in (select public.auth_org_ids()));

    -- Writes are service-role only (the PUT route checks the executive role).
    revoke insert, update, delete on public.org_research_methodology from anon, authenticated;
  end if;
end
$$;
