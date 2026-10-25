-- Security assessment P1 (item 8): over-broad live policies.
--
--   waitlist                  any signed-in user could read every applicant's
--                             email; anyone could insert directly (bypassing
--                             the API's validation and rate limit).
--   echo_writer_applications  FOR ALL own row: a user could set their own
--                             application to approved.
--   echo_articles             FOR ALL own row: an author could publish and
--                             feature their own article, skipping review.
--   plaid_accounts/holdings/transactions
--                             FOR ALL own row: a user could forge balances
--                             and holdings the portfolio pages trust.
--
-- Every write to these tables already goes through the service role
-- (src/app/api/waitlist, echo/writer-application, echo/articles,
-- echo/coauthors, plaid/exchange-token, lib/plaid-sync), and the only browser
-- read is the terminal page's SELECT on its own plaid_holdings. So users keep
-- read-own where they had it, and lose every write. The service role bypasses
-- RLS and is unaffected.
--
-- Additive and idempotent. Apply by hand, after 20261025170200.

-- Each block runs only when its table exists, so the file also applies
-- cleanly to a database (or test harness) that lacks one of them.
do $$
declare t text;
begin
  -- waitlist: server-only.
  if to_regclass('public.waitlist') is not null then
    drop policy if exists "Allow authenticated to view" on public.waitlist;
    drop policy if exists "Allow public inserts" on public.waitlist;
    alter table public.waitlist enable row level security;
    revoke all on public.waitlist from anon, authenticated;
  end if;

  -- echo_writer_applications: read own; never write.
  if to_regclass('public.echo_writer_applications') is not null then
    drop policy if exists "Users see own application" on public.echo_writer_applications;
    drop policy if exists "Users read own application" on public.echo_writer_applications;
    create policy "Users read own application" on public.echo_writer_applications
      for select to authenticated using (auth.uid() = user_id);
    revoke insert, update, delete, truncate on public.echo_writer_applications
      from anon, authenticated;
  end if;

  -- echo_articles: published to everyone, own drafts to the author; never write.
  if to_regclass('public.echo_articles') is not null then
    drop policy if exists "Authors manage own articles" on public.echo_articles;
    drop policy if exists "Authors read own articles" on public.echo_articles;
    create policy "Authors read own articles" on public.echo_articles
      for select to authenticated using (auth.uid() = author_id);
    revoke insert, update, delete, truncate on public.echo_articles from anon, authenticated;
  end if;

  -- plaid_*: read own; never write.
  foreach t in array array['plaid_accounts', 'plaid_holdings', 'plaid_transactions'] loop
    continue when to_regclass('public.' || t) is null;
    execute format('drop policy if exists %I on public.%I', 'Users see own ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'Users read own ' || t, t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (auth.uid() = user_id)',
      'Users read own ' || t, t);
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t);
  end loop;
end $$;
