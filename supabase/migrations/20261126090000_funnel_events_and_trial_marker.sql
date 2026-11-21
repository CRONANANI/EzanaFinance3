-- Nov 21, 2026: pricing and Advanced-trial funnel events, and the trusted
-- trial-signup marker.
--
-- 1. public.funnel_events: aggregate, privacy-conscious funnel steps
--    (pricing view, billing toggle, plan CTA, checkout started, trial
--    confirmed, onboarding goal). No research query text, no portfolio
--    contents, no email, no IP. Written only by the service role from
--    /api/funnel-event and the Stripe webhook; nobody can read it through the
--    API (RLS on, no policies).
create table if not exists public.funnel_events (
  id bigserial primary key,
  event text not null check (event in (
    'pricing_view',
    'billing_toggle',
    'plan_cta',
    'trial_signup_started',
    'checkout_started',
    'trial_confirmed',
    'onboarding_goal',
    'onboarding_skip'
  )),
  plan text check (plan is null or plan in ('free', 'starter', 'advanced', 'family', 'enterprise')),
  billing text check (billing is null or billing in ('quarterly', 'yearly')),
  goal text check (goal is null or goal in ('research', 'money', 'quant')),
  user_id uuid references auth.users (id) on delete set null,
  anon_id text check (anon_id is null or char_length(anon_id) <= 64),
  created_at timestamptz not null default now()
);

create index if not exists funnel_events_event_created_idx
  on public.funnel_events (event, created_at desc);

alter table public.funnel_events enable row level security;
revoke all on public.funnel_events from anon, authenticated;

-- 2. Accounts created by the Advanced trial signup before Nov 21 carry the
--    marker only in user_metadata, which the user can edit. Copy it into
--    app_metadata (server-only) so the waitlist checks cannot be bypassed.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('signup_source', 'advanced_trial')
where raw_user_meta_data ->> 'signup_source' = 'advanced_trial'
  and coalesce(raw_app_meta_data ->> 'signup_source', '') <> 'advanced_trial';
