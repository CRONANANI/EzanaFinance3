/**
 * Provider failure isolation (Sonar 6.4 final integration). Mocked providers and source
 * scans; no network, no database.
 *
 *   - a Quiver 403 is "provider unavailable" (503), never "no filings", and is not retried
 *   - Quiver never writes institutional (13F) data; Sonar's 13F research reads SEC tables
 *   - organization and personal entitlements stay separate
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { serveQuiver, clearQuiverCache, noteQuiverRefusal } from '../src/lib/quiver/proxy.js';

const walk = (dir, out = []) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|jsx|mjs)$/.test(n)) out.push(p);
  }
  return out;
};
const read = (p) => readFileSync(p, 'utf8');

test('Quiver 403: unavailable, not empty, one upstream attempt per hour across callers', async () => {
  clearQuiverCache();
  let calls = 0;
  const fetchAll = async () => {
    calls += 1;
    noteQuiverRefusal('sec13f', 403);
    return { rows: [], pages: 1, failed: true };
  };
  const base = { route: 'sec13f', dailyLimit: 10, limiter: async () => ({ allowed: true }) };
  const a = await serveQuiver({ ...base, caller: 'u:1', params: { ticker: 'NVDA' }, fetchAll });
  const b = await serveQuiver({ ...base, caller: 'u:2', params: { ticker: 'MSFT' }, fetchAll });
  assert.equal(a.unavailable, true);
  assert.equal(b.unavailable, true);
  assert.ok(!a.rows?.length);
  assert.equal(calls, 1);
  /* The refusal is per route: congress trades on the same key keep working. */
  const c = await serveQuiver({
    ...base,
    route: 'congress',
    caller: 'u:1',
    params: { ticker: 'NVDA' },
    fetchAll: async () => ({ rows: [{ Ticker: 'NVDA' }], pages: 1 }),
  });
  assert.equal(c.unavailable, undefined);
  assert.equal(c.rows.length, 1);
  clearQuiverCache();
});

test('the Quiver routes answer 503 provider_unavailable and never write to the database', () => {
  for (const p of [
    'src/app/api/quiver/sec13f/route.js',
    'src/app/api/quiver/congress-trades/route.js',
  ]) {
    const s = read(p);
    assert.match(s, /error: 'provider_unavailable'/);
    assert.match(s, /status: 503/);
    assert.ok(!/\.(upsert|insert|update|delete)\(/.test(s), `${p} writes`);
  }
  assert.ok(!/\.(upsert|insert|update)\(/.test(read('src/lib/quiver/proxy.js')));
});

test('Quiver cannot overwrite SEC-derived institutional research', () => {
  const files = walk('src');
  /* The only job that writes Quiver data inserts unverified lobbying pairs and never
     overwrites an existing row; nothing writes Quiver data into a 13F table. */
  for (const f of files) {
    const s = read(f);
    if (!/quiverquant|lib\/quiver|api\/quiver/.test(s)) continue;
    assert.ok(!/from\('sec_13f[a-z_]*'\)[\s\S]{0,200}\.(upsert|insert|update|delete)\(/.test(s), f);
  }
  const harvest = read('src/app/api/cron/harvest-lobbying-tickers/route.js');
  assert.match(harvest, /ignoreDuplicates: true/);
  assert.match(harvest, /verified: false/);
  /* Sonar never calls Quiver for 13F; it reads SEC's filings tables. */
  const sonar = walk('src/lib/sonar');
  assert.ok(sonar.every((f) => !/api\/quiver\/sec13f|quiverquant/.test(read(f))));
  assert.ok(sonar.some((f) => /from\('sec_13f_(effective_filings|holdings)'\)/.test(read(f))));
});

test('organization and personal entitlements are resolved separately', async () => {
  const { getSonarEntitlements } = await import('../src/lib/sonar/entitlements.js');
  const personalFree = getSonarEntitlements({ planTier: 0 });
  const orgFree = getSonarEntitlements({ planTier: 0, version: 'org', orgRole: 'analyst' });
  const personalPro = getSonarEntitlements({ planTier: 2 });
  /* An org seat adds the org's own data and nothing from a personal paid plan. */
  assert.ok(orgFree.datasets.includes('org-internal'));
  assert.ok(!orgFree.datasets.includes('13f'));
  assert.equal(orgFree.dailyQueries, personalFree.dailyQueries);
  assert.equal(orgFree.exportsEnabled, false);
  /* A personal plan never grants org data. */
  assert.ok(!personalPro.datasets.includes('org-internal'));
  assert.ok(personalPro.datasets.includes('13f'));
  assert.equal(personalPro.userLookup, false);
});
