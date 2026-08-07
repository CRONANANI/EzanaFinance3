-- Globe rail payload for Echo article pages ("Geography of the story" sticky
-- card). Nullable jsonb: articles without a rail simply render without it.
alter table public.echo_articles
  add column if not exists globe_rail jsonb;
