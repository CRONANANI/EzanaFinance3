-- Reliability audit P2-15: atomic 13F filing writes, latest message per
-- conversation, race-free assignment submission versions.
-- Additive and idempotent. Apply by hand (any time after 20261025150000).

-- ── 13F holdings: replace one filing in ONE transaction ──────────────────
-- The ingest used delete-then-insert as separate HTTP calls; a failure in
-- between left a filing half-deleted. A natural unique key is not possible
-- here: one filing repeats a CUSIP on several lines (31,123 such groups
-- live), so the guarantee is atomic replacement per accession instead.
create or replace function public.replace_13f_holdings(p_accession text, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
begin
  perform pg_advisory_xact_lock(hashtext('13f:' || p_accession));
  delete from sec_13f_holdings where accession_no = p_accession;
  insert into sec_13f_holdings
    (accession_no, name_of_issuer, cusip, ticker, value_usd, shares, share_type, put_call)
  select p_accession, x.name_of_issuer, x.cusip, x.ticker, coalesce(x.value_usd, 0),
         x.shares, x.share_type, x.put_call
    from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as x(
      name_of_issuer text, cusip text, ticker text, value_usd numeric,
      shares numeric, share_type text, put_call text);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.replace_13f_holdings(text, jsonb) from public, anon, authenticated;
grant execute on function public.replace_13f_holdings(text, jsonb) to service_role;

-- ── Messages: newest message per conversation (DISTINCT ON) ─────────────
-- /api/messages used to load every message of every conversation to find
-- the last one. Uses messages_conversation_id_idx (conversation_id,
-- created_at desc). Called with the service role after the route has
-- resolved the caller's own conversations.
create or replace function public.latest_messages(p_conversation_ids uuid[])
returns table (id uuid, conversation_id uuid, sender_id uuid, content text,
               created_at timestamptz, read_at timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct on (m.conversation_id)
         m.id, m.conversation_id, m.sender_id, m.content, m.created_at, m.read_at
    from messages m
   where m.conversation_id = any(p_conversation_ids)
   order by m.conversation_id, m.created_at desc;
$$;
revoke all on function public.latest_messages(uuid[]) from public, anon, authenticated;
grant execute on function public.latest_messages(uuid[]) to service_role;

-- ── Assignment submissions: one row per (assignment, version) ───────────
-- (No duplicates live on 2026-10-25; the table is small, so a plain index.)
create unique index if not exists org_assignment_submissions_version_uq
  on public.org_assignment_submissions (assignment_id, version);

-- The next version is computed inside the insert, under a per-assignment
-- lock, instead of max+1 in Node. SECURITY INVOKER: the caller's RLS
-- ("assignee or manager writes submissions") still decides who may insert.
create or replace function public.submit_org_assignment(
  p_assignment uuid,
  p_org uuid,
  p_note text default null
)
returns table (id uuid, submitted_by uuid, version integer, note text, created_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('asg:' || p_assignment::text));
  return query
    insert into org_assignment_submissions (assignment_id, org_id, submitted_by, version, note)
    select p_assignment, p_org, auth.uid(),
           coalesce(max(s.version), 0) + 1, left(p_note, 2000)
      from org_assignment_submissions s
     where s.assignment_id = p_assignment
    returning org_assignment_submissions.id, org_assignment_submissions.submitted_by,
              org_assignment_submissions.version, org_assignment_submissions.note,
              org_assignment_submissions.created_at;
end;
$$;
revoke all on function public.submit_org_assignment(uuid, uuid, text) from public, anon;
grant execute on function public.submit_org_assignment(uuid, uuid, text) to authenticated, service_role;
