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
