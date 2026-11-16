/**
 * Compliance page (Nov 2026 redesign): the shared rule engine, honest
 * readings and the sample bundle.
 *   npm run test:org-compliance
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  evaluateHoldings,
  evaluateProposal,
  ideaRows,
  ruleReading,
  sectorCap,
  sectorsOverCap,
  applySampleAction,
  detailText,
  checkedText,
} from '../src/lib/org-compliance-model.js';
import { buildComplianceSample } from '../src/lib/org-compliance-sample.js';

const b = buildComplianceSample({
  role: 'executive',
  displayName: 'Tester',
  now: Date.UTC(2026, 10, 16),
});

test('sample: same council figures as the other pages (2 open, 1 hard, 35% cap, 1 sector over)', () => {
  assert.equal(b.violations.length, 2);
  assert.equal(b.violations.filter((v) => v.severity === 'block').length, 1);
  assert.equal(sectorCap(b.rules), 35);
  const h = evaluateHoldings({ rules: b.rules, positions: b.positions });
  assert.equal(sectorsOverCap(h, 35), 1);
  assert.equal(h.positionCount, 12);
  for (const row of [...b.rules, ...b.violations, ...b.resolved, ...b.positions, ...b.activity])
    assert.equal(row.is_demo, true);
});

test('engine: idea check hits and sentences unchanged', () => {
  const r = evaluateProposal({
    rules: b.rules,
    positions: b.positions,
    ticker: 'mo',
    sector: 'Healthcare',
    sizePct: 6,
    marketCap: 1e9,
  });
  assert.equal(r.blocked, true);
  const types = r.violations.map((v) => v.rule_type).sort();
  assert.deepEqual(types, ['max_sector_pct', 'min_market_cap', 'prohibited_ticker']);
  assert.ok(
    r.violations
      .find((v) => v.rule_type === 'prohibited_ticker')
      .detail.endsWith('MO is on the prohibited-securities list.'),
  );
});

test('honesty: cash floor is recorded only; blank inputs read not tested', () => {
  const cash = b.rules.find((r) => r.rule_type === 'cash_floor_pct');
  assert.equal(checkedText(cash), 'Recorded only, not checked');
  assert.equal(ruleReading(cash, null).reading, 'Recorded only, not checked');
  const { rows } = ideaRows(b.rules, { ticker: 'XYZ' }, { violations: [] });
  const sector = rows.find((x) => x.rule.rule_type === 'max_sector_pct');
  assert.equal(sector.state, 'untested');
});

test('sample actions respect roles and never touch the input bundle', () => {
  const before = JSON.stringify(b);
  assert.equal(
    applySampleAction(b, { type: 'delete', id: b.rules[0].id }, { role: 'analyst' }).ok,
    false,
  );
  assert.equal(
    applySampleAction(b, { type: 'resolve', id: b.violations[0].id }, { role: 'analyst' }).ok,
    false,
  );
  const r = applySampleAction(
    b,
    { type: 'resolve', id: b.violations[0].id, reason: 'x' },
    { role: 'portfolio_manager' },
  );
  assert.equal(r.ok, true);
  assert.equal(r.bundle.violations.length, 1);
  assert.equal(JSON.stringify(b), before);
});

test('audit detail is drawn as text, never an object', () => {
  assert.equal(detailText({ fields: ['benchmark_symbol'] }), 'Fields: benchmark symbol');
  assert.equal(detailText({ severity: 'block', label: 'X' }), 'Severity: hard');
  assert.equal(detailText(null), 'N/A');
});

test('page copy makes no blocking or assurance claims', () => {
  const dir = 'src/components/org/compliance/';
  const text = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.jsx'))
    .map((f) => fs.readFileSync(dir + f, 'utf8'))
    .join('\n');
  for (const bad of [
    'All clear',
    'block the trade',
    'enforced',
    'real-time',
    'blackout list',
    'is logged in this preview',
  ])
    assert.ok(!text.includes(bad), bad);
  assert.ok(text.includes('Not legal, regulatory or compliance advice.'));
});
