/**
 * Home: "Top performers" heat map in My Portfolio (Nov 2026).
 * The ranking, the treemap layout and the colour scale
 * (src/lib/home/performance-heatmap.js), plus the wiring and the removal of
 * the rules around the 1W / 1M / YTD / Beta figures.
 *   node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-performance-heatmap.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  HEATMAP_MAX_TILES,
  heatmapTiles,
  mixPct,
  onStrong,
  squarify,
  tileTone,
  topPerformers,
} from '../src/lib/home/performance-heatmap.js';

const read = (p) => fs.readFileSync(p, 'utf8');
const P = (ticker, value, totalPct, dayPct = null) => ({
  ticker,
  name: '',
  value,
  totalPct,
  dayPct,
});

test('ranking: best return first, unknown returns and empty positions skipped, capped', () => {
  const rows = [
    P('AAPL', 1000, 12),
    P('NVDA', 500, 80, 2),
    P('MSFT', 800, -4, -1),
    P('ZERO', 0, 99),
    P('NOPE', 300, null, 5),
  ];
  assert.deepEqual(
    topPerformers(rows, 'total').map((r) => r.ticker),
    ['NVDA', 'AAPL', 'MSFT'],
  );
  assert.deepEqual(
    topPerformers(rows, 'day').map((r) => r.ticker),
    ['NOPE', 'NVDA', 'MSFT'],
  );
  const many = Array.from({ length: 20 }, (_, i) => P(`T${i}`, 100, i));
  assert.equal(topPerformers(many).length, HEATMAP_MAX_TILES);
  assert.equal(topPerformers(many)[0].ticker, 'T19');
});

test('one tile per ticker, value-weighted return', () => {
  const [row] = topPerformers([P('aapl', 100, 10), P('AAPL', 300, 30)]);
  assert.equal(row.ticker, 'AAPL');
  assert.equal(row.value, 400);
  assert.equal(row.pct, 25);
});

test('treemap: areas proportional to value, tiles cover the box without overlap', () => {
  const items = [6, 6, 4, 3, 2, 2, 1].map((v, i) => ({ ticker: `T${i}`, value: v }));
  const out = squarify(items, 100, 60);
  assert.equal(out.length, items.length);
  const total = items.reduce((a, i) => a + i.value, 0);
  let area = 0;
  for (const t of out) {
    const a = t.w * t.h;
    area += a;
    assert.ok(Math.abs(a - (t.value / total) * 6000) < 1e-6, `${t.ticker} area`);
    assert.ok(t.x >= -1e-9 && t.y >= -1e-9 && t.x + t.w <= 100 + 1e-9 && t.y + t.h <= 60 + 1e-9);
  }
  assert.ok(Math.abs(area - 6000) < 1e-6);
  for (let i = 0; i < out.length; i += 1)
    for (let j = i + 1; j < out.length; j += 1) {
      const a = out[i];
      const b = out[j];
      const overlap =
        Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1e-6 &&
        Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1e-6;
      assert.ok(!overlap, `${a.ticker} overlaps ${b.ticker}`);
    }
  assert.deepEqual(squarify([], 100, 100), []);
  assert.deepEqual(squarify([{ value: 0 }], 100, 100), []);
});

test('colour: the best performer is the strongest tile; sign picks the tone', () => {
  assert.deepEqual(tileTone(0, 10), { tone: 'flat', strength: 0 });
  assert.deepEqual(tileTone(-5, 10), { tone: 'down', strength: 0.5 });
  const tiles = heatmapTiles([P('A', 100, 40), P('B', 100, 10), P('C', 100, -20)]);
  const best = tiles.find((t) => t.ticker === 'A');
  assert.equal(best.strength, 1);
  assert.equal(best.tone, 'up');
  assert.equal(tiles.find((t) => t.ticker === 'C').tone, 'down');
  assert.equal(mixPct(0), 22);
  assert.equal(mixPct(1), 78);
  assert.equal(onStrong(1), true);
  assert.equal(onStrong(0.2), false);
});

test('wiring: heat map in My Portfolio from real positions; no rules around the hero figures', () => {
  const page = read('src/app/(dashboard)/home/page.js');
  assert.match(page, /usePortfolioPositions\(/);
  assert.match(page, /<PerformanceHeatmap/);
  const hero = page.slice(page.indexOf('bs-hero-stats'), page.indexOf('bs-hero-r"'));
  assert.match(hero, /<PerformanceHeatmap/, 'the heat map sits in the My Portfolio column');
  const css = read('src/app/(dashboard)/home/broadsheet.css');
  const rule = (sel) =>
    css.match(new RegExp(`\\n${sel.replace('.', '\\.')} \\{[^}]*\\}`))?.[0] || '';
  assert.doesNotMatch(rule('.bs-hero-stats'), /border/, 'no lines around the figures');
  assert.doesNotMatch(rule('.bs-hero-stat'), /border/, 'no lines between the figures');
  assert.match(
    rule('.bs-hero-stats'),
    /grid-template-columns: repeat\(4, 1fr\)/,
    'four figures on one line',
  );
  assert.doesNotMatch(
    css,
    /\.bs-hero-stats \{\s*grid-template-columns: repeat\(2/,
    'the figures never fold to two columns',
  );
  const comp = read('src/components/home/PerformanceHeatmap.jsx');
  assert.ok(!comp.includes('—'), 'no em dash');
  const start = css.indexOf('Top performers heat map');
  const section = css.slice(start, css.indexOf('.bs-heat-tile {\n    transition: none;', start));
  assert.ok(section.length > 500, 'found the heat map styles');
  assert.doesNotMatch(section, /#[0-9a-f]{3,8}\b|rgba?\(/i, 'tokens only');
});
