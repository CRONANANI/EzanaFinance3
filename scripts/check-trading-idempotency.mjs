#!/usr/bin/env node
/* Reliability audit P0: idempotent Alpaca orders, transfers and account
   claims; the mock-trades handlers. Mocked Supabase and Alpaca.
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-trading-idempotency.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockSupabase } from './lib/mock-supabase.mjs';
import {
  readIdempotencyKey,
  clientOrderId,
  CLIENT_ORDER_ID_MAX,
  isDefiniteRejection,
  placeOrderOnce,
  createTransferOnce,
  reconcilePendingOrders,
  claimBrokerageAccount,
} from '../src/lib/trading/idempotent.js';
import { recordMockTrade, listMockTrades } from '../src/lib/trading/mock-trades.js';

const USER = '11111111-1111-4111-8111-111111111111';
const KEY = '22222222-2222-4222-8222-222222222222';
const ORDER = { symbol: 'AAPL', side: 'buy', type: 'market', time_in_force: 'day', qty: '1' };

const tradeDb = () =>
  createMockSupabase({
    unique: {
      trade_history: [['client_order_id'], ['alpaca_order_id']],
      alpaca_transfers: [['idempotency_key']],
    },
  });

function fakeAlpaca({ fail } = {}) {
  const posts = [];
  return {
    posts,
    async post(path, body) {
      await new Promise((r) => setTimeout(r, 5));
      posts.push({ path, body });
      if (fail) throw fail;
      return { id: `ord-${posts.length}`, status: 'accepted', qty: body.qty, symbol: body.symbol };
    },
    async get() {
      return null;
    },
  };
}

const headers = (h) => ({ headers: new Map(Object.entries(h)) });

test('Idempotency-Key must be a UUID', () => {
  assert.equal(readIdempotencyKey(headers({ 'idempotency-key': KEY })), KEY);
  assert.equal(readIdempotencyKey(headers({ 'idempotency-key': 'abc' })), null);
  assert.equal(readIdempotencyKey(headers({})), null);
});

test("client_order_id is deterministic and within Alpaca's limit", () => {
  const a = clientOrderId(USER, KEY);
  assert.equal(a, clientOrderId(USER, KEY));
  assert.notEqual(a, clientOrderId(USER, '33333333-3333-4333-8333-333333333333'));
  assert.ok(a.length <= CLIENT_ORDER_ID_MAX, `${a.length} chars`);
});

test('10 parallel submits with one key place exactly one order', async () => {
  const admin = tradeDb();
  const alpaca = fakeAlpaca();
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      placeOrderOnce(
        { admin, alpaca },
        { userId: USER, accountId: 'acc-1', idempotencyKey: KEY, orderBody: ORDER },
      ),
    ),
  );
  assert.equal(alpaca.posts.length, 1);
  assert.equal(results.filter((r) => !r.replay).length, 1);
  assert.equal(admin.rows('trade_history').length, 1);
  assert.equal(alpaca.posts[0].body.client_order_id, clientOrderId(USER, KEY));
  assert.equal(admin.rows('trade_history')[0].alpaca_order_id, 'ord-1');
});

test('a 4xx rejection marks the row submit_failed; a timeout leaves it pending', async () => {
  const rej = Object.assign(new Error('insufficient buying power'), { status: 403 });
  const admin = tradeDb();
  await assert.rejects(
    placeOrderOnce(
      { admin, alpaca: fakeAlpaca({ fail: rej }) },
      { userId: USER, accountId: 'a', idempotencyKey: KEY, orderBody: ORDER },
    ),
  );
  assert.equal(admin.rows('trade_history')[0].status, 'submit_failed');

  const admin2 = tradeDb();
  const timeout = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
  await assert.rejects(
    placeOrderOnce(
      { admin: admin2, alpaca: fakeAlpaca({ fail: timeout }) },
      { userId: USER, accountId: 'a', idempotencyKey: KEY, orderBody: ORDER },
    ),
  );
  assert.equal(admin2.rows('trade_history')[0].status, 'pending_submit');
  assert.equal(isDefiniteRejection(timeout), false);
  assert.equal(isDefiniteRejection({ status: 429 }), false);
  assert.equal(isDefiniteRejection({ status: 422 }), true);
});

test('a database error on the claim never reaches Alpaca', async () => {
  const admin = tradeDb();
  const orig = admin.from;
  admin.from = (t) => {
    const b = orig(t);
    const ins = b.insert;
    b.insert = (p) => {
      ins(p);
      b.then = (res) => res({ data: null, error: { code: '57014', message: 'timeout' } });
      return b;
    };
    return b;
  };
  const alpaca = fakeAlpaca();
  await assert.rejects(
    placeOrderOnce(
      { admin, alpaca },
      { userId: USER, accountId: 'a', idempotencyKey: KEY, orderBody: ORDER },
    ),
    /trade_history claim/,
  );
  assert.equal(alpaca.posts.length, 0);
});

test('reconcile: found at Alpaca -> recorded; 404 -> submit_failed', async () => {
  const old = new Date(Date.now() - 10 * 60_000).toISOString();
  const admin = createMockSupabase({
    seed: {
      trade_history: [
        {
          id: 'r1',
          client_order_id: 'ez-a',
          alpaca_account_id: 'acc',
          status: 'pending_submit',
          created_at: old,
        },
        {
          id: 'r2',
          client_order_id: 'ez-b',
          alpaca_account_id: 'acc',
          status: 'pending_submit',
          created_at: old,
        },
      ],
    },
  });
  const alpaca = {
    async get(path) {
      if (path.includes('ez-a')) return { id: 'ord-a', status: 'filled' };
      throw Object.assign(new Error('not found'), { status: 404 });
    },
  };
  const out = await reconcilePendingOrders({ admin, alpaca });
  assert.deepEqual(out, { checked: 2, found: 1, failed: 1, skipped: 0 });
  const byId = Object.fromEntries(admin.rows('trade_history').map((r) => [r.id, r]));
  assert.equal(byId.r1.alpaca_order_id, 'ord-a');
  assert.equal(byId.r2.status, 'submit_failed');
});

test('10 parallel transfers with one key start one ACH transfer', async () => {
  const admin = tradeDb();
  const alpaca = fakeAlpaca();
  await Promise.all(
    Array.from({ length: 10 }, () =>
      createTransferOnce(
        { admin, alpaca },
        {
          userId: USER,
          accountId: 'acc',
          idempotencyKey: KEY,
          relationshipId: 'rel',
          amount: 100,
          direction: 'INCOMING',
        },
      ),
    ),
  );
  assert.equal(alpaca.posts.length, 1);
  assert.equal(admin.rows('alpaca_transfers').length, 1);
});

test('account claim: one of 10 racing requests may create the account', async () => {
  const admin = createMockSupabase({
    rpc: {
      claim_brokerage_account({ p_user }, { rows }) {
        if (rows('brokerage_accounts').some((r) => r.user_id === p_user)) return null;
        const id = `ba-${rows('brokerage_accounts').length + 1}`;
        rows('brokerage_accounts').push({ id, user_id: p_user, account_status: 'creating' });
        return id;
      },
    },
  });
  const claims = await Promise.all(
    Array.from({ length: 10 }, () => claimBrokerageAccount(admin, USER)),
  );
  assert.equal(claims.filter((c) => c.claimed).length, 1);
  assert.ok(
    claims.filter((c) => !c.claimed).every((c) => c.existing.account_status === 'creating'),
  );
});

test('mock trades: list and record work; a repeated client_request_id records once', async () => {
  const db = createMockSupabase({ unique: { mock_trades: [['user_id', 'client_request_id']] } });
  const body = { ticker: 'msft', quantity: 2, price: 10, client_request_id: 'req-12345678' };
  const [a, b] = await Promise.all([
    recordMockTrade(db, USER, body),
    recordMockTrade(db, USER, body),
  ]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(db.rows('mock_trades').length, 1);
  const list = await listMockTrades(db, USER);
  assert.equal(list.status, 200);
  assert.equal(list.body.trades[0].ticker, 'MSFT');
  assert.equal(
    (await recordMockTrade(db, USER, { ticker: '', quantity: 1, price: 1 })).status,
    400,
  );
});
