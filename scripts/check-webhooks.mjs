#!/usr/bin/env node
/* Reliability audit P1-9/10: Stripe event de-dupe and order-safe writes,
   reconcile, and Plaid JWT verification with a generated ES256 key.
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-webhooks.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createHash, sign } from 'node:crypto';
import { createMockSupabase } from './lib/mock-supabase.mjs';
import {
  claimStripeEvent,
  finishStripeEvent,
  handleStripeEvent,
  applySubscription,
  reconcileStripe,
} from '../src/lib/billing/stripe-webhook.js';
import { verifyPlaidWebhookWith } from '../src/lib/plaid-webhook-verify.js';

const USER = 'u-1';
const db = () =>
  createMockSupabase({
    unique: { stripe_events: [['id']] },
    seed: {
      profiles: [
        {
          id: USER,
          stripe_customer_id: 'cus_1',
          subscription_id: 'sub_new',
          subscription_status: 'active',
          subscription_source: 'stripe',
        },
      ],
    },
  });

const sub = (id, status, extra = {}) => ({
  id,
  status,
  customer: 'cus_1',
  current_period_end: 1_900_000_000,
  items: { data: [{ price: { id: 'price_1' } }] },
  metadata: { supabase_user_id: USER, plan_key: 'pro' },
  ...extra,
});

test('stripe: 10 parallel deliveries of one event, one is processed', async () => {
  const admin = db();
  const ev = { id: 'evt_1', type: 'customer.subscription.updated', created: 1_800_000_000 };
  const claims = await Promise.all(Array.from({ length: 10 }, () => claimStripeEvent(admin, ev)));
  assert.equal(claims.filter((c) => c === 'claimed').length, 1);
  assert.ok(claims.filter((c) => c !== 'claimed').every((c) => c === 'in_flight'));
  await finishStripeEvent(admin, 'evt_1', { ok: true });
  assert.equal(await claimStripeEvent(admin, ev), 'duplicate');
});

test('stripe: a failed event is re-claimed on redelivery', async () => {
  const admin = db();
  const ev = { id: 'evt_2', type: 'x', created: 1 };
  assert.equal(await claimStripeEvent(admin, ev), 'claimed');
  await finishStripeEvent(admin, 'evt_2', { ok: false, error: new Error('boom') });
  assert.equal(await claimStripeEvent(admin, ev), 'claimed');
  assert.equal(admin.rows('stripe_events')[0].attempts, 2);
});

test('stripe: a late event writes the RE-FETCHED state, not its stale payload', async () => {
  const admin = db();
  const stripe = { subscriptions: { retrieve: async (id) => sub(id, 'active') } };
  /* Stale payload says past_due; Stripe now says active. */
  await handleStripeEvent(
    { admin, stripe },
    { type: 'customer.subscription.updated', data: { object: sub('sub_new', 'past_due') } },
  );
  assert.equal(admin.rows('profiles')[0].subscription_status, 'active');
});

test('stripe: an old subscription ending never clears the current one', async () => {
  const admin = db();
  const r = await applySubscription(admin, sub('sub_old', 'canceled'));
  assert.equal(r, 'not_current');
  assert.equal(admin.rows('profiles')[0].subscription_id, 'sub_new');
  const r2 = await applySubscription(admin, sub('sub_new', 'canceled'));
  assert.equal(r2, 'updated');
  assert.equal(admin.rows('profiles')[0].subscription_status, 'canceled');
  assert.equal(admin.rows('profiles')[0].subscription_id, null);
});

test('stripe: a failed profiles write throws (route answers 500, Stripe retries)', async () => {
  const admin = db();
  admin.from = ((orig) => (t) => {
    const b = orig(t);
    if (t === 'profiles') {
      const up = b.update;
      b.update = (p) => {
        up(p);
        b.then = (res) => res({ data: null, error: { message: 'db down' } });
        return b;
      };
    }
    return b;
  })(admin.from);
  await assert.rejects(applySubscription(admin, sub('sub_new', 'active')), /db down/);
});

test('stripe reconcile: fixes drift and catches a lost cancellation', async () => {
  const admin = createMockSupabase({
    seed: {
      profiles: [
        {
          id: 'a',
          stripe_customer_id: 'cus_a',
          subscription_id: 'sub_a',
          subscription_status: 'past_due',
          subscription_source: 'stripe',
        },
        {
          id: 'b',
          stripe_customer_id: 'cus_b',
          subscription_id: 'sub_b',
          subscription_status: 'active',
          subscription_source: 'stripe',
        },
      ],
    },
  });
  const live = [sub('sub_a', 'active', { customer: 'cus_a', metadata: {} })];
  const stripe = {
    subscriptions: {
      list: ({ status }) =>
        (async function* gen() {
          for (const s of live) if (s.status === status) yield s;
        })(),
      retrieve: async (id) => sub(id, 'canceled', { customer: 'cus_b', metadata: {} }),
    },
  };
  const out = await reconcileStripe({ admin, stripe });
  assert.equal(out.fixed, 1);
  assert.equal(out.ended, 1);
  const byId = Object.fromEntries(admin.rows('profiles').map((p) => [p.id, p]));
  assert.equal(byId.a.subscription_status, 'active');
  assert.equal(byId.b.subscription_status, 'canceled');
});

/* ── Plaid ── */
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1' };

function plaidToken(body, { iat = Math.floor(Date.now() / 1000), alg = 'ES256', kid = 'k1' } = {}) {
  const h = Buffer.from(JSON.stringify({ alg, kid, typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(
    JSON.stringify({ iat, request_body_sha256: createHash('sha256').update(body).digest('hex') }),
  ).toString('base64url');
  const sig = sign('sha256', Buffer.from(`${h}.${p}`), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });
  return `${h}.${p}.${sig.toString('base64url')}`;
}
const opts = () => ({ getKey: async () => jwk, cache: new Map() });

test('plaid: a genuine ES256 (raw r||s) signature verifies', async () => {
  const body = '{"webhook_type":"HOLDINGS"}';
  assert.equal(await verifyPlaidWebhookWith(body, plaidToken(body), opts()), true);
});

test('plaid: tampered body, old token, wrong alg, expired key or no header are refused', async () => {
  const body = '{"a":1}';
  assert.equal(await verifyPlaidWebhookWith('{"a":2}', plaidToken(body), opts()), false);
  assert.equal(
    await verifyPlaidWebhookWith(
      body,
      plaidToken(body, { iat: Math.floor(Date.now() / 1000) - 600 }),
      opts(),
    ),
    false,
  );
  assert.equal(
    await verifyPlaidWebhookWith(body, plaidToken(body, { alg: 'none' }), opts()),
    false,
  );
  assert.equal(
    await verifyPlaidWebhookWith(body, plaidToken(body), {
      getKey: async () => ({ ...jwk, expired_at: 1 }),
      cache: new Map(),
    }),
    false,
  );
  assert.equal(await verifyPlaidWebhookWith(body, '', opts()), false);
});
