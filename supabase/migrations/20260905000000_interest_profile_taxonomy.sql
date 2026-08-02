-- Phase 2 (personalization): structured taxonomy interest maps + kill switch.
-- Applied MANUALLY in the Supabase SQL Editor (never via deploy). These maps are
-- populated by buildUserProfile from echo_articles.article_meta (Phase 1) via
-- article_open/article_read joins and explicit article_meta_click breadcrumbs.
alter table public.user_interest_profiles
  add column if not exists industry_scores jsonb not null default '{}'::jsonb,
  add column if not exists entity_scores jsonb not null default '{}'::jsonb,
  add column if not exists geo_scores jsonb not null default '{}'::jsonb,
  add column if not exists theme_scores jsonb not null default '{}'::jsonb,
  add column if not exists asset_class_scores jsonb not null default '{}'::jsonb,
  -- User-facing kill switch. When false, the matching engine ignores every
  -- profile-derived term and falls back to severity + explicit prefs only.
  add column if not exists personalization_enabled boolean not null default true;
