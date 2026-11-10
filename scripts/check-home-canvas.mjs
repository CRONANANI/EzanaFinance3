#!/usr/bin/env node
/**
 * Home canvas (Nov 2026): the /home broadsheet is the template. Pages on it
 * carry `ez-canvas` on their root and import src/styles/home-canvas.css,
 * which lays their cards flat on the canvas (no fill, border or shadow),
 * rules them with hairlines and sets home type.
 *
 *   node --no-warnings --test scripts/check-home-canvas.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const CSS = 'src/styles/home-canvas.css';

const PAGES = [
  {
    name: 'Dashboard',
    page: 'src/app/(dashboard)/home-dashboard/page.js',
    root: 'src/components/dashboard/home/DashboardPage.jsx',
    // Nov 2026 redesign: cards come from dashboard.module.css, which lays
    // them flat itself (see the module-card test below), so there are no
    // shared shells to flatten here.
    shells: [],
  },
  {
    name: 'Community',
    page: 'src/app/(dashboard)/community/page.js',
    root: 'src/components/community/CommunityPage.jsx',
    shells: ['.ez-card', '.ledger-card', '.ledger-post'],
  },
  {
    name: 'Watchlist',
    page: 'src/app/(dashboard)/watchlist/page.js',
    root: 'src/app/(dashboard)/watchlist/page.js',
    shells: ['.wl-chart-panel', '.wl-side', '.wl-strip-card'],
  },
  {
    name: 'Mock Portfolio',
    page: 'src/app/(dashboard)/trading/mock/page.js',
    root: 'src/app/(dashboard)/trading/mock/page.js',
    shells: ['.mock-card', '.mock-trade-panel'],
  },
  {
    name: 'Learning Center',
    page: 'src/app/(dashboard)/learning-center/page.js',
    root: 'src/components/learning/hub/LearningHub.jsx',
    // Nov 2026 redesign: the hub's cards lay themselves flat (hairline, no
    // surface) in learning-hub.css, so there are no shared shells here.
    shells: [],
  },
  {
    name: 'Company & Portfolio Research',
    page: 'src/app/(dashboard)/company-research/page.js',
    root: 'src/app/(dashboard)/company-research/page.js',
    shells: ['.rco', '.cr-news-chain-card', '.mcs-card', '.ai-analysis-card', '.rc-card'],
  },
];

const css = read(CSS);
const shellBlock = (() => {
  const i = css.indexOf('/* ── 1. Card shells');
  const j = css.indexOf('/* No hover lift', i);
  return css.slice(i, j);
})();

for (const p of PAGES) {
  test(`${p.name}: root is on the canvas and the stylesheet loads last`, () => {
    const page = read(p.page);
    assert.match(page, /import '@\/styles\/home-canvas\.css';/);
    const imports = [...page.matchAll(/^import ['"][^'"]+\.css['"];/gm)].map((m) => m[0]);
    assert.ok(imports.at(-1).includes('home-canvas.css'), 'home-canvas.css is the last CSS import');
    assert.match(read(p.root), /className="[^"]*\bez-canvas\b/);
  });
  test(`${p.name}: card shells are flattened`, () => {
    for (const s of p.shells) assert.ok(shellBlock.includes(s), `${s} is in the flat list`);
  });
}

test('flat shells: transparent, no border, no shadow, no radius', () => {
  for (const decl of [
    'background: transparent !important',
    'border-color: transparent !important',
    'box-shadow: none !important',
    'border-radius: 0 !important',
  ])
    assert.ok(shellBlock.includes(decl), decl);
});

test('overlays keep their surfaces', () => {
  assert.match(shellBlock, /\.ez-card:not\(\.evo-post-menu\)/);
  assert.doesNotMatch(css, /\.(wl-wl-panel|mock-search-results|db-sector-pie-tooltip)\b/);
  assert.doesNotMatch(css, /(modal|dropdown|tooltip|popover)\s*[,{)]/i);
});

test('tokens only, reduced motion respected', () => {
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /#[0-9a-f]{3,8}\b|rgba?\(/i);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('community root no longer paints its own ground', () => {
  assert.doesNotMatch(
    read('src/components/community/redesign_v2/HubEvolutionary.jsx'),
    /background: 'var\(--bg-primary\)'/,
  );
});

test('Dashboard: module cards are flat (transparent, no border, no shadow, no radius)', () => {
  const mod = read('src/app/(dashboard)/home-dashboard/dashboard.module.css');
  const m = mod.match(/\n\.card \{([^}]*)\}/);
  assert.ok(m, '.card rule exists');
  const body = m[1];
  for (const decl of [
    'background: transparent',
    'border: 0',
    'box-shadow: none',
    'border-radius: 0',
  ])
    assert.ok(body.includes(decl), `.card has ${decl}`);
  assert.ok(!/--db-card\b/.test(mod), 'the --db-card tint is gone');
});
