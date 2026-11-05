/**
 * Sonar results framed to the app nav (Nov 4): inside the app the research
 * brief's left edge sits under the Ezana logo and the far-right card's right
 * edge under the logout icon. geometryFor() takes the measured frame.
 *   npm run test:sonar-nav-frame
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { geometryFor } = await import('@/components/landing/sonar-geometry');

test('without a frame the geometry is unchanged', () => {
  const g = geometryFor(1920, 1000, 64);
  assert.equal(g.content, 1440);
  assert.equal(g.gutter, 240);
  assert.equal(g.gutterR, 240);
  assert.equal(g.framed, false);
});

test('a frame spans the content box from the logo to the logout icon', () => {
  /* 1868px band: nav container capped at 1600 and centred (134px each
     side) plus its 32px padding; the logout glyph sits 7px inside its box. */
  const g = geometryFor(1868, 1000, 64, { left: 166, right: 173 });
  assert.equal(g.framed, true);
  assert.equal(g.gutter, 166);
  assert.equal(g.gutterR, 173);
  assert.equal(g.content, 1868 - 166 - 173);
  assert.equal(
    g.colL + g.colC + g.colR + 2 * g.gap,
    g.content,
    'the three columns fill the framed box exactly',
  );
  assert.ok(g.colL > 400, 'columns widen with the box');
});

test('a frame too narrow, invalid, or on a phone is ignored', () => {
  assert.equal(geometryFor(1100, 900, 64, { left: 200, right: 200 }).framed, false);
  assert.equal(geometryFor(1600, 900, 64, { left: -4, right: 32 }).framed, false);
  assert.equal(geometryFor(1600, 900, 64, { left: NaN, right: 32 }).framed, false);
  assert.equal(geometryFor(390, 844, 56, { left: 16, right: 16 }).framed, false);
});

test('the framed rules outrank the page band padding and use tokens only', () => {
  const css = readFileSync('src/components/landing/sonar-band.css', 'utf8');
  assert.match(css, /\.snr-band\.snr-composed\[data-nav-framed='on'\] \{/);
  assert.match(css, /padding-right: var\(--snr-gutter-r, var\(--snr-gutter\)\)/);
  const jsx = readFileSync('src/components/landing/SonarSection.jsx', 'utf8');
  assert.match(jsx, /#mainNav \.nav-logout-btn i/);
  assert.match(jsx, /px\('--snr-gutter-r', g\.gutterR\)/);
});
