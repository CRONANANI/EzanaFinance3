/**
 * Sonar v2 engine tests: the rule router, the template registry and the
 * composer's validator. Pure node:test over the source modules; no network,
 * no database. Run: npm run test:sonar-v2 (wired into npm test).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const { routeByRules, TEMPLATE_IDS } = await import('../src/lib/sonar/router.js');
const { TEMPLATES, getTemplate } = await import('../src/lib/sonar/templates.js');
const { validateBriefing, digestSweep, buildComposerPrompt } =
  await import('../src/lib/sonar/composer.js');
const { EXEMPLAR_SEEDS } = await import('../src/lib/sonar/exemplar-seeds.js');

/* ── router rules ────────────────────────────────────────────────────── */

test('hero: industry x country routes with resolved entities', () => {
  const r = routeByRules('steel industry in Canada');
  assert.equal(r.template, 'industry_country');
  assert.equal(r.entities.industry, 'steel');
  assert.equal(r.entities.country, 'CAN');
  assert.equal(r.entities.countryName, 'Canada');
});

test('bare tickers and dollar tickers route to company', () => {
  assert.equal(routeByRules('NVDA').template, 'company');
  assert.equal(routeByRules('$TSLA').entities.ticker, 'TSLA');
  assert.equal(routeByRules('BRK.B').template, 'company');
});

test('known ETF tickers route to etf_index, not company', () => {
  assert.equal(routeByRules('XLE').template, 'etf_index');
  assert.equal(routeByRules('SPY').template, 'etf_index');
});

test('vs and compare route to comparison with both sides', () => {
  const r = routeByRules('LMT vs RTX');
  assert.equal(r.template, 'comparison');
  assert.deepEqual(r.entities.compare, ['LMT', 'RTX']);
  assert.equal(routeByRules('compare Canada and US steel').template, 'comparison');
});

test('top N routes to ranking and keeps the inner entities', () => {
  const r = routeByRules('top 10 steel companies in Canada');
  assert.equal(r.template, 'ranking');
  assert.equal(r.entities.n, 10);
  assert.equal(r.entities.industry, 'steel');
  assert.equal(r.entities.country, 'CAN');
});

test('follow-up inherits the parent entities', () => {
  const parent = { entities: { industry: 'steel', country: 'CAN' } };
  const r = routeByRules('top 10 companies', parent);
  assert.equal(r.template, 'ranking');
  assert.equal(r.entities.industry, 'steel');
  assert.equal(r.entities.country, 'CAN');
});

test('the keyword families each claim their template', () => {
  assert.equal(routeByRules('will tariffs on Canada be lifted').template, 'prediction_question');
  assert.equal(routeByRules('who supplies Apple').template, 'supply_chain');
  assert.equal(routeByRules('activists in energy').template, 'activism');
  assert.equal(routeByRules('crypto lobbying').template, 'lobbying_topic');
  assert.equal(routeByRules('CHIPS Act').template, 'policy');
  assert.equal(routeByRules('Department of Defense spending').template, 'agency_program');
  assert.equal(routeByRules('copper').template, 'commodity');
  assert.equal(routeByRules('Canada inflation').template, 'macro_indicator');
  assert.equal(routeByRules('Nancy Pelosi trades senator').template, 'politician');
  assert.equal(routeByRules('Berkshire Hathaway').template, 'investor_fund');
  assert.equal(routeByRules('NVDA earnings').template, 'event_catalyst');
  assert.equal(routeByRules('Alberta energy').template, 'region');
  assert.equal(routeByRules('Japan').template, 'country');
  assert.equal(routeByRules('semiconductors').template, 'industry');
});

test('a query no rule claims returns null for the LLM fallback', () => {
  assert.equal(routeByRules('what should I have for lunch'), null);
});

/* ── registry ────────────────────────────────────────────────────────── */

test('every template id has a complete registry entry', () => {
  for (const id of TEMPLATE_IDS) {
    const t = TEMPLATES[id];
    assert.ok(t, `missing template ${id}`);
    assert.ok(Array.isArray(t.datasets) && t.datasets.length, `${id} declares no datasets`);
    assert.ok(Array.isArray(t.briefSections) && t.briefSections.length, `${id} has no sections`);
    assert.equal(typeof t.sweepParams, 'function', `${id} has no sweepParams`);
  }
  assert.equal(getTemplate('nonsense'), TEMPLATES.open_question);
  assert.equal(TEMPLATE_IDS.length, 24); // 21 + industry_layout + country_rank + open_question
});

/* ── exemplar seeds ──────────────────────────────────────────────────── */

test('seeds: 2 per seeded template, placeholders only, no em dashes', () => {
  const byTemplate = new Map();
  for (const e of EXEMPLAR_SEEDS) {
    byTemplate.set(e.template, (byTemplate.get(e.template) || 0) + 1);
    const text = JSON.stringify(e.ideal_output);
    assert.ok(!text.includes('—'), `${e.template} exemplar has an em dash`);
    /* No bare figures: every digit in exemplar text sits inside a
       {{placeholder}} or a citation marker like [S1]. */
    /* Structure may carry ordinals ("Top 10", "#1 vs #2") and form names
       (13F, Section 232); facts may not. */
    const stripped = text
      .replace(/\{\{[^}]+\}\}/g, '')
      .replace(/\[S\d+\]/g, '')
      .replace(/\b[Tt]op \d+\b/g, '')
      .replace(/#\d+/g, '')
      .replace(/13[FDG]|S&P 500|Section 232|232/gi, '');
    assert.ok(!/\d/.test(stripped), `${e.template} exemplar "${e.query}" carries a literal figure`);
  }
  for (const t of [
    'company',
    'politician',
    'investor_fund',
    'industry_country',
    'industry',
    'ranking',
    'comparison',
    'policy',
  ]) {
    assert.equal(byTemplate.get(t), 2, `${t} needs exactly 2 seed exemplars`);
  }
});

/* ── composer validation ─────────────────────────────────────────────── */

const SWEEP = {
  market: { status: 'ok', rows: [{ ticker: 'AAA', marketCap: 1 }] },
  contracts: { status: 'empty', rows: [] },
};

test('digestSweep assigns markers only to datasets that returned rows', () => {
  const { data, sources } = digestSweep(SWEEP);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].id, 'S1');
  assert.ok(data.market);
  assert.ok(!data.contracts);
});

test('validator accepts a clean briefing', () => {
  const { sources } = digestSweep(SWEEP);
  const errors = validateBriefing(
    {
      headline: 'A short lede.',
      brief: [{ section: 'Market structure', text: 'One listed company leads the basket [S1].' }],
      kpis: [{ label: 'Companies', value_ref: 'market.count' }],
      followups: [{ label: 'Top companies' }],
    },
    { sources, template: 'industry' },
  );
  assert.deepEqual(errors, []);
});

test('validator rejects phantom citations, uncited figures and typed values', () => {
  const { sources } = digestSweep(SWEEP);
  const errors = validateBriefing(
    {
      headline: 'Lede.',
      brief: [{ section: 'A', text: 'The basket holds 14 names with no citation. Also [S9].' }],
      kpis: [{ label: 'Cap', value: 123 }],
      charts: [{ id: 'x', data: [1, 2, 3] }],
    },
    { sources, template: 'industry' },
  );
  assert.ok(errors.some((e) => e.includes('[S9]')));
  assert.ok(errors.some((e) => e.includes('uncited figure')));
  assert.ok(errors.some((e) => e.includes('value_ref')));
  assert.ok(errors.some((e) => e.includes('embeds data')));
});

test('the composer prompt carries the exemplars, never the answer', () => {
  const { data } = digestSweep(SWEEP);
  const prompt = buildComposerPrompt({
    query: 'steel industry in Canada',
    template: 'industry_country',
    entities: { industry: 'steel', country: 'CAN' },
    exemplars: EXEMPLAR_SEEDS.filter((e) => e.template === 'industry_country').slice(0, 2),
    data,
    briefSections: ['Market structure'],
  });
  assert.ok(prompt.includes('EXAMPLE 1'));
  assert.ok(prompt.includes('auto industry in Germany') || prompt.includes('semiconductor'));
  assert.ok(prompt.includes('NOW (template: industry_country'));
  assert.ok(prompt.includes('{{top_company}}'));
});

/* ── query understanding in front of the rules ─────────────────────── */

test('the hero query routes to industry_layout with the US, never the USA ticker', async () => {
  const { routeUnderstood } = await import('../src/lib/sonar/router.js');
  const r = routeUnderstood('give me a lyout of the semiconductor industry in the USA');
  assert.equal(r.template, 'industry_layout');
  assert.equal(r.entities.industryId, 'semiconductors');
  assert.equal(r.entities.country, 'USA');
  assert.equal(r.understood.display, 'Semiconductor industry in the United States');
});

test('the India rank ping routes to country_rank with the country, not an industry', async () => {
  const { routeUnderstood } = await import('../src/lib/sonar/router.js');
  const r = routeUnderstood('what ranking is india in the world economy');
  assert.equal(r.template, 'country_rank');
  assert.equal(r.entities.country, 'IND');
  assert.equal(r.entities.metric, 'gdp_nominal_usd');
  assert.equal(r.understood.display, "India's rank in the world economy");
});
