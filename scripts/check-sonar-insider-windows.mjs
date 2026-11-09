/**
 * Sonar insider buying: the window a ping names, and the long-window helpers (Nov 9, 2026).
 *   node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-sonar-insider-windows.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { windowSpec, resolveWindow, windowDays } from '../src/lib/sonar/insider-windows.js';
import { buyFromGroupRow, summaryFromStats, roleInSentence } from '../src/lib/sec/insider-buys.js';

const NOW = new Date('2026-11-09T15:00:00Z'); // Monday 9 Nov 2026, New York
const spec = (t) => windowSpec(t, NOW);
const win = (t) => resolveWindow(spec(t), NOW);

test('the window a ping names', () => {
  const cases = [
    ["Who's buying their own stock this week?", 'week'],
    ['Who was buying their own shares in 2025?', 'year:2025'],
    ['insider buying in 2026', 'ytd'],
    ['insider buying this year', 'ytd'],
    ['insider buying last year', 'last_year'],
    ['insider purchases October 2025', 'month:2025-10'],
    ['insider buying in October', 'month:2026-10'],
    ['insider buying in December', 'month:2025-12'],
    ['insider buying in November', 'month'],
    ['which CEOs bought shares in Q3 2025', 'quarter:2025-3'],
    ['insider buys 2025 Q4', 'quarter:2025-4'],
    ['insiders buying in the third quarter', 'quarter:2026-3'],
    ['insider buying this quarter', 'qtd'],
    ['insider buys last quarter', 'last_quarter'],
    ['insider buying over the last 90 days', 'rolling:90'],
    ['insiders buying past 6 months', 'rolling:180'],
    ['insider buying past year', 'rolling:365'],
    ['insider buying last 30 days', 'rolling:30'],
    ['insider purchases since 2025', 'range:2025-01-01:today'],
    ['insider buying since March', 'range:2026-03-01:today'],
    ['insider buying from 2024 to 2025', 'range:2024-01-01:2025-12-31'],
    ['insider buying last month', 'last_month'],
    ['insider buying this month', 'month'],
    ['insider buying last week', 'last_week'],
    /* Not windows: "may" is a verb, "$2000" is an amount. */
    ['who may be buying their own stock', 'week'],
    ['insiders who bought over $2000 of their own stock', 'week'],
    ['insiders who bought 2000 shares of their own stock', 'week'],
  ];
  for (const [q, want] of cases) assert.equal(spec(q), want, q);
});

test('a 2025 question resolves to 2025, never to this week', () => {
  const w = win('Who was buying their own shares in 2025?');
  assert.deepEqual(
    [w.from, w.to, w.word, w.noun, w.unit, w.future],
    ['2025-01-01', '2025-12-31', 'in 2025', '2025', 'year', false],
  );
  assert.equal(windowDays(w), 365);
});

test('windows clip to today; a future one is flagged', () => {
  const ytd = win('insider buying this year');
  assert.deepEqual([ytd.from, ytd.to], ['2026-01-01', '2026-11-09']);
  const fut = win('insider buying in 2027');
  assert.equal(fut.future, true);
  const wk = win('who is buying their own stock this week');
  assert.deepEqual([wk.from, wk.to, wk.prev.spec], ['2026-11-09', '2026-11-09', 'last_week']);
});

test('long-window helpers mirror the short-window shape', () => {
  const g = buyFromGroupRow({
    accession_no: '0001-26-1',
    ticker: 'MGM',
    issuer_name: 'MGM RESORTS INTERNATIONAL',
    reporter_name: 'Meister Keith A.',
    reporter_title: null,
    is_director: true,
    shares: 1738074,
    value: 51513483,
    lines: 2,
    first_date: '2026-10-30',
    last_date: '2026-10-30',
  });
  assert.equal(g.name, 'Mgm Resorts International');
  assert.equal(g.role.label, 'Director');
  assert.ok(Math.abs(g.price - 51513483 / 1738074) < 1e-9);
  const s = summaryFromStats(
    {
      count: 50,
      total: 122573361,
      companies: 35,
      insiders: 48,
      median: 55260.155,
      tiers: { director: 20, owner: 12 },
      tierValue: { director: 1e7 },
      roles: { Director: 20, '10% Owner': 12, CEO: 5 },
      smallest: {
        ticker: 'CZNC',
        name: 'CITIZENS & NORTHERN CORP',
        reporter: 'Shattuck',
        role: 'Director',
        value: 204.08,
        date: '2026-10-02',
      },
    },
    [{ ...g, sincePct: 3 }],
  );
  assert.deepEqual(
    [s.count, s.companies, s.topRole.label, s.tiers.exec, s.quoted, s.upCount],
    [50, 35, 'Director', 0, 1, 1],
  );
  assert.equal(s.largest.ticker, 'MGM');
  assert.equal(s.smallest.name, 'Citizens & Northern Corp');
});

test('roles read naturally in a sentence', () => {
  assert.equal(roleInSentence('Officer'), 'an officer');
  assert.equal(roleInSentence('Director'), 'a director');
  assert.equal(roleInSentence('CEO'), 'a CEO');
  assert.equal(roleInSentence('10% Owner'), 'a 10% owner');
});

test('wiring: the pipeline says the window it read; the SQL is a migration', () => {
  const pipe = readFileSync('src/lib/sonar/landing-pipeline.js', 'utf8');
  assert.match(pipe, /insiderAsk\.said/);
  assert.ok(!/insiderAsk\.window\.replace/.test(pipe));
  const mod = readFileSync('src/lib/sonar/landing-insider-buying.js', 'utf8');
  assert.match(mod, /rpc\('sonar_insider_buys_window'/);
  assert.match(mod, /rpc\('sonar_insider_coverage'/);
  assert.ok(!/function windowAsked/.test(mod), 'the four-window parser is gone');
  const sql = readFileSync('supabase/migrations/20261110100000_sonar_insider_windows.sql', 'utf8');
  assert.match(
    sql,
    /grant execute on function public\.sonar_insider_buys_window\(date, date, integer\) to service_role/,
  );
  for (const f of [
    'src/lib/sonar/insider-windows.js',
    'src/lib/sonar/landing-insider-buying.js',
    'src/components/landing/SonarInsiderBuyingStack.jsx',
  ])
    assert.ok(!readFileSync(f, 'utf8').includes('\u2014'), `${f}: no em dash`);
});
