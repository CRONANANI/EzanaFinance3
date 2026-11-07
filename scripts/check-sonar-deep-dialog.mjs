/**
 * The deep research offer dialog (Nov 6): black glass, styled like the Sonar
 * free account popup (sonar-signup-cta.css).
 *
 *   node --no-warnings --test scripts/check-sonar-deep-dialog.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const jsx = read('src/components/sonar/DeepResearch.jsx');
const css = read('src/components/sonar/deep-research.css');
const rule = (sel) => {
  const i = css.indexOf(`${sel} {`);
  assert.ok(i >= 0, `${sel} rule`);
  return css.slice(i, css.indexOf('}', i));
};

test('the overlay stays dark in light mode and a press on the scrim closes', () => {
  assert.match(jsx, /className="sdr-overlay force-dark-theme"/);
  assert.match(jsx, /if \(e\.target === e\.currentTarget\) onClose\?\.\(\);/);
});

test('scrim and card match the free account popup', () => {
  const overlay = rule('.sdr-overlay');
  assert.doesNotMatch(overlay, /backdrop-filter/, 'the scrim lives on ::before');
  const scrim = rule('.sdr-overlay::before');
  assert.match(scrim, /background: color-mix\(in srgb, black 38%, transparent\)/);
  const card = rule('.sdr-card');
  assert.match(card, /background: color-mix\(in srgb, black 62%, transparent\)/);
  assert.match(card, /backdrop-filter: blur\(12px\)/);
  assert.match(
    card,
    /border: 1px solid color-mix\(in srgb, var\(--brand-band-mint\) 26%, transparent\)/,
  );
  assert.match(card, /color: white/);
  assert.match(rule('.sdr-card .sdr-eyebrow'), /color: var\(--brand-band-mint\)/);
  assert.match(rule('.sdr-card .sdr-title'), /color: white/);
});

test('emerald primary, ghost secondary, mint focus, 44px targets', () => {
  assert.match(rule('.sdr-card .sdr-btn--primary'), /background: var\(--emerald\)/);
  assert.match(rule('.sdr-card .sdr-btn--primary:hover'), /var\(--emerald-glow\)/);
  const ghost = rule('.sdr-card .sdr-btn');
  assert.match(ghost, /min-height: 44px/);
  assert.match(ghost, /border-color: color-mix\(in srgb, white 30%, transparent\)/);
  assert.match(rule('.sdr-card .sdr-btn:focus-visible'), /var\(--brand-band-mint\)/);
});

test('the run view gates keep the base buttons', () => {
  assert.match(rule('.sdr-btn'), /border: 1px solid var\(--border-primary\)/);
  assert.match(rule('.sdr-btn--primary'), /background: var\(--emerald\)/);
});

test('tokens only and no em dashes', () => {
  const start = css.indexOf('/* The offer dialog (Nov 6)');
  const block = css.slice(start, css.indexOf('/* The run view.'));
  assert.ok(start >= 0 && block.length > 500);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(block, /rgba?\(/);
  assert.ok(!css.includes('—') && !jsx.includes('—'));
});
