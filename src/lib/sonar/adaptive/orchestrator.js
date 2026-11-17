/**
 * Sonar adaptive research: the orchestrator (Nov 2026).
 *
 * Runs a ResearchPlan and returns a validated report: an ordered list of
 * typed sections and the sources they cite. One entry point, one executor per
 * runnable scenario, shared steps underneath (prices, news, markets, the live
 * research call). Each step is bounded and recorded; a step that fails
 * removes its own section and nothing else.
 *
 * Two executors exist today:
 *   B01 technical analysis   deterministic end to end. Bars in, indicators
 *                            out, sentences assembled from the numbers. No
 *                            model call: an indicator reading is arithmetic.
 *   A02 executive succession one live research call (web search, validated),
 *                            the news cache, strict prediction-market matching
 *                            and a secondary price comparison.
 *
 * Everything I/O is injected (`deps`), so the same code runs in the route and
 * in the tests with fixtures.
 */
import { runGeoEconomic } from './geo-economic';
import { runFxPressure } from './fx-pressure';
import { benchmarkFor } from '@/lib/sonar/market-context';
import { technicalSnapshot, rsiReading } from './technical';
import { sourceClass, hostOf, canonicalUrl } from './news-intelligence';
import { discoverMarkets } from './prediction-intelligence';
import { researchSuccession } from './succession-research';
import { selectComponents } from './layout-planner';
import { validateReport, EVENT_STATUSES, CANDIDATE_BASES, REPORT_VERSION } from './schema';
import { SCENARIO_BY_ID } from './profiles';
import { narrowDeps, controlsNote } from './controls-plan';
import {
  day,
  usd,
  pct,
  aboveBelow,
  isoDaysAgo,
  ADJUSTMENT,
  step,
  sourceBook,
  newsItems,
  tooSimilar,
} from './kit';
import { runLeadershipImpact, runMoveAttribution } from './executors-events';
import { runValuation, runFundamentals, runCompetition } from './executors-company';
import { runInstitutional, runCongressTrades, runCountryRanking } from './executors-disclosures';
import {
  runEarnings,
  runGovExposure,
  runLobbying,
  runQuant,
  runCountryMacro,
  runCountryCompare,
  runCommodity,
  runPredictionMarkets,
  runSourcedBrief,
} from './executors-macro';
import {
  runVerification,
  runCatalysts,
  runPerformance,
  runSanctions,
  runCrypto,
} from './executors-rest';

/* ── B01: price action and technical analysis ───────────────────────────── */

async function runTechnical(plan, deps, now, telemetry) {
  const company = plan.entities.find((e) => e.type === 'company');
  const symbol = company.ticker;
  const label = company.label && company.label !== symbol ? `${company.label} (${symbol})` : symbol;
  const name = company.label || symbol;
  const sources = sourceBook();
  const built = {};

  const data = await step(telemetry, 'daily_bars', 9000, () =>
    deps.getOhlcv(symbol, isoDaysAgo(now, 620)),
  );
  const snap = data?.bars?.length
    ? technicalSnapshot(data.bars, { windowDays: plan.controls?.window?.chartDays || 260 })
    : null;
  const related = [
    `How has ${symbol} performed against its sector over the past three months?`,
    `What is driving ${symbol}’s recent price move?`,
    `Is ${name} expensive versus its peers?`,
  ];

  if (!snap) {
    built.lead = {
      headline: `Daily prices for ${label} are not available right now`,
      text: `Sonar could not load enough daily price history for ${symbol} to compute any indicator, so no reading is given. Nothing is estimated in its place. Try again shortly.`,
    };
    built.followups = { placeholder: `Ask a follow-up about ${symbol}…`, related };
    return { built, sources: sources.list, thread: { subject: name, ticker: symbol } };
  }

  const L = snap.latest;
  const reading = rsiReading(L.rsi14);
  const priceSrc = sources.add({
    key: `bars:${symbol}`,
    title: `${symbol} daily price bars`,
    publisher: 'Market data',
    date: snap.asOf,
    detail: `${snap.bars} sessions through ${day(snap.asOf)}. ${ADJUSTMENT[data.adjustment] || 'Closing prices only.'}`,
    kind: 'computed',
  });

  const asked = plan.resolvedQuestion.toLowerCase();
  let headline;
  if (reading.zone === 'unavailable')
    headline = `${label}: the 14-session RSI cannot be computed yet`;
  else if (/oversold/.test(asked))
    headline =
      reading.zone === 'oversold'
        ? `${label} is in oversold territory on the 14-session RSI`
        : `${label} is not oversold on the 14-session RSI`;
  else if (/overbought/.test(asked))
    headline =
      reading.zone === 'overbought'
        ? `${label} is in overbought territory on the 14-session RSI`
        : `${label} is not overbought on the 14-session RSI`;
  else headline = `${label}: what the daily chart shows as of ${day(snap.asOf)}`;

  const parts = [];
  if (L.rsi14 != null)
    parts.push(
      `The 14-session RSI is ${L.rsi14.toFixed(1)} as of ${day(snap.asOf)}, ${reading.text}.`,
    );
  const vs = [
    L.vsSma50Pct != null ? `${aboveBelow(L.vsSma50Pct)} its 50-session average` : null,
    L.vsSma200Pct != null ? `${aboveBelow(L.vsSma200Pct)} its 200-session average` : null,
  ].filter(Boolean);
  if (vs.length) parts.push(`The close of ${usd(L.close)} is ${vs.join(' and ')}.`);
  if (L.offHighPct != null && L.high52wDate)
    parts.push(
      L.offHighPct >= -0.05
        ? `That is the highest level of the past 52 weeks.`
        : `It is ${Math.abs(L.offHighPct).toFixed(1)}% below the 52-week high of ${usd(L.high52w)} set on ${day(L.high52wDate)}.`,
    );
  parts.push(
    'An RSI reading describes recent price momentum. It does not say what the price does next.',
  );
  built.lead = { headline, text: parts.join(' '), cites: [priceSrc], computed: true };

  built.ohlcv_technical = {
    symbol,
    label,
    asOf: snap.asOf,
    adjustment: ADJUSTMENT[data.adjustment] || 'Closing prices only.',
    series: snap.series,
    capabilities: snap.capabilities,
    rsi: { value: L.rsi14, zone: reading.zone, oversold: 30, overbought: 70 },
    cites: [priceSrc],
  };

  const rows = [
    L.rsi14 != null && {
      label: 'RSI (14)',
      value: L.rsi14.toFixed(1),
      note: reading.text,
      method: snap.methods.rsi14,
    },
    {
      label: 'Close',
      value: usd(L.close),
      note: `1 session ${pct(L.change1dPct)}, 5 sessions ${pct(L.change5dPct)}, 21 sessions ${pct(L.change21dPct)}`,
    },
    L.sma20 != null && {
      label: '20-session average',
      value: usd(L.sma20),
      note: `Close is ${aboveBelow(L.vsSma20Pct)}`,
      method: snap.methods.sma,
    },
    L.sma50 != null && {
      label: '50-session average',
      value: usd(L.sma50),
      note: `Close is ${aboveBelow(L.vsSma50Pct)}`,
      method: snap.methods.sma,
    },
    L.sma200 != null && {
      label: '200-session average',
      value: usd(L.sma200),
      note: `Close is ${aboveBelow(L.vsSma200Pct)}`,
      method: snap.methods.sma,
    },
    L.macd != null && {
      label: 'MACD (12, 26, 9)',
      value: L.macd.toFixed(2),
      note: `Signal ${L.macdSignal?.toFixed(2) ?? 'N/A'}, histogram ${L.macdHistogram?.toFixed(2) ?? 'N/A'}`,
      method: snap.methods.macd,
    },
    L.atr14 != null && {
      label: 'ATR (14)',
      value: usd(L.atr14),
      note: `${L.atr14Pct}% of the close`,
      method: snap.methods.atr14,
    },
    L.realizedVol30Pct != null && {
      label: 'Realized volatility (30 sessions)',
      value: `${L.realizedVol30Pct}%`,
      note: 'Annualised',
      method: snap.methods.realizedVol30,
    },
    {
      label: '52-week range',
      value: `${usd(L.low52w)} to ${usd(L.high52w)}`,
      note:
        L.rangePositionPct != null
          ? `Close sits ${L.rangePositionPct}% of the way from low to high`
          : '',
      method: snap.methods.range52w,
    },
    L.volumeVs20dPct != null && {
      label: 'Volume, last session',
      value: Number(L.volume).toLocaleString('en-US'),
      note: `${pct(L.volumeVs20dPct, 0)} against the 20-session average`,
    },
  ].filter(Boolean);
  built.metric_table = { title: 'Computed readings', asOf: snap.asOf, rows, cites: [priceSrc] };

  const clusters = await newsItems(deps, telemetry, {
    tickers: [symbol],
    phrase: name,
    entityTerms: [name, symbol],
    eventTerms: ['shares', 'stock', 'earnings', 'guidance'],
    now,
    limit: 4,
  });
  if (clusters.length) {
    built.news_timeline = {
      title: 'Recent coverage',
      note: 'Context only. Coverage that coincided with a price move is not shown to have caused it.',
      items: clusters.map((c) => ({
        date: c.lead.publishedAt ? String(c.lead.publishedAt).slice(0, 10) : null,
        title: c.lead.title,
        publisher: c.lead.publisher,
        url: c.lead.url,
        sourceClass: c.lead.sourceClass,
        corroboration: c.corroboration,
        cites: [
          sources.add({
            url: c.lead.url,
            title: c.lead.title,
            publisher: c.lead.publisher,
            date: c.lead.publishedAt ? String(c.lead.publishedAt).slice(0, 10) : null,
          }),
        ],
      })),
    };
  }

  const limits = [
    'Indicators are computed from daily bars with the standard definitions shown beside each figure. They describe past prices and are not a forecast or a recommendation.',
    ADJUSTMENT[data.adjustment] ||
      'Only closing prices were available, so range-based measures are not shown.',
  ];
  if (!snap.capabilities.sma200)
    limits.push('Fewer than 200 sessions were available, so the 200-session average is not shown.');
  if (!snap.capabilities.volume)
    limits.push(
      'Volume was not available for every recent session, so no volume reading is shown.',
    );
  built.limitations = { items: limits };
  built.followups = {
    placeholder: `Ask a follow-up about ${symbol}’s price, valuation or what is moving it…`,
    related,
  };
  return {
    built,
    sources: sources.list,
    thread: { subject: name, ticker: symbol, headline, summary: parts.slice(0, 2).join(' ') },
  };
}

/* ── A02: executive succession forecasting ──────────────────────────────── */

async function runSuccession(plan, deps, now, telemetry, deadlineAt) {
  const person = plan.entities.find((e) => e.type === 'person')?.label || null;
  const planned = plan.entities.find((e) => e.type === 'company') || null;
  const sources = sourceBook();
  const built = {};

  const [research, firstMarkets] = await Promise.all([
    deps.synthesize
      ? step(
          telemetry,
          'live_research',
          Math.max(4000, (deadlineAt || Date.now() + 30000) - Date.now() - 2500),
          () =>
            researchSuccession(
              { synthesize: deps.synthesize },
              {
                question: plan.resolvedQuestion,
                person,
                company: planned?.label,
                now,
                deadlineAt: deadlineAt ? deadlineAt - 2500 : undefined,
              },
            ),
        )
      : null,
    planned && deps.retrieveMarkets
      ? step(telemetry, 'prediction_markets', 6000, () =>
          discoverMarkets(
            { retrieve: deps.retrieveMarkets, admin: deps.admin },
            {
              query: `${planned.label} next CEO`,
              eventType: 'succession',
              entityTerms: [planned.label, planned.ticker, person].filter(Boolean),
              now,
            },
          ),
        )
      : null,
  ]);
  if (deps.synthesize && !research && !telemetry.degraded.includes('live_research'))
    telemetry.degraded.push('live_research');

  const companyName = planned?.label || research?.company || null;
  const ticker = planned?.ticker || research?.ticker || null;
  let market = firstMarkets;
  if (!market && !planned && companyName && deps.retrieveMarkets) {
    market = await step(telemetry, 'prediction_markets', 5000, () =>
      discoverMarkets(
        { retrieve: deps.retrieveMarkets, admin: deps.admin },
        {
          query: `${companyName} next CEO`,
          eventType: 'succession',
          entityTerms: [companyName, ticker, person].filter(Boolean),
          now,
        },
      ),
    );
  }

  const cite = (urls) =>
    (urls || []).map((u) =>
      sources.add({ url: u, title: research?.titles?.[u] || hostOf(u), publisher: hostOf(u) }),
    );

  const clusters = await newsItems(deps, telemetry, {
    tickers: ticker ? [ticker] : [],
    phrase: [person, companyName, 'CEO'].filter(Boolean).join(' '),
    entityTerms: [companyName, ticker, person, person?.split(' ').slice(-1)[0]].filter(Boolean),
    eventTerms: ['ceo', 'chief executive', 'successor', 'interim', 'resign', 'board', 'search'],
    now,
  });

  const superseded =
    research?.event.status === 'event_superseded' && research.event.permanentSuccessor;

  if (research) {
    built.lead = {
      headline: research.headline,
      text: research.answer,
      cites: cite(research.event.sourceUrls),
    };
    const ev = research.event;
    const facts = [
      ev.effectiveDate && { label: 'Effective', value: day(ev.effectiveDate) },
      ev.announcedDate && { label: 'Announced', value: day(ev.announcedDate) },
      ev.interim && {
        label: 'Interim',
        value: [ev.interim.name, ev.interim.role].filter(Boolean).join(', '),
      },
      ev.permanentSuccessor && {
        label: 'Permanent successor',
        value: [ev.permanentSuccessor.name, ev.permanentSuccessor.role].filter(Boolean).join(', '),
      },
      ev.searchStatus && { label: 'Search', value: ev.searchStatus },
    ]
      .filter(Boolean)
      .map((f) => ({ ...f, cites: cite(ev.sourceUrls) }));
    built.verified_event_status = {
      status: ev.status,
      statusLabel: EVENT_STATUSES[ev.status],
      summary: ev.summary,
      facts,
      cites: cite(ev.sourceUrls),
      checkedAt: now.toISOString().slice(0, 10),
    };
    built.candidate_table = {
      title: superseded ? 'Named successor' : 'Who has been named',
      note: 'Listed only where a cited source names the person. The order is not a ranking.',
      rows: research.candidates.map((c) => ({
        name: c.name,
        role: c.currentRole,
        basis: c.basis,
        basisLabel: CANDIDATE_BASES[c.basis],
        reason: c.reason,
        caveat: c.caveat,
        cites: cite(c.sourceUrls),
      })),
      emptyText: 'No credible list of candidates has been established in the sources reviewed.',
    };
    if (research.scenarios.length)
      built.scenario_matrix = {
        title: 'How this could unfold',
        label: 'Analyst interpretation',
        rows: research.scenarios,
      };
    if (research.watch.length)
      built.watchpoints = { title: 'What to monitor', items: research.watch };
  } else {
    const who = person ? `${person}’s successor` : 'this succession';
    built.lead = {
      headline: `Sonar could not verify the current state of ${who} just now`,
      text: `The live research step did not complete, so no event status and no candidates are given. ${
        clusters.length ? 'Recent coverage from the news cache is listed below. ' : ''
      }Nothing is filled in from memory. Try again shortly.`,
    };
  }

  /* A market on "who will be next" is not shown once a successor has been named. */
  if (market?.markets?.length && !superseded) {
    built.forecast_market = {
      title: 'What matching contracts are pricing',
      note: 'Each row is one contract’s last indexed price on its own venue. Prices are not added or averaged across contracts, and a price is not a forecast.',
      markets: market.markets,
    };
  }

  const timeline = [
    ...(research?.timeline || []).map((t) => ({
      date: t.date,
      title: t.title,
      text: t.text,
      url: t.sourceUrls[0],
      publisher: hostOf(t.sourceUrls[0]),
      sourceClass: sourceClass(t.sourceUrls[0]),
      cites: cite(t.sourceUrls),
    })),
  ];
  const have = new Set(timeline.map((t) => canonicalUrl(t.url)));
  for (const c of clusters) {
    if (have.has(c.lead.url)) continue;
    timeline.push({
      date: c.lead.publishedAt ? String(c.lead.publishedAt).slice(0, 10) : null,
      title: c.lead.title,
      publisher: c.lead.publisher,
      url: c.lead.url,
      sourceClass: c.lead.sourceClass,
      corroboration: c.corroboration,
      cites: [
        sources.add({
          url: c.lead.url,
          title: c.lead.title,
          publisher: c.lead.publisher,
          date: c.lead.publishedAt ? String(c.lead.publishedAt).slice(0, 10) : null,
        }),
      ],
    });
  }
  if (timeline.length) {
    timeline.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    built.news_timeline = { title: 'What has been reported', items: timeline.slice(0, 10) };
  }

  if (ticker) {
    const bench = benchmarkFor({ ticker, industry: research?.industry || '', sector: '' });
    const eventDate = research?.event.effectiveDate || research?.event.announcedDate || null;
    built.price_comparison = {
      secondary: true,
      chart: {
        kicker: 'Market context',
        title: `${companyName || ticker} vs. ${bench.label}`,
        subject: { symbol: ticker, label: `${companyName || ticker} (${ticker})` },
        benchmark: { symbol: bench.symbol, label: `${bench.label} (${bench.symbol})` },
        event: eventDate ? { date: eventDate, label: 'Leadership change' } : null,
        defaultRange: '3M',
      },
    };
  }

  const subject = companyName || 'the company';
  const defaults = [
    `How will the leadership change affect ${subject} and its industry?`,
    `What is the board’s timeline for naming a permanent CEO at ${subject}?`,
    `What would change in ${subject}’s product strategy under new leadership?`,
    `Which customers are most sensitive to a leadership transition at ${subject}?`,
  ];
  const offered = (research?.followups || []).filter(
    (f) => !tooSimilar(f, plan.resolvedQuestion) && !tooSimilar(f, plan.originalQuestion),
  );
  built.followups = {
    placeholder: 'Ask a follow-up about the search, the candidates or the effect on the business…',
    related: [...offered, ...defaults]
      .filter((f, i, all) => all.findIndex((g) => tooSimilar(f, g)) === i)
      .slice(0, 3),
  };

  const limits = [
    'People are listed only where a cited source names them. Being named in reporting is not a forecast, and the order shown is not a ranking.',
  ];
  if (built.forecast_market)
    limits.push(
      'Prediction-market prices are refreshed on a schedule and shown with the time they were indexed. They are not live quotes.',
    );
  if (!research && deps.synthesize)
    limits.push('Live verification did not complete for this answer.');
  built.limitations = { items: limits };

  return {
    built,
    sources: sources.list,
    thread: {
      subject: companyName,
      ticker,
      person,
      headline: built.lead.headline,
      summary: built.lead.text,
      event: research?.event.status || null,
    },
    marketAudit: market
      ? {
          considered: market.considered,
          shown: market.markets.length,
          rejected: market.rejected.slice(0, 8),
        }
      : null,
  };
}

const EXECUTORS = {
  B01: runTechnical,
  A02: runSuccession,
  A03: runLeadershipImpact,
  A05: runMoveAttribution,
  B02: runFundamentals,
  B03: runValuation,
  B05: runCompetition,
  B06: runInstitutional,
  B07: runCongressTrades,
  C02: runCountryRanking,
  A04: runEarnings,
  B04: runGovExposure,
  B08: runLobbying,
  B10: runQuant,
  /* A currency-pressure question (plan.fx, set by the router) gets the fx-pressure-v2 view;
     if its data cannot answer, the plain country view still can. */
  C01: async (plan, ...rest) =>
    (plan.fx ? await runFxPressure(plan, ...rest) : null) || runCountryMacro(plan, ...rest),
  C04: runCountryMacro,
  C05: runCountryMacro,
  C09: runCountryCompare,
  C03: runCommodity,
  C08: runPredictionMarkets,
  A07: runSourcedBrief,
  /* A geo-economic impact question gets its own executor (plan.geo, set by the router). */
  A08: (plan, ...rest) =>
    plan.geo ? runGeoEconomic(plan, ...rest) : runSourcedBrief(plan, ...rest),
  A10: runSourcedBrief,
  C10: runSourcedBrief,
  A01: runVerification,
  A06: runSourcedBrief,
  A09: runCatalysts,
  B09: runPerformance,
  C06: runSanctions,
  C07: runCrypto,
};

/**
 * Run an executable plan.
 *
 * @param {object} plan  planAdaptive() output with executable: true
 * @param {object} deps  { getOhlcv, news, retrieveMarkets, synthesize, admin }
 * @param {{ now?: Date, deadlineAt?: number }} [opts]
 * @returns {Promise<null | object>} the report, or null when the plan cannot be run or the
 *          result has no usable lead (the caller then answers the old way)
 */
export async function runAdaptive(
  plan,
  deps,
  { now = new Date(), deadlineAt = null, onStep = null } = {},
) {
  const run = plan?.executable ? EXECUTORS[plan.primaryScenario] : null;
  if (!run) return null;
  const t0 = Date.now();
  const telemetry = { steps: [], degraded: [], model: [] };
  /* Streaming progress (not serialised: removed before the report is returned). */
  if (typeof onStep === 'function') Object.defineProperty(telemetry, 'onStep', { value: onStep });
  /* Research Controls: only the readers the chosen data sources allow, and the focus and
     horizon given to every research step as a directive. */
  const narrowed = narrowDeps(deps, plan.controls);
  deps = narrowed.deps;
  const directive = plan.controls?.directive || '';
  /* Every model call an executor makes is counted here, whatever module makes it. */
  if (deps?.synthesize) {
    const synthesize = deps.synthesize;
    deps = {
      ...deps,
      synthesize: async (args) => {
        const out = await synthesize(
          directive ? { ...args, user: `${args.user}\n${directive}` } : args,
        );
        telemetry.model.push({
          provider: out?.provider || null,
          webUsed: Boolean(out?.webUsed),
          ...(out?.usage || {}),
        });
        return out;
      },
    };
  }
  const out = await run(plan, deps, now, telemetry, deadlineAt);
  /* An executor declines a question its data cannot answer; the ping then runs the old way. */
  if (!out?.built?.lead) return null;
  /* What the reader's own controls changed is said on the answer. */
  const note = controlsNote(plan.controls, narrowed.dropped);
  if (note) out.built.limitations = { items: [...(out.built.limitations?.items || []), note] };
  /* The horizon sets the range a price comparison opens on. */
  if (plan.controls?.window && out.built.price_comparison?.chart)
    out.built.price_comparison.chart.defaultRange = plan.controls.window.range;
  const { sections, omitted } = selectComponents(plan, {
    ...out.built,
    sources: { title: 'Evidence and sources' },
  });
  const profile = SCENARIO_BY_ID[plan.primaryScenario];
  const checked = validateReport({
    version: REPORT_VERSION,
    scenario: { id: profile.id, key: profile.key, label: profile.label },
    question: plan.originalQuestion,
    resolvedQuestion: plan.resolvedQuestion,
    asOf: now.toISOString(),
    controls: plan.controls
      ? {
          focus: plan.controls.focus,
          horizon: plan.controls.horizon,
          sources: plan.controls.sources,
          labels: plan.controls.labels,
        }
      : null,
    sections,
    sources: out.sources,
    thread: { question: plan.resolvedQuestion, ...out.thread },
    plan: {
      version: plan.version,
      primaryScenario: plan.primaryScenario,
      supportingScenarios: plan.supportingScenarios,
      specialists: plan.specialistAssignments,
      requiredEvidence: plan.requiredEvidence,
      computations: plan.requiredComputations,
      uncertainty: plan.uncertainty,
      confidence: plan.confidence,
    },
  });
  if (!checked.ok) return null;
  /* Sources nothing cites are not listed. */
  const used = new Set();
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') {
      if (Array.isArray(v.cites)) v.cites.forEach((c) => used.add(c));
      Object.values(v).forEach(walk);
    }
  };
  walk(checked.report.sections);
  checked.report.sources = checked.report.sources.filter((s) => used.has(s.id));
  if (!checked.report.sources.length) {
    checked.report.sections = checked.report.sections.filter((s) => s.type !== 'sources');
  }
  checked.report.telemetry = {
    ms: Date.now() - t0,
    steps: telemetry.steps,
    degraded: [...new Set(telemetry.degraded)],
    model: telemetry.model,
    omitted,
    removed: checked.removed,
    markets: out.marketAudit || null,
  };
  return checked.report;
}
