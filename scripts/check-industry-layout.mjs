/**
 * Industry Layout model and registry seed. Run: npm run test:industry-layout
 * (wired into npm test).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const M = await import('../src/lib/sonar/industry-layout-model.js');
const { INDUSTRY_SEED, industryBasket, getIndustryRegistry } =
  await import('../src/lib/sonar/industries.js');

test('seed: six semiconductor stages, equipment and materials upstream of fab and packaging', () => {
  const semis = INDUSTRY_SEED.stages.filter((s) => s.industry_id === 'semiconductors');
  assert.equal(semis.length, 6);
  for (const up of ['semis.equipment', 'semis.materials']) {
    assert.ok(semis.find((s) => s.id === up).is_upstream_input);
    for (const to of ['semis.fabrication', 'semis.packaging']) {
      assert.ok(
        INDUSTRY_SEED.links.some((l) => l.from_stage === up && l.to_stage === to),
        `${up} -> ${to}`,
      );
    }
  }
});

test('seed: every company carries a source_url and as_of; aerospace has stages only', () => {
  for (const c of INDUSTRY_SEED.companies) {
    assert.match(c.source_url, /^https:\/\/www\.sec\.gov\//);
    assert.ok(c.as_of);
  }
  assert.ok(INDUSTRY_SEED.stages.some((s) => s.industry_id === 'aerospace_defense'));
  assert.ok(!INDUSTRY_SEED.companies.some((c) => c.industry_id === 'aerospace_defense'));
});

test('migration seeds exactly the code seed and no numbers', () => {
  const file = readdirSync('supabase/migrations').find((f) => f.endsWith('_industry_registry.sql'));
  const sql = readFileSync(`supabase/migrations/${file}`, 'utf8');
  for (const c of INDUSTRY_SEED.companies)
    assert.ok(sql.includes(`'${c.company_name}'`), c.company_name);
  assert.ok(!/insert into public\.industry_(metrics|facilities|risks)/.test(sql));
});

test('registry falls back to the seed with no client', async () => {
  const r = await getIndustryRegistry(null, 'semiconductors');
  assert.equal(r.source, 'seed');
  assert.deepEqual(r.metrics, []);
  assert.ok(industryBasket(r).includes('NVDA'));
  assert.equal(await getIndustryRegistry(null, 'nope'), null);
});

test('state incentive totals count a split award once per state', () => {
  const award = { id: 'a1', source: 'nist', status: 'final', amount_usd: 100 };
  const fac = [
    { state_code: 'AZ', awards: [award] },
    { state_code: 'AZ', awards: [award] },
    { state_code: 'TX', awards: [award] },
  ];
  assert.deepEqual(M.incentivesByState(fac), { AZ: 100, TX: 100 });
});

test('pipeline: max per project group, incentives never added to private investment', () => {
  const p = M.investmentPipeline([
    {
      project_group: 'g1',
      announced_investment_usd: 10e9,
      awards: [{ id: 'n1', source: 'nist', status: 'final', amount_usd: 1e9 }],
    },
    {
      project_group: 'g1',
      announced_investment_usd: 40e9,
      awards: [{ id: 'n1', source: 'nist', status: 'final', amount_usd: 1e9 }],
    },
    {
      project_group: 'g2',
      announced_investment_usd: 5e9,
      awards: [{ id: 'u1', source: 'usaspending', amount_usd: 2e8 }],
    },
  ]);
  assert.equal(p.privateUsd, 45e9);
  assert.equal(p.incentives.final, 1e9);
  assert.equal(p.incentives.obligated, 2e8);
  assert.equal(p.projects, 2);
});

test('metrics: superseded and unapproved rows are hidden', () => {
  const rows = [
    {
      id: 'm1',
      metric: 'industry_sales',
      value: 1,
      unit: 'usd',
      review_status: 'approved',
      as_of: '2025-01-01',
    },
    {
      id: 'm2',
      metric: 'industry_sales',
      value: 2,
      unit: 'usd',
      review_status: 'approved',
      as_of: '2026-01-01',
      supersedes: 'm1',
    },
    {
      id: 'm3',
      metric: 'industry_sales',
      value: 3,
      unit: 'usd',
      review_status: 'pending',
      as_of: '2026-06-01',
    },
  ];
  assert.equal(M.headline(rows, 'industry_sales').id, 'm2');
});

test('filters cross: stage narrows companies and risks', () => {
  const reg = {
    companies: [
      { stage_id: 'a', ticker: 'X', company_name: 'X', business_model: 'fabless' },
      { stage_id: 'b', ticker: 'Y', company_name: 'Y', business_model: 'idm' },
    ],
    facilities: [{ ticker: 'Y', company_name: 'Y', state_code: 'TX', review_status: 'approved' }],
    risks: [{ stage_id: 'b', title: 'r', review_status: 'approved' }],
  };
  const f = M.applyFilters(reg, { stage: 'b' });
  assert.deepEqual(
    f.companies.map((c) => c.ticker),
    ['Y'],
  );
  assert.equal(f.facilities.length, 1);
  assert.equal(f.risks.length, 1);
  assert.equal(M.applyFilters(reg, { stage: 'a' }).facilities.length, 0);
});
