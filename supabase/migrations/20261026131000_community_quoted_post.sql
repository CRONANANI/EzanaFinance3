-- QA RET-16: quote posts keep the post they quote.
-- POST /api/community/posts validates `quoted_post_id` (exists, top-level,
-- not moderation-hidden, not across a block) and stores it; GET embeds a
-- small `quotedPost` (id, author, excerpt). Deleting the quoted post leaves
-- the quote in place with the reference cleared.
-- Additive and idempotent. Independent of the other pending migrations.

alter table public.community_posts
  add column if not exists quoted_post_id uuid
  references public.community_posts(id) on delete set null;

create index if not exists community_posts_quoted_post_id_idx
  on public.community_posts (quoted_post_id)
  where quoted_post_id is not null;

-- Verification (read-only):
--   select column_name, data_type from information_schema.columns
--    where table_schema = 'public' and table_name = 'community_posts'
--      and column_name = 'quoted_post_id';
