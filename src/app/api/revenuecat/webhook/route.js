/**
 * POST /api/revenuecat/webhook: App Store and Google Play subscriptions,
 * delivered by RevenueCat. Writes the same profiles fields as the Stripe
 * webhook plus subscription_source ('apple' or 'google').
 *
 * Auth: the Authorization header must equal REVENUECAT_WEBHOOK_SECRET (set the
 * same value in the RevenueCat dashboard). The app logs in to RevenueCat with
 * the Supabase user id, so event.app_user_id is the profiles id.
 * Idempotent on the event id: the first delivery claims `rc:<event id>` in
 * notification_delivery_log (unique per user), retries are acknowledged and
 * ignored.
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { revenueCatAuthorized, handleRevenueCatEvent } from '@/lib/billing/revenuecat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  if (!revenueCatAuthorized(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const event = body?.event;
  if (!event?.id) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  if (event.type === 'TEST') return NextResponse.json({ received: true, test: true });

  const out = await handleRevenueCatEvent(getAdminClient(), event);
  return NextResponse.json(out.body, { status: out.status });
}
