/**
 * Sonar country Key chart (freshest series per tab) and the Country intelligence card's
 * pure view helpers (Nov 2026).
 *   npm run test:key-chart
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const {
  periodX,
  cataloguePoints,
  catalogueStory,
  chooseStory,
  mergeKeyStories,
  annotateOecdStory,
  hasProjection,
  storyHeadline,
  OECD_SOURCE,
} = await import('@/lib/sonar/key-chart');
const view = await import('@/lib/sonar/country-intel-view');

const NOW = new Date('2026-11-06T00:00:00Z');

/* An OECD story as landing-country.js seriesStory builds it: actual to 2023, projections after. */
function oecdStory(slug, { lastActual = 2023, value = 50, z = 1.2 } = {}) {
  const points = [];
  for (let y = 1995; y <= lastActual + 2; y += 1)
    points.push({ year: y, value: value - (lastActual - y) * 0.5, proj: y > lastActual });
  const latest = points.find((p) => p.year === lastActual);
  return {
    slug,
    label: 'Headline inflation',
    short: 'Infl',
    unit: '% YoY',
    decimals: 1,
    signed: false,
    points,
    latest,
    median: 10,
    sd: 5,
    z,
    peak: latest,
    trough: points[0],
    normYears: 20,
  };
}

/* Monthly index history Jan 2019 .. Sep 2026 rising 2% a month. */
function monthlyIndex(from = 2019, to = [2026, 9]) {
  const out = [];
  let v = 100;
  for (let y = from; y <= to[0]; y += 1)
    for (let m = 1; m <= 12; m += 1) {
      if (y === to[0] && m > to[1]) break;
      out.push({ period: `${y}-${String(m).padStart(2, '0')}`, value: +(v = v * 1.02).toFixed(4) });
    }
  return out;
}

function catInflation() {
  const points = cataloguePoints(monthlyIndex(), {
    family: 'inflation_monthly',
    source: 'imf',
    seriesKey: 'IMF.CPI:dataflow.TUR.CPI._T.IX.M',
    mode: 'yoy_from_index',
    now: NOW,
  });
  return catalogueStory({
    family: 'inflation_monthly',
    slug: 'eo-cpi_ytypct',
    points,
    label: 'Headline inflation',
    short: 'Infl',
    unit: '% y/y',
    attribution: 'International Monetary Fund, CPI',
    source: 'imf',
  });
}

test('periodX: monthly points are fractional years, start of month', () => {
  assert.equal(periodX('2026-01'), 2026);
  assert.ok(Math.abs(periodX('2026-09') - (2026 + 8 / 12)) < 1e-9);
  assert.equal(periodX('2026-Q3'), 2026.5);
  assert.equal(periodX('2023'), 2023);
  assert.ok(periodX('2026-07-02') > 2026.49 && periodX('2026-07-02') < 2026.51);
  assert.equal(periodX('n/a'), null);
});

test('a catalogue index becomes y/y points, labelled by month, stats over what is shown', () => {
  const s = catInflation();
  assert.ok(s);
  assert.equal(s.periodLabel, 'Sep 2026');
  assert.equal(s.latest.label, 'Sep 2026');
  assert.equal(s.projection, false);
  assert.ok(s.points.every((p) => p.proj === false && typeof p.label === 'string'));
  /* 2% a month compounds to 26.82% a year. */
  assert.ok(Math.abs(s.latest.value - 26.82) < 0.01);
  /* y/y starts Jan 2020, so the norm covers Jan 2020 to Aug 2026: about 7 years, not 20. */
  assert.equal(s.normYears, 7);
  assert.match(
    s.headline,
    /Inflation is (close to|running (above|below)) its 7-year norm as of Sep 2026/,
  );
  assert.equal(s.source, 'International Monetary Fund, CPI');
});

test('OECD 2023 vs catalogue Sep 2026: the catalogue is shown', () => {
  const o = annotateOecdStory(oecdStory('eo-cpi_ytypct'));
  const c = catInflation();
  assert.equal(chooseStory(o, c), c);
  const merged = mergeKeyStories(
    [oecdStory('eo-cpi_ytypct')],
    { 'eo-cpi_ytypct': c },
    { order: ['eo-cpi_ytypct'] },
  );
  assert.equal(merged.stories.length, 1);
  assert.equal(merged.stories[0].source, 'International Monetary Fund, CPI');
  assert.equal(merged.stories[0].short, 'Infl');
});

test('OECD fresher than the catalogue keeps OECD', () => {
  const o = annotateOecdStory(oecdStory('eo-gdpv_annpct', { lastActual: 2025 }));
  const annual = [];
  for (let y = 2000; y <= 2024; y += 1) annual.push({ period: String(y), value: 2 + (y % 3) });
  const c = catalogueStory({
    family: 'gdp_growth',
    points: cataloguePoints(annual, {
      family: 'gdp_growth',
      source: 'imf',
      seriesKey: 'IMF.WEO:x',
      now: NOW,
    }),
    attribution: 'IMF WEO',
  });
  assert.ok(c);
  assert.equal(chooseStory(o, c), o);
  /* Same year, a non-preferred family: OECD stays. */
  const o24 = annotateOecdStory(oecdStory('eo-gdpv_annpct', { lastActual: 2024 }));
  assert.equal(chooseStory(o24, c), o24);
});

test('inflation and the policy rate prefer the catalogue within the OECD latest year', () => {
  const o = annotateOecdStory(oecdStory('eo-ircb', { lastActual: 2025 }));
  const monthly = [];
  for (let y = 2015; y <= 2025; y += 1)
    for (let m = 1; m <= 6; m += 1)
      monthly.push({ period: `${y}-${String(m).padStart(2, '0')}`, value: 5 });
  const c = catalogueStory({ family: 'policy_rate', points: monthly, attribution: 'BIS' });
  assert.ok(c);
  assert.equal(chooseStory(o, c), c);
});

test('IMF WEO projection years never enter a catalogue story', () => {
  const rows = [];
  for (let y = 2000; y <= 2031; y += 1) rows.push({ period: String(y), value: y });
  const pts = cataloguePoints(rows, {
    family: 'gdp_growth',
    source: 'imf',
    seriesKey: 'IMF.WEO:dataflow.TUR.NGDP_RPCH.A',
    now: NOW,
  });
  assert.equal(pts[pts.length - 1].period, '2025');
});

test('a policy rate dated at each change is carried forward month by month', () => {
  const pts = cataloguePoints(
    [
      { period: '2024-06-12', value: 3.75 },
      { period: '2024-09-18', value: 3.5 },
      { period: '2024-10-23', value: 3.25 },
    ],
    { family: 'policy_rate', source: 'ecb', seriesKey: 'ECB.FM:B.U2.EUR.4F.KR.DFR.LEV', now: NOW },
  );
  assert.deepEqual(
    pts.map((p) => `${p.period}=${p.value}`),
    ['2024-06=3.75', '2024-07=3.75', '2024-08=3.75', '2024-09=3.5', '2024-10=3.25'],
  );
});

test('projection flag only for OECD', () => {
  const o = annotateOecdStory(oecdStory('eo-cpi_ytypct'));
  const c = catInflation();
  assert.equal(o.source, OECD_SOURCE);
  assert.equal(o.projection, true);
  assert.equal(hasProjection(o), true);
  assert.equal(hasProjection(c), false);
  /* Even a catalogue story handed a stray proj point is not drawn as a projection. */
  assert.equal(
    hasProjection({ ...c, points: [...c.points, { year: 2027, value: 1, proj: true }] }),
    false,
  );
  assert.match(storyHeadline(o), /as of 2023$/);
});

test('merge: tabs follow the order, the story is the series furthest from its norm', () => {
  const merged = mergeKeyStories(
    [oecdStory('eo-cpi_ytypct', { z: 0.2 }), oecdStory('eo-irl', { z: -2.5 })],
    {},
    { order: ['eo-cpi_ytypct', 'eo-gdpv_annpct', 'eo-irl'] },
  );
  assert.deepEqual(
    merged.stories.map((s) => s.slug),
    ['eo-cpi_ytypct', 'eo-irl'],
  );
  assert.equal(merged.storyIndex, 1);
  assert.ok(merged.stories.every((s) => s.source === OECD_SOURCE && s.headline));
  assert.equal(mergeKeyStories([], {}, {}), null);
});

test('too thin a catalogue series makes no story (the tab stays on OECD)', () => {
  const pts = [];
  for (let m = 1; m <= 12; m += 1)
    pts.push({ period: `2026-${String(m).padStart(2, '0')}`, value: m });
  assert.equal(catalogueStory({ family: 'unemployment', points: pts }), null);
  const o = annotateOecdStory(oecdStory('eo-unr'));
  assert.equal(chooseStory(o, null), o);
});

/* ── Country intelligence card: view helpers ──────────────────────────────── */

function dailyFx(days = 400, end = Date.UTC(2026, 10, 5)) {
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end - i * 864e5);
    out.push({ x: d.toISOString().slice(0, 10), y: 40 + (days - i) * 0.02 });
  }
  return {
    label: 'TRY per US dollar',
    unit: 'TRY per USD',
    source: 'BIS',
    period: 'x',
    points: out,
  };
}

function monthlyFx(from = 2019) {
  const out = [];
  for (let y = from; y <= 2026; y += 1)
    for (let m = 1; m <= 12; m += 1) {
      if (y === 2026 && m > 9) break;
      out.push({ x: `${y}-${String(m).padStart(2, '0')}`, y: 5 + (y - from) * 6 + m * 0.3 });
    }
  return {
    label: 'TRY per US dollar (monthly)',
    unit: 'TRY per USD',
    source: 'BIS',
    period: 'x',
    points: out,
  };
}

test('hasCountryIntel: brief, fallback or KPIs', () => {
  assert.equal(view.hasCountryIntel({}), false);
  assert.equal(view.hasCountryIntel({ intel: { kpis: [] } }), false);
  assert.equal(view.hasCountryIntel({ intel: { brief: { answer: 'a' } } }), true);
  assert.equal(view.hasCountryIntel({ intel: { fallbackText: 'x' } }), true);
  assert.equal(view.hasCountryIntel({ intel: { kpis: [{ id: 'fx' }] } }), true);
});

test('fx windows: relative to the last point; 5Y falls back to the monthly series', () => {
  const fx = dailyFx();
  const fxm = monthlyFx();
  const w1m = view.fxWindow(fx, fxm, 1);
  assert.equal(w1m.chart, fx);
  assert.ok(w1m.points.length >= 28 && w1m.points.length <= 32);
  assert.equal(view.fxWindow(fx, fxm, 12).chart, fx);
  const w5 = view.fxWindow(fx, fxm, 60);
  assert.equal(w5.chart, fxm, 'a 400-day daily series does not cover five years');
  assert.equal(w5.points[w5.points.length - 1].x, '2026-09');
  assert.deepEqual(
    view.fxWindowsAvailable(fx, fxm).map((w) => w.id),
    ['1M', '3M', '1Y', '5Y'],
  );
  assert.equal(view.defaultFxWindow(view.fxWindowsAvailable(fx, fxm)), '1Y');
});

test('fx windows: a monthly-only series hides the windows that show fewer than two points', () => {
  const fxm = monthlyFx();
  const ids = view.fxWindowsAvailable(fxm, null).map((w) => w.id);
  assert.deepEqual(ids, ['1M', '3M', '1Y', '5Y']);
  const short = { ...fxm, points: fxm.points.slice(-1) };
  assert.deepEqual(view.fxWindowsAvailable(short, null), []);
  assert.equal(view.defaultFxWindow([]), null);
  /* Two monthly points one month apart: 1M shows both. */
  const two = { ...fxm, points: fxm.points.slice(-2) };
  assert.equal(view.fxWindow(two, null, 1).points.length, 2);
});

test('missing measures: the plain sentence', () => {
  assert.equal(
    view.missingSentence(['policy rate', 'sovereign CDS spreads', 'inflation expectations']),
    "Sovereign CDS spreads and inflation expectations are not in Ezana's data.",
  );
  assert.equal(view.missingSentence(['policy rate']), null);
  assert.equal(
    view.missingSentence(['sovereign CDS spreads']),
    "Sovereign CDS spreads are not in Ezana's data.",
  );
});

test('transmission layout: wide and tall, every edge drawn, no box past the width', () => {
  const map = {
    nodes: [
      { id: 'inflation', label: 'High inflation', supported: true },
      { id: 'fx_demand', label: 'Demand for foreign currency and expectations', supported: false },
      { id: 'easing', label: 'Monetary easing', supported: true },
      { id: 'capital', label: 'Capital-flow risk', supported: false },
      { id: 'depreciation', label: 'Depreciation', supported: true },
      { id: 'import_prices', label: 'Import-price pressure', supported: false },
    ],
    edges: [
      ['inflation', 'fx_demand'],
      ['easing', 'capital'],
      ['fx_demand', 'depreciation'],
      ['capital', 'depreciation'],
      ['depreciation', 'import_prices'],
    ],
    caption: 'Conceptual channels, not a fitted causal model.',
  };
  for (const width of [640, 330]) {
    const L = view.transmissionLayout(map, width);
    assert.equal(L.mode, width >= 520 ? 'wide' : 'tall');
    assert.equal(L.nodes.length, 6);
    assert.equal(L.edges.length, 5);
    for (const n of L.nodes)
      assert.ok(n.x >= 0 && n.x + n.w <= width + 0.01, `${n.id} fits ${width}`);
    for (const e of L.edges) assert.ok([e.x1, e.y1, e.x2, e.y2].every(Number.isFinite));
  }
  assert.equal(view.transmissionLayout(null, 300), null);
  assert.equal(
    view.transmissionLayout({ nodes: [{ id: 'x', label: 'X' }], edges: [['x', 'y']] }, 300).edges
      .length,
    0,
  );
});

test('value formatting uses a real minus sign and compact large values', () => {
  assert.equal(view.fmtValue(-1.234, { decimals: 1, pct: true }), '−1.2%');
  assert.equal(view.fmtValue(152_300_000_000), '152.3B');
  assert.equal(view.fmtValue(48.6512), '48.65');
  assert.equal(view.dateLabel('2026-11-06'), '6 Nov 2026');
  assert.equal(view.dateLabel('2026-09'), 'Sep 2026');
});

test('the card source carries the required captions and no em dash', () => {
  const src = fs.readFileSync(
    new URL('../src/components/landing/CountryIntelCard.jsx', import.meta.url),
    'utf8',
  );
  /* Nov 6: "Ezana thresholds" is now a button inside the caption (it opens the explainer),
     so the caption is checked in its parts around it. */
  assert.match(
    src.replace(/\s+/g, ' '),
    /Qualitative assessment against <EzanaThresholdsButton[^>]*\/>, not a calibrated risk score\./,
  );
  for (const s of [
    'Conditional scenarios, not forecasts.',
    'Conceptual channels, not a fitted causal model.',
    'EzanaThresholdsButton',
    'Country intelligence ·',
  ])
    assert.ok(src.includes(s), s);
  for (const f of [
    '../src/components/landing/CountryIntelCard.jsx',
    '../src/components/landing/country-intel.css',
    '../src/lib/sonar/country-intel-view.js',
    '../src/lib/sonar/key-chart.js',
  ])
    assert.ok(
      !fs.readFileSync(new URL(f, import.meta.url), 'utf8').includes('\u2014'),
      `${f} has an em dash`,
    );
});
