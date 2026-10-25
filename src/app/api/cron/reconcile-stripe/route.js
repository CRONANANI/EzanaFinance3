/**
 * Daily: repair drift between Stripe subscriptions and profiles (a lost or
 * failed webhook). Live subscriptions are written where the profile
 * disagrees; profiles still showing a subscription Stripe no longer lists
 * as live are re-fetched and written. See reconcileStripe().
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { stripe } from '@/lib/services/stripe';
import { reconcileStripe } from '@/lib/billing/stripe-webhook';
import { cronRoute } from '@/lib/cron/with-cron-lock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function run() {
  if (!stripe) return NextResponse.json({ ok: true, skipped: 'stripe not configured' });
  const out = await reconcileStripe({ admin: getAdminClient(), stripe });
  return NextResponse.json({
    ok: out.errors.length === 0,
    ...out,
    errors: out.errors.slice(0, 10),
  });
}

export const GET = cronRoute('reconcile-stripe', run, { ttlSeconds: 600 });
