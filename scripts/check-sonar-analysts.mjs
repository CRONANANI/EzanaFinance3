/**
 * Sonar analyst registry and router: profiles are complete and consistent, every capability
 * and skill exists, and routing matches the reviewed lead/supporting table.
 *   node --test scripts/check-sonar-analysts.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { ANALYSTS, SPECIALIST_IDS, CONTROL_IDS } from '../src/lib/sonar/analysts/registry.js';
import {
  CAPABILITIES,
  engineSourcesFor,
  isStale,
} from '../src/lib/sonar/analysts/dataset-capabilities.js';
import { routeAnalysts } from '../src/lib/sonar/analysts/analyst-router.js';

test('21 roles: 18 specialists and 3 control roles', () => {
  assert.equal(SPECIALIST_IDS.length, 18);
  assert.deepEqual(CONTROL_IDS.sort(), ['methodology-auditor', 'red-team', 'research-director']);
  assert.equal(Object.keys(ANALYSTS).length, 21);
});

test('every profile names real capabilities and an existing skill file', () => {
  for (const a of Object.values(ANALYSTS)) {
    for (const c of [...a.required, ...a.preferred])
      assert.ok(CAPABILITIES[c], `${a.id}: unknown capability ${c}`);
    assert.ok(
      existsSync(new URL(`../sonar-skills/${a.skill}/SKILL.md`, import.meta.url)),
      `${a.id}: missing skill ${a.skill}`,
    );
    assert.ok(a.rules.length, `${a.id}: no rules`);
  }
});

test('capabilities map to engine sources', () => {
  assert.ok(engineSourcesFor(['fx_spot', 'contract_awards']).includes('macro_series'));
  assert.ok(engineSourcesFor(['contract_awards']).includes('contracts_history'));
  assert.equal(
    isStale('fx_spot', '2026-08', { now: new Date('2026-11-06'), monthlyOnly: true }),
    true,
  );
  assert.equal(
    isStale('fx_spot', '2026-09', { now: new Date('2026-11-06'), monthlyOnly: true }),
    false,
  );
  assert.equal(isStale('fx_spot', '2026-10-20', { now: new Date('2026-11-06') }), true);
  assert.equal(isStale('policy_rate', '2026-10-22', { now: new Date('2026-11-06') }), false);
});

const D = (o) => Object.entries(o).map(([id, score]) => ({ id, score }));
const CASES = [
  {
    q: "Is Turkey's lira under pressure?",
    spec: {
      objective: { primary: 'assess_exposure' },
      domains: D({ country: 0.95, macro: 0.8 }),
      subject: { kind: 'country' },
    },
    cls: { mode: 'standard', operations: ['exposure'] },
    route: { themes: ['currency'], countries: ['TUR'] },
    lead: 'fx-strategist',
    support: ['macroeconomist', 'sovereign-risk'],
  },
  {
    q: "What are NVIDIA's biggest risks?",
    spec: {
      format: 'investment_memo',
      objective: { primary: 'risk_assessment' },
      domains: D({
        company: 1,
        company_financials: 0.95,
        competition: 0.75,
        analyst_views: 0.7,
        geopolitics: 0.6,
      }),
      subject: { kind: 'company' },
    },
    cls: { mode: 'deep', operations: ['risk_assessment'] },
    route: {},
    lead: 'equity-research',
    support: ['valuation', 'industry-analyst', 'geopolitical-analyst'],
    anyOf: true,
  },
  {
    q: 'How dependent is Palantir on government spending?',
    spec: {
      format: 'investment_memo',
      objective: { primary: 'risk_assessment' },
      domains: D({ company: 1, company_financials: 0.95, contracts: 0.9 }),
      subject: { kind: 'company' },
    },
    cls: { mode: 'deep', operations: ['dependence'] },
    route: {},
    lead: 'equity-research',
    support: ['contracts-analyst'],
  },
  {
    q: 'Who is lobbying on AI policy?',
    spec: {
      objective: { primary: 'rank' },
      domains: D({ lobbying: 1, industry: 0.4 }),
      subject: null,
    },
    cls: { mode: 'standard', operations: ['rank_screen'] },
    route: {},
    lead: 'lobbying-analyst',
    support: [],
  },
  {
    q: 'Is copper likely to become more expensive?',
    spec: {
      objective: { primary: 'assess_outlook' },
      domains: D({ commodity: 1, macro: 0.4 }),
      subject: null,
    },
    cls: { mode: 'standard', operations: ['outlook_scenario'] },
    route: { themes: ['commodity', 'metals'], commodity: 'copper' },
    lead: 'commodities-analyst',
    support: ['macroeconomist'],
  },
  {
    q: 'Are institutional investors accumulating Microsoft?',
    spec: {
      objective: { primary: 'explain' },
      domains: D({ institutional: 1, company: 0.6 }),
      subject: { kind: 'company' },
    },
    cls: { mode: 'standard', operations: ['trend'] },
    route: {},
    lead: 'ownership-analyst',
    support: ['equity-research'],
  },
  {
    q: 'Is our fund too concentrated in technology?',
    spec: {
      rawQuery: 'Is our fund too concentrated in technology?',
      objective: { primary: 'assess_exposure' },
      domains: D({ sector: 0.5 }),
      subject: { kind: 'portfolio' },
    },
    cls: { mode: 'standard', operations: ['exposure', 'breakdown'] },
    route: {},
    ctx: { orgId: 'org_1' },
    lead: 'portfolio-analyst',
    support: [],
  },
  {
    q: 'Could sanctions disrupt semiconductor supply chains?',
    spec: {
      objective: { primary: 'assess_exposure' },
      domains: D({ geopolitics: 0.9, industry: 0.7 }),
      subject: { kind: 'industry' },
    },
    cls: { mode: 'deep', operations: ['exposure', 'risk_assessment'] },
    route: { themes: ['sanctions'] },
    lead: 'sanctions-analyst',
    support: ['geopolitical-analyst', 'industry-analyst'],
  },
  {
    q: 'What is NVIDIA worth under conservative, base and aggressive assumptions?',
    spec: {
      rawQuery: 'What is NVIDIA worth under conservative, base and aggressive assumptions?',
      objective: { primary: 'assess_outlook' },
      domains: D({ company: 1, company_financials: 0.9, analyst_views: 0.6 }),
      subject: { kind: 'company' },
    },
    cls: { mode: 'deep', operations: ['outlook_scenario'] },
    route: {},
    lead: 'valuation',
    support: ['equity-research'],
  },
];

for (const c of CASES) {
  test(`routing: ${c.q}`, () => {
    const r = routeAnalysts({
      spec: c.spec,
      classification: c.cls,
      route: c.route,
      ctx: c.ctx || {},
    });
    assert.equal(
      r.lead?.id,
      c.lead,
      JSON.stringify(r.supporting.map((s) => s.id)) + ' ' + JSON.stringify(r.lead),
    );
    const got = r.supporting.map((s) => s.id);
    if (c.anyOf)
      assert.ok(
        c.support.some((s) => got.includes(s)),
        `supporting ${got}`,
      );
    else
      for (const s of c.support) assert.ok(got.includes(s), `missing supporting ${s}; got ${got}`);
    if (c.cls.mode === 'deep') assert.ok(r.controls.includes('red-team'));
    assert.ok(r.controls.includes('methodology-auditor'));
  });
}

test('portfolio analyst never runs without an organization', () => {
  const r = routeAnalysts({
    spec: {
      objective: { primary: 'assess_exposure' },
      domains: [],
      subject: { kind: 'portfolio' },
    },
    classification: { mode: 'standard', operations: ['exposure'] },
  });
  assert.notEqual(r.lead?.id, 'portfolio-analyst');
  assert.ok(r.skipped.some((s) => s.id === 'portfolio-analyst'));
});

test('quick mode: no supporting analysts, auditor only', () => {
  const r = routeAnalysts({
    spec: {
      objective: { primary: 'explain' },
      domains: D({ institutional: 1 }),
      subject: { kind: 'company' },
    },
    classification: { mode: 'quick', operations: ['lookup'] },
  });
  assert.equal(r.supporting.length, 0);
  assert.deepEqual(r.controls, ['methodology-auditor']);
});
