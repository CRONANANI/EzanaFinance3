/**
 * Dotted world map guard (Nov 2026). The Market Analysis map draws a
 * jittered dot field on a canvas from precomputed data; the landing hero is
 * a static SVG of the original lattice. This checks the pieces that must not
 * drift:
 *
 *   - the packed data still decodes to the 170-row diagonal lattice
 *     (24,480 land cells) with a country for most of them;
 *   - financial-centre pins project exactly where the old renderer put them;
 *   - sampled dots are deterministic, all on land, and NOT on a lattice
 *     (the regular lattice is what produced the rows and moire);
 *   - the hero SVGs are still the lattice the generator reproduces;
 *   - WorldMap no longer builds the lattice at runtime or CSS-scales a
 *     raster layer.
 *
 *   node --no-warnings --test scripts/check-dotted-world.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildWorld,
  sampleDots,
  latticeSvg,
  encodeIsoRuns,
  decodeIsoRuns,
} from '../src/lib/geo/dotted-world.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const world = buildWorld(JSON.parse(read('src/lib/geo/dotted-world-data.json')));

test('packed data decodes to the 170-row diagonal lattice', () => {
  assert.equal(world.width, 337);
  assert.equal(world.height, 170);
  assert.equal(world.grid, 'diagonal');
  assert.equal(world.count, 24480);
  const withCountry = world.cellIso.filter(Boolean).length;
  assert.ok(withCountry / world.count > 0.9, `only ${withCountry} cells have a country`);
  const us = world.cellIso.filter((c) => c === 'US').length;
  assert.ok(us > 1500 && us < 2600, `US cells: ${us}`);
});

test('country run-length codec round-trips', () => {
  const isos = ['US', 'US', null, 'CA', 'CA', 'CA', 'US', null, null];
  assert.deepEqual(decodeIsoRuns(encodeIsoRuns(isos), isos.length), isos);
});

test('financial-centre pins project where the old lattice put them', () => {
  // Values from new DottedMap({ height: 170, grid: 'diagonal' }).getPin().
  const expected = {
    'New York': [40.7128, -74.006, 94, 58.023702053557386],
    London: [51.5074, -0.1278, 168, 42.43524478543749],
    Tokyo: [35.6762, 139.6503, 308.5, 64.08587988004845],
    Sydney: [-33.8688, 151.2093, 320.5, 138.56406460551017],
    'Sao Paulo': [-23.5505, -46.6333, 121.5, 126.43970895252804],
    Johannesburg: [-26.2041, 28.0473, 197, 129.03778516388135],
  };
  for (const [city, [lat, lng, x, y]] of Object.entries(expected)) {
    const pin = world.getPin(lat, lng);
    assert.equal(pin.x, x, `${city} x`);
    assert.equal(pin.y, y, `${city} y`);
  }
});

test('sampled dots are deterministic and on land', () => {
  const a = sampleDots(buildWorld(JSON.parse(read('src/lib/geo/dotted-world-data.json'))), 1.26);
  const b = sampleDots(world, 1.26);
  assert.equal(a.count, b.count);
  assert.deepEqual(Array.from(a.x.slice(0, 50)), Array.from(b.x.slice(0, 50)));
  for (let i = 0; i < b.count; i++) assert.ok(world.cellAt(b.x[i], b.y[i]) >= 0);
});

test('sampled dots are not on a lattice (no rows, columns or diagonals)', () => {
  const d = sampleDots(world, 1);
  // On the old lattice every y is a multiple of ystep. Jittered dots almost
  // never are, and their rows do not repeat.
  let onRow = 0;
  const ys = new Set();
  for (let i = 0; i < d.count; i++) {
    const r = d.y[i] / world.ystep;
    if (Math.abs(r - Math.round(r)) < 0.02) onRow++;
    ys.add(Math.round(d.y[i] * 100));
  }
  assert.ok(onRow / d.count < 0.1, `${onRow} of ${d.count} dots sit on lattice rows`);
  assert.ok(ys.size > d.count * 0.3, 'dot heights repeat like a lattice');
  // Density stays even: about one dot per land cell at spacing 1.
  assert.ok(Math.abs(d.count / world.count - 1) < 0.05, `${d.count} dots for ${world.count} cells`);
});

test('hero SVGs are the lattice the generator reproduces', () => {
  for (const [variant, color] of [
    ['sparse', 'rgba(5, 150, 105, 0.7)'],
    ['dense', 'rgba(4, 120, 87, 0.92)'],
  ]) {
    const shipped = read(`public/images/landing/hero-dotted-map-${variant}.svg`);
    assert.equal(latticeSvg(world, { color }), shipped, `${variant} differs from the generator`);
  }
});

test('WorldMap draws on a canvas from the precomputed world', () => {
  const src = read('src/components/ui/world-map.tsx');
  assert.doesNotMatch(src, /new DottedMap\(/, 'the lattice is built at runtime again');
  assert.doesNotMatch(src, /from 'next\/image'/);
  assert.doesNotMatch(src, /willChange/);
  assert.doesNotMatch(src, /latLngToAlpha2Cached/);
  assert.match(src, /dotted-world-data\.json/);
  assert.match(src, /DottedWorldRenderer/);
  assert.match(src, /prefers-reduced-motion/);
  const r = read('src/components/ui/dotted-world-renderer.ts');
  assert.match(r, /devicePixelRatio/);
  assert.match(r, /--emerald/);
  for (const f of ['market-analysis-world-monitor.css', 'market-analysis-monitor.css']) {
    const css = read(`src/app/(dashboard)/market-analysis/${f}`);
    const inner = css.match(/\.world-map-inner \{[^}]*\}/)?.[0] || '';
    assert.doesNotMatch(
      inner.replace(/\/\*[^]*?\*\//g, ''),
      /will-change\s*:/,
      `${f}: .world-map-inner is GPU-promoted again`,
    );
  }
});

test('map colour tokens exist in every theme block that needs them', () => {
  const css = read('src/app/theme-variables.css');
  for (const t of ['--map-dot-alpha', '--map-dot-muted', '--map-power-bg']) {
    const n = css.split(`${t}:`).length - 1;
    assert.ok(n >= 3, `${t} declared ${n} times (dark, light, forced dark)`);
  }
});
