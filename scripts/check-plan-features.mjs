#!/usr/bin/env node
/* Nov 21, 2026: the plan registry (src/config/plan-features.js) stays
   consistent with billing, the Sonar matrix and the gates.
   Usage: npm run test:plan-features */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FEATURE_GROUPS,
  FEATURES,
  OPEN_PLAN_KEYS,
  PLAN_HIGHLIGHTS,
  PLAN_KEY_TIER,
  RETAIL_PLANS,
  canonicalTierOfPlanKey,
  watchlistLimitFor,
  yearlySaving,
} from '../src/config/plan-features.js';
import { PLANS as CATALOG } from '../src/config/pricing.js';
import { getPlanTier } from '../src/lib/subscription.js';
import { planDecision } from '../src/lib/plan-gate.js';
import { getSonarEntitlements } from '../src/lib/sonar/entitlements.js';

test('every Stripe catalog key maps to a tier, quarterly keys included', () => {
  for (const key of Object.keys(CATALOG)) {
    assert.ok(key in PLAN_KEY_TIER, `${key} has no tier`);
  }
  assert.equal(getPlanTier('personal_quarterly'), 1);
  assert.equal(getPlanTier('personal_advanced_quarterly'), 2);
  assert.equal(getPlanTier('family_quarterly'), 3);
  assert.equal(getPlanTier('professional_annual'), 4);
  assert.equal(canonicalTierOfPlanKey('nonsense'), 0);
});

test('a quarterly Advanced subscriber passes an Advanced gate (was tier 0)', () => {
  assert.equal(
    planDecision(
      { subscription_status: 'trialing', subscription_plan: 'personal_advanced_quarterly' },
      { minTier: 2 },
    ),
    null,
  );
});

test('only Advanced is open without an invite', () => {
  assert.deepEqual([...OPEN_PLAN_KEYS].sort(), [
    'personal_advanced_annual',
    'personal_advanced_quarterly',
  ]);
  assert.equal(RETAIL_PLANS.advanced.availability, 'available');
  for (const id of ['free', 'starter', 'family']) {
    assert.equal(RETAIL_PLANS[id].availability, 'waitlist');
  }
});

test('display prices match the Stripe catalog amounts', () => {
  for (const id of ['starter', 'advanced', 'family']) {
    const p = RETAIL_PLANS[id];
    assert.equal(CATALOG[p.stripeKey.quarter].price, p.price.quarter.amount, `${id} quarter`);
    assert.equal(CATALOG[p.stripeKey.year].price, p.price.year.amount, `${id} year`);
    assert.equal(p.price.quarter.amount, p.price.quarter.perMonth * 3);
    assert.equal(p.price.year.amount, p.price.year.perMonth * 12);
  }
  assert.equal(yearlySaving('advanced').saved, 48);
});

test('Sonar cells come from the enforced Sonar matrix', () => {
  for (const t of [0, 1, 2]) {
    const e = getSonarEntitlements({ planTier: t });
    assert.equal(FEATURES['sonar-pings'].values[t], String(e.dailyQueries));
    assert.equal(FEATURES['sonar-deep'].values[t], String(e.deepRunsPerDay));
    assert.equal(FEATURES['sonar-datasets'].values[t], String(e.datasets.length));
  }
  assert.ok(getSonarEntitlements({ planTier: 2 }).datasets.includes('13f'));
  assert.ok(!getSonarEntitlements({ planTier: 1 }).datasets.includes('13f'));
});

test('every feature is live, has a value per primary tier, and a coherent minTier', () => {
  for (const g of FEATURE_GROUPS) {
    for (const f of g.features) {
      assert.equal(f.maturity, 'live', f.id);
      for (const t of [0, 1, 2, 3]) assert.ok(t in f.values, `${f.id} tier ${t}`);
      if (f.values[0] === false) assert.ok(f.minTier > 0, `${f.id} minTier`);
      if (f.minTier > 0) assert.equal(f.values[f.minTier - 1], false, `${f.id} below minTier`);
    }
  }
});

test('card highlights only cite registry features the tier actually has', () => {
  const tierOf = { free: 0, starter: 1, advanced: 2 };
  for (const [plan, list] of Object.entries(PLAN_HIGHLIGHTS)) {
    assert.ok(list.length >= 5 && list.length <= 7, `${plan} has ${list.length} highlights`);
    for (const h of list) {
      const f = FEATURES[h.feature];
      assert.ok(f, `${plan}: unknown feature ${h.feature}`);
      assert.notEqual(f.values[tierOf[plan]], false, `${plan} highlights ${h.feature}`);
    }
  }
});

test('watchlist caps rise with the tier', () => {
  assert.ok(watchlistLimitFor(0) < watchlistLimitFor(1));
  assert.ok(watchlistLimitFor(1) < watchlistLimitFor(2));
  assert.equal(watchlistLimitFor(-1), watchlistLimitFor(0));
});
