-- Phase 1 (CLAUDE_CODE_PERSONALIZATION_PHASES_1-4): structured article taxonomy.
-- Applied MANUALLY in the Supabase SQL Editor (never via deploy), then seeded
-- from the src/lib article modules through curated-seed.js.
alter table public.echo_articles
  add column if not exists article_meta jsonb not null default '{}'::jsonb;
comment on column public.echo_articles.article_meta is
  'Structured taxonomy: sectors/industries/investors/institutions/government/geos/assetClasses/themes/datasets/markets. Seeded from src/lib article modules.';
