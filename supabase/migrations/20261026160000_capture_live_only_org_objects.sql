-- QA ORG-14: org objects the code uses that existed only in the live
-- database. Captured read-only from the live catalog on 2026-10-25
-- (information_schema.columns, pg_constraint, pg_indexes,
-- pg_get_functiondef, storage.buckets and the storage.objects policies), so
-- the database can be rebuilt from the repo.
--
-- On the live database every statement is a no-op: columns and indexes use
-- IF NOT EXISTS, the function body is byte-for-byte the live definition, the
-- bucket insert is ON CONFLICT DO NOTHING, the foreign key and the policies
-- are created only when absent (existing ones are never dropped or touched).
--
-- Code that relies on these:
--   org_invites.can_invite / accepted_by / accepted_at  src/app/api/org/invites
--   org_members.can_invite                               invite permission
--   org_for_email_domain(text)                           OrgSignInCard.js
--   organizations.email_domains (+ GIN index)            org_for_email_domain
--   bucket org-uploads + 4 policies                      org attachments routes
-- Apply by hand, any time after 20260626000000 (org_invites) and
-- 20260330120000 (organizations, org_members).

-- organizations.email_domains (used by org_for_email_domain) ---------------
alter table public.organizations
  add column if not exists email_domains text[] default '{}'::text[];
create index if not exists idx_org_email_domains
  on public.organizations using gin (email_domains);

-- org_invites ---------------------------------------------------------------
alter table public.org_invites add column if not exists can_invite boolean not null default false;
alter table public.org_invites add column if not exists accepted_by uuid;
alter table public.org_invites add column if not exists accepted_at timestamp with time zone;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.org_invites'::regclass and conname = 'org_invites_accepted_by_fkey'
  ) then
    alter table public.org_invites
      add constraint org_invites_accepted_by_fkey
      foreign key (accepted_by) references auth.users(id) on delete set null;
  end if;
end $$;

-- org_members ---------------------------------------------------------------
alter table public.org_members add column if not exists can_invite boolean not null default false;

-- org_for_email_domain(text): live definition -------------------------------
create or replace function public.org_for_email_domain(p_domain text)
 returns table(id uuid, name text)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select o.id, o.name
  from public.organizations o
  where o.is_active
    and lower(coalesce(p_domain, '')) <> ''
    and o.email_domains @> array[lower(p_domain)]
  limit 1;
$function$;

-- Live grants: execute for anon and authenticated (the org sign-in card calls
-- it before the user has a session). Returns only an active org's id and
-- name for an exact domain match.
-- (No PUBLIC grant live: revoke it so a fresh database matches.)
revoke all on function public.org_for_email_domain(text) from public;
grant execute on function public.org_for_email_domain(text) to anon, authenticated, service_role;

-- bucket org-uploads (private) ----------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('org-uploads', 'org-uploads', false, null, null)
on conflict (id) do nothing;

-- storage.objects policies for org-uploads: active members of the org whose
-- id is the first path segment (<org_id>/...). Created only when absent.
do $$
declare
  member_folder constant text :=
    '(bucket_id = ''org-uploads''::text) AND ((storage.foldername(name))[1] IN ( SELECT (org_members.org_id)::text AS org_id
   FROM public.org_members
  WHERE ((org_members.user_id = auth.uid()) AND (org_members.is_active = true))))';
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                 and policyname = 'org members read org-uploads') then
    execute format('create policy %I on storage.objects for select using (%s)',
                   'org members read org-uploads', member_folder);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                 and policyname = 'org members insert org-uploads') then
    execute format('create policy %I on storage.objects for insert with check (%s)',
                   'org members insert org-uploads', member_folder);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                 and policyname = 'org members update org-uploads') then
    execute format('create policy %I on storage.objects for update using (%s)',
                   'org members update org-uploads', member_folder);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                 and policyname = 'org members delete org-uploads') then
    execute format('create policy %I on storage.objects for delete using (%s)',
                   'org members delete org-uploads', member_folder);
  end if;
end $$;
