/**
 * Council tab of Quant Lab (/for-the-quants).
 *   npm run test:council-quant-lab
 *
 * The model's honesty rules (open pitches only, the Pitch Pipeline's model
 * checklist, the Compliance engine deciding every policy result, untested
 * never read as a pass, fund risk from the lab's own engine), the sample
 * council, the routes' access rules and the page's gating (the Overview
 * unchanged for everyone else, the Council tab only for council members once
 * membership is known, no placeholder leaderboard rows for real accounts).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CLOSED_STAGES,
  NA,
  assignmentRows,
  ipsInputs,
  ipsRows,
  ipsSummary,
  modelChecklist,
  openPitches,
  pitchRows,
  replayPaths,
  riskView,
  sectorRows,
} from '../src/lib/org-quant-lab-model.js';
import { buildQuantLabSample } from '../src/lib/org-quant-lab-sample.js';
import { evaluateProposal } from '../src/lib/org-compliance-model.js';
import { portfolioRisk, replaySeries } from '../src/lib/quants/risk.js';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const NOW = Date.UTC(2026, 10, 16, 15);
const viewer = { userId: 'u-1', memberId: 'm-1', role: 'executive', displayName: 'Viewer' };
const sample = buildQuantLabSample({ ...viewer, now: NOW });

test('the model checklist counts a model only once uploaded and reviewed', () => {
  const c = modelChecklist(
    ['dcf', 'comps', 'three_statement'],
    [
      { model_type: 'dcf', file_url: 'x', reviewed_at: '2026-11-01', version: 2 },
      { model_type: 'comps', file_url: 'y', reviewed_at: null, version: 1 },
    ],
  );
  assert.equal(c.requiredCount, 3);
  assert.equal(c.uploadedCount, 2);
  assert.equal(c.completeCount, 1);
});

test('only open pitches are listed, the viewer first', () => {
  const pitches = [
    { id: 'a', ticker: 'AAA', stage: 'idea', created_at: '2026-11-10' },
    { id: 'b', ticker: 'BBB', stage: 'in_portfolio', created_at: '2026-11-11' },
    {
      id: 'c',
      ticker: 'CCC',
      stage: 'deep_dive',
      analyst_member_id: 'me',
      created_at: '2026-10-01',
    },
    { id: 'd', ticker: 'DDD', stage: 'screening', archived_at: '2026-11-12' },
  ];
  assert.deepEqual(
    openPitches(pitches, 'me').map((p) => p.id),
    ['c', 'a'],
  );
  for (const p of sample.pitches) assert.ok(!CLOSED_STAGES.includes(p.stage));
  const rows = pitchRows({ pitches, models: { c: modelChecklist(['dcf'], []) } }, [], 'me');
  assert.equal(rows[0].owner, 'You');
  assert.equal(rows[0].reviewed, 0);
  assert.equal(rows[1].required, null, 'no checklist on file reads N/A, not zero');
});

test('the sample council: same pitches and checklists as the Pitch Pipeline sample', () => {
  const rows = pitchRows(sample, sample.members, sample.viewer.memberId);
  const avgo = rows.find((r) => r.ticker === 'AVGO');
  assert.ok(avgo);
  assert.equal(avgo.required, 3);
  assert.equal(avgo.reviewed, 2);
  assert.deepEqual(avgo.missing, ['Comparable companies']);
  assert.ok(sample.pitches.every((p) => p.is_demo));
  assert.ok(sample.assignments.every((a) => a.is_demo));
  assert.equal(sample.positions.length, 12);
});

test('sector concentration reads the stored cap, flags over and near', () => {
  const s = sectorRows(sample.positions, sample.rules);
  assert.equal(s.cap, 35);
  assert.equal(s.hard, true);
  const fin = s.rows.find((r) => r.sector === 'Financials');
  assert.ok(fin.over, 'Financials is over the 35% cap in the sample, as Compliance shows');
  const none = sectorRows(sample.positions, []);
  assert.equal(none.cap, null);
  assert.ok(none.rows.every((r) => !r.over && !r.near));
});

test('the IPS pre-check is decided by the Compliance engine, never by the page', () => {
  const avgo = sample.pitches.find((p) => p.ticker === 'AVGO');
  const inputs = ipsInputs(avgo);
  const result = evaluateProposal({
    rules: sample.rules,
    positions: sample.positions,
    ...inputs,
  });
  const view = ipsRows(sample.rules, inputs, result);
  const sector = view.rows.find((r) => r.name === 'Max sector exposure');
  /* Technology plus the proposed size stays under 35%: within, not blocked. */
  assert.equal(sector.status.text, 'Within limit');
  const trade = view.rows.find((r) => r.name === 'Max single trade');
  assert.equal(trade.status.text, avgo.position_size_pct > 8 ? 'Warning' : 'Within limit');
  const cash = view.rows.find((r) => r.name === 'Cash floor');
  assert.equal(cash.status.text, 'Recorded only');
  const cap = view.rows.find((r) => r.name === 'Min market cap');
  assert.equal(cap.status.text, 'Not tested', 'a missing input is never a pass');

  /* A Financials pitch breaches the hard sector cap: Blocked. */
  const fin = sample.pitches.find((p) => p.sector === 'Financials');
  const fi = ipsInputs(fin);
  const fr = evaluateProposal({ rules: sample.rules, positions: sample.positions, ...fi });
  const fv = ipsRows(sample.rules, fi, fr);
  assert.equal(fv.rows.find((r) => r.name === 'Max sector exposure').status.text, 'Blocked');
  assert.match(ipsSummary(fv.counts), /1 hard/);

  /* No size recorded: the size rules read Not tested. */
  const noSize = ipsInputs({ ticker: 'XYZ', sector: 'Technology', position_size_pct: null });
  const nr = evaluateProposal({ rules: sample.rules, positions: sample.positions, ...noSize });
  const nv = ipsRows(sample.rules, noSize, nr);
  assert.equal(nv.rows.find((r) => r.name === 'Max single position').status.text, 'Not tested');
});

function candles(start, n, drift) {
  const out = [];
  let p = 100;
  for (let i = 0; i < n; i += 1) {
    const d = new Date(Date.UTC(2025, 0, 1) + i * 86400000).toISOString().slice(0, 10);
    p *= 1 + drift + (i % 5 === 0 ? -0.01 : 0.004);
    out.push({ date: d, close: Math.round(p * 100) / 100 });
  }
  return out.slice(start);
}

test('fund risk: the replay and the figures come from the same weights and sessions', () => {
  const input = {
    holdings: [
      { ticker: 'AAA', quantity: 10 },
      { ticker: 'BBB', quantity: 5 },
      { ticker: 'HON', quantity: 20 },
    ],
    series: { AAA: candles(0, 120, 0.001), BBB: candles(0, 120, -0.0005), HON: [] },
    benchmark: candles(0, 120, 0.0003),
  };
  const report = portfolioRisk(input);
  const replay = replaySeries(input);
  assert.deepEqual(report.skipped, ['HON'], 'a holding without prices is left out and named');
  assert.equal(replay.length, report.observations + 1);
  assert.equal(replay[0].portfolio, 0);
  assert.equal(replay[0].benchmark, 0);
  const view = riskView({ ...report, replay, benchmark: 'SPY' });
  assert.equal(view.status, 'ready');
  assert.deepEqual(view.skipped, ['HON']);
  assert.ok(replayPaths(view.replay, 600, 220).fund.startsWith('M'));
  assert.equal(riskView({ empty: true, reason: 'no_history' }).status, 'no_history');
  assert.equal(riskView({ empty: true, reason: 'no_positions' }).status, 'empty');
});

test('model assignments: open only, the viewer first, soonest due', () => {
  const rows = assignmentRows(
    [
      { id: '1', title: 'A', status: 'assigned', due_date: '2026-11-30', assignees: ['Ana'] },
      { id: '2', title: 'B', status: 'complete', due_date: '2026-11-01', mine: true },
      { id: '3', title: 'C', status: 'in_progress', due_date: '2026-12-05', mine: true },
      { id: '4', title: 'D', status: 'assigned', due_date: null, assignees: ['Ana', 'Ben'] },
    ],
    NOW,
  );
  assert.deepEqual(
    rows.map((r) => r.id),
    ['3', '1', '4'],
  );
  assert.equal(rows[0].owner, 'You');
  assert.equal(rows[2].owner, 'Ana and 1 more');
  assert.equal(rows[2].due, NA);
});

test('routes run as the member, the sample only for master admin and demo accounts', () => {
  for (const f of [
    'src/app/api/org/quant-lab/route.js',
    'src/app/api/org/quant-lab/sample/route.js',
    'src/app/api/org/quant-lab/risk/route.js',
  ]) {
    const src = read(f);
    assert.match(src, /getUserClient\(\)/);
    assert.doesNotMatch(src, /getAdminClient|service_role|SERVICE_ROLE/);
    assert.match(src, /getCurrentOrgMember/);
  }
  assert.match(read('src/app/api/org/quant-lab/sample/route.js'), /isCommunityDemoViewer\(user\)/);
  assert.match(
    read('src/app/api/org/quant-lab/risk/route.js'),
    /wantSample && !isCommunityDemoViewer\(user\)/,
  );
  /* No Quant Lab strategy or run is read for the council. */
  for (const f of ['src/app/api/org/quant-lab/route.js', 'src/app/api/org/quant-lab/risk/route.js'])
    assert.doesNotMatch(read(f), /quant_strategies|quant_backtest|strategies'\)/);
  /* The pre-check never asks the check route to log a breach. */
  assert.doesNotMatch(read('src/components/quants/council/QuantCouncil.jsx'), /log:\s*true/);
});

test('the Overview gates the Council tab and keeps every user’s page', () => {
  const src = read('src/components/quants/overview/QuantLabOverview.jsx');
  assert.match(src, /Boolean\(user && isOrgUser && !orgLoading\)/);
  assert.match(src, /useCouncilQuant\(councilReady\)/);
  assert.match(src, /councilReady \? \(/);
  assert.doesNotMatch(src, /PlannedPanel/, 'the three planned panels are one line now');
  assert.match(src, /Planned, not built yet/);
  for (const word of ['Duplicate', 'Rename', 'Paper deploy\n                    </button>'])
    assert.ok(!src.includes(`>${word}`) && !src.includes(`>\n${word}`), `menu has ${word}`);
  for (const keep of ['Create strategy', 'Open full results', 'Drawdown', 'Recent backtests'])
    assert.ok(src.includes(keep), `${keep} is gone`);
});

test('the strategy leaderboard shows sample rows only to master admin and demo accounts', () => {
  const page = read('src/app/(dashboard)/for-the-quants/community-strategies/page.js');
  assert.doesNotMatch(page, /LEADERBOARD/);
  assert.match(page, /isCommunityDemoViewer/);
  assert.match(page, /Sample content/);
});
