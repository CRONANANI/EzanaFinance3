#!/usr/bin/env node
/* QA RET-1: the server plan gate's decision. Usage: part of test:platform-qa */
import test from 'node:test';
import assert from 'node:assert/strict';
import { planDecision } from '../src/lib/plan-gate.js';

test('a paid active plan passes; free and inactive are refused', () => {
  assert.equal(
    planDecision({ subscription_status: 'active', subscription_plan: 'personal_monthly' }),
    null,
  );
  assert.equal(
    planDecision(
      { subscription_status: 'trialing', subscription_plan: 'professional_annual' },
      { minTier: 4 },
    ),
    null,
  );
  assert.equal(
    planDecision({ subscription_status: 'free', subscription_plan: 'free' }).status,
    402,
  );
  assert.equal(
    planDecision({ subscription_status: 'canceled', subscription_plan: 'personal_monthly' }).status,
    402,
  );
  assert.equal(planDecision(null).status, 402);
});

test('minTier is respected', () => {
  const advanced = {
    subscription_status: 'active',
    subscription_plan: 'personal_advanced_monthly',
  };
  assert.equal(planDecision(advanced, { minTier: 2 }), null);
  assert.equal(planDecision(advanced, { minTier: 3 }).body.code, 'plan_required');
});
