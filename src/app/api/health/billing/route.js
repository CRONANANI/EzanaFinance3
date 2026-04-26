import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { PLANS } from '@/config/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = {
    stripe_secret_key: !!process.env.STRIPE_SECRET_KEY,
    stripe_publishable_key: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    stripe_reachable: false,
    test_or_live: 'unknown',
    plans: {},
  };

  if (process.env.STRIPE_SECRET_KEY) {
    checks.test_or_live = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')
      ? 'test'
      : process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')
        ? 'live'
        : 'unknown';
  }

  for (const [key, plan] of Object.entries(PLANS)) {
    const id = plan.priceId;
    checks.plans[key] = {
      has_price_id: !!id,
      starts_with_price: id ? id.startsWith('price_') : false,
      preview: id ? `${id.slice(0, 12)}...` : null,
    };
  }

  if (stripe) {
    try {
      await stripe.balance.retrieve();
      checks.stripe_reachable = true;
    } catch (err) {
      checks.stripe_error = err?.message;
    }
  }

  const allPlansValid = Object.values(checks.plans).every(
    (p) => p.has_price_id && p.starts_with_price
  );
  const status =
    checks.stripe_secret_key && checks.stripe_reachable && allPlansValid
      ? 'healthy'
      : 'degraded';

  return NextResponse.json({ status, checks });
}
