#!/usr/bin/env node
/* Security assessment F-17: real-money order and transfer validation and
   per-user velocity caps. Mocked Supabase and limiter.
   Usage: part of npm run test:reliability */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockSupabase } from './lib/mock-supabase.mjs';
import {
  validateOrder,
  validateTransfer,
  checkOrderVelocity,
  checkTransferVelocity,
  tradingLimits,
} from '../src/lib/trading/order-validation.js';

const USER = '11111111-1111-4111-8111-111111111111';
const L = tradingLimits();

test('a normal TradeTicket market order passes, normalised', () => {
  const r = validateOrder({
    symbol: 'aapl',
    side: 'buy',
    type: 'market',
    timeInForce: 'day',
    notional: 100.456,
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.order, {
    symbol: 'AAPL',
    side: 'buy',
    type: 'market',
    time_in_force: 'day',
    notional: '100.46',
  });
  const lim = validateOrder({
    symbol: 'BRK.B',
    side: 'sell',
    type: 'limit',
    qty: 2,
    limitPrice: 400,
  });
  assert.equal(lim.ok, true);
  assert.equal(lim.order.limit_price, '400');
});

for (const [why, body, re] of [
  ['bad side', { symbol: 'AAPL', side: 'short', qty: 1 }, /buy or sell/],
  ['missing side', { symbol: 'AAPL', qty: 1 }, /buy or sell/],
  ['bad type', { symbol: 'AAPL', side: 'buy', type: 'iceberg', qty: 1 }, /order type/],
  ['bad tif', { symbol: 'AAPL', side: 'buy', timeInForce: 'forever', qty: 1 }, /time in force/],
  ['bad symbol', { symbol: 'AAPL; DROP', side: 'buy', qty: 1 }, /symbol/],
  ['path symbol', { symbol: '../x', side: 'buy', qty: 1 }, /symbol/],
  ['both sizes', { symbol: 'AAPL', side: 'buy', qty: 1, notional: 10 }, /exactly one/],
  ['no size', { symbol: 'AAPL', side: 'buy' }, /exactly one/],
  ['negative qty', { symbol: 'AAPL', side: 'buy', qty: -5 }, /qty/],
  ['NaN qty', { symbol: 'AAPL', side: 'buy', qty: 'NaN' }, /qty/],
  ['Infinity notional', { symbol: 'AAPL', side: 'buy', notional: Infinity }, /notional/],
  ['huge notional', { symbol: 'AAPL', side: 'buy', notional: L.maxOrderNotional + 1 }, /limited/],
  ['huge qty', { symbol: 'AAPL', side: 'buy', qty: L.maxOrderQty + 1 }, /limited/],
  [
    'priced qty over cap',
    { symbol: 'AAPL', side: 'buy', type: 'limit', qty: 1000, limitPrice: 1000 },
    /limited/,
  ],
  ['limit without price', { symbol: 'AAPL', side: 'buy', type: 'limit', qty: 1 }, /limit price/],
  ['stop without price', { symbol: 'AAPL', side: 'buy', type: 'stop', qty: 1 }, /stop price/],
  [
    'bad limit price',
    { symbol: 'AAPL', side: 'buy', type: 'limit', qty: 1, limitPrice: -1 },
    /limit price/,
  ],
  ['tiny notional', { symbol: 'AAPL', side: 'buy', notional: 0.5 }, /Minimum/],
]) {
  test(`order rejected: ${why}`, () => {
    const r = validateOrder(body);
    assert.equal(r.ok, false);
    assert.match(r.error, re);
  });
}

test('transfers: valid passes; bad direction, amount, cap and decimals fail', () => {
  const rel = 'a1b2c3d4-0000-4000-8000-000000000000';
  assert.deepEqual(validateTransfer({ relationshipId: rel, amount: '250.50' }), {
    ok: true,
    transfer: { amount: 250.5, direction: 'INCOMING', relationshipId: rel },
  });
  for (const [body, re] of [
    [{ relationshipId: rel, amount: 10, direction: 'SIDEWAYS' }, /direction/],
    [{ relationshipId: rel, amount: -10 }, /amount/],
    [{ relationshipId: rel, amount: 'abc' }, /amount/],
    [{ relationshipId: rel, amount: L.maxTransfer + 1 }, /limited/],
    [{ relationshipId: rel, amount: 10.005 }, /decimals/],
    [{ relationshipId: '../../x', amount: 10 }, /relationshipId/],
  ]) {
    const r = validateTransfer(body);
    assert.equal(r.ok, false, JSON.stringify(body));
    assert.match(r.error, re);
  }
});

function fakeLimiter() {
  const hits = new Map();
  return async (key, limit) => {
    const n = (hits.get(key) || 0) + 1;
    hits.set(key, n);
    return { allowed: n <= limit, resetAt: new Date() };
  };
}

test('order velocity: the per-minute cap bites, and a limiter outage fails closed', async () => {
  const checkRateLimit = fakeLimiter();
  for (let i = 0; i < L.maxOrdersPerMin; i += 1) {
    assert.equal(await checkOrderVelocity(USER, { checkRateLimit }), null);
  }
  assert.match(await checkOrderVelocity(USER, { checkRateLimit }), /wait a minute/);
  const down = async () => ({ allowed: false, degraded: true, resetAt: new Date() });
  assert.match(await checkOrderVelocity(USER, { checkRateLimit: down }), /unavailable/);
});

test('transfer velocity: daily dollar cap counts live transfers, skips failed ones and replays', async () => {
  const admin = createMockSupabase({
    seed: {
      alpaca_transfers: [
        {
          id: 't1',
          user_id: USER,
          idempotency_key: `${USER}:k1`,
          amount: 60_000,
          status: 'QUEUED',
          created_at: new Date().toISOString(),
        },
        {
          id: 't2',
          user_id: USER,
          idempotency_key: `${USER}:k2`,
          amount: 90_000,
          status: 'submit_failed',
          created_at: new Date().toISOString(),
        },
      ],
    },
  });
  const checkRateLimit = fakeLimiter();
  assert.equal(
    await checkTransferVelocity(
      admin,
      { userId: USER, idempotencyKey: 'new1', amount: 30_000 },
      { checkRateLimit },
    ),
    null,
  );
  assert.match(
    await checkTransferVelocity(
      admin,
      { userId: USER, idempotencyKey: 'new2', amount: 45_000 },
      { checkRateLimit },
    ),
    /Daily transfer limit/,
  );
  /* A retry of an already-claimed key is never blocked. */
  assert.equal(
    await checkTransferVelocity(
      admin,
      { userId: USER, idempotencyKey: 'k1', amount: 99_999 },
      { checkRateLimit },
    ),
    null,
  );
});
