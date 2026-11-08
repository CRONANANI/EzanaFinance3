/**
 * Sonar stock ping (Nov 2026): valuation history and percentiles, the snapshot, the deep
 * research model (DCF, scenarios, sensitivity, peers, conclusion), the equity-only Valuation
 * section and its navigation, the company brief, the KPI strip, "Explore valuations", the
 * nav icon geometry, and the wiring.
 *
 * Run: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-sonar-valuation.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const H = await import('@/lib/sonar/valuation/history');
const M = await import('@/lib/sonar/valuation/model');
const PE = await import('@/lib/sonar/valuation/peers');
const F = await import('@/lib/sonar/valuation/fetch');
const A = await import('@/lib/sonar/answer-sections');
const P = await import('@/lib/sonar/ping-board');
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const NOW = new Date('2026-11-06T12:00:00Z');
const DAY = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);

/* Synthetic company: 28 quarters ending Sep 2026, steady growth; market cap a smooth daily
   path from $2.0T to $3.4T over six years. Quarter-end on the 30th of Mar, Jun, Sep, Dec;
   filed 30 days after quarter end. */
function fixture({ netIncomeQ = (i) => 20e9 + i * 0.4e9, splitAt = null } = {}) {
  const ends = [];
  for (let y = 2019; y <= 2026; y += 1)
    for (const m of ['03-30', '06-30', '09-30', '12-30']) {
      const d = `${y}-${m}`;
      if (d <= '2026-09-30') ends.push(d);
    }
  const q = ends.slice(-28);
  const income = q.map((d, i) => ({
    date: d,
    filingDate: iso(Date.parse(d) + 30 * DAY),
    revenue: 80e9 + i * 1.5e9,
    ebitda: 28e9 + i * 0.6e9,
    netIncome: netIncomeQ(i),
    operatingIncome: 24e9 + i * 0.5e9,
    incomeBeforeTax: 25e9 + i * 0.5e9,
    incomeTaxExpense: (25e9 + i * 0.5e9) * 0.16,
    interestExpense: 1e9,
    depreciationAndAmortization: 3e9,
    /* An as-reported share count that jumps 4x at a split: market cap is unaffected. */
    weightedAverageShsOutDil: splitAt != null && i < splitAt ? 4e9 : 16e9,
    epsDiluted: 9.99,
  }));
  const cashflow = q.map((d, i) => ({
    date: d,
    filingDate: iso(Date.parse(d) + 30 * DAY),
    freeCashFlow: 22e9 + i * 0.3e9,
    capitalExpenditure: -2.5e9,
    changeInWorkingCapital: -0.5e9,
  }));
  const balance = q.map((d) => ({
    date: d,
    filingDate: iso(Date.parse(d) + 30 * DAY),
    totalDebt: 100e9,
    cashAndShortTermInvestments: 60e9,
  }));
  const caps = [];
  const start = Date.parse('2020-10-01');
  for (let t = start; t <= NOW.getTime(); t += DAY) {
    const k = (t - start) / (NOW.getTime() - start);
    caps.push({ date: iso(t), marketCap: 2.0e12 + 1.4e12 * k + 0.1e12 * Math.sin(k * 20) });
  }
  caps.reverse(); /* newest first, as the provider sends it */
  const estimates = [
    { date: '2026-09-30', epsAvg: 7.1, revenueAvg: 400e9 },
    { date: '2027-09-30', epsAvg: 8.0, revenueAvg: 440e9 },
  ];
  const quote = { price: 210, marketCap: 3.36e12 };
  return { income, cashflow, balance, caps, estimates, quote };
}

/* ------------------------------------------------------------------ percentiles */

test('percentile convention: share of observations at or below today, ties counted', () => {
  const s = Array.from({ length: 30 }, (_, i) => i + 1); // 1..30
  assert.equal(H.percentileRank(s, 15), 50);
  assert.equal(H.percentileRank(s, 30), 100, 'equal to the maximum is the 100th');
  assert.equal(H.percentileRank(s, 0.5), 0);
  const ties = [...Array(24).fill(10), 20, 30];
  assert.equal(H.percentileRank(ties, 10), 92.3, 'ties count as at or below');
  assert.equal(H.percentileRank(s.slice(0, 23), 10), null, 'fewer than 24 observations: none');
  assert.equal(H.MIN_OBSERVATIONS, 24);
  assert.equal(H.quantile([1, 2, 3, 4], 0.5), 2.5);
  assert.equal(H.medianPosition(104, 100), 'near');
  assert.equal(H.medianPosition(120, 100), 'above');
  assert.equal(H.medianPosition(80, 100), 'below');
});

test('history: month-end observations over five years, fundamentals as filed by each date', () => {
  const h = H.buildValuationHistory(fixture(), { now: NOW });
  const pe = h.metrics.find((m) => m.id === 'pe_ttm');
  assert.equal(pe.observations, 60, 'one per month for five years, the current month excluded');
  assert.equal(pe.window.frequency, 'month-end');
  assert.ok(pe.window.from >= '2021-11' && pe.window.to <= '2026-10-31');
  assert.equal(pe.percentileKind, 'historical');
  /* Today's P/E is market cap over trailing four-quarter net income known now. */
  const ttmNI = [24, 25, 26, 27].reduce((s, i) => s + 20e9 + i * 0.4e9, 0);
  assert.ok(Math.abs(pe.value - 3.36e12 / ttmNI) < 1e-6);
  assert.ok(pe.percentile > 50 && pe.percentile <= 100);
  /* Point in time: a month end in the 30 days after a quarter close still uses the prior
     window. The first observation (Nov 2021) uses the window ending Sep 2021, filed Oct 30. */
  const first = pe.series[0];
  assert.equal(first.date.slice(0, 7), '2021-11');
  const winEndingSep21 = [4, 5, 6, 7].reduce((s, i) => s + 20e9 + i * 0.4e9, 0);
  const capNov21 = fixture().caps.find((c) => c.date === first.date).marketCap;
  assert.ok(Math.abs(first.value - capNov21 / winEndingSep21) < 1e-6, 'fundamentals as filed');
  assert.ok(h.coverage.latestQuarter === '2026-09-30');
});

test('a split never breaks the series: market cap, not price over as-reported EPS', () => {
  const a = H.buildValuationHistory(fixture(), { now: NOW });
  const b = H.buildValuationHistory(fixture({ splitAt: 20 }), { now: NOW });
  assert.deepEqual(
    a.metrics.find((m) => m.id === 'pe_ttm').series,
    b.metrics.find((m) => m.id === 'pe_ttm').series,
  );
});

test('negative earnings are not meaningful: left out and counted, never a number', () => {
  const h = H.buildValuationHistory(fixture({ netIncomeQ: (i) => (i >= 20 ? -5e9 : 5e9) }), {
    now: NOW,
  });
  const pe = h.metrics.find((m) => m.id === 'pe_ttm');
  assert.equal(pe.status, 'nm');
  assert.equal(pe.value, null);
  assert.equal(pe.percentile, null);
  assert.ok(pe.excludedNm > 0);
  /* FCF yield keeps its sign and its own direction. */
  const fy = h.metrics.find((m) => m.id === 'fcf_yield');
  assert.equal(fy.direction, 'yield');
});

test('forward P/E: today only, never a fabricated history', () => {
  const h = H.buildValuationHistory(fixture(), { now: NOW });
  const f = h.metrics.find((m) => m.id === 'pe_fwd');
  assert.ok(Math.abs(f.value - 210 / 8.0) < 1e-9, 'next fiscal year after today (FY2027)');
  assert.equal(f.percentile, null);
  assert.match(f.note, /point-in-time history of consensus estimates is not available/);
  assert.match(f.basis, /fiscal year ending 2027-09-30/);
  const noEst = H.buildValuationHistory({ ...fixture(), estimates: [] }, { now: NOW });
  assert.equal(noEst.metrics.find((m) => m.id === 'pe_fwd').status, 'unavailable');
});

test('a short history gets an insufficient state, not a percentile', () => {
  const fx = fixture();
  fx.caps = fx.caps.slice(0, 400); // about 13 months
  const h = H.buildValuationHistory(fx, { now: NOW });
  const pe = h.metrics.find((m) => m.id === 'pe_ttm');
  assert.equal(pe.status, 'insufficient');
  assert.equal(pe.percentile, null);
  assert.match(pe.note, /Insufficient history: \d+ valid month-end observations/);
});

test('snapshot: rows, a context label only when multiples agree, never "undervalued"', () => {
  const snap = H.valuationSnapshot(H.buildValuationHistory(fixture(), { now: NOW }));
  assert.deepEqual(
    snap.rows.map((r) => r.id),
    ['pe_ttm', 'pe_fwd', 'ev_ebitda', 'ps_ttm', 'fcf_yield'],
  );
  assert.ok(
    snap.rows.every((r) => !('series' in r)),
    'no long series in the payload',
  );
  if (snap.context) assert.match(snap.context.label, /^(Above|Near|Below) historical median$/);
  assert.doesNotMatch(JSON.stringify(snap), /undervalued|overvalued|cheap|expensive/i);
  const one = H.valuationSnapshot({
    ...H.buildValuationHistory(fixture(), { now: NOW }),
    metrics: [{ id: 'pe_ttm', direction: 'multiple', position: 'above', status: 'ok', value: 30 }],
  });
  assert.equal(one.context, null, 'one multiple is not enough for a label');
});

test('the snapshot becomes one cited snippet for the brief', () => {
  const snap = H.valuationSnapshot(H.buildValuationHistory(fixture(), { now: NOW }));
  const s = F.valuationSnippet(snap, { name: 'Apple', ticker: 'AAPL' });
  assert.equal(s.corpus, 'valuation');
  assert.match(
    s.snippet,
    /Trailing P\/E [\d.]+x \(\d+(st|nd|rd|th) percentile of 60 month-end observations over 5 years, median [\d.]+x\)/,
  );
  assert.match(s.snippet, /Forward P\/E [\d.]+x \(no historical percentile/);
  assert.match(s.snippet, /a higher yield means a lower valuation/);
  assert.match(s.snippet, /not a verdict on value/);
});

/* ------------------------------------------------------------------ deep model */

test('DCF: every input present, assumptions disclosed with sources, value per share computed', () => {
  const h = H.buildValuationHistory(fixture(), { now: NOW });
  const m = M.buildValuationModel({
    history: h,
    market: { beta: 1.2, riskFree: 0.042 },
    consensusGrowth: 0.06,
  });
  assert.equal(m.dcf.ok, true);
  const i = m.dcf.inputs;
  assert.ok(Math.abs(i.taxRate - 0.16) < 1e-9, 'reported effective tax');
  assert.equal(i.growthSource, 'market');
  /* WACC by hand: ke = 4.2% + 1.2 x 5% = 10.2%; E = 3.36T, D = 100B. */
  const ke = 0.042 + 1.2 * 0.05;
  const kd = Math.min(0.12, Math.max(0.02, 4e9 / 100e9));
  const w = (3.36e12 / 3.46e12) * ke + (100e9 / 3.46e12) * kd * (1 - 0.16);
  assert.ok(Math.abs(m.dcf.result.wacc - w) < 1e-12);
  /* Year 1 FCFF by hand. */
  const rev0 = [24, 25, 26, 27].reduce((s, k) => s + 80e9 + k * 1.5e9, 0);
  const y1 = m.dcf.result.years[0];
  assert.ok(Math.abs(y1.revenue - rev0 * 1.06) < 1);
  const margin = [24, 25, 26, 27].reduce((s, k) => s + 24e9 + k * 0.5e9, 0) / rev0;
  const fcff =
    y1.revenue * margin * 0.84 +
    y1.revenue * (12e9 / rev0) -
    y1.revenue * (10e9 / rev0) -
    (y1.revenue - rev0) * 0.02;
  assert.ok(Math.abs(y1.fcff - fcff) < 1);
  assert.equal(m.dcf.result.years.length, 5);
  assert.ok(Math.abs(m.dcf.result.years[4].growth - 0.025) < 1e-12, 'growth fades to terminal');
  assert.ok(m.dcf.result.perShare > 0);
  const sources = new Set(m.dcf.assumptions.map((a) => a.source));
  for (const s of ['reported', 'market', 'assumption', 'model']) assert.ok(sources.has(s), s);
  assert.ok(
    m.dcf.assumptions.some((a) => a.label === 'Equity risk premium' && a.source === 'assumption'),
  );
});

test('DCF refuses without its inputs or with WACC too close to growth', () => {
  const h = H.buildValuationHistory(fixture(), { now: NOW });
  const m = M.buildValuationModel({ history: h, market: { beta: null, riskFree: 0.04 } });
  assert.equal(m.dcf.ok, false);
  assert.deepEqual(m.dcf.missing, ['beta']);
  assert.equal(m.scenarios.length, 0);
  assert.ok(
    m.conclusion.some((c) => c.kind === 'risk' && /No DCF: beta not available/.test(c.text)),
  );
  const di = M.dcfInputs(h, { beta: 1, riskFree: 0.04 });
  assert.match(M.runDcf(di.inputs, { wacc: 0.03 }).error, /too close to terminal growth/);
  const neg = H.buildValuationHistory(fixture(), { now: NOW });
  neg.ttm.operatingIncome = -1;
  assert.ok(
    M.dcfInputs(neg, { beta: 1, riskFree: 0.04 }).missing.includes('positive operating income'),
  );
});

test('scenarios order bear < base < bull; sensitivity moves the right way', () => {
  const h = H.buildValuationHistory(fixture(), { now: NOW });
  const m = M.buildValuationModel({ history: h, market: { beta: 1.1, riskFree: 0.042 } });
  const [bear, base, bull] = m.scenarios;
  assert.deepEqual([bear.id, base.id, bull.id], ['bear', 'base', 'bull']);
  assert.ok(bear.perShare < base.perShare && base.perShare < bull.perShare);
  assert.ok(Math.abs(base.perShare - m.dcf.result.perShare) < 1e-6);
  const g = m.sensitivity.waccGrowth;
  assert.equal(g.cells.length, 5);
  assert.ok(g.cells[0][2] > g.cells[4][2], 'higher WACC, lower value');
  assert.ok(g.cells[2][4] > g.cells[2][0], 'higher terminal growth, higher value');
  const gm = m.sensitivity.growthMultiple;
  assert.equal(gm.cols.length, 3);
  assert.ok(gm.cells[2][2] > gm.cells[0][0]);
});

test('peers: industry list only, selection logic inspectable, peer percentile labelled', () => {
  const sel = PE.industryPeers('Consumer Electronics', 'AAPL');
  assert.ok(!sel.peers.includes('AAPL'));
  assert.ok(sel.peers.includes('SONY'));
  assert.equal(sel.logic.matched, 'exact');
  assert.match(sel.logic.note, /sector-wide lists are not used/);
  const none = PE.industryPeers('Underwater Basket Weaving', 'ZZZ');
  assert.deepEqual(none.peers, []);
  assert.match(none.logic.note, /no peer comparison is made rather than borrowing a sector list/);
  const c = M.peerComparison(
    { ticker: 'AAPL', pe: 35, marketCap: 3.4e12 },
    [
      { ticker: 'A', pe: 15, marketCap: 1e11 },
      { ticker: 'B', pe: 20, marketCap: 2e11 },
      { ticker: 'C', pe: 25, marketCap: 3e11 },
    ],
    sel.logic,
  );
  assert.equal(c.percentileKind, 'peer');
  assert.equal(c.medians.pe, 20);
  assert.equal(c.subjectPercentile.pe, 100);
  assert.match(c.logic.scaleNote, /34x the market cap of the smallest peer/);
  /* The comps route still has its map, from the shared module. */
  assert.match(
    read('src/app/api/comps/[symbol]/route.js'),
    /import \{ INDUSTRY_PEERS, SECTOR_PEERS \} from '@\/lib\/sonar\/valuation\/peers'/,
  );
});

test('conclusion keeps observation, model output, interpretation and risk apart', () => {
  const h = H.buildValuationHistory(fixture(), { now: NOW });
  const m = M.buildValuationModel({ history: h, market: { beta: 1.1, riskFree: 0.042 } });
  const kinds = m.conclusion.map((c) => c.kind);
  for (const k of ['observation', 'model', 'interpretation', 'risk'])
    assert.ok(kinds.includes(k), k);
  const interp = m.conclusion.find((c) => c.kind === 'interpretation');
  assert.match(interp.text, /not a forecast|near the model/);
  assert.doesNotMatch(JSON.stringify(m.conclusion), /\b(buy|sell|hold|undervalued|overvalued)\b/i);
});

/* ------------------------------------------------------------------ sections and nav */

test('Valuation is a deep section only for an answer about one listed company', () => {
  assert.equal(A.ANSWER_SECTIONS.length, 12, 'the core twelve are unchanged');
  assert.equal(A.deepCount(), 7);
  assert.equal(A.deepCount({ equity: true }), 8);
  const navStock = A.answerNav(['answer', 'metrics', 'charts'], { equity: true });
  const keys = navStock.map((s) => s.key);
  assert.ok(keys.includes('valuation'));
  assert.equal(keys.indexOf('valuation'), keys.indexOf('methodology') + 1);
  assert.equal(navStock.find((s) => s.key === 'valuation').locked, true, 'locked on quick');
  assert.ok(
    !A.answerNav(['answer']).some((s) => s.key === 'valuation'),
    'never for other questions',
  );
  assert.equal(A.canRender('valuation', false), false);
  assert.equal(A.canRender('valuation', true), true);
  assert.equal(
    A.sectionAccess({ isGuest: true, equity: true }).cta.title,
    '8 more sections with deep research',
  );
  assert.equal(A.sectionAccess({ isGuest: true }).cta.title, '7 more sections with deep research');
  /* Which answers count as equity. */
  assert.equal(A.isEquityAnswer({ ticker: 'AAPL', kind: 'company' }), true);
  assert.equal(A.isEquityAnswer({ ticker: 'NVDA' }), true);
  assert.equal(A.isEquityAnswer({ ticker: null, kind: 'country' }), false);
  assert.equal(A.isEquityAnswer({ ticker: 'X', kind: 'country' }), false);
  const frame = read('src/components/sonar/SonarAnswerFrame.jsx');
  assert.match(frame, /answerNav\(present, \{ unlocked, equity \}\)/);
  assert.match(frame, /\{locked\.length\} more section/);
});

/* ------------------------------------------------------------------ the ping board */

const live = {
  query: 'aapl',
  answer:
    'Apple trades near the top of its own valuation range while its cash generation stays strong.\n\nApple closed at $342.37 [S1], up 27.5% over the year [S2]. Revenue grew 6% [S5].\n\nValuation: Trailing P/E sits at the 92nd percentile of its history [S3].\n\nFundamentals: Operating margins held at 31% [S5].\n\nPrimary consideration: Morgan Stanley maintained Overweight [S4].',
  evidence: [{}, {}, {}],
  sources: [{ used: true }, { used: true }, { used: false }],
  webSources: [{ url: 'https://a.test' }],
  grounded: true,
  dossier: {
    kind: 'company',
    ticker: 'AAPL',
    name: 'Apple Inc.',
    asOf: '2026-11-08',
    profile: { exchange: 'NASDAQ', sector: 'Technology', industry: 'Consumer Electronics' },
    fundamentals: {
      price: 342.37,
      marketCap: 5.08e12,
      peTtm: 38,
      evToEbitdaTtm: 29.2,
      dividendYieldPct: 0.31,
      changePct: -0.52,
    },
    valuation: H.valuationSnapshot(H.buildValuationHistory(fixture(), { now: NOW })),
  },
};

test('company brief: headline, summary and three labelled takeaways from the brief itself', () => {
  const b = P.companyBrief(live.answer);
  assert.equal(b.structured, true);
  assert.match(b.headline, /^Apple trades near the top/);
  assert.match(b.summary, /^Apple closed at/);
  assert.deepEqual(
    b.takeaways.map((t) => t.label),
    ['Valuation', 'Fundamentals', 'Primary consideration'],
  );
  /* An older brief: no headline is invented, nothing is relabelled. */
  const old = P.companyBrief(
    'Apple Inc. (AAPL) closed at $342.37 [S1]. It rose.\n\nAnalysts...\n\nDatasets...',
  );
  assert.equal(old.structured, false);
  assert.equal(old.headline, null);
  assert.deepEqual(old.takeaways, []);
  assert.equal(old.more.length, 2);
  assert.deepEqual(P.splitCitations('x [S2] y'), [{ text: 'x ' }, { cite: 'S2' }, { text: ' y' }]);
});

test('identity line and footer show only fields the data has', () => {
  const id = P.companyIdentity(live);
  assert.deepEqual(id, {
    name: 'Apple Inc.',
    ticker: 'AAPL',
    meta: ['NASDAQ', 'Technology', 'Consumer Electronics'],
    asOf: '2026-11-08',
  });
  const bare = P.companyIdentity({ dossier: { kind: 'company', ticker: 'X', name: 'X Co' } });
  assert.deepEqual(bare.meta, []);
  assert.equal(P.companyIdentity({ dossier: { kind: 'country' } }), null);
  const f = P.briefFooter(live);
  assert.deepEqual([f.cited, f.datasets, f.web, f.status], [3, 2, 1, 'Cited to sources']);
});

test('KPI strip complements the snapshot instead of repeating its multiples', () => {
  const tiles = P.pingKpis(live);
  const ids = tiles.map((t) => t.id);
  assert.deepEqual(ids, ['price', 'mcap', 'growth', 'dividend']);
  assert.ok(!ids.includes('pe') && !ids.includes('ev'));
  assert.equal(tiles[0].sub, '−0.52% today');
  /* Without a snapshot the old tiles stay. */
  const noSnap = P.pingKpis({ ...live, dossier: { ...live.dossier, valuation: null } });
  assert.ok(noSnap.some((t) => t.id === 'pe'));
});

test('Explore valuations never starts a run and never dead-ends', () => {
  const scroll = P.exploreValuationAction({ unlocked: true }, { hasSection: true });
  assert.deepEqual([scroll.kind, scroll.href], ['scroll', '#sa-valuation']);
  const deep = P.exploreValuationAction(
    A.sectionAccess({ isGuest: false, planTier: 1, depth: 'quick' }),
  );
  assert.equal(deep.kind, 'deep', 'opens the deep research offer, which shows cost and quota');
  const up = P.exploreValuationAction(A.sectionAccess({ isGuest: false, planTier: 0 }));
  assert.deepEqual([up.kind, up.href], ['upgrade', '/pricing?plan=starter']);
  const guest = P.exploreValuationAction(A.sectionAccess({ isGuest: true }));
  assert.equal(guest.kind, 'signup');
  const snap = read('src/components/sonar/valuation/ValuationSnapshot.jsx');
  assert.match(snap, /action\.kind === 'deep' \?/);
  assert.match(snap, /onClick=\{onDeep \|\| undefined\}/);
});

/* ------------------------------------------------------------------ wiring and branding */

test('wiring: the ping board, the brief, the dossier, the engine and the research board', () => {
  const pb = read('src/components/landing/SonarPingBoard.jsx');
  assert.match(pb, /function CompanyExecutive/);
  assert.match(pb, /right === 'valuation'/);
  assert.match(pb, /<ValuationSnapshot/);
  assert.match(pb, /equity=\{equity\}/);
  const lp = read('src/lib/sonar/landing-pipeline.js');
  assert.match(lp, /"Valuation: ", "Fundamentals: ", "Primary consideration: "/);
  assert.match(lp, /never treat it as a request for a recommendation/);
  assert.match(lp, /fetchValuationRaw\(ticker/);
  assert.match(lp, /valuation: snapshotFromRaw|const valuation = snapshotFromRaw/);
  assert.match(lp, /landing:v5:/);
  assert.match(lp, /valuationEvidence\(resolved\.ticker/);
  const eng = read('src/lib/sonar/engine/engine.js');
  assert.match(eng, /equityTicker && depth === 'deep' && !evidenceOverride/);
  assert.match(eng, /emit\('panel', \{ source: 'valuation', layout: \{ valuation \} \}\)/);
  const rb = read('src/components/sonar/research/ResearchBoard.jsx');
  assert.match(rb, /section: 'valuation'/);
  assert.match(rb, /<ValuationSection model=\{valuationModel\} \/>/);
  /* The stock chart stays in Charts and data: no price chart in either valuation component. */
  for (const f of [
    'src/components/sonar/valuation/ValuationSnapshot.jsx',
    'src/components/sonar/valuation/ValuationSection.jsx',
  ])
    assert.doesNotMatch(read(f), /spark|LineChart|PriceChart|candle/i, f);
});

test('nav icons: one box, one glyph size, badges anchored the same, imported last', () => {
  const css = read('src/components/Layout/nav-icons.css');
  assert.match(css, /--nav-icon-box: 44px/);
  assert.match(
    css,
    /\.nn-bell-btn,\s*#mainNav\.main-nav \.checklist-trigger-btn,\s*#mainNav\.main-nav \.nav-action-tap \{/,
  );
  assert.match(
    css,
    /\.nn-badge,\s*#mainNav\.main-nav \.checklist-trigger-badge \{[^}]*top: var\(--nav-badge-inset\);[^}]*right: var\(--nav-badge-inset\);/s,
  );
  assert.match(css, /border: 0;/);
  assert.doesNotMatch(css, /margin-top:\s*-|translateY\(/, 'no negative-margin or transform hacks');
  const nav = read('src/components/Layout/Navbar.js');
  assert.ok(
    nav.indexOf("import './nav-icons.css';") > nav.indexOf("import './nav-sonar-dark.css';"),
  );
});

test('branding: tokens only, no em dashes, neutral valuation colours', () => {
  for (const f of [
    'src/components/sonar/valuation/valuation.css',
    'src/components/Layout/nav-icons.css',
  ]) {
    const css = read(f);
    assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b(?![\w-])/, `${f}: hex`);
    assert.doesNotMatch(css, /rgba?\(/, `${f}: raw rgb`);
  }
  const v = read('src/components/sonar/valuation/valuation.css');
  assert.match(
    v,
    /\.vsn-dot \{[^}]*background: var\(--text-primary\)/s,
    'today is neutral, not green',
  );
  const pb = read('src/components/landing/sonar-ping-board.css');
  const block = pb.slice(
    pb.indexOf(
      '/* ---------------------------------------------------------------- company answer',
    ),
  );
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  for (const f of [
    'src/lib/sonar/valuation/history.js',
    'src/lib/sonar/valuation/model.js',
    'src/lib/sonar/valuation/fetch.js',
    /* peers.js keeps the provider's industry names verbatim ("Software\u2014Infrastructure"),
       which are lookup keys, not copy. */
    'src/components/sonar/valuation/ValuationSnapshot.jsx',
    'src/components/sonar/valuation/ValuationSection.jsx',
    'src/components/landing/SonarPingBoard.jsx',
    'src/lib/sonar/ping-board.js',
  ])
    assert.ok(!read(f).includes('—'), `${f}: em dash`);
});
