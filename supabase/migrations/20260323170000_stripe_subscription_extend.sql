-- Extra Stripe fields (safe to re-run)
-- Run in Supabase SQL Editor if not using CLI migrations

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS one_time_plan TEXT,
  ADD COLUMN IF NOT EXISTS one_time_plan_purchased_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id_unique
  ON public.profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
