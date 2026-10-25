#!/usr/bin/env node
/* QA ORG-17: the hindsight benchmark is SPY over the pitch's own window.
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-org-hindsight.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeHindsight, closeOnOrAfter } from '@/lib/org-hindsight';

/* FMP stable EOD rows come newest first. */
const SPY = [
  { date: '2026-10-23', close: 550 },
  { date: '2026-06-02', close: 505 },
  { date: '2026-06-01', close: 500 },
  { date: '2026-05-29', close: 498 },
];
const TICKER = [
  { date: '2026-10-23', close: 130 },
  { date: '2026-06-01', close: 100 },
];

test('decision on a weekend uses the next trading day close', () => {
  assert.equal(closeOnOrAfter(SPY, '2026-05-30T15:00:00Z').close, 500);
});

test('benchmark is SPY from decision_at to now, not its daily change', () => {
  const h = computeHindsight({
    pitch: { decision_at: '2026-05-31T12:00:00Z', current_price_at_submission: 90 },
    tickerHistory: TICKER,
    spyHistory: SPY,
  });
  assert.equal(h.price_at_decision, 100);
  assert.equal(h.current_price, 130);
  assert.equal(h.return_pct, 30);
  assert.equal(h.benchmark_return_pct, 10);
  assert.equal(h.alpha_pct, 20);
  assert.equal(h.current_state, 'outperforming');
});

test('live quotes win for "now"; submission price is the fallback at decision', () => {
  const h = computeHindsight({
    pitch: { decision_at: '2026-05-31', current_price_at_submission: 80 },
    tickerHistory: [],
    spyHistory: SPY,
    tickerQuote: 88,
    spyQuote: 525,
  });
  assert.equal(h.price_at_decision, 80);
  assert.equal(h.return_pct, 10);
  assert.equal(h.benchmark_return_pct, 5);
  assert.equal(h.alpha_pct, 5);
  assert.equal(h.current_state, 'roughly_inline');
});

test('no SPY history: benchmark, alpha and state are null, never invented', () => {
  const h = computeHindsight({
    pitch: { decision_at: '2026-05-31' },
    tickerHistory: TICKER,
    spyHistory: [],
    spyQuote: 525,
  });
  assert.equal(h.benchmark_return_pct, null);
  assert.equal(h.alpha_pct, null);
  assert.equal(h.current_state, null);
  assert.equal(h.return_pct, 30);
});
