/* Typed evidence relevance (lib/sonar/engine/typed-relevance.js). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { objectiveOf, typedGate, typedRole } from '../src/lib/sonar/engine/typed-relevance.js';

test('a company revenue comparison rejects world and country macro series', () => {
  const o = objectiveOf({ family: 'company_comparison', understood: { entities: [] } });
  assert.equal(o.kind, 'company_measure');
  const g = typedGate(
    [
      { id: 'a', source: 'macro_series', title: 'Real GDP growth ranking' },
      { id: 'b', source: 'company_financials', title: 'AMD revenue' },
      { id: 'c', source: 'news', title: 'Chip demand' },
      { id: 'd', source: 'research_composer', title: 'Company comparison' },
    ],
    o,
  );
  assert.deepEqual(
    g.rejected.map((r) => r.id),
    ['a'],
  );
  assert.match(g.rejected[0].reason, /macro series .* company-measure/);
  assert.deepEqual(Object.fromEntries(g.kept.map((e) => [e.id, e.evidenceRole])), {
    b: 'input',
    c: 'context',
    d: 'input',
  });
});

test('a central-bank question rejects company sources and keeps macro series as inputs', () => {
  const o = objectiveOf({
    family: null,
    understood: {
      entities: [
        { kind: 'central_bank', id: 'boc', country: 'CA' },
        { kind: 'country', id: 'CA', via: 'central_bank' },
      ],
    },
  });
  assert.equal(o.kind, 'central_bank');
  assert.equal(typedRole({ source: 'institutional_13f' }, o).role, 'rejected');
  assert.equal(typedRole({ source: 'company_financials' }, o).role, 'rejected');
  assert.equal(typedRole({ source: 'macro_series' }, o).role, 'input');
  assert.equal(typedRole({ source: 'news' }, o).role, 'context');
});

test('macro data stays as context when the company question names a country', () => {
  const o = objectiveOf({
    family: 'multi_stage_screen',
    understood: { entities: [{ kind: 'country', id: 'CA' }] },
  });
  assert.equal(typedRole({ source: 'macro_country' }, o).role, 'context');
  /* Other questions are not gated by type. */
  const other = objectiveOf({ family: 'currency_pressure', understood: { entities: [] } });
  assert.equal(typedRole({ source: 'macro_series' }, other).role, 'context');
});

/* ── Sonar 6.4 final integration retest ────────────────────────────────── */

test('cross-domain: a central-bank question that names a company keeps that company’s sources', () => {
  const o = objectiveOf({
    understood: {
      entities: [
        { kind: 'central_bank', id: 'boc', country: 'CA' },
        { kind: 'ticker', id: 'RY' },
      ],
    },
  });
  assert.equal(o.kind, 'central_bank');
  assert.equal(o.crossDomain, true);
  assert.equal(typedRole({ source: 'company_financials' }, o).role, 'input');
  assert.equal(typedRole({ source: 'macro_series' }, o).role, 'input');
  /* The resolver's company counts the same as a ticker entity. */
  const r = objectiveOf({
    understood: { entities: [{ kind: 'central_bank', id: 'fed', country: 'US' }] },
    resolution: { company: { ticker: 'JPM' } },
  });
  assert.equal(typedRole({ source: 'institutional_13f' }, r).role, 'input');
});

test('legitimate context stays eligible: news, filings text, composer output, named-country macro', () => {
  const o = objectiveOf({
    family: 'company_comparison',
    understood: { entities: [{ kind: 'country', id: 'JP' }] },
  });
  const g = typedGate(
    [
      { id: 'n', source: 'news' },
      { id: 'm', source: 'macro_country' },
      { id: 'r', source: 'research_composer' },
      { id: 's', source: 'sec_filings' },
      { id: 'x', source: 'unknown_future_source' },
    ],
    o,
  );
  assert.equal(g.rejected.length, 0);
  assert.deepEqual(Object.fromEntries(g.kept.map((e) => [e.id, e.evidenceRole])), {
    n: 'context',
    m: 'context',
    r: 'input',
    s: 'input',
    x: 'context',
  });
});

test('lineage: kept records keep every original field; rejected records keep id, source and reason', () => {
  const o = objectiveOf({ family: 'company_comparison', understood: { entities: [] } });
  const rec = { id: 'b', source: 'company_financials', title: 'AMD', url: 'u', lineage: ['sec'] };
  const g = typedGate([rec, { id: 'w', source: 'macro_series', title: 'World GDP' }], o);
  assert.deepEqual({ ...g.kept[0], evidenceRole: undefined }, { ...rec, evidenceRole: undefined });
  assert.deepEqual(Object.keys(g.rejected[0]).sort(), ['id', 'reason', 'source']);
  assert.ok(g.rejected[0].reason.length > 10);
  /* No input mutated. */
  assert.equal(rec.evidenceRole, undefined);
});
