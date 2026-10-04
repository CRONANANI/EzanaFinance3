-- Help-centre feedback (POST /api/help-center/platform-feedback).
--
-- Every message is saved here before the owning team is emailed, so nothing is
-- lost if email delivery fails. Written only by the API through the service
-- role: RLS is on with no policies and anon/authenticated have no grants, so
-- no browser can read or write it.
--
-- Columns mirror the route's insert; the length checks repeat the route's own
-- limits as a backstop (message min is 1 here, not 10, because char_length
-- counts code points and the route counts UTF-16 units).
--
-- Triage: select * from platform_feedback where status = 'new' order by created_at desc;

create table if not exists public.platform_feedback (
  id          uuid primary key default gen_random_uuid(),
  area        text not null check (area in ('platform', 'product', 'support')),
  product     text check (product is null or char_length(product) <= 40),
  message     text not null check (char_length(message) between 1 and 2000),
  email       text check (email is null or char_length(email) <= 320),
  user_id     uuid references auth.users (id) on delete set null,
  page_path   text check (page_path is null or char_length(page_path) <= 200),
  routed_to   text not null,
  status      text not null default 'new' check (status in ('new', 'reviewed', 'closed')),
  created_at  timestamptz not null default now(),
  constraint platform_feedback_product_matches_area
    check ((area = 'product') = (product is not null))
);

create index if not exists platform_feedback_status_created_idx
  on public.platform_feedback (status, created_at desc);

alter table public.platform_feedback enable row level security;
revoke all on public.platform_feedback from anon, authenticated;
