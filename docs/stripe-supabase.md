# Stripe + Supabase Auth (Ezana Finance)

- **Checkout:** `POST /api/stripe/create-checkout-session` with `{ planKey }` — uses `@supabase/ssr` cookies + `PLANS` in `src/config/pricing.js` (monthly = `subscription` mode, annual = `payment` mode).
- **Portal:** `POST /api/stripe/customer-portal` — Stripe Customer Portal, return URL `/settings`.
- **Webhook:** `POST /api/stripe/webhook` — uses `SUPABASE_SERVICE_ROLE_KEY` via `supabaseAdmin` in `src/lib/plaid.js`; updates `profiles` (`subscription_*`, `one_time_*`, `current_period_end`).
- **Success page:** `/payment/success?session_id=...`
- **Env:** See root `.env.example` — set Stripe keys + `NEXT_PUBLIC_STRIPE_PRICE_*` for each plan.

Apply DB migration: `supabase/migrations/20260323170000_stripe_subscription_extend.sql` (and earlier `20260323120000_stripe_profiles.sql` if not applied).
