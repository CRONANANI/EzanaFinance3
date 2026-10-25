-- Reliability audit P2-15: tables the code writes that existed only in the
-- live database. Generated read-only from the live catalog on 2026-10-25
-- (columns, defaults, constraints, indexes, RLS and policies as they are
-- live), so the database can be rebuilt from the repo and every onConflict
-- key is on record. On the live database every statement is a no-op.
-- Ordered for foreign keys. Two dependencies are still live-only and not in
-- any migration: public.badges (partner_badges FK) and the vector
-- extension (echo_articles.embedding). Apply by hand.
--
-- Policies are reproduced exactly as live. Some are too broad and are
-- listed in the security follow-up (waitlist readable by any signed-in
-- user; echo_articles / echo_writer_applications / plaid_* writable by
-- their owner); fixing them is a separate, reviewed change.

create extension if not exists pg_trgm;

create table if not exists public.alpaca_accounts (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  alpaca_account_id text not null,
  account_status text default 'SUBMITTED'::text,
  first_name text,
  last_name text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint alpaca_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint alpaca_accounts_pkey PRIMARY KEY (id),
  constraint alpaca_accounts_alpaca_account_id_key UNIQUE (alpaca_account_id),
  constraint alpaca_accounts_user_id_key UNIQUE (user_id)
);
create index if not exists idx_alpaca_accounts_alpaca ON public.alpaca_accounts USING btree (alpaca_account_id);
create index if not exists idx_alpaca_accounts_user ON public.alpaca_accounts USING btree (user_id);
alter table public.alpaca_accounts enable row level security;
-- (policy: see 20261025160000_security_p0_privileged_writes.sql)

create table if not exists public.user_boards (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  name text default 'My Investment Board'::text not null,
  persona_ids uuid[] default '{}'::uuid[] not null,
  is_default boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint user_boards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint user_boards_pkey PRIMARY KEY (id)
);
create index if not exists idx_user_boards_user ON public.user_boards USING btree (user_id);
alter table public.user_boards enable row level security;
drop policy if exists "Users manage own boards" on public.user_boards;
create policy "Users manage own boards" on public.user_boards as PERMISSIVE for ALL to public using ((auth.uid() = user_id));

create table if not exists public.personas (
  id uuid default gen_random_uuid() not null,
  slug text not null,
  name text not null,
  type text not null,
  avatar_url text,
  short_bio text,
  investment_philosophy text not null,
  system_prompt text not null,
  sector_biases jsonb default '[]'::jsonb,
  risk_profile text,
  time_horizon text,
  key_metrics jsonb default '[]'::jsonb,
  notable_holdings jsonb default '[]'::jsonb,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  constraint personas_risk_profile_check CHECK ((risk_profile = ANY (ARRAY['conservative'::text, 'moderate'::text, 'aggressive'::text, 'contrarian'::text]))),
  constraint personas_time_horizon_check CHECK ((time_horizon = ANY (ARRAY['short'::text, 'medium'::text, 'long'::text, 'multi-decade'::text]))),
  constraint personas_type_check CHECK ((type = ANY (ARRAY['legendary_investor'::text, 'politician'::text, 'quant'::text, 'analyst'::text]))),
  constraint personas_pkey PRIMARY KEY (id),
  constraint personas_slug_key UNIQUE (slug)
);
create index if not exists idx_personas_type ON public.personas USING btree (type);
create index if not exists idx_personas_slug ON public.personas USING btree (slug);
alter table public.personas enable row level security;

create table if not exists public.analysis_sessions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  board_id uuid,
  query_type text not null,
  query_input jsonb not null,
  market_data_snapshot jsonb,
  synthesis text,
  consensus_rating text,
  confidence_score numeric(3,2),
  created_at timestamp with time zone default now(),
  constraint analysis_sessions_query_type_check CHECK ((query_type = ANY (ARRAY['stock_analysis'::text, 'portfolio_review'::text, 'market_outlook'::text, 'comparison'::text, 'sector_analysis'::text]))),
  constraint analysis_sessions_board_id_fkey FOREIGN KEY (board_id) REFERENCES user_boards(id) ON DELETE SET NULL,
  constraint analysis_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint analysis_sessions_pkey PRIMARY KEY (id)
);
create index if not exists idx_analysis_sessions_user ON public.analysis_sessions USING btree (user_id);
alter table public.analysis_sessions enable row level security;
drop policy if exists "Users view own sessions" on public.analysis_sessions;
create policy "Users view own sessions" on public.analysis_sessions as PERMISSIVE for ALL to public using ((auth.uid() = user_id));

create table if not exists public.persona_responses (
  id uuid default gen_random_uuid() not null,
  session_id uuid not null,
  persona_id uuid not null,
  rating text,
  confidence numeric(3,2),
  analysis text not null,
  key_points jsonb default '[]'::jsonb,
  risks jsonb default '[]'::jsonb,
  catalysts jsonb default '[]'::jsonb,
  position_suggestion jsonb,
  reasoning_tokens integer,
  created_at timestamp with time zone default now(),
  constraint persona_responses_rating_check CHECK ((rating = ANY (ARRAY['strong_buy'::text, 'buy'::text, 'hold'::text, 'sell'::text, 'strong_sell'::text]))),
  constraint persona_responses_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
  constraint persona_responses_session_id_fkey FOREIGN KEY (session_id) REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  constraint persona_responses_pkey PRIMARY KEY (id)
);
create index if not exists idx_persona_responses_session ON public.persona_responses USING btree (session_id);
alter table public.persona_responses enable row level security;
drop policy if exists "Users view own responses" on public.persona_responses;
create policy "Users view own responses" on public.persona_responses as PERMISSIVE for SELECT to public using ((session_id IN ( SELECT analysis_sessions.id
   FROM analysis_sessions
  WHERE (analysis_sessions.user_id = auth.uid()))));

create table if not exists public.badge_definitions (
  id text not null,
  badge_name text not null,
  badge_description text not null,
  badge_category text not null,
  badge_icon text not null,
  tier integer default 1 not null,
  tier_name text default 'Bronze'::text not null,
  tier_color text default '#cd7f32'::text not null,
  requirement_type text not null,
  requirement_value integer default 0 not null,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  constraint badge_definitions_pkey PRIMARY KEY (id)
);
alter table public.badge_definitions enable row level security;
drop policy if exists badge_definitions_public_read on public.badge_definitions;
create policy badge_definitions_public_read on public.badge_definitions as PERMISSIVE for SELECT to public using (true);

create table if not exists public.partner_badges (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  badge_id text not null,
  earned_at timestamp with time zone default now(),
  constraint fk_partner_badges_badge FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
  constraint fk_partner_badges_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint partner_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
  constraint partner_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint partner_badges_pkey PRIMARY KEY (id),
  constraint partner_badges_user_id_badge_id_key UNIQUE (user_id, badge_id)
);
alter table public.partner_badges enable row level security;
drop policy if exists "Users can read own badges" on public.partner_badges;
create policy "Users can read own badges" on public.partner_badges as PERMISSIVE for SELECT to public using ((auth.uid() = user_id));

create table if not exists public.crowd_forecasts (
  forecast_id text not null,
  platform text not null,
  question text not null,
  probability numeric,
  forecasters integer,
  volume numeric,
  volume_unit text default 'mana'::text not null,
  token text,
  close_date timestamp with time zone,
  status text default 'open'::text not null,
  link text,
  category text,
  indexed_at timestamp with time zone default now() not null,
  constraint crowd_forecasts_pkey PRIMARY KEY (forecast_id)
);
create index if not exists idx_crowd_open ON public.crowd_forecasts USING btree (status, forecasters DESC NULLS LAST);
alter table public.crowd_forecasts enable row level security;

create table if not exists public.echo_articles (
  id uuid default gen_random_uuid() not null,
  author_id uuid,
  author_name text not null,
  author_avatar text,
  article_title text not null,
  article_slug text not null,
  article_excerpt text,
  article_body text not null,
  article_category text default 'Markets'::text,
  cover_image_url text,
  article_status text default 'draft'::text,
  read_time_minutes integer default 5,
  view_count integer default 0,
  like_count integer default 0,
  submitted_at timestamp with time zone,
  published_at timestamp with time zone,
  rejected_reason text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  content_blocks jsonb,
  content_paragraphs jsonb,
  hero_image jsonb,
  tags jsonb,
  tickers jsonb,
  is_featured boolean default false not null,
  series_id uuid,
  series_order integer,
  tsv tsvector generated always as (to_tsvector('english'::regconfig, ((((COALESCE(article_title, ''::text) || ' '::text) || COALESCE(article_excerpt, ''::text)) || ' '::text) || COALESCE(article_body, ''::text)))) stored,
  embedding vector(384),
  article_meta jsonb default '{}'::jsonb not null,
  globe_rail jsonb,
  constraint echo_articles_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint echo_articles_series_id_fkey FOREIGN KEY (series_id) REFERENCES echo_series(id) ON DELETE SET NULL,
  constraint echo_articles_pkey PRIMARY KEY (id),
  constraint echo_articles_article_slug_key UNIQUE (article_slug)
);
create index if not exists idx_echo_articles_published ON public.echo_articles USING btree (published_at DESC);
create index if not exists echo_articles_tsv_idx ON public.echo_articles USING gin (tsv);
create index if not exists idx_echo_articles_slug ON public.echo_articles USING btree (article_slug);
create index if not exists echo_articles_embedding_idx ON public.echo_articles USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');
create index if not exists idx_echo_articles_category ON public.echo_articles USING btree (article_category);
create index if not exists idx_echo_articles_status ON public.echo_articles USING btree (article_status);
create index if not exists idx_echo_articles_author ON public.echo_articles USING btree (author_id);
create index if not exists idx_echo_articles_series ON public.echo_articles USING btree (series_id);
alter table public.echo_articles enable row level security;
drop policy if exists "Anyone can read published articles" on public.echo_articles;
create policy "Anyone can read published articles" on public.echo_articles as PERMISSIVE for SELECT to public using ((article_status = 'published'::text));
drop policy if exists "Authors manage own articles" on public.echo_articles;
create policy "Authors manage own articles" on public.echo_articles as PERMISSIVE for ALL to public using ((auth.uid() = author_id));

create table if not exists public.echo_subscriptions (
  id uuid default gen_random_uuid() not null,
  subscriber_id uuid not null,
  author_id uuid not null,
  subscribed_at timestamp with time zone default now(),
  constraint echo_subscriptions_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint echo_subscriptions_subscriber_id_fkey FOREIGN KEY (subscriber_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint echo_subscriptions_pkey PRIMARY KEY (id),
  constraint echo_subscriptions_subscriber_id_author_id_key UNIQUE (subscriber_id, author_id)
);
create index if not exists idx_echo_subs_author ON public.echo_subscriptions USING btree (author_id);
create index if not exists idx_echo_subs_subscriber ON public.echo_subscriptions USING btree (subscriber_id);
alter table public.echo_subscriptions enable row level security;
drop policy if exists "Authors see their subscriber count" on public.echo_subscriptions;
create policy "Authors see their subscriber count" on public.echo_subscriptions as PERMISSIVE for SELECT to public using ((auth.uid() = author_id));
drop policy if exists "Users manage own subscriptions" on public.echo_subscriptions;
create policy "Users manage own subscriptions" on public.echo_subscriptions as PERMISSIVE for ALL to public using ((auth.uid() = subscriber_id));

create table if not exists public.echo_writer_applications (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  applicant_name text not null,
  applicant_email text not null,
  writing_experience text not null,
  sample_urls text,
  specialization text,
  reason_to_write text,
  portfolio_url text,
  application_status text default 'pending'::text,
  reviewer_notes text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  submitted_at timestamp with time zone default now(),
  constraint echo_writer_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint echo_writer_applications_pkey PRIMARY KEY (id),
  constraint echo_writer_applications_user_id_key UNIQUE (user_id)
);
create index if not exists idx_writer_apps_status ON public.echo_writer_applications USING btree (application_status);
create index if not exists idx_writer_apps_user ON public.echo_writer_applications USING btree (user_id);
alter table public.echo_writer_applications enable row level security;
drop policy if exists "Users see own application" on public.echo_writer_applications;
create policy "Users see own application" on public.echo_writer_applications as PERMISSIVE for ALL to public using ((auth.uid() = user_id));

create table if not exists public.lighthouse_observations (
  source text not null,
  indicator text not null,
  ref_area text not null,
  ref_area_name text,
  period date not null,
  frequency text not null,
  value numeric,
  unit text,
  synced_at timestamp with time zone default now() not null,
  constraint lighthouse_observations_pkey PRIMARY KEY (source, indicator, ref_area, period)
);
create index if not exists idx_lho_source_ind_period ON public.lighthouse_observations USING btree (source, indicator, period DESC);
create index if not exists idx_lho_area ON public.lighthouse_observations USING btree (ref_area);
alter table public.lighthouse_observations enable row level security;

create table if not exists public.plaid_items (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  item_id text not null,
  access_token text not null,
  institution_id text,
  institution_name text,
  institution_logo text,
  status text default 'active'::text,
  error_code text,
  consent_expiration timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint plaid_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint plaid_items_pkey PRIMARY KEY (id),
  constraint plaid_items_item_id_key UNIQUE (item_id)
);
create index if not exists idx_plaid_items_user ON public.plaid_items USING btree (user_id);
alter table public.plaid_items enable row level security;
-- (policy and column grants: see 20261025160000_security_p0_privileged_writes.sql)

create table if not exists public.plaid_accounts (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  plaid_item_id uuid not null,
  account_id text not null,
  account_name text not null,
  official_name text,
  account_type text not null,
  account_subtype text,
  account_mask text,
  balance_current numeric,
  balance_available numeric,
  balance_limit numeric,
  currency text default 'USD'::text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint plaid_accounts_plaid_item_id_fkey FOREIGN KEY (plaid_item_id) REFERENCES plaid_items(id) ON DELETE CASCADE,
  constraint plaid_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint plaid_accounts_pkey PRIMARY KEY (id),
  constraint plaid_accounts_account_id_key UNIQUE (account_id)
);
create index if not exists idx_plaid_accounts_user ON public.plaid_accounts USING btree (user_id);
create index if not exists idx_plaid_accounts_item ON public.plaid_accounts USING btree (plaid_item_id);
alter table public.plaid_accounts enable row level security;
drop policy if exists "Users see own plaid_accounts" on public.plaid_accounts;
create policy "Users see own plaid_accounts" on public.plaid_accounts as PERMISSIVE for ALL to public using ((auth.uid() = user_id));

create table if not exists public.plaid_holdings (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  account_id text not null,
  security_id text not null,
  ticker_symbol text,
  security_name text,
  security_type text,
  quantity numeric default 0 not null,
  price_per_share numeric,
  total_value numeric,
  cost_basis numeric,
  currency text default 'USD'::text,
  synced_at timestamp with time zone default now(),
  constraint plaid_holdings_account_id_fkey FOREIGN KEY (account_id) REFERENCES plaid_accounts(account_id) ON DELETE CASCADE,
  constraint plaid_holdings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint plaid_holdings_pkey PRIMARY KEY (id),
  constraint plaid_holdings_user_ticker_unique UNIQUE (user_id, ticker_symbol)
);
create index if not exists idx_plaid_holdings_account ON public.plaid_holdings USING btree (account_id);
create index if not exists idx_plaid_holdings_ticker ON public.plaid_holdings USING btree (ticker_symbol);
create index if not exists idx_plaid_holdings_user ON public.plaid_holdings USING btree (user_id);
alter table public.plaid_holdings enable row level security;
drop policy if exists "Users see own plaid_holdings" on public.plaid_holdings;
create policy "Users see own plaid_holdings" on public.plaid_holdings as PERMISSIVE for ALL to public using ((auth.uid() = user_id));

create table if not exists public.plaid_securities (
  id uuid default gen_random_uuid() not null,
  security_id text,
  ticker_symbol text,
  name text,
  type text,
  close_price numeric(12,4),
  close_price_as_of date,
  iso_currency_code text default 'USD'::text,
  created_at timestamp with time zone default now(),
  constraint plaid_securities_pkey PRIMARY KEY (id),
  constraint plaid_securities_security_id_key UNIQUE (security_id)
);
alter table public.plaid_securities enable row level security;
drop policy if exists "Anyone can view securities" on public.plaid_securities;
create policy "Anyone can view securities" on public.plaid_securities as PERMISSIVE for SELECT to public using (true);

create table if not exists public.plaid_transactions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  account_id text not null,
  transaction_id text not null,
  security_id text,
  ticker_symbol text,
  transaction_name text,
  amount numeric,
  quantity numeric,
  price_per_unit numeric,
  transaction_type text,
  transaction_subtype text,
  transaction_date date not null,
  created_at timestamp with time zone default now(),
  constraint plaid_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint plaid_transactions_pkey PRIMARY KEY (id),
  constraint plaid_transactions_transaction_id_key UNIQUE (transaction_id)
);
create index if not exists idx_plaid_transactions_user ON public.plaid_transactions USING btree (user_id);
create index if not exists idx_plaid_transactions_date ON public.plaid_transactions USING btree (transaction_date DESC);
alter table public.plaid_transactions enable row level security;
drop policy if exists "Users see own plaid_transactions" on public.plaid_transactions;
create policy "Users see own plaid_transactions" on public.plaid_transactions as PERMISSIVE for ALL to public using ((auth.uid() = user_id));

create table if not exists public.post_convictions (
  post_id uuid not null,
  user_id uuid not null,
  conviction_pct integer not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint post_convictions_conviction_pct_check CHECK (((conviction_pct >= 0) AND (conviction_pct <= 100))),
  constraint post_convictions_post_id_fkey FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  constraint post_convictions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  constraint post_convictions_pkey PRIMARY KEY (post_id, user_id)
);
create index if not exists idx_post_convictions_user ON public.post_convictions USING btree (user_id, updated_at DESC);
create index if not exists idx_post_convictions_post ON public.post_convictions USING btree (post_id);
alter table public.post_convictions enable row level security;
drop policy if exists "Signed-in users read" on public.post_convictions;
create policy "Signed-in users read" on public.post_convictions as PERMISSIVE for SELECT to authenticated using (true);
drop policy if exists "users delete own conviction" on public.post_convictions;
create policy "users delete own conviction" on public.post_convictions as PERMISSIVE for DELETE to public using ((auth.uid() = user_id));
drop policy if exists "users manage own conviction" on public.post_convictions;
create policy "users manage own conviction" on public.post_convictions as PERMISSIVE for INSERT to public with check ((auth.uid() = user_id));
drop policy if exists "users update own conviction" on public.post_convictions;
create policy "users update own conviction" on public.post_convictions as PERMISSIVE for UPDATE to public using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));

create or replace view public.post_conviction_stats as
  SELECT post_id,
    (count(*))::integer AS conviction_count,
    (round(avg(conviction_pct)))::integer AS avg_conviction,
    (round(avg(conviction_pct) FILTER (WHERE (conviction_pct >= 70))))::integer AS avg_high_conviction
   FROM post_convictions
  GROUP BY post_id;

create table if not exists public.price_data_cache (
  ticker text not null,
  date date not null,
  open real,
  high real,
  low real,
  close real,
  adj_close real,
  volume bigint,
  constraint price_data_cache_pkey PRIMARY KEY (ticker, date)
);
create index if not exists idx_prices_ticker_date ON public.price_data_cache USING btree (ticker, date DESC);
alter table public.price_data_cache enable row level security;

-- sanctions_norm() is created by 20261015120000_sanctions_research.sql.
create table if not exists public.sanctions_entries (
  ent_num integer not null,
  name text not null,
  entry_type text,
  programs text[] default '{}'::text[] not null,
  countries text[] default '{}'::text[] not null,
  remarks text,
  first_seen date default CURRENT_DATE not null,
  last_seen date default CURRENT_DATE not null,
  removed_on date,
  synced_at timestamp with time zone default now() not null,
  localities text[] default '{}'::text[] not null,
  remarks_full text,
  secondary_risk text,
  remarks_unparsed text,
  parser_version smallint,
  parsed_at timestamp with time zone,
  constraint sanctions_entries_pkey PRIMARY KEY (ent_num)
);
create index if not exists idx_sanctions_removed ON public.sanctions_entries USING btree (removed_on DESC);
create index if not exists idx_sanctions_programs ON public.sanctions_entries USING gin (programs);
create index if not exists idx_sanctions_countries ON public.sanctions_entries USING gin (countries);
create index if not exists idx_sanctions_first_seen ON public.sanctions_entries USING btree (first_seen DESC);
create index if not exists idx_sanctions_name_trgm ON public.sanctions_entries USING gin (name gin_trgm_ops);
create index if not exists idx_sanctions_type ON public.sanctions_entries USING btree (entry_type);
create index if not exists idx_sanctions_name_norm ON public.sanctions_entries USING btree (sanctions_norm(name));
alter table public.sanctions_entries enable row level security;

create table if not exists public.waitlist (
  id uuid default gen_random_uuid() not null,
  email text not null,
  full_name text,
  legacy_user boolean default false,
  legacy_number integer,
  referral_source text,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default now(),
  status text default 'pending'::text not null,
  invited_at timestamp with time zone,
  metadata jsonb default '{}'::jsonb,
  invite_token_hash text,
  invite_expires_at timestamp with time zone,
  approved_at timestamp with time zone,
  approved_by text,
  rejected_at timestamp with time zone,
  joined_at timestamp with time zone,
  joined_user_id uuid,
  constraint waitlist_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'joined'::text, 'rejected'::text]))),
  constraint waitlist_joined_user_id_fkey FOREIGN KEY (joined_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  constraint waitlist_pkey PRIMARY KEY (id),
  constraint waitlist_email_key UNIQUE (email)
);
create index if not exists idx_waitlist_legacy ON public.waitlist USING btree (legacy_user) WHERE (legacy_user = true);
create unique index if not exists waitlist_invite_token_hash_key ON public.waitlist USING btree (invite_token_hash) WHERE (invite_token_hash IS NOT NULL);
create index if not exists idx_waitlist_status ON public.waitlist USING btree (status);
create index if not exists idx_waitlist_created ON public.waitlist USING btree (created_at DESC);
create index if not exists idx_waitlist_email ON public.waitlist USING btree (email);
alter table public.waitlist enable row level security;
drop policy if exists "Allow authenticated to view" on public.waitlist;
create policy "Allow authenticated to view" on public.waitlist as PERMISSIVE for SELECT to authenticated using (true);
drop policy if exists "Allow public inserts" on public.waitlist;
create policy "Allow public inserts" on public.waitlist as PERMISSIVE for INSERT to public with check (true);
