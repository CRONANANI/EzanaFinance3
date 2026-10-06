/**
 * RevenueCat webhook logic, pure so scripts/check-mobile.mjs can test it.
 * The route verifies auth and handles storage; this decides what to write.
 */
import { timingSafeEqual } from 'node:crypto';
import { planForProduct } from './plans';

/** Constant-time check of the Authorization header against the secret. */
export function revenueCatAuthorized(header, secret) {
  if (!secret || !header) return false;
  const want = Buffer.from(String(secret));
  const raw = String(header);
  const got = Buffer.from(raw.startsWith('Bearer ') ? raw.slice(7) : raw);
  return want.length === got.length && timingSafeEqual(want, got);
}

const SOURCE_BY_STORE = { APP_STORE: 'apple', MAC_APP_STORE: 'apple', PLAY_STORE: 'google' };

const isActiveStripe = (p) =>
  p?.subscription_source === 'stripe' &&
  (p.subscription_status === 'active' || p.subscription_status === 'trialing') &&
  (!p.subscription_period_end || Date.parse(p.subscription_period_end) > Date.now());

/**
 * event: RevenueCat webhook `event` object. profile: the user's current
 * profiles row (subscription fields). Returns
 *   { skip: reason } or { update: {...profiles fields}, conflict: string|null }.
 *
 * Purchase, renewal, product change and uncancellation make the store
 * subscription active. Cancellation keeps access to the period end (status
 * stays active, the end date is recorded). Expiration ends it. A billing issue
 * marks it past_due. When the user also holds an active Stripe subscription,
 * the most recent purchase wins and the overlap is reported for review.
 */
export function revenueCatUpdate(event, profile) {
  if (!event?.id || !event?.type) return { skip: 'malformed' };
  if (event.type === 'TEST') return { skip: 'test' };
  const source = SOURCE_BY_STORE[event.store];
  if (!source) return { skip: `store ${event.store || 'unknown'}` };
  const plan = planForProduct(event.new_product_id || event.product_id);
  const periodEnd = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;

  const base = {
    subscription_source: source,
    subscription_period_end: periodEnd,
    current_period_end: periodEnd,
    updated_at: new Date().toISOString(),
  };

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE':
    case 'UNCANCELLATION': {
      if (!plan) return { skip: `unknown product ${event.product_id}` };
      const conflict = isActiveStripe(profile)
        ? `user has an active Stripe subscription (${profile.subscription_plan}); the ${source} purchase is newer and now applies`
        : null;
      return {
        update: { ...base, subscription_status: 'active', subscription_plan: plan.planKey },
        conflict,
      };
    }
    case 'CANCELLATION':
      // Auto-renew turned off: access continues until the period ends.
      if (profile?.subscription_source && profile.subscription_source !== source)
        return { skip: 'cancellation for a subscription that is not the current source' };
      return { update: { ...base }, conflict: null };
    case 'BILLING_ISSUE':
      if (profile?.subscription_source && profile.subscription_source !== source)
        return { skip: 'billing issue for a subscription that is not the current source' };
      return { update: { ...base, subscription_status: 'past_due' }, conflict: null };
    case 'EXPIRATION':
      if (profile?.subscription_source && profile.subscription_source !== source)
        return { skip: 'expiration for a subscription that is not the current source' };
      return {
        update: { ...base, subscription_status: 'canceled', subscription_plan: null },
        conflict: null,
      };
    default:
      return { skip: `unhandled ${event.type}` };
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Apply one webhook event with the given admin client. Idempotent on the
 * event id: the first delivery claims `rc:<event id>` in
 * notification_delivery_log (unique per user); later deliveries of the same
 * event are acknowledged and ignored. Returns { status, body } for the route.
 */
export async function handleRevenueCatEvent(admin, event) {
  const userId = [event.app_user_id, event.original_app_user_id, ...(event.aliases || [])].find(
    (id) => typeof id === 'string' && UUID.test(id),
  );
  if (!userId) {
    console.warn('[revenuecat] no Supabase user id on event', event.id, event.type);
    return { status: 200, body: { received: true, skipped: 'anonymous user' } };
  }

  const fingerprint = `rc:${event.id}`;
  const { error: claimErr } = await admin
    .from('notification_delivery_log')
    .insert({ user_id: userId, event_fingerprint: fingerprint });
  if (claimErr) {
    if (claimErr.code === '23505' || /duplicate|unique/i.test(claimErr.message || '')) {
      return { status: 200, body: { received: true, duplicate: true } };
    }
    console.error('[revenuecat] claim', claimErr.message);
    return { status: 500, body: { error: 'Storage error' } };
  }

  const { data: profile } = await admin
    .from('profiles')
    .select(
      'id, subscription_status, subscription_plan, subscription_source, subscription_period_end',
    )
    .eq('id', userId)
    .maybeSingle();

  const decision = revenueCatUpdate(event, profile);
  if (decision.skip) return { status: 200, body: { received: true, skipped: decision.skip } };
  if (decision.conflict) {
    console.error('[revenuecat] subscription conflict for review', {
      user: userId,
      event: event.id,
      detail: decision.conflict,
    });
  }
  const { error } = await admin.from('profiles').update(decision.update).eq('id', userId);
  if (error) {
    // Release the claim so RevenueCat's retry can apply the event.
    await admin
      .from('notification_delivery_log')
      .delete()
      .eq('user_id', userId)
      .eq('event_fingerprint', fingerprint);
    console.error('[revenuecat] profile update', error.message);
    return { status: 500, body: { error: 'Update failed' } };
  }
  return { status: 200, body: { received: true, conflict: !!decision.conflict } };
}
