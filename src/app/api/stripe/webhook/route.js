import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getAdminClient } from '@/lib/supabase';
import { stripe } from '@/lib/services/stripe';
import {
  claimStripeEvent,
  finishStripeEvent,
  handleStripeEvent,
} from '@/lib/billing/stripe-webhook';
import { recordFailedJob } from '@/lib/cron/failed-jobs';
import { logger, requestIdOf } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe webhook. Verified with the raw body, de-duplicated by event id
 * (stripe_events), processed against the re-fetched subscription, and
 * answered 500 on any failure so Stripe retries. See
 * src/lib/billing/stripe-webhook.js.
 */
export async function POST(request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const body = await request.text();
  const sig = headers().get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const admin = getAdminClient();
  let claim;
  try {
    claim = await claimStripeEvent(admin, event);
  } catch (e) {
    console.error('[Stripe Webhook] claim failed:', e.message);
    return NextResponse.json({ error: 'Webhook storage unavailable' }, { status: 500 });
  }
  if (claim === 'duplicate') return NextResponse.json({ received: true, duplicate: true });
  /* Another delivery of this event is mid-processing: ask Stripe to retry
     later rather than acknowledge something that may yet fail. */
  if (claim === 'in_flight') {
    return NextResponse.json({ error: 'Event is being processed' }, { status: 409 });
  }

  try {
    const result = await handleStripeEvent({ admin, stripe }, event);
    await finishStripeEvent(admin, event.id, { ok: true });
    console.log(`[Stripe Webhook] ${event.type} ${event.id}`, result);
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('webhook failed', {
      webhook: 'stripe',
      requestId: requestIdOf(request),
      event: event.id,
      error: error?.message,
    });
    await finishStripeEvent(admin, event.id, { ok: false, error });
    await recordFailedJob({
      job: 'webhook:stripe',
      error,
      payload: { event_id: event.id, type: event.type },
    });
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
