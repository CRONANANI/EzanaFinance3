#!/usr/bin/env node
/**
 * Quant Lab shell contract (stage 1 of the rebuild).
 *
 *   1. The eight workspace routes exist, each with a page and a loading state,
 *      and so do the two secondary routes.
 *   2. The old page title and subtitle are gone from src.
 *   3. The layout root carries both `ez-canvas` and `ql-app`.
 *   4. Nothing under for-the-quants imports a legacy stylesheet, except the
 *      sample community strategy page.
 *   5. Workspace links keep the research context.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const QUANTS = join(SRC, 'app', '(dashboard)', 'for-the-quants');
const SHELL = join(SRC, 'components', 'quants', 'shell');

const WORKSPACE_ROUTES = [
  '',
  'strategy-lab',
  'backtesting',
  'factor-research',
  'risk-portfolio',
  'statistical-arbitrage',
  'datasets-research',
  'paper-trading',
];
const SECONDARY_ROUTES = ['model-library', 'community-strategies'];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const rel = (file) => relative(ROOT, file).split(sep).join('/');

test('the eight workspaces and two secondary routes each have a page and a loading state', () => {
  assert.equal(WORKSPACE_ROUTES.length, 8);
  for (const route of [...WORKSPACE_ROUTES, ...SECONDARY_ROUTES]) {
    for (const file of ['page.js', 'loading.js']) {
      assert.ok(existsSync(join(QUANTS, route, file)), `missing ${route || '(overview)'}/${file}`);
    }
  }
});

test('the sidebar lists the same eight workspaces, in order', () => {
  const sidebar = readFileSync(join(SHELL, 'QuantLabSidebar.jsx'), 'utf8');
  const block = sidebar.slice(sidebar.indexOf('WORKSPACES = ['), sidebar.indexOf('ALSO_IN_EZANA'));
  const hrefs = [...block.matchAll(/href: (QUANT_BASE|`\$\{QUANT_BASE\}\/([a-z-]+)`)/g)].map(
    (m) => m[2] || '',
  );
  assert.deepEqual(hrefs, WORKSPACE_ROUTES);
});

test('the old page title and subtitle are gone from src', () => {
  const banned = [
    'Ezana Quant Lab',
    'Research. Validate. Deploy.',
    ['For', 'The', 'Quants'].join(' '),
    ['For', 'the', 'Quants'].join(' '),
  ];
  const hits = [];
  for (const file of walk(SRC)) {
    if (!/\.(js|jsx|json|css|md)$/.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    for (const phrase of banned) if (text.includes(phrase)) hits.push(`${rel(file)}: "${phrase}"`);
  }
  assert.deepEqual(hits, []);
});

test('the layout root carries ez-canvas and ql-app', () => {
  const layout = readFileSync(join(QUANTS, 'layout.js'), 'utf8');
  assert.match(layout, /QuantLabShell/);
  const shell = readFileSync(join(SHELL, 'QuantLabShell.jsx'), 'utf8');
  const root = shell.match(/className="([^"]*\bez-canvas\b[^"]*)"/);
  assert.ok(root, 'the shell root has no ez-canvas class');
  assert.match(root[1], /\bql-app\b/);
  /* The flat canvas only works when its stylesheet is the last import. */
  const imports = [...layout.matchAll(/^import '([^']+)';$/gm)].map((m) => m[1]);
  assert.equal(imports.at(-1), '@/styles/home-canvas.css');
});

test('no route under for-the-quants imports a legacy stylesheet, except the sample strategy page', () => {
  const allowed = 'src/app/(dashboard)/for-the-quants/strategy/[strategyId]/page.js';
  const hits = walk(QUANTS)
    .filter((file) => /\.(js|jsx)$/.test(file))
    .filter((file) => readFileSync(file, 'utf8').includes('app-legacy'))
    .map(rel)
    .filter((file) => file !== allowed);
  assert.deepEqual(hits, []);
});

test('workspace pages do not open with a page title', () => {
  for (const route of [...WORKSPACE_ROUTES, ...SECONDARY_ROUTES]) {
    const page = readFileSync(join(QUANTS, route, 'page.js'), 'utf8');
    assert.doesNotMatch(
      page,
      /<h1|PageHeader|WorkspaceHead/,
      `${route || '(overview)'} has a page title`,
    );
  }
});

test('links between workspaces keep the research context', async () => {
  /* The helper is pure, so it is imported without a browser. It lives in a
     client module; only the function is exercised here. */
  const source = readFileSync(join(SHELL, 'useQuantContext.js'), 'utf8');
  const body = source.slice(
    source.indexOf('export function contextHref'),
    source.indexOf('/**', source.indexOf('export function contextHref')),
  );
  const contextHref = new Function(
    `${body.replace('export function', 'function')}; return contextHref;`,
  )();
  const id = '11111111-2222-3333-4444-555555555555';
  assert.equal(contextHref('/for-the-quants/backtesting', {}), '/for-the-quants/backtesting');
  assert.equal(
    contextHref('/for-the-quants/backtesting', { strategy: id, version: '', run: '' }),
    `/for-the-quants/backtesting?strategy=${id}`,
  );
  assert.equal(
    contextHref('/for-the-quants/backtesting', { strategy: id }, { run: 'r1', tab: 'validation' }),
    `/for-the-quants/backtesting?strategy=${id}&run=r1&tab=validation`,
  );
  /* An explicit empty value clears a carried one. */
  assert.equal(
    contextHref('/for-the-quants/risk-portfolio', { strategy: id, run: 'r1' }, { run: '' }),
    `/for-the-quants/risk-portfolio?strategy=${id}`,
  );
});
