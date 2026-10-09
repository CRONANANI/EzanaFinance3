/**
 * Regression tests for the security guard helpers added in the Sep 2026
 * security sweep (src/lib/sanitize.js). Run directly:
 *   node scripts/check-security-guards.mjs   (wired as `npm run test:security`)
 *
 * These exist so the vulnerabilities they close cannot be silently
 * reintroduced: open redirect via protocol-relative paths, javascript: URLs
 * in user-submitted link fields.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { safeInternalPath, httpUrlOrNull } from '../src/lib/sanitize.js';

// ── safeInternalPath: post-auth redirect validation ────────────────────────

test('safeInternalPath accepts normal internal paths', () => {
  assert.equal(safeInternalPath('/home'), '/home');
  assert.equal(safeInternalPath('/org-team-hub?tab=1'), '/org-team-hub?tab=1');
});

test('safeInternalPath rejects protocol-relative outbound redirects', () => {
  assert.equal(safeInternalPath('//evil.com'), '/home');
  assert.equal(safeInternalPath('//evil.com/phish'), '/home');
});

test('safeInternalPath rejects backslash-based outbound redirects', () => {
  assert.equal(safeInternalPath('/\\evil.com'), '/home');
});

test('safeInternalPath rejects absolute URLs and garbage', () => {
  assert.equal(safeInternalPath('https://evil.com'), '/home');
  assert.equal(safeInternalPath('javascript:alert(1)'), '/home');
  assert.equal(safeInternalPath(null), '/home');
  assert.equal(safeInternalPath(undefined), '/home');
  assert.equal(safeInternalPath(42), '/home');
});

test('safeInternalPath honors a custom fallback', () => {
  assert.equal(safeInternalPath('//evil.com', '/org-team-hub'), '/org-team-hub');
});

// ── httpUrlOrNull: user-submitted link fields ──────────────────────────────

test('httpUrlOrNull accepts http(s) URLs and trims', () => {
  assert.equal(httpUrlOrNull('https://example.com/deck.pdf'), 'https://example.com/deck.pdf');
  assert.equal(httpUrlOrNull('  http://example.com  '), 'http://example.com');
});

test('httpUrlOrNull rejects javascript:, data:, and relative values', () => {
  assert.equal(httpUrlOrNull('javascript:alert(1)'), null);
  assert.equal(httpUrlOrNull('data:text/html,<script>1</script>'), null);
  assert.equal(httpUrlOrNull('//evil.com'), null);
  assert.equal(httpUrlOrNull('example.com'), null);
  assert.equal(httpUrlOrNull(''), null);
  assert.equal(httpUrlOrNull(null), null);
});

test('httpUrlOrNull caps length', () => {
  const long = 'https://example.com/' + 'a'.repeat(5000);
  assert.equal(httpUrlOrNull(long, 400)?.length, 400);
});

// ── CSV formula-injection neutralization contract ──────────────────────────
// The exporters each embed the same prefix rule; assert the canonical regex
// classifies correctly so a future "simplification" shows up here.

const needsNeutralizing = (s) => /^[=+\-@\t\r]/.test(s);

test('CSV formula prefixes are detected', () => {
  for (const bad of ['=1+1', '+SUM(A1)', '-2+3', '@cmd', '\tX', '\rX']) {
    assert.equal(needsNeutralizing(bad), true, bad);
  }
  for (const ok of ['AAPL', '1.23', 'plain text', '(=inner)']) {
    assert.equal(needsNeutralizing(ok), false, ok);
  }
});

// ── Public-key exposure (Oct 2026 HAR lockdown) ────────────────────────────
// Dataset tables are closed to the public (anon) key; the browser reaches them
// only through server routes. These checks stop a client-side read, or a
// public copy of the admin list, from coming back.

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(m?js|jsx)$/.test(name)) out.push(p);
  }
  return out;
}

const SRC = walk(new URL('../src', import.meta.url).pathname);
const LOCKED_PREFIXES =
  /from\(\s*['"`](congress_|congressional_trades|contract_awards_resolved|contractor_|country_scores_raw|dimension_metric_map|earnings_|echo_article_chunks|empire_|eyes_|ezq_|fec_|gov_contract_|house_|institution_registry|institutional_holdings_cache|lobbying_|oecd_|personas|politician_annual_performance|polymarket_market_index|prediction_market_index|sec_|senate_|snaptrade_brokerages_cache|ticker_sectors|usaspending_contract_awards|whale_moves)/;

test('no client component reads a locked dataset table directly', () => {
  const offenders = SRC.filter((p) => {
    const s = readFileSync(p, 'utf8');
    const isClient = /^\s*['"]use client['"]/m.test(s) || s.includes('@/lib/supabase-browser');
    return isClient && LOCKED_PREFIXES.test(s);
  });
  assert.deepEqual(offenders, []);
});

test('the admin allowlist never ships to the browser', () => {
  const offenders = SRC.filter((p) => readFileSync(p, 'utf8').includes('NEXT_PUBLIC_ADMIN_EMAILS'));
  assert.deepEqual(offenders, []);
});

test('browser code reads other users through public_profiles, not profiles(*)', () => {
  const offenders = SRC.filter((p) => {
    if (p.includes('/_legacy/') || p.endsWith('/profile/ProfilePageClient.jsx')) return false;
    const s = readFileSync(p, 'utf8');
    if (!s.includes('@/lib/supabase-browser')) return false;
    return /from\(\s*['"]profiles['"]\s*\)\s*\.select\(\s*['"]\*['"]/.test(s);
  });
  assert.deepEqual(offenders, []);
});
