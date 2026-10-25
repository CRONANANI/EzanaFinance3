/**
 * Stripe webhook processing and reconciliation (reliability audit P1-9).
 * Dependencies are passed in ({ admin, stripe }) so the check script drives
 * this with mocks.
 *
 * Dedupe: every event is claimed in public.stripe_events (id primary key)
 * before it is processed. A processed id returns 200 at once; one still
 * being processed returns 409 so Stripe redelivers later; a failed or
 * stalled one is re-claimed. Failure marks the row 'failed' and the route
 * answers 500, so Stripe retries.
 *
 * Ordering: Stripe does not deliver events in order. For subscription
 * events the subscription is RE-FETCHED (stripe.subscriptions.retrieve) and
 * that current state is written, so a late "updated" can never roll a newer
 * state back. An event about a subscription that is not the profile's
 * current one never overwrites it.
 *
 * Every profiles write is checked; an error throws (-> 500 -> retry).
 */

import { getPlanKeyByPriceId } from '@/config/pricing';

const UNIQUE_VIOLATION = '23505';
const MISSING_TABLE = new Set(['42P01', 'PGRST205']);
const STALE_PROCESSING_MS = 5 * 60_000;
const ENDED = new Set(['canceled', 'incomplete_expired']);

const iso = (secs) => (secs ? new Date(secs * 1000).toISOString() : null);

/** @returns {'claimed'|'duplicate'|'in_flight'|'untracked'} */
export async function claimStripeEvent(admin, event, now = Date.now()) {
  const row = {
    id: event.id,
    type: event.type,
    created: iso(event.created),
    status: 'processing',
    attempts: 1,
  };
  const { error } = await admin.from('stripe_events').insert(row);
  if (!error) return 'claimed';
  if (MISSING_TABLE.has(error.code)) return 'untracked';
  if (error.code !== UNIQUE_VIOLATION) throw new Error(`stripe_events claim: ${error.message}`);

  const { data: prior, error: readErr } = await admin
    .from('stripe_events')
    .select('status, attempts, updated_at')
    .eq('id', event.id)
    .maybeSingle();
  if (readErr) throw new Error(`stripe_events read: ${readErr.message}`);
  if (!prior) return 'in_flight';
  if (prior.status === 'processed') return 'duplicate';
  const stale = prior.updated_at && now - Date.parse(prior.updated_at) > STALE_PROCESSING_MS;
  if (prior.status === 'processing' && !stale) return 'in_flight';

  /* Failed, or a processing run that died: take it over (only if still in
     the state we just read, so two redeliveries cannot both take it). */
  const { data: taken, error: upErr } = await admin
    .from('stripe_events')
    .update({
      status: 'processing',
      attempts: (prior.attempts || 1) + 1,
      updated_at: new Date(now).toISOString(),
    })
    .eq('id', event.id)
    .eq('status', prior.status)
    .eq('attempts', prior.attempts || 1)
    .select('id');
  if (upErr) throw new Error(`stripe_events reclaim: ${upErr.message}`);
  return taken?.length ? 'claimed' : 'in_flight';
}

export async function finishStripeEvent(admin, eventId, { ok, error } = {}) {
  const patch = ok
    ? { status: 'processed', processed_at: new Date().toISOString(), error: null }
    : { status: 'failed', error: String(error?.message || error || 'failed').slice(0, 1000) };
  const { error: e } = await admin
    .from('stripe_events')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', eventId);
  if (e && !MISSING_TABLE.has(e.code)) console.error('[stripe] event finish failed:', e.message);
}

async function findProfile(admin, { userId, customerId }) {
  if (userId) {
    const { data, error } = await admin
      .from('profiles')
      .select('id, subscription_id, subscription_status, stripe_customer_id')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw new Error(`profile lookup: ${error.message}`);
    if (data) return data;
  }
  if (customerId) {
    const { data, error } = await admin
      .from('profiles')
      .select('id, subscription_id, subscription_status, stripe_customer_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    if (error) throw new Error(`profile lookup: ${error.message}`);
    return data || null;
  }
  return null;
}

/** The profile fields for a subscription's CURRENT state. */
export function subscriptionPatch(sub, { planKey = null } = {}) {
  const ended = ENDED.has(sub.status);
  const periodEnd = iso(sub.current_period_end);
  const patch = {
    subscription_status: ended ? 'canceled' : sub.status,
    subscription_source: 'stripe',
    current_period_end: periodEnd,
    subscription_period_end: periodEnd,
    updated_at: new Date().toISOString(),
  };
  if (ended) {
    patch.subscription_id = null;
    patch.subscription_plan = null;
  } else {
    patch.subscription_id = sub.id;
    const priceId = sub.items?.data?.[0]?.price?.id ?? null;
    patch.current_plan = priceId;
    /* The price is the source of truth (QA RET-4): a plan changed in the
       Billing Portal or by an in-app switch keeps the old checkout metadata,
       so metadata is only the fallback for a price not in the catalog. */
    const plan = getPlanKeyByPriceId(priceId) || planKey || sub.metadata?.plan_key || null;
    if (plan) patch.subscription_plan = plan;
  }
  return patch;
}

/**
 * Write a subscription's current state to its profile.
 * @returns {'updated'|'no_profile'|'not_current'}
 */
export async function applySubscription(
  admin,
  sub,
  { userId = null, planKey = null, extra = {} } = {},
) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  const profile = await findProfile(admin, {
    userId: userId || sub.metadata?.supabase_user_id || null,
    customerId,
  });
  if (!profile) return 'no_profile';
  /* An older subscription ending must not clear a newer, different one. */
  if (profile.subscription_id && profile.subscription_id !== sub.id && ENDED.has(sub.status)) {
    return 'not_current';
  }
  const patch = { ...subscriptionPatch(sub, { planKey }), ...extra };
  if (customerId && !profile.stripe_customer_id) patch.stripe_customer_id = customerId;
  const { data, error } = await admin
    .from('profiles')
    .update(patch)
    .eq('id', profile.id)
    .select('id');
  if (error) throw new Error(`profiles update: ${error.message}`);
  if (!data?.length) throw new Error(`profiles update matched no row for ${profile.id}`);
  return 'updated';
}

/** Process one verified event. Throws on any failure (the route -> 500). */
export async function handleStripeEvent({ admin, stripe }, event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.supabase_user_id;
      if (!userId) return { note: 'no supabase_user_id' };
      if (session.mode === 'subscription' && session.subscription) {
        const subId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        const result = await applySubscription(admin, sub, {
          userId,
          planKey: session.metadata?.plan_key || null,
          extra: { stripe_customer_id: session.customer, onboarding_completed: true },
        });
        return { result };
      }
      return { note: `mode ${session.mode} not handled` };
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused':
    case 'customer.subscription.resumed': {
      /* Re-fetch: the event payload may be older than the subscription. */
      const sub = await stripe.subscriptions.retrieve(event.data.object.id);
      return { result: await applySubscription(admin, sub) };
    }
    case 'invoice.paid':
    case 'invoice.payment_failed':
      /* The subscription's own update event carries the status change. */
      return { note: 'logged' };
    default:
      return { note: 'unhandled' };
  }
}

/**
 * Daily drift repair. 1) every live (active, trialing, past_due)
 * subscription is written to its profile when the profile disagrees;
 * 2) every profile that still shows a live Stripe subscription Stripe no
 * longer lists as live is re-fetched and written (a lost cancellation).
 */
export async function reconcileStripe({ admin, stripe }, { maxProfiles = 2000 } = {}) {
  const out = { live: 0, fixed: 0, ended: 0, noProfile: 0, errors: [] };
  const live = new Map();
  for (const status of ['active', 'trialing', 'past_due']) {
    for await (const sub of stripe.subscriptions.list({ status, limit: 100 })) {
      live.set(sub.id, sub);
    }
  }
  out.live = live.size;

  for (const sub of live.values()) {
    try {
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
      // eslint-disable-next-line no-await-in-loop
      const profile = await findProfile(admin, {
        userId: sub.metadata?.supabase_user_id || null,
        customerId,
      });
      if (!profile) {
        out.noProfile += 1;
        continue;
      }
      if (profile.subscription_id === sub.id && profile.subscription_status === sub.status)
        continue;
      // eslint-disable-next-line no-await-in-loop
      const r = await applySubscription(admin, sub, { userId: profile.id });
      if (r === 'updated') out.fixed += 1;
    } catch (e) {
      out.errors.push(`${sub.id}: ${e.message}`);
    }
  }

  const { data: stale, error } = await admin
    .from('profiles')
    .select('id, subscription_id')
    .in('subscription_status', ['active', 'trialing', 'past_due'])
    .eq('subscription_source', 'stripe')
    .not('subscription_id', 'is', null)
    .limit(maxProfiles);
  if (error) throw new Error(`profiles scan: ${error.message}`);
  for (const p of stale || []) {
    if (live.has(p.subscription_id)) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      const sub = await stripe.subscriptions.retrieve(p.subscription_id);
      // eslint-disable-next-line no-await-in-loop
      const r = await applySubscription(admin, sub, { userId: p.id });
      if (r === 'updated') out.ended += 1;
    } catch (e) {
      out.errors.push(`${p.subscription_id}: ${e.message}`);
    }
  }
  return out;
}
