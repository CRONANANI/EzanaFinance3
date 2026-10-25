#!/usr/bin/env node
/* QA RET-3 + RET-4: a paid plan switch updates the existing Stripe
   subscription instead of opening a second Checkout, and the webhook derives
   the plan from the price id first. Stripe is mocked: no network.
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-plan-switch.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_STRIPE_PRICE_PERSONAL_MONTHLY = 'price_personal_m';
process.env.NEXT_PUBLIC_STRIPE_PRICE_PERSONAL_ADVANCED_MONTHLY = 'price_adv_m';

const { startOrSwitchSubscription } = await import('../src/lib/billing/plan-switch.js');
const { subscriptionPatch } = await import('../src/lib/billing/stripe-webhook.js');

function mockStripe({ sub = null, retrieveError = null } = {}) {
  const calls = { retrieve: [], update: [], checkout: [] };
  return {
    calls,
    subscriptions: {
      async retrieve(id) {
        calls.retrieve.push(id);
        if (retrieveError) throw retrieveError;
        return sub;
      },
      async update(id, params, opts) {
        calls.update.push({ id, params, opts });
        return { ...sub, id };
      },
    },
    checkout: {
      sessions: {
        async create(params, opts) {
          calls.checkout.push({ params, opts });
          return { id: 'cs_test', url: 'https://checkout.stripe.test/cs_test' };
        },
      },
    },
  };
}

const liveSub = (status = 'active', price = 'price_personal_m') => ({
  id: 'sub_1',
  status,
  items: { data: [{ id: 'si_1', price: { id: price } }] },
  metadata: { supabase_user_id: 'u1', plan_key: 'personal_monthly' },
});

const base = {
  planKey: 'personal_advanced_monthly',
  priceId: 'price_adv_m',
  origin: 'https://app.test',
  checkoutParams: () => ({ mode: 'subscription' }),
  checkoutIdempotencyKey: 'cs:u1:price_adv_m:1',
  now: () => 1_700_000_000_000,
};

for (const status of ['active', 'trialing', 'past_due']) {
  test(`existing ${status} subscription -> subscriptions.update, no checkout`, async () => {
    const stripe = mockStripe({ sub: liveSub(status) });
    const r = await startOrSwitchSubscription({ ...base, stripe, subscriptionId: 'sub_1' });
    assert.equal(stripe.calls.checkout.length, 0, 'checkout.sessions.create must not be called');
    assert.equal(stripe.calls.update.length, 1);
    const [u] = stripe.calls.update;
    assert.equal(u.id, 'sub_1');
    assert.deepEqual(u.params.items, [{ id: 'si_1', price: 'price_adv_m' }]);
    assert.equal(u.params.proration_behavior, 'create_prorations');
    assert.equal(u.params.metadata.plan_key, 'personal_advanced_monthly');
    assert.equal(u.params.metadata.supabase_user_id, 'u1', 'existing metadata kept');
    assert.match(u.opts.idempotencyKey, /^switch:sub_1:price_adv_m:\d+$/);
    assert.equal(r.body.switched, true);
    assert.equal(r.body.url, 'https://app.test/home?checkout=switched');
  });
}

test('same price -> alreadySubscribed, no update, no checkout', async () => {
  const stripe = mockStripe({ sub: liveSub('active', 'price_adv_m') });
  const r = await startOrSwitchSubscription({ ...base, stripe, subscriptionId: 'sub_1' });
  assert.deepEqual(r.body, { alreadySubscribed: true, planKey: 'personal_advanced_monthly' });
  assert.equal(stripe.calls.update.length, 0);
  assert.equal(stripe.calls.checkout.length, 0);
});

test('no subscription id -> checkout, no retrieve', async () => {
  const stripe = mockStripe();
  const r = await startOrSwitchSubscription({ ...base, stripe, subscriptionId: null });
  assert.equal(stripe.calls.retrieve.length, 0);
  assert.equal(stripe.calls.checkout.length, 1);
  assert.equal(stripe.calls.checkout[0].opts.idempotencyKey, 'cs:u1:price_adv_m:1');
  assert.equal(r.body.url, 'https://checkout.stripe.test/cs_test');
});

test('ended subscription -> checkout', async () => {
  const stripe = mockStripe({ sub: liveSub('canceled') });
  await startOrSwitchSubscription({ ...base, stripe, subscriptionId: 'sub_1' });
  assert.equal(stripe.calls.update.length, 0);
  assert.equal(stripe.calls.checkout.length, 1);
});

test('subscription deleted at Stripe (404) -> checkout', async () => {
  const err = Object.assign(new Error('No such subscription'), { code: 'resource_missing' });
  const stripe = mockStripe({ retrieveError: err });
  await startOrSwitchSubscription({ ...base, stripe, subscriptionId: 'sub_gone' });
  assert.equal(stripe.calls.checkout.length, 1);
});

test('any other Stripe error propagates (no blind checkout)', async () => {
  const err = Object.assign(new Error('rate limited'), { type: 'StripeRateLimitError' });
  const stripe = mockStripe({ retrieveError: err });
  await assert.rejects(
    startOrSwitchSubscription({ ...base, stripe, subscriptionId: 'sub_1' }),
    /rate limited/,
  );
  assert.equal(stripe.calls.checkout.length, 0);
});

test('RET-4: webhook derives the plan from the price id before metadata', () => {
  // Portal change: price is Advanced, metadata still says Personal.
  const sub = liveSub('active', 'price_adv_m');
  assert.equal(subscriptionPatch(sub).subscription_plan, 'personal_advanced_monthly');
  // Even an explicit checkout plan_key loses to the price.
  assert.equal(
    subscriptionPatch(sub, { planKey: 'personal_monthly' }).subscription_plan,
    'personal_advanced_monthly',
  );
  // Unknown price: metadata is the fallback.
  const legacy = liveSub('active', 'price_unknown');
  assert.equal(subscriptionPatch(legacy).subscription_plan, 'personal_monthly');
  assert.equal(subscriptionPatch(legacy).current_plan, 'price_unknown');
});
