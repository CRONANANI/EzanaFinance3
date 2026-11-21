/* Quarterly billing (Nov 21, 2026): the live quarterly Stripe prices map to
   the right plan keys, the webhook writes those keys to the profile, and the
   plan tier (what gates features) comes out right.
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-quarterly-billing.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANS, getPlanKeyByPriceId } from '../src/config/pricing.js';
import { subscriptionPatch } from '../src/lib/billing/stripe-webhook.js';
import { resolvePriceId, planKeyFromLookupKey } from '../src/lib/billing/resolve-price.js';
import { getActivePlan, getPlanTier, hasActiveSubscription } from '../src/lib/subscription.js';
import { priceAndPeriod } from '../src/lib/billing/renewal-terms.js';
import { starterPlanKeyFor } from '../src/lib/billing/waitlist-trial.js';

const QUARTERLY = [
  ['personal_quarterly', 'price_1UeBcR0WWTGukEalmojgU3Vu', 15, 1],
  ['personal_advanced_quarterly', 'price_1UeBcc0WWTGukEalE9sdDmOh', 57, 2],
  ['family_quarterly', 'price_1UeBcd0WWTGukEalbKaZhexb', 147, 3],
];

const sub = (priceId, { status = 'trialing', lookupKey = null, metadata = {} } = {}) => ({
  id: 'sub_test',
  status,
  current_period_end: 1800000000,
  metadata,
  items: { data: [{ price: { id: priceId, lookup_key: lookupKey } }] },
});

test('catalog: every quarterly plan carries its live price, amount and quarter interval', () => {
  for (const [key, priceId, price] of QUARTERLY) {
    assert.equal(PLANS[key].priceId, priceId, key);
    assert.equal(PLANS[key].price, price, key);
    assert.equal(PLANS[key].interval, 'quarter', key);
    assert.equal(getPlanKeyByPriceId(priceId), key, key);
  }
});

test('webhook: a quarterly subscription writes its plan key to the profile', () => {
  for (const [key, priceId] of QUARTERLY) {
    const patch = subscriptionPatch(sub(priceId));
    assert.equal(patch.subscription_plan, key);
    assert.equal(patch.current_plan, priceId);
    assert.equal(patch.subscription_status, 'trialing');
    assert.equal(patch.subscription_source, 'stripe');
  }
});

test('webhook: an unknown price id still resolves through its lookup key', () => {
  const patch = subscriptionPatch(
    sub('price_unknown_quarterly', { lookupKey: 'personal_advanced_quarterly' }),
  );
  assert.equal(patch.subscription_plan, 'personal_advanced_quarterly');
  assert.equal(planKeyFromLookupKey('not_a_plan'), null);
});

test('permissions: quarterly plans get the same tier as monthly and yearly', () => {
  for (const [key, priceId, , tier] of QUARTERLY) {
    const profile = { ...subscriptionPatch(sub(priceId)) };
    assert.ok(hasActiveSubscription(profile), key);
    assert.equal(getActivePlan(profile), key);
    assert.equal(getPlanTier(key), tier, key);
  }
  assert.equal(
    getPlanTier('personal_advanced_quarterly'),
    getPlanTier('personal_advanced_monthly'),
  );
  assert.equal(getPlanTier('family_quarterly'), getPlanTier('family_annual'));
});

test('permissions: a canceled quarterly subscription clears the plan', () => {
  const patch = subscriptionPatch(sub(QUARTERLY[1][1], { status: 'canceled' }));
  assert.equal(patch.subscription_status, 'canceled');
  assert.equal(patch.subscription_plan, null);
  assert.equal(getPlanTier(getActivePlan(patch)), 0);
});

test('checkout: the catalog price id is used without a Stripe lookup', async () => {
  const stripe = {
    prices: {
      list: () => {
        throw new Error('should not be called');
      },
    },
  };
  for (const [key, priceId] of QUARTERLY) assert.equal(await resolvePriceId(stripe, key), priceId);
});

test('copy and waitlist: quarterly reads per quarter and maps Starter', () => {
  assert.equal(priceAndPeriod(PLANS.personal_advanced_quarterly), '$57 per quarter');
  assert.equal(starterPlanKeyFor('quarterly'), 'personal_quarterly');
});
