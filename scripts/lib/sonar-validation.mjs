/**
 * Checks for a live adaptive answer (Nov 2026). Pure: a report in, findings out, so the same
 * checks run in the unit tests (on fixture reports) and in the live validation runner.
 *
 * A finding is { level: 'fail' | 'warn', check, detail }. A report "passes" with no 'fail'.
 */

/** The validation set: one question per built pipeline, with what the route must do. */
export const VALIDATION_SET = [
  { id: 'B01', q: 'Is NVIDIA technically oversold?', model: false, lead: 'ohlcv_technical' },
  { id: 'A02', q: 'Who will replace Jensen Huang?', model: true, lead: 'candidate_table' },
  { id: 'A03', q: 'How will the CEO change affect NVIDIA and the chip industry?', model: true },
  { id: 'A05', q: 'Why is NVDA stock down this week?', model: true, lead: 'price_comparison' },
  {
    id: 'B03',
    q: 'Is NVIDIA expensive compared with its peers?',
    model: false,
    lead: 'metric_table',
  },
  { id: 'B02', q: 'What are NVDA’s biggest risks?', model: true, lead: 'fundamentals' },
  {
    id: 'B05',
    q: 'Which semiconductor companies benefit if NVIDIA loses market share?',
    model: true,
  },
  { id: 'B06', q: 'Which institutions hold NVDA?', model: false, lead: 'ranking', chart: true },
  {
    id: 'B07',
    q: 'What has Nancy Pelosi been buying?',
    model: false,
    lead: 'ranking',
    chart: true,
  },
  { id: 'B07', q: 'Are insiders selling NVDA?', model: false, key: 'B07-insiders' },
  { id: 'A04', q: 'When does NVDA report earnings next?', model: false },
  {
    id: 'B04',
    q: 'How dependent is Lockheed Martin on government contracts?',
    model: false,
    chart: true,
  },
  { id: 'B08', q: 'How much does Microsoft spend on lobbying?', model: false },
  {
    id: 'B10',
    q: 'What is NVDA’s volatility and max drawdown?',
    model: false,
    lead: 'price_comparison',
  },
  {
    id: 'C02',
    q: 'Which countries produce the most crude oil?',
    model: false,
    lead: 'ranking',
    chart: true,
  },
  { id: 'C01', q: 'How is Turkey’s lira doing?', model: false, lead: 'macro_timeseries' },
  { id: 'C04', q: 'Will the Fed cut rates next month?', model: false, lead: 'macro_timeseries' },
  {
    id: 'C09',
    q: 'Compare the economies of India and Brazil',
    model: false,
    lead: 'ranking',
    chart: true,
  },
  { id: 'C03', q: 'Where could Brent oil trade if OPEC supply rises?', model: true },
  { id: 'C08', q: 'Does any prediction market price NVIDIA’s next CEO?', model: false },
  { id: 'A08', q: 'How would new chip export restrictions affect ASML?', model: true },
].map((c) => ({ key: c.id, ...c }));

/** Follow-up chains: each step is asked under the thread of the answer before it. */
export const FOLLOW_UP_CHAINS = [
  {
    name: 'succession to impact to technicals',
    steps: [
      ['Who will replace Jensen Huang?', 'A02'],
      ['How will his resignation affect NVDA shares?', 'A03'],
      ['Is it technically oversold?', 'B01'],
    ],
  },
  {
    name: 'valuation to fundamentals to holders',
    steps: [
      ['Is NVIDIA expensive compared with its peers?', 'B03'],
      ['How have its revenue, margins and free cash flow trended?', 'B02'],
      ['Which institutions hold it?', 'B06'],
    ],
  },
];

const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const TABLE_TYPES = new Set([
  'valuation',
  'ranking',
  'data_table',
  'sector_exposure',
  'policy_tracker',
  'macro_timeseries',
  'catalyst_calendar',
]);

/**
 * @param {object} report  the `adaptive` object the route returned
 * @param {{ id?: string, lead?: string, chart?: boolean, now?: Date }} [expect]
 * @returns {{ level: 'fail'|'warn', check: string, detail: string }[]}
 */
export function checkReport(report, expect = {}) {
  const out = [];
  const fail = (check, detail) => out.push({ level: 'fail', check, detail });
  const warn = (check, detail) => out.push({ level: 'warn', check, detail });
  if (!report || !Array.isArray(report.sections)) {
    fail('shape', 'no adaptive report in the response');
    return out;
  }
  const sections = report.sections;
  const types = sections.map((s) => s.type);
  if (expect.id && report.scenario?.id !== expect.id)
    fail('scenario', `expected ${expect.id}, got ${report.scenario?.id || 'none'}`);
  if (types[0] !== 'lead') fail('layout', 'the report does not open with the lead');
  const lead = sections[0] || {};
  if (!lead.headline || !lead.text) fail('lead', 'the lead has no headline or text');
  const unavailable = /not available right now|could not (verify|source|match)/i.test(
    lead.headline || '',
  );
  if (unavailable) warn('unavailable', `the answer is an unavailable state: "${lead.headline}"`);
  if (expect.lead && !unavailable && !types.includes(expect.lead))
    fail('layout', `the scenario's lead section (${expect.lead}) is missing`);
  if (
    expect.chart &&
    !unavailable &&
    !types.includes('series_chart') &&
    !types.includes('price_comparison') &&
    !types.includes('ohlcv_technical')
  )
    fail('chart', 'no chart in an answer that should carry one');

  /* Citations: every id resolves; every source is complete; links are https. */
  const sources = report.sources || [];
  const ids = new Set(sources.map((s) => s.id));
  if (ids.size !== sources.length) fail('sources', 'duplicate source ids');
  for (const s of sources) {
    if (!s.title) fail('sources', `source ${s.id} has no title`);
    if (s.url != null && !/^https:\/\//.test(s.url))
      fail('sources', `source ${s.id} link is not https`);
  }
  const cited = new Set();
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') {
      if (Array.isArray(v.cites)) v.cites.forEach((c) => cited.add(c));
      Object.values(v).forEach(walk);
    }
  };
  walk(sections);
  for (const c of cited) if (!ids.has(c)) fail('citations', `citation ${c} has no source`);
  for (const s of sources)
    if (!cited.has(s.id)) warn('citations', `source ${s.id} is listed but never cited`);
  if (!unavailable && !sources.length && report.scenario?.id !== 'C08')
    fail('citations', 'an answer with content cites no source');

  for (const s of sections) {
    /* A takeaway, risk or figure is sourced or labelled. */
    if (s.type === 'key_findings' || s.type === 'risk')
      for (const i of s.items || [])
        if (!(i.cites || []).length && !i.note)
          fail('labels', `"${i.title}" has neither a citation nor an interpretation label`);
    if (s.type === 'fundamentals')
      for (const i of s.items || [])
        if (!(i.cites || []).length) fail('figures', `figure "${i.label}" has no citation`);
    if (s.type === 'candidate_table')
      for (const r of s.rows || [])
        if (!(r.cites || []).length) fail('candidates', `candidate ${r.name} has no citation`);
    if (s.type === 'metric_table')
      for (const r of s.rows || [])
        if (!r.method) warn('method', `"${r.label}" does not say how it is computed`);
    if (TABLE_TYPES.has(s.type)) {
      if (!s.columns?.length || !s.rows?.length) fail('table', `${s.type} is empty`);
      for (const r of s.rows || [])
        for (const c of s.columns || [])
          if (!(c.key in (r.cells || {}))) fail('table', `${s.type} row ${r.id} lacks ${c.key}`);
    }
    if (s.type === 'series_chart') {
      const n = s.categories?.length || 0;
      if (n < 2) fail('chart', 'a chart with fewer than two categories');
      for (const sr of s.series || []) {
        if (sr.values?.length !== n) fail('chart', `series "${sr.name}" does not match the axis`);
        if ((sr.values || []).filter(finite).length < 2)
          fail('chart', `series "${sr.name}" has fewer than two real values`);
        if ((sr.values || []).some((v) => v != null && !finite(v)))
          fail('chart', `series "${sr.name}" holds a non-number`);
      }
    }
    if (s.type === 'ohlcv_technical' && (s.series?.length || 0) < 30)
      fail('chart', 'fewer than 30 real bars');
    if (s.type === 'forecast_market')
      for (const m of s.markets || [])
        if (
          !/^https:\/\//.test(m.url || '') ||
          !finite(m.yesPrice) ||
          m.yesPrice < 0 ||
          m.yesPrice > 1
        )
          fail('markets', `contract "${m.question}" lacks a link or a valid price`);
    /* A sortable ranking is in the order it claims. */
    if (s.type === 'ranking' && s.sortable) {
      const vals = (s.rows || []).map((r) => r.sort?.value).filter(finite);
      const desc = vals.every((v, i) => i === 0 || v <= vals[i - 1]);
      const asc = vals.every((v, i) => i === 0 || v >= vals[i - 1]);
      if (!desc && !asc) fail('calculation', 'ranking values are not in order');
    }
  }

  /* Freshness: the answer is dated today, and price-based figures are not stale. */
  const now = expect.now || new Date();
  if (!report.asOf || Math.abs(now.getTime() - Date.parse(report.asOf)) > 36e5 * 6)
    fail('freshness', `the answer's as-of time is not current (${report.asOf || 'missing'})`);
  for (const s of sections) {
    const asOf = s.type === 'ohlcv_technical' ? s.asOf : s.type === 'metric_table' ? s.asOf : null;
    if (asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
      const age = (now.getTime() - Date.parse(`${asOf}T00:00:00Z`)) / 86400000;
      if (age > 7 && ['B01', 'A05', 'B10'].includes(report.scenario?.id))
        fail('freshness', `${s.type} is as of ${asOf}, ${Math.round(age)} days old`);
    }
  }
  if ((report.degraded || []).length)
    warn('degraded', `steps did not complete: ${report.degraded.join(', ')}`);

  /* No advice, in any section. */
  const body = JSON.stringify(sections.filter((s) => s.type !== 'followups'));
  const advice = body.match(
    /\b(you should (buy|sell)|we recommend|strong buy|price target of|guaranteed)\b/i,
  );
  if (advice) fail('advice', `advice-like wording: "${advice[0]}"`);
  return out;
}

/** Tokens to dollars, when prices per million tokens are supplied; otherwise null. */
export function modelCost(calls = [], { inPerM = null, outPerM = null, perSearch = null } = {}) {
  const tokensIn = calls.reduce((s, c) => s + (c.inputTokens || 0), 0);
  const tokensOut = calls.reduce((s, c) => s + (c.outputTokens || 0), 0);
  const searches = calls.reduce((s, c) => s + (c.webSearches || 0), 0);
  const usd =
    inPerM != null && outPerM != null
      ? (tokensIn / 1e6) * inPerM +
        (tokensOut / 1e6) * outPerM +
        (perSearch != null ? searches * perSearch : 0)
      : null;
  return { calls: calls.length, tokensIn, tokensOut, searches, usd };
}

export const passed = (findings) => !findings.some((f) => f.level === 'fail');
