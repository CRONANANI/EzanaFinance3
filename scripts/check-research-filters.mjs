#!/usr/bin/env node
/**
 * Research page filter menu: the rules behind it.
 * Run: node --test scripts/check-research-filters.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FILTER_GROUPS,
  FILTER_VIEWS,
  HEATMAP_SECTORS,
  PORTFOLIO_MODELS,
  applySectorFilters,
  chooseFilter,
  countActive,
  defaultFilters,
  filterHeatmap,
  filterSuggestions,
  modelVisible,
  resetFilters,
  sanitizeFilters,
} from '../src/lib/research/research-filters.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('each view of the pill has its own options', () => {
  assert.deepEqual(FILTER_VIEWS, ['company', 'industry', 'portfolio']);
  const ids = (view) => FILTER_GROUPS[view].map((g) => g.id);
  assert.deepEqual(ids('company'), ['results', 'sectors', 'movers']);
  assert.deepEqual(ids('industry'), ['direction', 'sort']);
  assert.deepEqual(ids('portfolio'), ['models']);
});

test('the default state filters nothing', () => {
  const f = defaultFilters();
  for (const view of FILTER_VIEWS) assert.equal(countActive(f, view), 0);
  assert.notEqual(defaultFilters().company.sectors, f.company.sectors);
});

test('the sector options are the heatmap sectors, in order', () => {
  const source = readFileSync(
    join(ROOT, 'src', 'components', 'company-research', 'StockHeatmap.jsx'),
    'utf8',
  );
  const block = source.slice(source.indexOf('SECTOR_DATA = {'), source.indexOf('SECTOR_ACCENT'));
  const keys = [...block.matchAll(/^ {2}'?([A-Za-z][A-Za-z &]*)'?: \[$/gm)].map((m) => m[1]);
  assert.deepEqual(keys, HEATMAP_SECTORS);
});

test('a single-choice group holds exactly one option', () => {
  let f = defaultFilters();
  f = chooseFilter(f, 'company', 'movers', 'gainers');
  assert.equal(f.company.movers, 'gainers');
  f = chooseFilter(f, 'company', 'movers', 'decliners');
  assert.equal(f.company.movers, 'decliners');
  assert.equal(countActive(f, 'company'), 1);
  assert.equal(chooseFilter(f, 'company', 'movers', 'sideways'), f);
});

test('a multi-choice group toggles, and all selected is the same as none', () => {
  let f = defaultFilters();
  f = chooseFilter(f, 'company', 'sectors', 'Energy');
  f = chooseFilter(f, 'company', 'sectors', 'Technology');
  assert.deepEqual(f.company.sectors, ['Technology', 'Energy']);
  f = chooseFilter(f, 'company', 'sectors', 'Energy');
  assert.deepEqual(f.company.sectors, ['Technology']);
  f = chooseFilter(f, 'company', 'sectors', null);
  assert.deepEqual(f.company.sectors, []);
  for (const s of HEATMAP_SECTORS) f = chooseFilter(f, 'company', 'sectors', s);
  assert.deepEqual(f.company.sectors, []);
  assert.equal(countActive(f, 'company'), 0);
});

test('choosing never mutates the previous state and never touches another view', () => {
  const before = defaultFilters();
  const after = chooseFilter(before, 'industry', 'sort', 'worst');
  assert.equal(before.industry.sort, 'best');
  assert.equal(after.industry.sort, 'worst');
  assert.deepEqual(after.company, before.company);
  assert.equal(countActive(after, 'industry'), 1);
  assert.equal(countActive(after, 'company'), 0);
});

test('reset clears one view only', () => {
  let f = chooseFilter(defaultFilters(), 'industry', 'direction', 'declining');
  f = chooseFilter(f, 'portfolio', 'models', 'mpt');
  f = resetFilters(f, 'industry');
  assert.equal(countActive(f, 'industry'), 0);
  assert.equal(countActive(f, 'portfolio'), 1);
});

test('a stored state is rebuilt, dropping anything unknown', () => {
  const f = sanitizeFilters({
    company: { results: 'bonds', sectors: ['Energy', 'Crypto', 7], movers: 'gainers', extra: 1 },
    industry: 'nonsense',
    portfolio: { models: 'mpt' },
    admin: { all: true },
  });
  assert.equal(f.company.results, 'all');
  assert.deepEqual(f.company.sectors, ['Energy']);
  assert.equal(f.company.movers, 'gainers');
  assert.deepEqual(f.industry, defaultFilters().industry);
  assert.deepEqual(f.portfolio.models, []);
  assert.equal(f.admin, undefined);
  assert.deepEqual(sanitizeFilters(null), defaultFilters());
  assert.deepEqual(sanitizeFilters('x'), defaultFilters());
});

test('search results can be narrowed to stocks or funds', () => {
  const list = [
    { symbol: 'AAPL', type: 'Common Stock' },
    { symbol: 'SPY', type: 'ETP' },
    { symbol: 'QQQ', type: 'etf' },
    { symbol: 'BABA', type: 'ADR' },
    { symbol: 'XYZ' },
  ];
  assert.equal(filterSuggestions(list, 'all'), list);
  assert.deepEqual(
    filterSuggestions(list, 'etfs').map((s) => s.symbol),
    ['SPY', 'QQQ'],
  );
  assert.deepEqual(
    filterSuggestions(list, 'stocks').map((s) => s.symbol),
    ['AAPL', 'BABA', 'XYZ'],
  );
  assert.deepEqual(filterSuggestions(null, 'stocks'), []);
});

test('the heatmap is narrowed by sector and by direction, and empty sectors drop out', () => {
  const data = {
    Technology: [
      { t: 'UP', ch: 4 },
      { t: 'DOWN', ch: -2 },
    ],
    Energy: [{ t: 'OIL', ch: -1 }],
    Finance: [{ t: 'FLAT', ch: 0 }],
  };
  assert.deepEqual(filterHeatmap(data), data);
  assert.deepEqual(Object.keys(filterHeatmap(data, { sectors: ['Energy'] })), ['Energy']);
  const gainers = filterHeatmap(data, { movers: 'gainers' });
  assert.deepEqual(gainers, { Technology: [{ t: 'UP', ch: 4 }] });
  const decliners = filterHeatmap(data, { movers: 'decliners' });
  assert.deepEqual(Object.keys(decliners), ['Technology', 'Energy']);
  assert.deepEqual(filterHeatmap(data, { sectors: ['Energy'], movers: 'gainers' }), {});
  /* The source is left as it was. */
  assert.equal(data.Technology.length, 2);
});

test('sector rows are filtered by direction and ordered three ways', () => {
  const rows = [
    { name: 'Utilities', changePct: -0.4 },
    { name: 'Energy', changePct: 1.2 },
    { name: 'Materials', changePct: Number.NaN },
    { name: 'Health Care', changePct: 0.3 },
  ];
  const names = (opts) => applySectorFilters(rows, opts).map((r) => r.name);
  assert.deepEqual(names(), ['Energy', 'Health Care', 'Utilities', 'Materials']);
  assert.deepEqual(names({ sort: 'worst' }), ['Utilities', 'Health Care', 'Energy', 'Materials']);
  assert.deepEqual(names({ sort: 'name' }), ['Energy', 'Health Care', 'Materials', 'Utilities']);
  assert.deepEqual(names({ direction: 'advancing' }), ['Energy', 'Health Care']);
  assert.deepEqual(names({ direction: 'declining' }), ['Utilities']);
  assert.equal(rows[0].name, 'Utilities');
});

test('no model selected shows every portfolio model', () => {
  for (const m of PORTFOLIO_MODELS) assert.equal(modelVisible([], m.id), true);
  assert.equal(modelVisible(['mpt'], 'mpt'), true);
  assert.equal(modelVisible(['mpt'], 'stress'), false);
  assert.equal(modelVisible(undefined, 'stress'), true);
});
