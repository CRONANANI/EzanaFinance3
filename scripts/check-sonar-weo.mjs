/**
 * IMF actual vs estimate vs projection, and the OECD output gap (Nov 2026, prompt 1.9).
 * Run: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-sonar-weo.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const { weoStatus, weoLatestActual, WEO_VINTAGE } = await import('@/lib/sonar/analysts/weo-status');
const C = await import('@/lib/sonar/macro/catalog');
const { catalogueStory } = await import('@/lib/sonar/key-chart');
const { buildCurrencyPicture } = await import('@/lib/sonar/macro/currency');
const { parseAppendix, renderReference, iso3Of } = await import('./build-weo-latest-actual.mjs');
const { PROJECTION_FROM_YEAR } = await import('@/lib/oecd-curated');

const NOW = new Date('2026-11-06T00:00:00Z');

test('weoStatus: Türkiye 2025 actual, 2026 projection; Libya 2022 estimate; India fiscal year; unknown', () => {
  assert.equal(weoStatus('TUR', 'nationalAccounts', 2025, { now: NOW }), 'actual');
  assert.equal(weoStatus('TUR', 'nationalAccounts', 2026, { now: NOW }), 'projection');
  assert.equal(weoStatus('LBY', 'nationalAccounts', 2022, { now: NOW }), 'estimate');
  assert.equal(weoLatestActual('LBY', 'nationalAccounts'), 2019);
  /* India reports "2024/25": the fiscal year ends in 2025. */
  assert.equal(weoStatus('IND', 'governmentFinance', 2025, { now: NOW }), 'actual');
  assert.equal(weoStatus('XXX', 'cpi', 2020, { now: NOW }), 'unknown');
  assert.equal(WEO_VINTAGE, '2026-10');
});

const L = (source, series_key, country_iso3, period, value, extra = {}) => ({
  source,
  series_key,
  country_iso3,
  period,
  value,
  series_name: null,
  unit: null,
  frequency: null,
  dataset: null,
  year_ago_period: null,
  year_ago_value: null,
  ...extra,
});

test('catalogue statements say "IMF estimate (2022)" and name the vintage; non-IMF rows carry no label', () => {
  const lby = L('imf', 'IMF.WEO:dataflow.LBY.NGDP_RPCH.A', 'LBY', '2022', 1.3, {
    year_ago_period: '2021',
    year_ago_value: 31.4,
  });
  const item = C.rowToItem(lby, { attributionOf: (s) => `Attribution ${s}`, now: NOW });
  assert.match(item.text, /IMF estimate \(2022\): an IMF staff estimate, not yet actual data\./);
  assert.match(item.text, /IMF World Economic Outlook, October 2026 vintage\./);
  assert.ok(item.text.endsWith('Source: Attribution imf.'), 'attribution stays verbatim');
  assert.equal(item.citation.vintage, 'IMF World Economic Outlook, October 2026');
  const tur = L('imf', 'IMF.WEO:dataflow.TUR.NGDP_RPCH.A', 'TUR', '2026', 2.7, {
    year_ago_period: '2025',
    year_ago_value: 3.2,
  });
  const t = C.rowToItem(tur, { attributionOf: () => 'IMF', now: NOW });
  assert.equal(t.meta.weo.status, 'actual');
  assert.match(t.text, /IMF projection \(2026\): 2\.70/);
  assert.doesNotMatch(t.text, /IMF estimate/);
});

test('Key chart: an IMF estimate year is flagged on the point and in the note', () => {
  const pts = [];
  for (let y = 2005; y <= 2022; y += 1)
    pts.push({ period: String(y), value: y === 2022 ? 1.3 : 2 + (y % 3) });
  const story = catalogueStory({
    family: 'gdp_growth',
    points: pts,
    source: 'imf',
    seriesKey: 'IMF.WEO:dataflow.LBY.NGDP_RPCH.A',
    attribution: 'International Monetary Fund',
    now: NOW,
  });
  assert.equal(story.estimate, 'IMF estimate (2022)');
  assert.ok(story.latest.est);
  assert.match(story.latest.label, /IMF estimate/);
  assert.match(
    story.source,
    /IMF World Economic Outlook, October 2026; IMF estimate \(2022\), not yet actual data/,
  );
  assert.ok(!story.points.find((p) => p.period === '2019').est, 'Libya 2019 is actual');
});

test('currency picture: an estimated IMF current account says so', () => {
  const pic = buildCurrencyPicture(
    {
      external: {
        currentAccount: {
          value: -2.1,
          period: '2025',
          unit: '% of GDP',
          estimate: 'IMF estimate (2025)',
        },
      },
    },
    { currency: { code: 'XXX', short: 'currency' }, place: 'Somewhere', now: NOW },
  );
  assert.ok(pic.statements.some((s) => /IMF estimate \(2025\), not yet actual data/.test(s)));
});

test('OECD output gap and potential growth: latest outturn before the projection year, members only', async () => {
  const { oecdGapLatest } = await import('@/lib/sonar/macro/series-store');
  const rows = [
    { ezana_slug: 'eo-gap', year: 2024, obs_value: '0.4' },
    { ezana_slug: 'eo-gap', year: 2025, obs_value: '0.9' },
    { ezana_slug: 'eo-gap', year: 2026, obs_value: '1.1' },
    { ezana_slug: 'eo-gdpvtr_annpct', year: 2025, obs_value: '3.1' },
  ];
  const out = oecdGapLatest(rows, 'TUR', { projectionFrom: 2026 });
  const gap = out.find((r) => r.series_key === 'OECD.EO:eo-gap');
  assert.deepEqual(
    [gap.period, gap.value, gap.year_ago_period, gap.year_ago_value],
    ['2025', 0.9, '2024', 0.4],
  );
  assert.equal(C.familyOf(gap).id, 'output_gap');
  assert.equal(C.familyOf(out.find((r) => /gdpvtr/.test(r.series_key))).id, 'potential_growth');
  assert.ok(C.THEME_FAMILIES.growth.includes('output_gap'));
  assert.deepEqual(oecdGapLatest([], 'BRA'), []);
});

test('the OECD projection year matches the stored June 2026 edition (projections from 2026)', () => {
  assert.equal(PROJECTION_FROM_YEAR, 2026);
});

/* A pdftotext -layout fragment: base years sit beside the latest-actual columns, one cell is missing. */
const LAYOUT = [
  'Table G. Key Data Documentation: National Accounts and Prices',
  '                                    National Accounts                         Prices (CPI)',
  'Country              Currency       Latest Actual   Base Year                 Latest Actual   Base Year',
  'Türkiye              Turkish lira   2025            2009                      2025            2003',
  'Libya                Libyan dinar   2019            2007                      2025            2003',
  'India                Indian rupee   2024/25         2011/12                   2025            2012',
  'Atlantis             Coin           2020            2010                      2020            2010',
  '',
  'Table H. Key Data Documentation: Government Finance and Balance of Payments',
  'Country              Source         Latest Actual   Manual                    Latest Actual   Manual',
  'Türkiye              MoF            2025            GFSM 2014                 2025            BPM6',
  'Libya                MoF            ...             GFSM 1986                 2024            BPM6',
  'India                MoF            2024/25         GFSM 2014                 2025/26         BPM6',
].join('\n');

test('appendix parser: years by column, never by order; missing cells stay null; fiscal years kept', () => {
  const p = parseAppendix(LAYOUT);
  assert.deepEqual(p.countries.TUR, {
    nationalAccounts: '2025',
    cpi: '2025',
    governmentFinance: '2025',
    balanceOfPayments: '2025',
  });
  assert.equal(p.countries.LBY.nationalAccounts, '2019');
  assert.equal(
    p.countries.LBY.governmentFinance,
    null,
    'a missing cell is null, not the next year',
  );
  assert.equal(p.countries.LBY.balanceOfPayments, '2024');
  assert.equal(p.countries.IND.nationalAccounts, '2024/25');
  assert.equal(p.countries.IND.balanceOfPayments, '2025/26');
  assert.ok(p.unplaced.includes('Atlantis'));
  assert.equal(iso3Of('Taiwan Province of China'), 'TWN');
  const text = renderReference(p, {
    vintage: '2027-04',
    through: '2027-03-31',
    monthName: 'April 2027',
  });
  assert.match(text, /"vintage": "2027-04"/);
  assert.ok(!/—/.test(text));
});
