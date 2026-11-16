# Meetings: committee vote row policy (NOT RUN)

Written by the Meetings build (branch `redesign/org-meetings`, 2026-11-15). Nothing here has
been run. Paste it into the Supabase SQL editor yourself when you are ready. It was written from
the migrations in the repo (`supabase/migrations`, latest policy text in
`20260727000000_fix_org_rls_recursion.sql`); production may differ, so run the "check first"
query before the change.

## Why this is needed

The app code on the branch no longer sends the running Buy, Pass and Abstain counts, other
members' ballots or voter names to the browser while a meeting is not completed. Members see only
ballots received, quorum and their own vote. That closes the leak on the page.

It does not close it in the database. Two policies on `org_meeting_votes` let any council member
read every ballot, with the voter, using their own session against the database directly:

```
CREATE POLICY "read meeting votes" ON public.org_meeting_votes FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids()));

CREATE POLICY "cast meeting vote" ON public.org_meeting_votes FOR ALL USING (
  voter_member_id IN (SELECT public.auth_member_ids())
  OR org_id IN (SELECT public.auth_manager_org_ids())
) WITH CHECK (...same...);
```

The second one is `FOR ALL`, which includes SELECT, so even after the read policy is narrowed,
every executive and portfolio manager could still read all ballots through it. Both need to change.

## What the change does

1. Read: a member can always read their OWN ballot; they can read other members' ballots only once
   the meeting is completed (`org_meetings.status = 'closed'`). After completion everything is
   readable as today.
2. Write: the `FOR ALL` policy is split into INSERT, UPDATE and DELETE policies with the same rule as
   today (the voter, or a manager of the council). Who may vote is unchanged; the server route still
   allows only executives and portfolio managers, IC meetings only, and now also refuses a vote
   after completion or before quorum is met.
3. Adds `org_meeting_ballot_counts`, which returns only the NUMBER of ballots per meeting, for
   meetings in the caller's own council. The page shows "N of M ballots received"; once members can
   no longer read each other's ballots, the count must come from here. The app already calls this
   function when it exists and falls back to counting readable rows when it does not, so the order
   you deploy and run things in does not matter. Until this runs, the count comes from the readable
   rows (correct today, because today every row is readable).

## Check first (read only)

```sql
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'org_meeting_votes'
order by policyname;

select proname from pg_proc
where proname in ('auth_org_ids', 'auth_member_ids', 'auth_manager_org_ids');
```

You should see `read meeting votes` (SELECT) and `cast meeting vote` (ALL), and all three helper
functions. If a policy has a different name, change the matching `drop policy` line below.

## The change

```sql
begin;

-- 1. Read: own ballot always; everyone's once the meeting is completed.
drop policy if exists "read meeting votes" on public.org_meeting_votes;
create policy "read meeting votes" on public.org_meeting_votes
  for select using (
    voter_member_id in (select public.auth_member_ids())
    or (
      org_id in (select public.auth_org_ids())
      and meeting_id in (
        select m.id from public.org_meetings m
        where m.org_id in (select public.auth_org_ids())
          and m.status = 'closed'
      )
    )
  );

-- 2. Write: the old FOR ALL policy also granted SELECT. Split it.
drop policy if exists "cast meeting vote" on public.org_meeting_votes;
create policy "cast meeting vote" on public.org_meeting_votes
  for insert with check (
    voter_member_id in (select public.auth_member_ids())
    or org_id in (select public.auth_manager_org_ids())
  );
create policy "change meeting vote" on public.org_meeting_votes
  for update using (
    voter_member_id in (select public.auth_member_ids())
    or org_id in (select public.auth_manager_org_ids())
  ) with check (
    voter_member_id in (select public.auth_member_ids())
    or org_id in (select public.auth_manager_org_ids())
  );
create policy "remove meeting vote" on public.org_meeting_votes
  for delete using (
    voter_member_id in (select public.auth_member_ids())
    or org_id in (select public.auth_manager_org_ids())
  );

-- 3. Participation count only: how many ballots each meeting has received.
create or replace function public.org_meeting_ballot_counts(p_meeting_ids uuid[])
returns table (meeting_id uuid, received integer)
language sql
stable
security definer
set search_path = public
as $$
  select v.meeting_id, count(*)::int as received
  from public.org_meeting_votes v
  where v.meeting_id = any (p_meeting_ids)
    and v.org_id in (select public.auth_org_ids())
  group by v.meeting_id;
$$;

revoke all on function public.org_meeting_ballot_counts(uuid[]) from public;
grant execute on function public.org_meeting_ballot_counts(uuid[]) to authenticated;

commit;
```

Note on the upsert: the vote route upserts on `(meeting_id, voter_member_id)`. An upsert needs the
voter to be able to see their own existing row (the new read policy allows it) and the UPDATE policy
(added above), so changing a vote keeps working.

## Verify

```sql
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'org_meeting_votes'
order by policyname;
-- expect: cast meeting vote (INSERT), change meeting vote (UPDATE),
--         read meeting votes (SELECT), remove meeting vote (DELETE)

select proname, prosecdef from pg_proc where proname = 'org_meeting_ballot_counts';
```

## Undo

```sql
begin;
drop policy if exists "read meeting votes" on public.org_meeting_votes;
drop policy if exists "cast meeting vote" on public.org_meeting_votes;
drop policy if exists "change meeting vote" on public.org_meeting_votes;
drop policy if exists "remove meeting vote" on public.org_meeting_votes;
create policy "read meeting votes" on public.org_meeting_votes for select using (
  org_id in (select public.auth_org_ids()));
create policy "cast meeting vote" on public.org_meeting_votes for all using (
  voter_member_id in (select public.auth_member_ids())
  or org_id in (select public.auth_manager_org_ids())
) with check (
  voter_member_id in (select public.auth_member_ids())
  or org_id in (select public.auth_manager_org_ids())
);
drop function if exists public.org_meeting_ballot_counts(uuid[]);
commit;
```

## Not covered

- A meeting's category can be changed after ballots exist (Edit details). Ballots stay attached and
  follow the same rule.
- Reopening a completed meeting is not possible anywhere, so a completed vote never becomes hidden
  again.
