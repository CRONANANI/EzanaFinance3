# Council Community: replies, titles, tickers, edit, delete, remove and pin on council posts (not run)

Written 2026-11-16 for branch `redesign/org-community`. Nothing below has been run. Paste it into the Supabase SQL editor after the branch is merged.

## Why

`public.org_posts` today is text, a type and an optional team tag, with two rules: members of the council read every post (`"Members read posts"`), and a member inserts a post as themselves (`"Members write posts"`). Nothing lets anyone edit, delete, remove or pin a post, and there are no replies, titles or tickers. The council Community page ships with those controls reading "not available yet"; this change turns them on.

What it adds:

- columns `parent_id` (a reply's post, one level only), `title` (up to 140 characters), `ticker`, `pinned_at`, `pinned_by`, `edited_at`;
- authors edit and delete their own posts and replies;
- executives (the faculty advisor is an executive) remove any post in their council and pin up to three top-level posts;
- announcements only from executives and portfolio managers (today only the page checks this);
- a deleted or removed post takes its replies (foreign key cascade) and its reactions (trigger) with it.

## How the page detects it

The loader asks for the new columns. Until they exist Postgres answers 42703 and the page reads the original columns with every extra off. The write routes also answer "not available yet" when the database lets a write through but changes no row (no rule allows it). So the columns and the policies must arrive together: apply the whole block below in one go.

## Will legitimate writes still work?

Yes. The routes write as the signed-in member with their own client: `insert({ org_id, author_id: user.id, content, post_type, team_id, title?, ticker?, parent_id?, pinned_at?, pinned_by? })`, `update({ content, title, edited_at }).eq('author_id', user.id)` for edits, `update({ pinned_at, pinned_by })` for pins, and `delete()` for delete and remove. Each matches exactly one policy below. The guard trigger stops an executive's update from touching anything but the pin, and stops an author from pinning their own post unless they are an executive. The pin limit error (P0001) is reported by the route as "Up to 3 posts can be pinned".

## SQL

```sql
-- 1. Columns.
alter table public.org_posts
  add column if not exists parent_id uuid references public.org_posts(id) on delete cascade,
  add column if not exists title text,
  add column if not exists ticker text,
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by uuid references auth.users(id),
  add column if not exists edited_at timestamptz;

alter table public.org_posts drop constraint if exists org_posts_title_len;
alter table public.org_posts add constraint org_posts_title_len
  check (title is null or char_length(title) between 1 and 140);
alter table public.org_posts drop constraint if exists org_posts_ticker_shape;
alter table public.org_posts add constraint org_posts_ticker_shape
  check (ticker is null or ticker ~ '^[A-Z][A-Z0-9.-]{0,9}$');
alter table public.org_posts drop constraint if exists org_posts_reply_not_pinned;
alter table public.org_posts add constraint org_posts_reply_not_pinned
  check (parent_id is null or pinned_at is null);

create index if not exists idx_org_posts_parent on public.org_posts (parent_id);
create index if not exists idx_org_posts_org_created on public.org_posts (org_id, created_at desc);
create index if not exists idx_org_posts_pinned on public.org_posts (org_id) where pinned_at is not null;

-- 2. Guard: replies stay in the council and one level deep; at most three pins
--    per council; on update only the pin may change unless you are the author,
--    and only executives pin; identity columns never change.
create or replace function public.org_posts_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_exec boolean;
  pins int;
begin
  is_exec := new.org_id in (select public.auth_executive_org_ids());

  if new.parent_id is not null and (tg_op = 'INSERT' or new.parent_id is distinct from old.parent_id) then
    if not exists (
      select 1 from public.org_posts p
       where p.id = new.parent_id and p.org_id = new.org_id and p.parent_id is null
    ) then
      raise exception 'Replies go on a post in the same council' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if new.org_id is distinct from old.org_id
       or new.author_id is distinct from old.author_id
       or new.parent_id is distinct from old.parent_id
       or new.created_at is distinct from old.created_at then
      raise exception 'These fields cannot change' using errcode = '42501';
    end if;
    if old.author_id is distinct from auth.uid()
       and (new.content is distinct from old.content
            or new.title is distinct from old.title
            or new.ticker is distinct from old.ticker
            or new.post_type is distinct from old.post_type
            or new.team_id is distinct from old.team_id
            or new.edited_at is distinct from old.edited_at) then
      raise exception 'Only the author can edit a post' using errcode = '42501';
    end if;
  end if;

  if (tg_op = 'INSERT' and new.pinned_at is not null)
     or (tg_op = 'UPDATE' and (new.pinned_at is distinct from old.pinned_at
                               or new.pinned_by is distinct from old.pinned_by)) then
    if not is_exec then
      raise exception 'Only executives pin posts' using errcode = '42501';
    end if;
    if new.pinned_at is not null and (tg_op = 'INSERT' or old.pinned_at is null) then
      select count(*) into pins from public.org_posts
       where org_id = new.org_id and pinned_at is not null and parent_id is null
         and id <> new.id;
      if pins >= 3 then
        raise exception 'Up to 3 posts can be pinned';  -- P0001
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists org_posts_guard on public.org_posts;
create trigger org_posts_guard
  before insert or update on public.org_posts
  for each row execute function public.org_posts_guard();

-- 3. Reactions on a deleted post (or on its cascaded replies) go with it.
create or replace function public.org_posts_drop_reactions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.org_reactions where target_type = 'post' and target_id = old.id;
  delete from public.org_mentions where target_type = 'post' and target_id = old.id;
  return old;
end;
$$;

drop trigger if exists org_posts_drop_reactions on public.org_posts;
create trigger org_posts_drop_reactions
  after delete on public.org_posts
  for each row execute function public.org_posts_drop_reactions();

revoke all on function public.org_posts_guard() from public;
revoke all on function public.org_posts_drop_reactions() from public;

-- 4. Policies. "Members read posts" (SELECT, auth_org_ids) stays as it is.
drop policy if exists "Members write posts" on public.org_posts;
create policy "Members write posts" on public.org_posts
  for insert with check (
    org_id in (select public.auth_org_ids())
    and author_id = auth.uid()
    and (post_type <> 'announcement' or org_id in (select public.auth_manager_org_ids()))
    and (pinned_at is null or org_id in (select public.auth_executive_org_ids()))
  );

drop policy if exists "Authors edit own posts" on public.org_posts;
create policy "Authors edit own posts" on public.org_posts
  for update
  using (author_id = auth.uid() and org_id in (select public.auth_org_ids()))
  with check (
    author_id = auth.uid()
    and org_id in (select public.auth_org_ids())
    and (post_type <> 'announcement' or org_id in (select public.auth_manager_org_ids()))
  );

drop policy if exists "Executives pin posts" on public.org_posts;
create policy "Executives pin posts" on public.org_posts
  for update
  using (org_id in (select public.auth_executive_org_ids()))
  with check (org_id in (select public.auth_executive_org_ids()));

drop policy if exists "Authors delete own posts" on public.org_posts;
create policy "Authors delete own posts" on public.org_posts
  for delete
  using (author_id = auth.uid() and org_id in (select public.auth_org_ids()));

drop policy if exists "Executives remove posts" on public.org_posts;
create policy "Executives remove posts" on public.org_posts
  for delete
  using (org_id in (select public.auth_executive_org_ids()));
```

## Verify

```sql
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'org_posts' order by ordinal_position;
-- expect: ... parent_id, title, ticker, pinned_at, pinned_by, edited_at

select policyname, cmd from pg_policies where tablename = 'org_posts' order by 1;
-- expect: Authors delete own posts (DELETE), Authors edit own posts (UPDATE),
--         Executives pin posts (UPDATE), Executives remove posts (DELETE),
--         Members read posts (SELECT), Members write posts (INSERT)

select tgname from pg_trigger where tgrelid = 'public.org_posts'::regclass and not tgisinternal;
-- expect: org_posts_drop_reactions, org_posts_guard
```

Then on /community: as an analyst, post with a title and reply to a post (works), try Announce through the API (403); as an executive, pin three posts and try a fourth (refused, "Up to 3 posts can be pinned"), remove another member's post (gone with its replies and reactions); as the author, edit and delete your own post.

## Before applying

- Check the live policy names on `org_posts` first (the brief says two policies exist in production; the repo names them "Members read posts" and "Members write posts" in `20260727000000_fix_org_rls_recursion.sql`). If the live insert policy has a different name, drop that one instead, or two insert policies will be OR-ed and the announcement rule will not hold.
- Existing rows are unaffected: every new column is nullable, and no existing post is pinned or a reply.
- The orchestrator's migration copy should wrap this in a `to_regclass('public.org_posts') is not null` guard so `test:rls` passes on a fresh database.
