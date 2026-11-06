/**
 * Ezana Echo article globe (Nov 2026).
 *   npm run test:echo-globe
 *
 * The Geography of the story rail draws its globe with cobe (CobeGlobe, the
 * 21st.dev cobe globe card ported to JSX and tokens). Labels, clicks and the
 * turn to the city the article is talking about all use cobe's own
 * projection (src/lib/echo/globe-math.js); these checks pin that maths and
 * the rail's wiring.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const G = await import('@/lib/echo/globe-math.js');

const CITIES = [
  ['Taipei', 25.03, 121.56],
  ['Phoenix', 33.45, -112.07],
  ['Dresden', 51.05, 13.74],
  ['Washington', 38.9, -77.04],
  ['Sydney', -33.87, 151.21],
  ['Sao Paulo', -23.55, -46.63],
];

test('focusing a city puts it at the centre of the globe, facing the viewer', () => {
  for (const [name, lat, lng] of CITIES) {
    const { phi, theta } = G.focusAngles(lat, lng);
    const at = G.locationToScreen(lat, lng, phi, theta);
    assert.ok(Math.abs(at.x - 0.5) < 1e-9, `${name} x ${at.x}`);
    assert.ok(Math.abs(at.y - 0.5) < 1e-9, `${name} y ${at.y}`);
    assert.equal(at.visible, true, name);
    assert.ok(at.depth > 0.99, `${name} depth ${at.depth}`);
  }
});

test('a city on the far side is hidden, one at the rim is at the edge', () => {
  const { phi, theta } = G.focusAngles(0, 0);
  const far = G.locationToScreen(0, 180, phi, theta);
  assert.equal(far.visible, false);
  const rim = G.locationToScreen(0, 90, phi, theta);
  assert.ok(Math.abs(rim.depth) < 1e-9);
  /* The globe's radius is 0.8 of the half width, plus the marker elevation. */
  assert.ok(Math.abs(Math.abs(rim.x - 0.5) - (G.RADIUS + G.MARKER_ELEVATION) / 2) < 1e-9);
});

test('the turn to a city is always the short way round', () => {
  assert.ok(Math.abs(G.shortestTurn(0, Math.PI * 1.9) - -Math.PI * 0.1) < 1e-9);
  assert.ok(Math.abs(G.shortestTurn(Math.PI * 1.9, 0.1) - (Math.PI * 0.1 + 0.1)) < 1e-9);
  assert.ok(Math.abs(G.shortestTurn(10 * Math.PI, 10 * Math.PI + 0.3) - 0.3) < 1e-9);
  for (let i = 0; i < 50; i += 1) {
    const d = G.shortestTurn(Math.random() * 40 - 20, Math.random() * 40 - 20);
    assert.ok(d >= -Math.PI && d <= Math.PI);
  }
});

test('the tilt toward a polar city is bounded', () => {
  assert.equal(G.focusAngles(78, 15).theta, G.MAX_THETA);
  assert.equal(G.focusAngles(-80, 0).theta, -G.MAX_THETA);
});

test('the rail draws CobeGlobe at its current size, with the same focus and jump wiring', () => {
  const rail = fs.readFileSync('src/components/echo/EchoGlobeRail.jsx', 'utf8');
  assert.match(rail, /import \{ CobeGlobe \} from '@\/components\/ui\/cobe-globe';/);
  assert.doesNotMatch(rail, /InteractiveGlobe/);
  assert.match(rail, /<CobeGlobe\s+size=\{280\}/);
  assert.match(rail, /focusTarget=\{globeFocus\}/);
  assert.match(rail, /activeIndex=\{focusIdx\}/);
  assert.match(rail, /onMarkerClick=\{onMarkerClick\}/);
  assert.match(rail, /paused=\{!visible\}/);
  /* Scroll sync and click-to-jump are unchanged. */
  assert.match(rail, /function buildSectionCardMap\(sections, cities\)/);
  assert.match(rail, /const RESUME_AUTOROTATE_MS = 2500;/);
});

test('the globe uses tokens only and cobe is a pinned dependency', () => {
  const jsx = fs.readFileSync('src/components/ui/cobe-globe.jsx', 'utf8');
  const css = fs.readFileSync('src/components/ui/cobe-globe.css', 'utf8');
  for (const src of [jsx, css]) assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/);
  assert.match(jsx, /tokenRgb\(wrap, '--echo-globe-ink'/);
  const theme = fs.readFileSync('src/app/theme-variables.css', 'utf8');
  for (const t of ['paper', 'ink', 'ink-2', 'ink-3', 'ink-4', 'glow', 'label-shadow']) {
    assert.match(theme, new RegExp(`--echo-globe-${t}:`));
  }
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(pkg.dependencies.cobe, '2.0.1');
});
