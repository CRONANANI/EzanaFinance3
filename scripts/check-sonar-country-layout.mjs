/**
 * Sonar country answer layout (Nov 2026): the full-width detail packing, the "Ezana
 * thresholds" explainer generated from CURRENCY_THRESHOLDS, the assessment's boundary
 * behaviour after the cut-offs moved into CURRENCY_THRESHOLDS, the per-country reading in the
 * explainer, and the wiring that keeps the band from repeating the brief or stacking the
 * detail in one column.
 *
 * Run: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-sonar-country-layout.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const V = await import('@/lib/sonar/country-intel-view');
const PB = await import('@/lib/sonar/macro/playbook');
const TH = await import('@/lib/sonar/macro/currency-thresholds');

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const rowsOf = (packed) => {
  const m = new Map();
  for (const c of packed) m.set(c.row, (m.get(c.row) || 0) + c.span);
  return [...m.values()];
};

/* ------------------------------------------------------------------ packDetailRows */

test('every packed row fills the grid edge to edge', () => {
  const turkey = [
    { id: 'drivers', span: 6, min: 5 },
    { id: 'scenarios', span: 6, min: 6 },
    { id: 'chart-infl', span: 4, min: 4 },
    { id: 'chart-fx', span: 4, min: 4 },
    { id: 'chart-policy', span: 4, min: 4 },
    { id: 'map', span: 8, min: 7 },
    { id: 'monitor', span: 4, min: 4 },
    { id: 'bottom', span: 4, min: 4 },
    { id: 'x-story', span: 7, min: 6 },
    { id: 'x-indicators', span: 5, min: 4 },
    { id: 'missing', span: 6, min: 4 },
  ];
  for (const cols of [12, 6]) {
    const input =
      cols === 12
        ? turkey
        : turkey.map((s) => ({
            id: s.id,
            span: Math.max(2, Math.round(s.span / 2)),
            min: Math.max(2, Math.round(s.min / 2)),
          }));
    const packed = V.packDetailRows(input, cols);
    assert.equal(packed.length, turkey.length, 'every section is placed');
    for (const sum of rowsOf(packed)) assert.equal(sum, cols, `row sums to ${cols}`);
  }
});

test('a lone section takes the whole row; odd counts never strand a gap', () => {
  assert.deepEqual(V.packDetailRows([{ id: 'a', span: 4 }], 12), [{ id: 'a', span: 12, row: 0 }]);
  for (let n = 1; n <= 7; n++) {
    const packed = V.packDetailRows(
      Array.from({ length: n }, (_, i) => ({ id: `c${i}`, span: 4 })),
      12,
    );
    for (const sum of rowsOf(packed)) assert.equal(sum, 12);
  }
  /* Wider than the grid: clamped to a full row. */
  assert.equal(V.packDetailRows([{ id: 'w', span: 20 }], 12)[0].span, 12);
  /* A section that fits at its min width shrinks into the row instead of opening a new one. */
  const p = V.packDetailRows(
    [
      { id: 'a', span: 8 },
      { id: 'b', span: 6, min: 4 },
    ],
    12,
  );
  assert.deepEqual(
    p.map((c) => [c.id, c.span, c.row]),
    [
      ['a', 8, 0],
      ['b', 4, 0],
    ],
  );
  assert.deepEqual(V.packDetailRows([], 12), []);
});

/* ------------------------------------------------------------------ thresholds explainer */

test('the explainer states the engine cut-offs and follows them when they change', () => {
  const rows = TH.currencyThresholdRows();
  assert.deepEqual(
    rows.map((r) => r.id),
    ['depreciation', 'inflation', 'policy', 'external', 'stress'],
  );
  for (const r of rows) {
    for (const lv of PB.CURRENCY_LEVELS) assert.ok(r.levels[lv], `${r.id} has a ${lv} line`);
  }
  const T = PB.CURRENCY_THRESHOLDS;
  const dep = rows[0];
  assert.match(dep.levels.severe, new RegExp(`^${T.depreciation1y.severe}%`));
  assert.match(dep.levels.elevated, new RegExp(`^${T.depreciation1y.elevated}%`));
  assert.match(dep.note, new RegExp(`${T.depreciation3mAnnualised.elevated}%`));
  assert.match(rows[1].levels.severe, new RegExp(`^${T.inflation.severe}%`));
  assert.match(rows[3].levels.elevated, new RegExp(`${T.reserveImportMonths.weak} months`));
  assert.match(rows[4].levels.severe, new RegExp(`^${T.riskPercentile.severe}th`));

  const moved = structuredClone(T);
  moved.depreciation1y.severe = 33;
  assert.match(TH.currencyThresholdRows(moved)[0].levels.severe, /^33%/);
});

test('explainer copy: no em dashes, no advice words, the overall rule names the anchor', () => {
  const all = [
    ...TH.currencyThresholdRows().flatMap((r) => [
      r.label,
      r.measure,
      r.note || '',
      ...Object.values(r.levels),
    ]),
    ...TH.OVERALL_RULE,
    TH.CRISIS_RULE,
    ...TH.THRESHOLD_CAVEATS,
  ].join('\n');
  assert.ok(!all.includes('—'), 'no em dash');
  assert.ok(!/\b(buy|sell|should invest|we recommend)\b/i.test(all), 'findings only');
  assert.match(TH.OVERALL_RULE[0], /depreciation/i);
  const src = read('src/components/sonar/macro/EzanaThresholds.jsx');
  assert.ok(!src.includes('—'), 'no em dash in the modal');
});

/* ------------------------------------------------------------------ assessment unchanged */

test('the assessment boundaries are unchanged after the cut-offs moved', () => {
  const level = (m, id) => PB.assessCurrencyPressure(m).components.find((c) => c.id === id)?.level;
  /* valueLost = (1 - old/new) * 100 */
  const fxFor = (lost) => ({ fxYearAgo: 100, fxNow: 100 / (1 - lost / 100) });
  assert.equal(level(fxFor(2.9), 'depreciation'), 'low');
  assert.equal(level(fxFor(3.5), 'depreciation'), 'moderate');
  assert.equal(level(fxFor(10.1), 'depreciation'), 'elevated');
  assert.equal(level(fxFor(25.1), 'depreciation'), 'severe');
  assert.equal(level({ inflationAnnual: 3.9 }, 'inflation'), 'low');
  assert.equal(level({ inflationAnnual: 4 }, 'inflation'), 'moderate');
  assert.equal(level({ inflationAnnual: 10 }, 'inflation'), 'elevated');
  assert.equal(level({ inflationAnnual: 30 }, 'inflation'), 'severe');
  assert.equal(level({ riskPercentile: 49 }, 'stress'), 'low');
  assert.equal(level({ riskPercentile: 50 }, 'stress'), 'moderate');
  assert.equal(level({ riskPercentile: 80 }, 'stress'), 'elevated');
  assert.equal(level({ riskPercentile: 95 }, 'stress'), 'severe');
  /* Turkey, Sep 2026 (the expected answer): elevated overall. */
  const tr = PB.assessCurrencyPressure({
    fxNow: 48.65,
    fxYearAgo: 41.33,
    inflationAnnual: 29.7,
    policyRate: 37,
    policyRateChange1y: -3.5,
  });
  assert.equal(tr.overall, 'elevated');
});

/* ------------------------------------------------------------------ this country's reading */

test('evidenceReading puts the measured inputs in words', () => {
  assert.equal(
    V.evidenceReading({
      id: 'depreciation',
      evidence: { valueLostPct: 15.04, annualisedLast3mPct: 12.2 },
    }),
    '15.0% of dollar value lost over 12 months, last 3 months annualised 12.2%',
  );
  assert.equal(
    V.evidenceReading({ id: 'policy', evidence: { expostRealRatePp: 7.3, easingOverYear: true } }),
    'Real policy rate 7.3 pp, rate cut over the year',
  );
  assert.equal(
    V.evidenceReading({ id: 'external', evidence: { currentAccountPctGdp: -1.26 } }),
    'Current account −1.3% of GDP',
  );
  assert.equal(
    V.evidenceReading({ id: 'stress', evidence: { ownHistoryPercentile: 82.6 } }),
    '83rd percentile of its own history',
  );
  assert.equal(V.evidenceReading({ id: 'crisis', evidence: null }), null);
  assert.equal(V.evidenceReading({ id: 'inflation' }), null);
});

/* ------------------------------------------------------------------ wiring */

test('the band does not repeat the brief, leads with the KPIs and spans the detail full width', () => {
  const card = read('src/components/landing/CountryIntelCard.jsx');
  const stack = read('src/components/landing/SonarCountryStack.jsx');
  const band = read('src/components/landing/SonarSection.jsx');
  const brief = read('src/lib/sonar/macro/intel-brief.js');

  /* KPI row comes before the meta line and the lede in the card. */
  const body = card.slice(card.indexOf('export function CountryIntelCard'));
  assert.ok(body.indexOf('<KpiRow') < body.indexOf('snr-cii-meta'), 'KPIs lead the card');
  assert.ok(body.indexOf('<KpiRow') < body.indexOf('snr-cii-lede'), 'KPIs above any lede');

  /* "Ezana thresholds" in the caption is the explainer button. */
  assert.match(card, /Qualitative assessment against <EzanaThresholdsButton/);

  /* The band's card never repeats the brief; /datasets detaches the detail. */
  assert.match(stack, /<CountryIntelCard dossier=\{dossier\} lede=\{false\}/);
  assert.match(band, /detached=\{isPage\}/);
  assert.match(band, /<CountryDetail dossier=\{live\.dossier\}/);

  /* The deep report keeps the full card. */
  const report = read('src/components/sonar/research/ResearchReport.jsx');
  assert.ok(!/CountryIntelCard[^>]*part="summary"/.test(report));

  /* Rows carry their evidence to the explainer. */
  assert.match(brief, /evidence: c\.evidence \|\| null/);
});
