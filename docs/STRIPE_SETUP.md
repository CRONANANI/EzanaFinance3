# Stripe subscriptions

1. **Environment** — Copy `.env.example` keys into `.env.local` and Vercel (never commit secrets):
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_APP_URL` (e.g. `https://ezana.world`)
   - `NEXT_PUBLIC_STRIPE_PRICE_*` for each plan (from Stripe Dashboard → Products → Prices)

2. **Supabase** — Run `supabase/migrations/20260323120000_stripe_profiles.sql` (or paste into SQL Editor) so `profiles` has Stripe columns.

3. **Stripe Dashboard**
   - Create products/prices for Free trial / paid tiers as needed.
   - Enable **Customer Portal** (Settings → Customer Portal).
   - Add webhook endpoint `https://your-domain/api/stripe/webhook` with events:
     `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

4. **Local webhooks** — `stripe listen --forward-to localhost:3000/api/stripe/webhook` and use the printed `whsec_` as `STRIPE_WEBHOOK_SECRET`.

5. **Rotate keys** if they were ever exposed.
