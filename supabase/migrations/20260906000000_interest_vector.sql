-- Phase 3 (personalization): per-user interest vector in the Echo 384-dim
-- (gte-small) space + a per-user semantic match RPC. Applied MANUALLY in the
-- Supabase SQL Editor. Vector-ranked surfaces are gated behind PERSONALIZATION_V2
-- and stay inert until (a) the flag is on, (b) echo_articles.embedding is
-- populated (index-echo-articles cron), and (c) the user has an interest_vector
-- (compute-interest-vectors cron).
alter table public.user_interest_profiles
  add column if not exists interest_vector vector(384),
  add column if not exists interest_vector_computed_at timestamptz;

-- Rank published articles by cosine similarity to a user's interest_vector.
-- Mirrors match_echo_articles but sources the query vector from the profile row
-- and supports slug exclusion (current article + already-shown related).
create or replace function public.match_echo_articles_for_user(
  p_user_id uuid,
  match_threshold double precision default 0.0,
  match_count integer default 12,
  exclude_slugs text[] default '{}'
)
returns table(
  id uuid,
  article_slug text,
  article_title text,
  article_excerpt text,
  article_category text,
  published_at timestamptz,
  similarity double precision
)
language sql
stable
as $function$
  select
    a.id, a.article_slug, a.article_title, a.article_excerpt,
    a.article_category, a.published_at,
    1 - (a.embedding <=> p.interest_vector) as similarity
  from public.echo_articles a
  cross join (
    select interest_vector
    from public.user_interest_profiles
    where user_id = p_user_id
  ) p
  where a.embedding is not null
    and p.interest_vector is not null
    and a.article_status = 'published'
    and not (a.article_slug = any(exclude_slugs))
    and 1 - (a.embedding <=> p.interest_vector) > match_threshold
  order by a.embedding <=> p.interest_vector
  limit match_count;
$function$;
