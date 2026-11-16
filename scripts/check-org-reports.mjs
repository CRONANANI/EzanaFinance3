/**
 * Reports (/org-team-hub/reports): access, the same-window comparison, the
 * frozen payload, old reports, the printable document and the sample.
 *   npm run test:org-reports
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const M = await import('../src/lib/org-reports-model.js');
const S = await import('../src/lib/org-reports-sample.js');
const D = await import('../src/lib/org-reports-document.js');
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('export setting: executives always, managers only while included, analysts never', () => {
  const both = { who_can_export_reports: 'exec_pm_advisor' };
  const execOnly = { who_can_export_reports: 'exec_advisor' };
  assert.equal(M.canExportReports({ role: 'executive' }, execOnly), true);
  assert.equal(M.canExportReports({ role: 'portfolio_manager' }, both), true);
  assert.equal(M.canExportReports({ role: 'portfolio_manager' }, execOnly), false);
  assert.equal(M.canExportReports({ role: 'portfolio_manager' }, null), true);
  assert.equal(M.canExportReports({ role: 'analyst' }, both), false);
  assert.equal(M.canExportReports({ role: 'executive', is_active: false }, both), false);
  assert.equal(M.reportAccess({ role: 'portfolio_manager' }, execOnly), 'export_restricted');
  assert.equal(M.reportAccess({ role: 'analyst' }, both), 'managers_only');
});

test('every reports route enforces the export setting server-side', () => {
  for (const f of [
    'src/app/api/org/reports/route.js',
    'src/app/api/org/reports/[id]/route.js',
    'src/app/api/org/reports/[id]/pdf/route.js',
  ]) {
    const s = read(f);
    assert.match(s, /reportViewer\(supabase, member\)/, f);
    assert.match(s, /canExport/, f);
  }
  const srv = read('src/lib/org-reports-server.js');
  assert.match(srv, /getGovernance\(supabase, member\.org_id\)/);
  /* Analysts get no rows from the list. */
  assert.match(
    read('src/app/api/org/reports/route.js'),
    /if \(!viewer\.canExport\)[\s\S]*reports: \[\]/,
  );
});

test('comparison: fund and benchmark over the same days and weights', () => {
  const history = {
    AAA: { '2026-01-05': 100, '2026-01-06': 101, '2026-03-02': 120 },
    BBB: { '2026-02-02': 50, '2026-03-02': 45 },
    SPY: { '2026-01-05': 400, '2026-02-02': 410, '2026-03-02': 420 },
  };
  const positions = [
    { ticker: 'AAA', shares: 10, added_at: '2026-01-03T10:00:00Z', priced: true },
    { ticker: 'BBB', shares: 20, added_at: '2026-02-02T10:00:00Z', priced: true },
    { ticker: 'CCC', shares: 5, added_at: '2026-02-02T10:00:00Z', priced: true },
  ];
  const c = M.comparedWindow({ positions, history, symbol: 'spy', endDay: '2026-03-02' });
  /* AAA: 1000 -> 1200, SPY 400 -> 420 (+5%); BBB: 1000 -> 900, SPY 410 -> 420. */
  const fund = (200 - 100) / 2000;
  const bench = (1000 * (420 / 400 - 1) + 1000 * (420 / 410 - 1)) / 2000;
  assert.equal(c.symbol, 'SPY');
  assert.equal(c.start, '2026-01-05');
  assert.equal(c.end, '2026-03-02');
  assert.ok(Math.abs(c.fund_pct - fund * 100) < 1e-9);
  assert.ok(Math.abs(c.benchmark_pct - bench * 100) < 1e-9);
  assert.ok(Math.abs(c.difference_pts - (c.fund_pct - c.benchmark_pct)) < 1e-12);
  assert.equal(c.matched, 2);
  assert.equal(c.left_out, 1);
  assert.equal(
    M.comparedWindow({ positions, history: {}, symbol: 'SPY', endDay: '2026-03-02' }),
    null,
  );
});

test('payload: choices stored, left-out names never written, label cleaned', () => {
  const p = M.assembleReport({
    universityName: 'Test council',
    periodLabel: '  ',
    generatedAt: '2026-11-15T12:00:00Z',
    positions: [
      { shares: 10, avg_cost: 10, current_value: 150, priced: true, added_at: '2026-01-01' },
      { shares: 5, avg_cost: 10, current_value: 50, priced: false, added_at: '2026-02-01' },
    ],
    bySector: [{ sector: 'Unclassified', weight_pct: 100, contribution_pct: 33.3 }],
    pitches: [{ ticker: 'X', analyst: 'Invented Person', alpha_pct: 1, has_outcome: true }],
    roster: [{ name: 'Invented Person', role: 'analyst' }],
    byAnalyst: [{ name: 'Invented Person' }],
    includeRoster: false,
    includeAnalystNames: false,
  });
  assert.equal(p.version, 2);
  assert.equal(p.periodLabel, M.DEFAULT_PERIOD);
  assert.equal(p.performance.unpriced_count, 1);
  assert.equal(p.unclassifiedSectors, 1);
  assert.deepEqual(p.include, { roster: false, analystNames: false });
  assert.equal(JSON.stringify(p).includes('Invented Person'), false);
  assert.equal(p.window.first_recorded, '2026-01-01');
});

test('old reports read with N/A and no difference', () => {
  const s = M.summarizeReport(
    {
      id: 'r1',
      title: 'Old, Fund Report (Fall)',
      period_label: 'Fall',
      created_at: '2026-07-01T00:00:00Z',
      generated_by: 'u1',
      payload: {
        performance: { total_value: 10, return_pct: 5, benchmark_return_pct: 2, alpha_pct: 3 },
      },
    },
    new Map([['u1', 'Someone']]),
  );
  assert.equal(s.legacy, true);
  assert.equal(s.comparison, null);
  assert.equal(s.legacyBenchmarkPct, 2);
  assert.equal(s.unpricedCount, null);
  assert.equal(s.author, 'Someone');
  const html = D.renderPrintableHtml({ title: 't', payload: {} }, {});
  assert.ok(html.includes(M.DISCLOSURE.slice(0, 40)));
});

test('printable: disclosure, no auto print, nonce only when valid, no third-party hosts', () => {
  const r = S.buildReportsSample({ now: Date.UTC(2026, 10, 16) }).reports[0];
  const html = D.renderPrintableHtml(r, { origin: 'https://app.test', nonce: 'abcdEFGH1234' });
  assert.ok(html.includes('Unaudited, student-prepared, descriptive only'));
  assert.ok(html.includes('not time-weighted'));
  assert.ok(!/addEventListener\('load'/.test(html));
  assert.ok(html.includes('nonce="abcdEFGH1234"'));
  const bad = D.renderPrintableHtml(r, { origin: 'https://app.test', nonce: '"><x' });
  assert.ok(!bad.includes('nonce='));
  const hosts = [...html.matchAll(/https?:\/\/([^/'"\s)]+)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(hosts)], ['app.test']);
  assert.ok(!/Confidential/.test(html));
  assert.ok(!/\u2014/.test(html));
  const preview = D.renderPrintableHtml(r, { screen: false });
  assert.ok(!preview.includes('<script'));
});

test('sample: the same council, figures consistent, older reports differ', () => {
  const b = S.buildReportsSample({ now: Date.UTC(2026, 10, 16), userId: 'me' });
  assert.equal(b.reports.length, 3);
  const [a, o1, o2] = b.reports.map((r) => M.summarizeReport(r, null));
  assert.equal(M.fmtMoney(a.fundValue), '$240,050.00');
  assert.equal(M.fmtPct(a.gainPct), '+46.73%');
  assert.equal(M.fmtPct(a.comparison.benchmarkPct), '+10.08%');
  assert.equal(a.positions, 12);
  assert.equal(a.unpricedCount, 1);
  assert.equal(a.comparison.matched, 11);
  assert.ok(Math.abs(a.comparison.differencePts - (a.comparison.fundPct - 10.08)) < 1e-9);
  assert.notEqual(o1.comparison.benchmarkPct, a.comparison.benchmarkPct);
  assert.notEqual(o2.comparison.benchmarkPct, o1.comparison.benchmarkPct);
  assert.equal(o2.positions, 11);
  assert.equal(o2.includeRoster, false);
  assert.equal(JSON.stringify(b.reports[2].payload.roster), '[]');
  for (const r of b.reports) assert.equal(r.is_demo, true);
  /* Sector weights total 100% and contributions total the gain on cost. */
  const sec = b.reports[0].payload.attribution.bySector;
  assert.ok(Math.abs(sec.reduce((s, x) => s + x.weight_pct, 0) - 100) < 1e-9);
  assert.ok(Math.abs(sec.reduce((s, x) => s + x.contribution_pct, 0) - a.gainPct) < 1e-9);
  assert.equal(S.sampleReportById('sample-report-002', {}).period_label, 'Fall 2026');
  assert.equal(S.sampleReportById('../x', {}), null);
});

test('sample route and printable sample are gated to master admin and demo accounts', () => {
  assert.match(read('src/app/api/org/reports/sample/route.js'), /isCommunityDemoViewer\(user\)/);
  assert.match(read('src/app/api/org/reports/[id]/pdf/route.js'), /isCommunityDemoViewer\(user\)/);
});

test('formatting: signed, N/A, two decimals, dates', () => {
  assert.equal(M.fmtPct(null), 'N/A');
  assert.equal(M.fmtPct(-0.001), '0.00%');
  assert.equal(M.fmtPts(36.654), '+36.65 pts');
  assert.equal(M.fmtMoney(1234.5), '$1,234.50');
  assert.equal(M.fmtDay('2026-11-15T23:59:00Z'), 'Nov 15, 2026');
});
