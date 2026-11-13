/**
 * Sonar board polish (Nov 7 2026):
 *   - research board: the Top 5 snapshot as a dotted world map (ranked countries lit), the
 *     run's Back and ping bar in the sections column (no full-width run bar on a board), the
 *     executive answer's new layout and meta line, shorter centred KPI tiles;
 *   - country board: the FX key findings (computed, any currency) and the restructured
 *     charts (FX ranges and 12-month change, inflation vs policy with the real rate, REER
 *     with its median, no duplicate inflation chart, FX wide beside policy).
 *
 * Run: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-sonar-board-polish.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { oilState } from './fixtures/sonar-research-oil.mjs';

const D = await import('@/lib/sonar/dot-map');
const B = await import('@/lib/sonar/research-board');
const CUR = await import('@/lib/sonar/macro/currency');
const F = await import('@/lib/sonar/macro/fx-findings');
const V = await import('@/lib/sonar/country-intel-view');
const CB = await import('@/lib/sonar/country-board');
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const FIX = JSON.parse(read('scripts/fixtures/macro-turkey.json')).series;
const TRY = { code: 'TRY', name: 'Turkish lira', short: 'lira' };
const NOW = new Date('2026-11-06T00:00:00Z');

const turkey = (over = {}) => {
  const pic = CUR.buildCurrencyPicture(
    {
      fx: FIX.fx,
      reer: FIX.reer,
      inflation: { history: FIX.cpi, mode: 'index' },
      policy: FIX.policy,
      ...over,
    },
    { currency: TRY, place: 'Turkey', now: NOW },
  );
  return pic;
};

/* ------------------------------------------------------------------ dotted map */

test('world dots: a land grid with every drawn country tagged and anchored', () => {
  const { dots, anchors } = D.worldDots();
  assert.ok(dots.length > 2000 && dots.length < 3500, `land dots ${dots.length}`);
  for (const iso of ['USA', 'RUS', 'SAU', 'CAN', 'BRA', 'CHN', 'TUR', 'ARE', 'QAT'])
    assert.ok(anchors.has(iso), iso);
  /* Small countries still get a dot. */
  assert.ok(dots.some((d) => d.iso3 === 'QAT'));
  assert.ok(dots.every((d) => d.x > 0 && d.x < D.WORLD_COLS && d.y > 0 && d.y < D.WORLD_ROWS));
});

test('country names resolve to ISO3, as publishers write them', () => {
  assert.equal(D.isoOf('United States'), 'USA');
  assert.equal(D.isoOf('Russia'), 'RUS');
  assert.equal(D.isoOf('Russian Federation'), 'RUS');
  assert.equal(D.isoOf('Saudi Arabia'), 'SAU');
  assert.equal(D.isoOf('Türkiye'), 'TUR');
  assert.equal(D.isoOf('United Arab Emirates'), 'ARE');
  assert.equal(D.isoOf('Iran, Islamic Rep.'), 'IRN');
  assert.equal(D.isoOf('BRA'), 'BRA');
  assert.equal(D.isoOf('Lockheed Martin'), null);
});

test('a country ranking goes on the map; a company ranking keeps the bars', () => {
  const rank = B.rankingOf(oilState.analysis.visualizations);
  const rows = B.rankingRows(rank, 5);
  const placed = D.placeRanking(rows);
  assert.equal(placed.isCountries, true);
  assert.deepEqual(
    placed.rows.map((r) => r.iso3),
    ['USA', 'RUS', 'SAU', 'CAN', 'BRA'],
  );
  const firms = D.placeRanking([
    { label: 'Exxon Mobil', value: 3 },
    { label: 'Chevron', value: 2 },
    { label: 'Saudi Aramco', value: 1 },
  ]);
  assert.equal(firms.isCountries, false);
});

test('the engine sends iso3 with each ranking row, and rankingOf keeps it', () => {
  const an = read('src/lib/sonar/engine/analysis.js');
  assert.match(an, /note: r\.period,\s*iso3: r\.iso3 \|\| null/);
  const rank = B.rankingOf([
    {
      id: 'macro_rank_x',
      type: 'bars',
      rows: [
        { label: 'Somewhere', value: 2, iso3: 'NOR' },
        { label: 'Elsewhere', value: 1, iso3: 'GUY' },
      ],
    },
  ]);
  assert.deepEqual(
    D.placeRanking(B.rankingRows(rank, 5)).rows.map((r) => r.iso3),
    ['NOR', 'GUY'],
  );
});

test('map geometry: one path per ranked country, markers that do not sit on each other', () => {
  const rank = B.rankingOf(oilState.analysis.visualizations);
  const placed = D.placeRanking(B.rankingRows(rank, 5));
  const g = D.dotMapGeometry(placed.rows);
  assert.equal(g.ranked.length, 5);
  assert.deepEqual(
    g.ranked.map((r) => r.rank),
    [1, 2, 3, 4, 5],
  );
  assert.match(g.base, /^M[\d.]+ [\d.]+h0/);
  assert.ok(!g.ranked.some((r) => g.base.includes(r.d.slice(0, 20))), 'lit dots leave the base');
  assert.equal(g.markers.length, 5);
  for (let i = 0; i < g.markers.length; i += 1)
    for (let j = i + 1; j < g.markers.length; j += 1) {
      const a = g.markers[i];
      const b = g.markers[j];
      assert.ok(Math.abs(a.x - b.x) >= 7 || Math.abs(a.y - b.y) >= 7 * 0.62, `${a.iso3}/${b.iso3}`);
    }
  /* The Gulf: Saudi Arabia, the UAE, Iraq and Kuwait crowd one spot; they get nudged apart. */
  const gulf = D.dotMapGeometry(
    D.placeRanking([
      { label: 'Saudi Arabia', value: 4 },
      { label: 'United Arab Emirates', value: 3 },
      { label: 'Iraq', value: 2 },
      { label: 'Kuwait', value: 1 },
    ]).rows,
  );
  assert.ok(gulf.markers.some((m) => m.moved));
});

test('the snapshot renders the map for countries, with a list that carries the values', () => {
  const rb = read('src/components/sonar/research/ResearchBoard.jsx');
  assert.match(rb, /placeRanking\(rows\)/);
  assert.match(rb, /if \(!placed\.isCountries\)/);
  assert.match(rb, /<DotMap rows=\{placed\.rows\}/);
  assert.match(rb, /role="img"/);
  assert.match(rb, /The list below gives each value/);
  assert.match(rb, /className="srb-maplist"/);
  const css = read('src/components/sonar/research/research-board.css');
  assert.match(css, /\.srb \.srb-map-hit\.is-r1 \{\s*stroke: var\(--emerald\);/);
  assert.match(css, /stroke-linecap: round/);
});

/* ------------------------------------------------------------------ executive answer, KPIs */

test('executive answer: the headline is the title, with a meta line and key takeaways', () => {
  const rank = B.rankingOf(oilState.analysis.visualizations);
  const meta = B.execMeta({ rank, resources: [1, 2, 3, 4, 5], evidence: [] });
  assert.deepEqual(
    meta.map((m) => m.text),
    ['Data to Jun 2026', 'U.S. Energy Information Administration', '5 sources used'],
  );
  assert.deepEqual(B.execMeta({}), []);
  const rb = read('src/components/sonar/research/ResearchBoard.jsx');
  /* Nov 13 (research workspace): the answer is the shared Desk Summary. Its title is the
     run's headline (else the board's), the meta line sits above it, and the key points are
     the card's Key takeaways (the run's own, else the board's bullets). */
  assert.match(rb, /<SonarDeskSummary/);
  assert.match(
    rb,
    /const headline = run\?\.headline \|\| report\?\.headline \|\| boardHeadline\(report, rank\)/,
  );
  assert.match(rb, /question="Research answer"/);
  assert.match(rb, /className="srb-exec-meta"/);
  assert.match(rb, /bullets\.map\(\(b\) => b\.text\)/);
  assert.match(read('src/components/sonar/SonarDeskSummary.jsx'), /Key takeaways/);
  assert.ok(!rb.includes('—'), 'no em dash');
});

test('KPI tiles: shorter, everything centred', () => {
  const css = read('src/components/sonar/research/research-board.css');
  const kpi = css.slice(css.indexOf('.srb .srb-kpi {'), css.indexOf('.srb .srb-kpi-head'));
  assert.match(kpi, /flex-direction: column/);
  assert.match(kpi, /align-items: center/);
  assert.match(kpi, /text-align: center/);
  assert.match(kpi, /padding: 12px 14px/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/, 'no hex');
});

/* ------------------------------------------------------------------ run bar -> sections column */

/* Nov 13 (research workspace): Back stays at the top of the sections column; the ping bar is
   the workspace's query bar at the top of the centre column (the frame's `top`). */
test('a finished board keeps Back in its sections column and the ping bar in the centre', () => {
  const dr = read('src/components/sonar/DeepResearch.jsx');
  assert.equal((dr.match(/\{boardUp \? null : \(/g) || []).length, 2, 'both runs drop the bar');
  assert.equal(
    (dr.match(/navTop=\{boardUp \? <SonarRunNav onBack=\{onBack\} \/> : null\}/g) || []).length,
    2,
  );
  assert.equal((dr.match(/variant="query"/g) || []).length, 2, 'both runs pass the query bar');
  assert.match(dr, /const boardUp = onBoard && state\.status === 'done'/);
  const rr = read('src/components/sonar/research/ResearchReport.jsx');
  assert.match(rr, /navTop=\{navTop\}/);
  const rb = read('src/components/sonar/research/ResearchBoard.jsx');
  assert.match(rb, /navTop=\{navTop\}/);
  assert.match(rr, /queryBar=\{queryBar\}/);
  assert.match(rb, /\{queryBar\}/);
  const fr = read('src/components/sonar/SonarAnswerFrame.jsx');
  assert.match(fr, /\{navTop \? <div className="san-top">\{navTop\}<\/div> : null\}/);
  const fcss = read('src/components/sonar/sonar-answer-frame.css');
  assert.match(fcss, /\.san \.san-side \{\s*position: sticky/);
  const bar = read('src/components/sonar/SonarRunPingBar.jsx');
  assert.match(bar, /export function SonarRunNav/);
  assert.match(bar, /aria-label="Back"/);
  assert.match(bar, /variant="nav"/);
  assert.match(bar, /aria-label=\{variant === 'nav' \? 'Ping' : undefined\}/);
  const dcss = read('src/components/sonar/deep-research.css');
  assert.match(dcss, /\.sdr-ping--nav \.sdr-ping-input \{\s*width: 0;/);
});

/* ------------------------------------------------------------------ FX key findings */

test('Turkey: four findings, every figure from the computed measures', () => {
  const pic = turkey();
  const m = F.compactMetrics(pic.metrics, { reerBasis: 'bis_real_broad' });
  assert.equal(m.inflation.series, undefined, 'no long series in the payload');
  const fs = F.fxFindings({ metrics: m, currency: TRY, place: 'Turkey', missing: pic.missing });
  assert.deepEqual(
    fs.map((f) => f.id),
    ['fx-pace', 'policy-real', 'reer', 'crisis-scope'],
  );
  const [pace, pol, reer, scope] = fs;
  assert.match(pace.headline, /lira has lost value against the US dollar over every window/);
  assert.ok(
    pace.evidence.some((e) => /12 months \(Sep 2025 to Sep 2026\).*17\.7% more.*15\.1%/.test(e)),
  );
  assert.ok(pace.evidence.some((e) => /annualise to an 18\.1% loss/.test(e)));
  assert.match(pace.qualification, /17\.7% dearer dollar is a 15\.1% loss/);
  assert.equal(pace.chart, 'fx');
  assert.match(pol.headline, /\+7\.3 percentage points/);
  assert.ok(pol.evidence.includes('Policy rate minus inflation: 37.0% − 29.7% = +7.3 pp.'));
  assert.match(pol.interpretation, /backward-looking measure policy is restrictive/);
  assert.match(pol.qualification, /not in Ezana's data/);
  assert.match(reer.headline, /yet rose 7\.2% in real effective terms/);
  assert.ok(reer.evidence.some((e) => /index 108\.3/.test(e)));
  assert.ok(reer.evidence.some((e) => /83rd percentile/.test(e)));
  assert.match(reer.qualification, /not by itself evidence of overvaluation/);
  assert.match(scope.headline, /cannot establish that a crisis is imminent/);
  for (const k of [
    'short-term external debt',
    'sovereign CDS spreads',
    'capital flows',
    'inflation expectations',
  ])
    assert.ok(
      scope.evidence.some((e) => e.includes(k)),
      k,
    );
  for (const f of fs) {
    const all = [f.headline, ...f.evidence, f.interpretation, f.why, f.qualification].join(' ');
    assert.ok(!all.includes('—'), `${f.id}: no em dash`);
    assert.doesNotMatch(
      all,
      /\b(should|buy|sell|recommend|we advise)\b/i,
      `${f.id}: findings only`,
    );
    assert.doesNotMatch(all, /undefined|NaN|null/, f.id);
  }
});

test('findings drop what the data cannot support', () => {
  const pic = turkey();
  /* A REER whose base is not verified: no REER finding. */
  const other = F.fxFindings({
    metrics: F.compactMetrics(pic.metrics, { reerBasis: 'other' }),
    currency: TRY,
    place: 'Turkey',
  });
  assert.ok(!other.some((f) => f.id === 'reer'));
  /* No policy rate: no policy finding. */
  const noPol = turkey({ policy: null });
  const fs = F.fxFindings({
    metrics: F.compactMetrics(noPol.metrics, { reerBasis: 'bis_real_broad' }),
    currency: TRY,
  });
  assert.ok(!fs.some((f) => f.id === 'policy-real'));
  assert.deepEqual(F.fxFindings({}), []);
});

test('findings generalise: a strengthening currency, no country hardcoded', () => {
  const months = [];
  for (let y = 2019; y <= 2026; y += 1)
    for (let mo = 1; mo <= 12; mo += 1) {
      if (y === 2026 && mo > 9) break;
      months.push(`${y}-${String(mo).padStart(2, '0')}`);
    }
  const fx = months.map((period, i) => ({ period, value: +(1.0 - i * 0.002).toFixed(4) }));
  const pic = CUR.buildCurrencyPicture(
    { fx },
    {
      currency: { code: 'CHF', name: 'Swiss franc', short: 'franc' },
      place: 'Switzerland',
      now: NOW,
    },
  );
  const fs = F.fxFindings({
    metrics: F.compactMetrics(pic.metrics),
    currency: { code: 'CHF', name: 'Swiss franc', short: 'franc' },
    place: 'Switzerland',
  });
  assert.equal(fs[0].id, 'fx-pace');
  assert.match(fs[0].headline, /franc has gained against the US dollar/);
  assert.ok(fs[0].evidence.every((e) => !/lira|TRY|Turkey/.test(e)));
  const src = read('src/lib/sonar/macro/fx-findings.js');
  assert.doesNotMatch(src, /Turkey|lira|TRY/, 'nothing hardcoded to one country');
});

/* ------------------------------------------------------------------ payload */

test('the pipeline passes the measures; intel adds the REER chart only for BIS real broad', () => {
  const lp = read('src/lib/sonar/landing-pipeline.js');
  assert.match(
    lp,
    /metrics: compactMetrics\(intel\.picture\.metrics, \{ reerBasis: intel\.reerBasis \|\| null \}\)/,
  );
  const intel = read('src/lib/sonar/macro/intel.js');
  assert.match(intel, /reerBasis === 'bis_real_broad'\s*\? chart\(reerRow, reerH/);
  assert.match(intel, /\/\^WS_EER:M\\\.R\\\.B\\\.\/\.test\(reerRow\.series_key\)/);
});

/* ------------------------------------------------------------------ charts */

test('chart data: rolling 12-month value change, real rate, median and percentile', () => {
  const fxm = { points: FIX.fx.map((p) => ({ x: p.period, y: p.value })) };
  const roll = V.rollingValueChange(null, fxm, 12);
  const last = roll[roll.length - 1];
  assert.equal(last.x, '2026-09');
  assert.ok(Math.abs(last.y - -15.05) < 0.1, `12m value change ${last.y}`);
  const pol = { points: FIX.policy.map((p) => ({ x: p.period, y: p.value })) };
  const infl = {
    points: CUR.yoyFromIndexHistory(FIX.cpi).map((p) => ({ x: p.period, y: p.value })),
  };
  const real = V.realRateSeries(pol, infl);
  assert.equal(real[real.length - 1].x, '2026-09');
  assert.ok(Math.abs(real[real.length - 1].y - 7.3) < 0.1);
  assert.equal(V.medianOf([3, 1, 2]), 2);
  assert.equal(V.medianOf([1, 2, 3, 4]), 2.5);
  assert.equal(V.medianOf([]), null);
  assert.equal(V.percentileRank([1, 2, 3, 4], 3), 75);
  assert.deepEqual(
    V.FX_WINDOWS.map((w) => w.id),
    ['3M', '1Y', '3Y', '5Y'],
  );
});

test('chart layout: FX wide beside policy, the rest evenly below', () => {
  assert.deepEqual([...CB.chartSpans(['fx', 'policy', 'reer', 'res']).values()], [7, 5, 6, 6]);
  assert.deepEqual([...CB.chartSpans(['fx', 'policy', 'reer']).values()], [7, 5, 12]);
  assert.deepEqual([...CB.chartSpans(['policy', 'res']).values()], [6, 6]);
  assert.deepEqual([...CB.chartSpans(['fx']).values()], [12]);
});

test('charts: no duplicate inflation chart, REER with its median, findings link to charts', () => {
  const ci = read('src/components/landing/CountryIntelCard.jsx');
  const items = ci.slice(
    ci.indexOf('function intelChartItems'),
    ci.indexOf('function IntelCharts'),
  );
  assert.match(items, /if \(pol\.length >= 2\)\s*items\.push\(<PolicyChart/);
  assert.match(
    items,
    /else if \(infl\.length >= 2\)/,
    'inflation alone only without a policy rate',
  );
  assert.match(items, /<ReerChart key="reer"/);
  assert.match(ci, /refs=\{med != null \? \[\{ y: med, label: `Median/);
  assert.match(ci, /id="intel-chart-fx"/);
  assert.match(ci, /id="intel-chart-policy"/);
  assert.match(ci, /id="intel-chart-reer"/);
  assert.match(ci, /12M change/);
  assert.match(ci, /Real rate/);
  const board = read('src/components/landing/SonarCountryBoard.jsx');
  assert.match(board, /id: 'keyfindings',\s*section: 'findings'/);
  assert.match(board, /href=\{`#intel-chart-\$\{f\.chart\}`\}/);
  assert.match(board, /'--bd-cspan': spans\.get\(c\.key\)/);
  assert.ok(!board.includes('—'));
  const css = read('src/components/landing/sonar-country-board.css');
  assert.match(css, /grid-column: span var\(--bd-cspan, 6\)/);
});
