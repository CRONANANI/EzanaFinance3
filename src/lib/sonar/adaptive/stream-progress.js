/**
 * Sonar adaptive streaming (Nov 2026): turns the route's progress events into what the loading
 * screen shows, and assembles a partial report from validated sections. Pure.
 *
 * Progress is real: a dimension row moves only when an evidence step in it starts or ends, and
 * nothing reads "Complete" until the answer has arrived (the loading screen's own rule). Steps
 * outside the seven dimensions move nothing.
 */

/** Evidence step (the executors' step names, without a ticker suffix) -> data dimension. */
const STEP_DIMENSION = {
  congress_disclosures: 'capitol',
  lobbying_filings: 'capitol',
  federal_contracts: 'capitol',
  holdings_13f: 'titans',
  fund_holdings: 'titans',
  insider_filings: 'titans',
  fund_context: 'titans',
  org_pitches: 'titans',
  org_reports: 'titans',
  industry_registry: 'eyes',
  company_disclosures: 'eyes',
  peer_set: 'eyes',
  commodity_series: 'eyes',
  news_cache: 'whispers',
  live_research: 'whispers',
  prediction_markets: 'hive',
  macro_series: 'lighthouse',
  macro_rankings: 'lighthouse',
  series_history: 'lighthouse',
  daily_bars: 'lighthouse',
  benchmark_bars: 'lighthouse',
  bars: 'lighthouse',
  earnings: 'lighthouse',
  earnings_history: 'lighthouse',
  financial_statements: 'lighthouse',
  valuation_model: 'lighthouse',
  segment_revenue: 'lighthouse',
  company_facts: 'lighthouse',
  sanctions_lists: 'regulatory',
};

/** What the screen says while a step runs. Descriptive only. */
const STEP_PHRASE = {
  congress_disclosures: 'Reading congressional disclosures',
  lobbying_filings: 'Reading lobbying filings',
  federal_contracts: 'Reading federal contract awards',
  holdings_13f: 'Reading institutional 13F holdings',
  fund_holdings: 'Reading fund holdings',
  insider_filings: 'Reading insider filings',
  fund_context: "Reading your fund's mandate",
  org_pitches: "Reading your organization's pitches",
  org_reports: "Reading your organization's research",
  industry_registry: 'Mapping the value chain',
  company_disclosures: 'Reading company disclosures',
  peer_set: 'Building the peer set',
  commodity_series: 'Reading commodity prices',
  news_cache: 'Reading recent coverage',
  live_research: 'Checking sources',
  prediction_markets: 'Reading prediction markets',
  macro_series: 'Reading economic series',
  macro_rankings: 'Ranking economies',
  series_history: 'Reading series history',
  daily_bars: 'Reading daily prices',
  benchmark_bars: 'Reading the benchmark',
  bars: 'Reading daily prices',
  earnings: 'Reading the earnings calendar',
  earnings_history: 'Reading reported results',
  financial_statements: 'Reading financial statements',
  valuation_model: 'Computing valuation',
  segment_revenue: 'Reading segment revenue',
  company_facts: 'Reading company facts',
  sanctions_lists: 'Checking sanctions lists',
};

/** The executor step name without a per-ticker suffix ("earnings_NVDA" -> "earnings"). */
export function stepKey(name) {
  const s = String(name || '');
  if (STEP_DIMENSION[s]) return s;
  const cut = s.replace(/_[A-Z0-9.\-]+$/, '');
  return STEP_DIMENSION[cut] ? cut : s;
}

/**
 * @param {object[]} events  the stream's events so far, in order
 * @returns {{ dimensions: Record<string,string>, stage: number, phrase: string|null,
 *             failed: string[], label: string|null }}
 */
export function progressFromEvents(events = []) {
  const dimensions = {};
  const failed = [];
  let stage = 0;
  let phrase = null;
  let label = null;
  const rank = ['scanning', 'linking', 'cross-checking', 'synthesizing'];
  const advance = (dim, status) => {
    if (!dim) return;
    if (rank.indexOf(status) > rank.indexOf(dimensions[dim] ?? '')) dimensions[dim] = status;
  };
  for (const ev of events) {
    if (!ev || typeof ev !== 'object') continue;
    if (ev.t === 'plan') {
      stage = Math.max(stage, 1);
      label = ev.scenario?.label || null;
    } else if (ev.t === 'step') {
      const key = stepKey(ev.step);
      const dim = STEP_DIMENSION[key];
      if (ev.state === 'start') {
        advance(dim, 'linking');
        phrase = STEP_PHRASE[key] || phrase;
      } else if (ev.state === 'done') {
        advance(dim, 'cross-checking');
        stage = Math.max(stage, 2);
      } else if (ev.state === 'failed') {
        failed.push(key);
      }
    } else if (ev.t === 'sources' || ev.t === 'section') {
      for (const d of Object.keys(dimensions)) advance(d, 'synthesizing');
      phrase = 'Assembling the verified answer';
      stage = Math.max(stage, 2);
    } else if (ev.t === 'fallback') {
      phrase = 'Switching to standard research';
    }
  }
  return { dimensions, stage, phrase, failed: [...new Set(failed)], label };
}

/**
 * A partial report from the stream: the plan's scenario, the validated sources and the
 * validated sections received so far. Null until the first section (the lead) arrives.
 */
export function partialReport(events = [], question = '') {
  let plan = null;
  let sources = [];
  let at = null;
  const sections = [];
  for (const ev of events) {
    if (ev?.t === 'ack') at = ev.at || at;
    else if (ev?.t === 'plan') plan = ev;
    else if (ev?.t === 'sources') sources = Array.isArray(ev.sources) ? ev.sources : [];
    else if (ev?.t === 'section' && ev.section && Number.isInteger(ev.index)) {
      sections[ev.index] = ev.section;
    }
  }
  const got = sections.filter(Boolean);
  if (!got.length || got[0].type !== 'lead') return null;
  return {
    scenario: plan?.scenario?.label ? plan.scenario : { id: null, label: 'Research' },
    question: plan?.question || question,
    resolvedQuestion: plan?.question || question,
    asOf: at || new Date().toISOString(),
    org: Boolean(plan?.organization),
    sections: got,
    sources,
    thread: {},
    partial: true,
  };
}
