#!/usr/bin/env node
/* QA remediation (Retail-B): community image paths + bucket policy (MIG-2/R29),
   server-priced mock trades (RET-10), server-graded quizzes (RET-14),
   quote posts (RET-16), login-lockout proof (RET-9), email preferences (RET-7).
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-retail-qa.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCommunityImagePath } from '../src/lib/community-utils.js';
import { createMockSupabase } from './lib/mock-supabase.mjs';
import {
  executeMockTrade,
  resetMockPortfolio,
  applyTrade,
  freshPortfolio,
} from '../src/lib/trading/mock-portfolio.js';

const UID = '11111111-1111-4111-8111-111111111111';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* ── MIG-2 / R29 ─────────────────────────────────────────────────────── */

test('community image path starts with the uploader uid (bucket policy folder)', () => {
  const p = buildCommunityImagePath(UID, 'My Photo (1).PNG', 123);
  assert.equal(p, `${UID}/123-My-Photo-1-.PNG`);
  assert.equal(p.split('/')[0], UID);
});

test('community image path strips directories and traversal', () => {
  const p = buildCommunityImagePath(UID, '../../etc/passwd', 5);
  assert.equal(p, `${UID}/5-passwd`);
  assert.equal(buildCommunityImagePath(UID, '...', 5), `${UID}/5-image`);
  assert.throws(() => buildCommunityImagePath('', 'a.png'));
});

test('every community composer uses the uid-first path and surfaces upload errors', () => {
  for (const f of [
    'src/components/community/redesign_v2/EvoComposer.jsx',
    'src/components/community/_legacy/FeedComposer.jsx',
    'src/components/community/_legacy_v1/Composer.jsx',
  ]) {
    const src = read(f);
    assert.ok(!src.includes('community/${user.id}'), `${f}: legacy community/ prefix`);
    assert.ok(src.includes('buildCommunityImagePath('), `${f}: path helper`);
    assert.ok(src.includes('COMMUNITY_IMAGE_UPLOAD_ERROR'), `${f}: upload error shown`);
  }
});

test('bucket migration: owner folder policies, documents bucket has no policies', () => {
  const sql = read('supabase/migrations/20261026110000_storage_buckets_community_documents.sql');
  assert.match(sql, /\('community-images', 'community-images', true/);
  assert.match(sql, /\('documents', 'documents', false/);
  assert.match(sql, /\(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
  const createPolicies = sql.match(/create policy[^;]+;/g) || [];
  assert.equal(createPolicies.length, 3);
  for (const p of createPolicies) assert.ok(!p.includes("'documents'"));
});

/* ── RET-10 ──────────────────────────────────────────────────────────── */

const tradeDb = (portfolio) =>
  createMockSupabase({
    unique: { mock_trades: [['user_id', 'client_request_id']], mock_portfolios: [['user_id']] },
    seed: portfolio
      ? {
          mock_portfolios: [{ user_id: UID, portfolio, updated_at: '2026-10-25T00:00:00.000Z' }],
        }
      : {},
  });
const quoteAt = (price) => ({ getQuote: async () => ({ price }) });

test('mock trade ignores the client price and executes at the server quote', async () => {
  const db = tradeDb(freshPortfolio(10_000));
  const r = await executeMockTrade(
    db,
    UID,
    { ticker: 'aapl', side: 'buy', amount: 1000, price: 0.01, total_amount: 1 },
    quoteAt(200),
  );
  assert.equal(r.status, 200);
  assert.equal(r.body.trade.price, 200);
  assert.equal(r.body.trade.quantity, 5);
  assert.equal(r.body.portfolio.cash, 9000);
  assert.equal(r.body.portfolio.positions.AAPL.avgCost, 200);
  const [trade] = db.rows('mock_trades');
  assert.equal(trade.price, 200);
  assert.equal(trade.total_amount, 1000);
  assert.equal(db.rows('mock_portfolios')[0].portfolio.cash, 9000);
});

test('mock trade executes against stored cash: insufficient funds is a 400 and logs nothing', async () => {
  const db = tradeDb(freshPortfolio(500));
  const r = await executeMockTrade(
    db,
    UID,
    { ticker: 'AAPL', side: 'buy', amount: 1000, cash: 1e12 },
    quoteAt(100),
  );
  assert.equal(r.status, 400);
  assert.equal(db.rows('mock_trades').length, 0);
  assert.equal(db.rows('mock_portfolios')[0].portfolio.cash, 500);
});

test('mock trade: no server price is a 503, never a client-priced fill', async () => {
  const db = tradeDb(freshPortfolio());
  const r = await executeMockTrade(
    db,
    UID,
    { ticker: 'AAPL', side: 'buy', amount: 10, price: 1 },
    { getQuote: async () => null },
  );
  assert.equal(r.status, 503);
  assert.equal(db.rows('mock_trades').length, 0);
});

test('mock trade: first trade creates the portfolio row; sell and close work', async () => {
  const db = tradeDb(null);
  assert.equal(
    (await executeMockTrade(db, UID, { ticker: 'MSFT', side: 'buy', amount: 1000 }, quoteAt(100)))
      .status,
    200,
  );
  const s = await executeMockTrade(
    db,
    UID,
    { ticker: 'MSFT', side: 'sell', quantity: 4 },
    quoteAt(150),
  );
  assert.equal(s.status, 200);
  assert.equal(s.body.portfolio.positions.MSFT.qty, 6);
  assert.equal(s.body.portfolio.cash, 100_000 - 1000 + 600);
  const c = await executeMockTrade(
    db,
    UID,
    { ticker: 'MSFT', side: 'sell', close: true },
    quoteAt(50),
  );
  assert.equal(c.status, 200);
  assert.equal(c.body.portfolio.positions.MSFT, undefined);
  assert.equal(db.rows('mock_trades').length, 3);
});

test('mock trade: 10 parallel buys never overdraw; a repeated request id fills once', async () => {
  const db = tradeDb(freshPortfolio(5_000));
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      executeMockTrade(db, UID, { ticker: 'AAPL', side: 'buy', amount: 1000 }, quoteAt(100)),
    ),
  );
  const filled = results.filter((r) => r.status === 200).length;
  const cash = db.rows('mock_portfolios')[0].portfolio.cash;
  assert.ok(cash >= 0, `cash ${cash}`);
  assert.equal(cash, 5_000 - filled * 1000);
  assert.equal(db.rows('mock_trades').length, filled);

  const db2 = tradeDb(freshPortfolio(5_000));
  const body = { ticker: 'AAPL', side: 'buy', amount: 100, client_request_id: 'req-abcdefgh' };
  const [a, b] = await Promise.all([
    executeMockTrade(db2, UID, body, quoteAt(10)),
    executeMockTrade(db2, UID, body, quoteAt(10)),
  ]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(db2.rows('mock_trades').length, 1);
  assert.equal(db2.rows('mock_portfolios')[0].portfolio.cash, 4_900);
});

test('mock-portfolio POST accepts only a reset', async () => {
  const db = createMockSupabase();
  for (const bad of [
    null,
    { portfolio: { cash: 1e12 } },
    { action: 'set', cash: 1 },
    { action: 'reset', cash: 1e12 },
    { action: 'reset', startingCash: 1e12 },
  ]) {
    assert.equal((await resetMockPortfolio(db, UID, bad)).status, 400, JSON.stringify(bad));
  }
  const ok = await resetMockPortfolio(db, UID, { action: 'reset' });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body.portfolio, freshPortfolio());
  assert.equal(db.rows('mock_portfolios')[0].portfolio.cash, 100_000);
});

test('applyTrade sells are capped at the held quantity', () => {
  const p = applyTrade(freshPortfolio(1000), { ticker: 'X', side: 'buy', amount: 100 }, 10);
  const s = applyTrade(p.portfolio, { ticker: 'X', side: 'sell', quantity: 999 }, 20);
  assert.equal(s.trade.quantity, 10);
  assert.equal(s.portfolio.cash, 900 + 200);
});

test('gamification migration leaves only owner SELECT on the four tables', () => {
  const sql = read('supabase/migrations/20261026130000_server_only_gamification_writes.sql');
  for (const live of [
    'Users manage own mock portfolio',
    'Users insert own mock trades',
    'Users own course progress',
    'Users own learning badges',
  ]) {
    assert.ok(sql.includes(`drop policy if exists "${live}"`), live);
  }
  for (const p of sql.match(/create policy[^;]+;/g) || []) {
    assert.match(p, /for select to authenticated using \(auth\.uid\(\) = user_id\)/);
  }
  assert.ok(!/for all/i.test(sql.replace(/--.*$/gm, '')));
});

test('learning progress writes run on the admin client; no module-load admin', () => {
  const src = read('src/app/api/learning/progress/route.js');
  assert.ok(!/^const admin = getAdminClient\(\)/m.test(src));
  assert.ok(
    !/await supabase\s*\.from\('user_course_progress'\)\s*\.(insert|update|upsert)/.test(src),
  );
  assert.match(src, /syncTrackAndBadges\(admin,/);
  assert.match(src, /updateBrokerageFlags\(admin,/);
});
