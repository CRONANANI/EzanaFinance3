# Stripe + Supabase Auth (Ezana Finance)

- **Checkout:** `POST /api/stripe/create-checkout-session` with `{ planKey }` — `@supabase/ssr` cookies; `PLANS` in `src/config/pricing.js` (monthly → `subscription`, annual one-time → `payment`).
- **Portal:** `POST /api/stripe/customer-portal` — return URL `/settings`.
- **Webhook:** `POST /api/stripe/webhook` — `createClient` + `SUPABASE_SERVICE_ROLE_KEY`; verifies signature with `STRIPE_WEBHOOK_SECRET`; syncs `profiles`.
- **Helpers:** `src/lib/subscription.js` — `hasActiveSubscription`, `getActivePlan`, `getPlanTier`.
- **Manage billing:** `src/components/ManageBillingButton.js`
- **Success:** `/payment/success?session_id=...`
- **Stripe API:** `src/lib/stripe.js` uses `apiVersion: '2024-12-18.acacia'`.

Apply migrations: `20260323120000_stripe_profiles.sql`, `20260323170000_stripe_subscription_extend.sql` if not already applied.
