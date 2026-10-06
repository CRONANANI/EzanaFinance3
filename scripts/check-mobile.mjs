/**
 * Mobile app server logic. Run directly:
 *   node scripts/check-mobile.mjs   (wired as `npm run test:mobile`)
 *
 * Covers: the app's user-agent detection, the native route and API gates,
 * RevenueCat webhook auth, decisions and idempotency, the push fan-out (one
 * push per notification, 20 a day, dead tokens disabled), report validation,
 * the block filter, and the deep-link documents.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./mobile-node-loader.mjs', import.meta.url);

const native = await import('../src/lib/native.js');
const rc = await import('../src/lib/billing/revenuecat.js');
const plans = await import('../src/lib/billing/plans.js');
const fanoutCore = await import('../src/lib/push/fanout-core.js');
const { pushNotification } = await import('../src/lib/push/fanout.js');
const mod = await import('../src/lib/moderation/core.js');
const links = await import('../src/lib/mobile/app-links.js');

/* A tiny in-memory stand-in for the Supabase admin client: enough of the
   query builder for the code under test (eq, like, select count, insert with
   unique keys, update, delete, maybeSingle). */
function fakeAdmin(tables, unique = {}) {
  const db = structuredClone(tables);
  const builder = (name) => {
    const filters = [];
    let op = 'select';
    let payload = null;
    let head = false;
    const rows = () =>
      (db[name] ||= []).filter((r) =>
        filters.every(([k, kind, v]) =>
          kind === 'eq'
            ? r[k] === v
            : kind === 'like'
              ? new RegExp(
                  `^${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*')}$`,
                ).test(r[k])
              : r[k] == null,
        ),
      );
    const run = () => {
      if (op === 'insert') {
        const keys = unique[name] || [];
        for (const row of [].concat(payload)) {
          if (keys.length && db[name].some((r) => keys.every((k) => r[k] === row[k]))) {
            return { data: null, error: { code: '23505', message: 'duplicate key' } };
          }
          db[name].push({ ...row });
        }
        return { data: null, error: null };
      }
      if (op === 'update') {
        rows().forEach((r) => Object.assign(r, payload));
        return { data: null, error: null };
      }
      if (op === 'delete') {
        const gone = new Set(rows());
        db[name] = db[name].filter((r) => !gone.has(r));
        return { data: null, error: null };
      }
      const hit = rows();
      return head ? { count: hit.length, data: null, error: null } : { data: hit, error: null };
    };
    const q = {
      select(_c, opts) {
        if (op === 'select') head = !!opts?.head;
        return q;
      },
      insert(p) {
        op = 'insert';
        payload = p;
        return q;
      },
      update(p) {
        op = 'update';
        payload = p;
        return q;
      },
      delete() {
        op = 'delete';
        return q;
      },
      eq(k, v) {
        filters.push([k, 'eq', v]);
        return q;
      },
      like(k, v) {
        filters.push([k, 'like', v]);
        return q;
      },
      is(k) {
        filters.push([k, 'is', null]);
        return q;
      },
      maybeSingle: async () => {
        const r = run();
        return { data: r.data?.[0] ?? null, error: r.error };
      },
      then: (res, rej) => Promise.resolve(run()).then(res, rej),
    };
    return q;
  };
  return { from: builder, db };
}

/* ── user agent ─────────────────────────────────────────────────────── */

test('isNativeRequest reads the EzanaApp user-agent suffix', () => {
  const ios =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 EzanaApp/1.0 (iOS)';
  const android =
    'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Mobile Safari/537.36 EzanaApp/1.0 (Android)';
  assert.equal(native.isNativeRequest(new Headers({ 'user-agent': ios })), true);
  assert.equal(native.isNativeRequest({ 'user-agent': android }), true);
  assert.deepEqual(native.parseNativeUserAgent(android), { version: '1.0', platform: 'android' });
  assert.equal(native.isNativeRequest(new Headers({ 'user-agent': 'Mozilla/5.0 Safari' })), false);
  assert.equal(native.isNativeRequest(new Headers()), false);
  assert.equal(native.isNativeRequest({ 'user-agent': 'EzanaApp (iOS)' }), false);
});

test('native routes: landing to home, pricing to upgrade, real-money trading web-only', () => {
  assert.equal(native.nativeRedirectFor('/'), '/home');
  assert.equal(native.nativeRedirectFor('/pricing'), '/upgrade');
  assert.equal(native.nativeRedirectFor('/subscribe'), '/upgrade');
  assert.equal(native.nativeRedirectFor('/trading'), '/web-only');
  assert.equal(native.nativeRedirectFor('/trading/open-account'), '/web-only');
  assert.equal(native.nativeRedirectFor('/trading/mock'), null, 'paper trading stays');
  assert.equal(native.nativeRedirectFor('/home'), null);
  assert.equal(native.isNativeBlockedApi('/api/stripe/create-checkout-session'), true);
  assert.equal(native.isNativeBlockedApi('/api/plaid/create-link-token'), true);
  assert.equal(native.isNativeBlockedApi('/api/plaid/webhook'), false);
  assert.equal(native.isNativeBlockedApi('/api/mock-trades'), false);
});

/* ── RevenueCat ─────────────────────────────────────────────────────── */

const USER = '11111111-2222-3333-4444-555555555555';
const evt = (over = {}) => ({
  id: 'evt_1',
  type: 'INITIAL_PURCHASE',
  app_user_id: USER,
  product_id: 'world.ezana.app.personal_advanced.monthly',
  store: 'APP_STORE',
  expiration_at_ms: Date.parse('2026-11-06T00:00:00Z'),
  ...over,
});

test('webhook auth: exact secret only, with or without Bearer', () => {
  assert.equal(rc.revenueCatAuthorized('s3cret', 's3cret'), true);
  assert.equal(rc.revenueCatAuthorized('Bearer s3cret', 's3cret'), true);
  assert.equal(rc.revenueCatAuthorized('s3cre', 's3cret'), false);
  assert.equal(rc.revenueCatAuthorized(null, 's3cret'), false);
  assert.equal(rc.revenueCatAuthorized('anything', ''), false);
});

test('store products map to the same plan keys Stripe writes', () => {
  assert.equal(
    plans.planForProduct('world.ezana.app.personal.annual').planKey,
    'individual_annual',
  );
  assert.equal(
    plans.planForProduct('world.ezana.app.professional.monthly:base').planKey,
    'professional_monthly',
  );
  assert.equal(plans.planForProduct('world.ezana.app.platinum.monthly'), null);
  assert.equal(plans.APP_PRODUCT_IDS.length, 8);
});

test('purchase, cancellation, billing issue and expiration decisions', () => {
  const buy = rc.revenueCatUpdate(evt(), null);
  assert.equal(buy.update.subscription_status, 'active');
  assert.equal(buy.update.subscription_plan, 'personal_advanced_monthly');
  assert.equal(buy.update.subscription_source, 'apple');
  assert.equal(buy.update.subscription_period_end, '2026-11-06T00:00:00.000Z');

  const g = rc.revenueCatUpdate(evt({ store: 'PLAY_STORE' }), null);
  assert.equal(g.update.subscription_source, 'google');

  const cancel = rc.revenueCatUpdate(evt({ type: 'CANCELLATION' }), {
    subscription_source: 'apple',
  });
  assert.equal(cancel.update.subscription_status, undefined, 'access runs to the period end');
  assert.equal(
    rc.revenueCatUpdate(evt({ type: 'BILLING_ISSUE' }), null).update.subscription_status,
    'past_due',
  );
  const exp = rc.revenueCatUpdate(evt({ type: 'EXPIRATION' }), { subscription_source: 'apple' });
  assert.equal(exp.update.subscription_status, 'canceled');
  /* An Apple expiry never cancels an active Stripe subscription. */
  assert.ok(
    rc.revenueCatUpdate(evt({ type: 'EXPIRATION' }), { subscription_source: 'stripe' }).skip,
  );
  assert.ok(rc.revenueCatUpdate(evt({ type: 'TEST' }), null).skip);
});

test('a store purchase over an active Stripe plan wins and is flagged', () => {
  const r = rc.revenueCatUpdate(evt(), {
    subscription_source: 'stripe',
    subscription_status: 'active',
    subscription_plan: 'family_monthly',
    subscription_period_end: '2099-01-01T00:00:00Z',
  });
  assert.equal(r.update.subscription_source, 'apple');
  assert.match(r.conflict, /Stripe/);
});

test('webhook is idempotent on the event id', async () => {
  const admin = fakeAdmin(
    { notification_delivery_log: [], profiles: [{ id: USER, subscription_status: null }] },
    { notification_delivery_log: ['user_id', 'event_fingerprint'] },
  );
  const first = await rc.handleRevenueCatEvent(admin, evt());
  assert.equal(first.status, 200);
  assert.equal(admin.db.profiles[0].subscription_status, 'active');
  admin.db.profiles[0].subscription_status = 'tampered';
  const again = await rc.handleRevenueCatEvent(admin, evt());
  assert.equal(again.body.duplicate, true);
  assert.equal(admin.db.profiles[0].subscription_status, 'tampered', 'replay changed nothing');
  const anon = await rc.handleRevenueCatEvent(
    admin,
    evt({ id: 'e2', app_user_id: '$RCAnonymousID:x' }),
  );
  assert.equal(anon.body.skipped, 'anonymous user');
});

/* ── push fan-out ───────────────────────────────────────────────────── */

test('fan-out: one push per notification, 20 a day, dead tokens disabled', async () => {
  const uid = USER;
  const admin = fakeAdmin(
    {
      device_push_tokens: [
        { id: 't1', user_id: uid, token: 'ios-token-aaaaaaaaaa', platform: 'ios', enabled: true },
        {
          id: 't2',
          user_id: uid,
          token: 'and-token-bbbbbbbbbb',
          platform: 'android',
          enabled: true,
        },
      ],
      user_interest_profiles: [],
      notification_delivery_log: [],
    },
    { notification_delivery_log: ['user_id', 'event_fingerprint'] },
  );
  const sent = [];
  const senders = {
    configured: () => true,
    ios: async (token) => {
      sent.push(token);
      return { ok: true };
    },
    android: async (token) => {
      sent.push(token);
      return { ok: false, unregistered: true };
    },
  };
  const row = { id: 'n1', user_id: uid, title: 'Hello', content: 'World ↳ /home' };
  const r1 = await pushNotification(admin, row, { senders });
  assert.equal(r1.sent, 1);
  assert.equal(sent.length, 2);
  assert.equal(admin.db.device_push_tokens.find((t) => t.id === 't2').enabled, false);

  const r2 = await pushNotification(admin, row, { senders });
  assert.equal(r2.duplicate, true, 'the same notification never pushes twice');

  for (let i = 2; i <= 25; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await pushNotification(admin, { ...row, id: `n${i}` }, { senders });
  }
  const today = admin.db.notification_delivery_log.filter((l) =>
    l.event_fingerprint.startsWith(`push:${fanoutCore.utcDay()}:`),
  );
  assert.equal(today.length, fanoutCore.DAILY_PUSH_CAP, 'capped at 20 a day');
});

test('fan-out respects the push switch in notification preferences', async () => {
  const admin = fakeAdmin({
    device_push_tokens: [
      { id: 't', user_id: USER, token: 'x'.repeat(20), platform: 'ios', enabled: true },
    ],
    user_interest_profiles: [{ user_id: USER, notification_prefs: { mobile_push: false } }],
    notification_delivery_log: [],
  });
  const r = await pushNotification(
    admin,
    { id: 'n', user_id: USER, title: 't', content: 'c' },
    {
      senders: {
        configured: () => true,
        ios: async () => ({ ok: true }),
        android: async () => ({ ok: true }),
      },
    },
  );
  assert.equal(r.sent, 0);
});

test('push text and deep link come from the notification row', () => {
  assert.equal(
    fanoutCore.pushUrl('Apple beat estimates ($AAPL)\n↳ /company-research?q=AAPL'),
    '/company-research?q=AAPL',
  );
  assert.equal(fanoutCore.pushUrl('No link here'), '/home');
  assert.equal(fanoutCore.pushText({ title: '', content: 'x' }).title, 'Ezana');
});

/* ── moderation ─────────────────────────────────────────────────────── */

test('report validation', () => {
  const id = '11111111-2222-3333-4444-555555555555';
  assert.ok(
    mod.validateReport({ contentType: 'community_post', contentId: id, reason: 'spam' }).value,
  );
  assert.ok(mod.validateReport({ contentType: 'post', contentId: id, reason: 'spam' }).error);
  assert.ok(mod.validateReport({ contentType: 'message', contentId: 'x', reason: 'spam' }).error);
  assert.ok(mod.validateReport({ contentType: 'message', contentId: id, reason: 'rude' }).error);
  assert.equal(
    mod.validateReport({
      contentType: 'profile',
      contentId: id,
      reason: 'other',
      details: 'a'.repeat(2000),
    }).value.details.length,
    1000,
  );
  assert.equal(mod.shouldAutoHide(2), false);
  assert.equal(mod.shouldAutoHide(3), true);
});

test('block filter hides blocked authors and moderation-hidden items', () => {
  const items = [
    { id: 1, user_id: 'a' },
    { id: 2, user_id: 'b' },
    { id: 3, user_id: 'c', moderation_hidden_at: '2026-10-06T00:00:00Z' },
  ];
  assert.deepEqual(
    mod.filterVisible(items, { blocked: new Set(['b']) }).map((i) => i.id),
    [1],
  );
  assert.deepEqual(
    mod.filterVisible([{ id: 9, sender_id: 'b' }], {
      blocked: new Set(['b']),
      authorKey: 'sender_id',
    }),
    [],
  );
});

/* ── deep links ─────────────────────────────────────────────────────── */

test('app links: 404 (null) until configured, correct documents after', () => {
  assert.equal(links.appleAppSiteAssociation(undefined), null);
  assert.equal(links.appleAppSiteAssociation('bad'), null);
  const aasa = links.appleAppSiteAssociation('ABCDE12345');
  assert.deepEqual(aasa.applinks.details[0].appIDs, ['ABCDE12345.world.ezana.app']);
  assert.ok(aasa.applinks.details[0].components.some((c) => c['/'] === '/datasets/*'));
  assert.equal(links.assetLinks(''), null);
  const fp = Array.from({ length: 32 }, () => 'AB').join(':');
  const al = links.assetLinks(fp);
  assert.equal(al[0].target.package_name, 'world.ezana.app');
  assert.deepEqual(al[0].target.sha256_cert_fingerprints, [fp]);
});
