/**
 * Sonar adaptive research: executors for company and ranking questions (Nov 2026).
 *
 *   B03 valuation            today's multiples against the company's own five-year history
 *                            and against its industry peers, from Ezana's valuation model
 *   B02 fundamentals         growth, margins, cash flow and net debt from reported quarters;
 *                            for a risk or thesis question, sourced risks beside the numbers
 *   B05 competition          the company against its listed peers on reported measures, with
 *                            sourced findings on positioning
 *
 * Every figure here is computed from stored or provider data and says how. The model is
 * asked only for what filings and reporting say (risks, positioning) and its reply is
 * checked before use. No executor calls something cheap or expensive, good or bad.
 */
import { hostOf } from './news-intelligence';
import { researchFindings } from './findings-research';
import { statementTrend } from './company-metrics';
import { day, pct, step, sourceBook, tooSimilar } from './kit';

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const NA = 'N/A';
/* "Trailing P/E" mid-sentence: only the first letter drops. */
const lower = (label) => String(label).charAt(0).toLowerCase() + String(label).slice(1);
const x1 = (v) => (num(v) == null ? NA : `${v.toFixed(1)}x`);
const p1 = (v) => (num(v) == null ? NA : `${v.toFixed(1)}%`);
function money(v) {
  if (num(v) == null) return NA;
  const a = Math.abs(v);
  const s = v < 0 ? '-' : '';
  if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
  return `${s}$${Math.round(a).toLocaleString('en-US')}`;
}
const ordinal = (p) => {
  const n = Math.round(p);
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
  return `${n}${s}`;
};

const subjectOf = (plan) => {
  const c = plan.entities.find((e) => e.type === 'company');
  return { symbol: c.ticker, name: c.label || c.ticker };
};
const questions = (plan, list, max = 3) =>
  list
    .filter(Boolean)
    .filter((f) => !tooSimilar(f, plan.resolvedQuestion) && !tooSimilar(f, plan.originalQuestion))
    .filter((f, i, all) => all.findIndex((g) => tooSimilar(f, g)) === i)
    .slice(0, max);
const unavailable = (plan, { symbol, name }, what, built = {}) => ({
  built: {
    ...built,
    lead: {
      headline: `${what} for ${symbol} ${/s$/.test(what) ? 'are' : 'is'} not available right now`,
      text: `Sonar computes this answer from stored and reported data. None could be retrieved for ${symbol}, so nothing is shown and nothing is estimated in its place. Try again shortly.`,
    },
    followups: {
      placeholder: `Ask a follow-up about ${symbol}…`,
      related: questions(plan, [
        `Is ${symbol} technically oversold?`,
        `Why is ${symbol} stock moving this week?`,
      ]),
    },
  },
  sources: [],
  thread: { subject: name, ticker: symbol },
});
const findingItems = (research, cite) =>
  research.findings.map((f) => ({
    kicker: f.label,
    title: f.title,
    text: f.text,
    note: f.interpretation ? 'Analyst interpretation' : null,
    cites: cite(f.sourceUrls),
  }));
const citer = (sources, research) => (urls) =>
  (urls || []).map((u) =>
    sources.add({ url: u, title: research?.titles?.[u] || hostOf(u), publisher: hostOf(u) }),
  );
const researchBudget = (deadlineAt, reserve = 2500) =>
  Math.max(4000, (deadlineAt || Date.now() + 25000) - Date.now() - reserve);

/* ── B03: valuation against history and peers ───────────────────────────── */

const PEER_COLUMNS = [
  { key: 'name', label: 'Company' },
  { key: 'cap', label: 'Market cap', num: true },
  { key: 'pe', label: 'P/E (TTM)', num: true },
  { key: 'ev', label: 'EV/EBITDA', num: true },
  { key: 'ps', label: 'P/S', num: true },
  { key: 'growth', label: 'Revenue growth', num: true },
  { key: 'margin', label: 'Operating margin', num: true },
];
const peerCells = (p) => ({
  name: p.name && p.name !== p.ticker ? `${p.name} (${p.ticker})` : p.ticker,
  cap: money(p.marketCap),
  pe: x1(p.pe),
  ev: x1(p.evEbitda),
  ps: x1(p.ps),
  growth: num(p.revenueGrowth) == null ? NA : pct(p.revenueGrowth),
  margin: p1(p.operatingMargin),
});
function peerTable(comp, { title, note, cites }) {
  const rows = [
    comp.subject
      ? { id: comp.subject.ticker, emphasis: true, cells: peerCells(comp.subject) }
      : null,
    ...comp.rows.map((p) => ({ id: p.ticker, cells: peerCells(p) })),
    {
      id: 'median',
      summary: true,
      cells: {
        name: 'Peer median',
        cap: '',
        pe: x1(comp.medians.pe),
        ev: x1(comp.medians.evEbitda),
        ps: x1(comp.medians.ps),
        growth: num(comp.medians.revenueGrowth) == null ? NA : pct(comp.medians.revenueGrowth),
        margin: p1(comp.medians.operatingMargin),
      },
    },
  ].filter(Boolean);
  return { title, note, columns: PEER_COLUMNS, rows, cites };
}

export async function runValuation(plan, deps, now, telemetry) {
  const who = subjectOf(plan);
  const { symbol, name } = who;
  const model = deps.valuation
    ? await step(telemetry, 'valuation_model', 14000, () => deps.valuation(symbol, { now }))
    : null;
  const metrics = (model?.history?.metrics || []).filter((m) => m.status !== 'unavailable');
  if (!metrics.length) return unavailable(plan, who, 'Valuation data');

  const sources = sourceBook();
  const src = sources.add({
    key: `valuation:${symbol}`,
    title: `${symbol} valuation history`,
    publisher: 'Ezana valuation model',
    date: model.asOf,
    detail: `Month-end multiples over ${model.history.lookbackYears} years from reported quarterly statements and market capitalisation. A quarter counts only from the date it was filed.`,
    kind: 'dataset',
  });
  const built = {};
  const ranked = metrics.filter((m) => m.percentile != null);
  const lead =
    ranked.find((m) => m.id === 'pe_ttm') || ranked.find((m) => m.id === 'ev_ebitda') || ranked[0];
  const comp = model.peers?.rows?.length ? model.peers : null;
  const fmt = (m, v) => (m.unit === '%' ? p1(v) : x1(v));

  const parts = [];
  let headline;
  if (lead) {
    const where =
      lead.position === 'above' ? 'above' : lead.position === 'below' ? 'below' : 'near';
    headline = `${name} trades ${where} its ${model.history.lookbackYears}-year median on ${lower(lead.label)}`;
    parts.push(
      `The ${lower(lead.label)} is ${fmt(lead, lead.value)}, at the ${ordinal(lead.percentile)} percentile of ${lead.observations} month-end readings (median ${fmt(lead, lead.median)}).`,
    );
  } else {
    headline = `${name} has too little history for a percentile; today's multiples are shown`;
    parts.push(
      `There are not enough valid month-end readings to place today's multiples in a history.`,
    );
  }
  if (comp && num(comp.medians.pe) != null && num(comp.subject?.pe) != null)
    parts.push(
      `Against ${comp.rows.length} industry peers the trailing P/E of ${x1(comp.subject.pe)} compares with a peer median of ${x1(comp.medians.pe)}.`,
    );
  parts.push('A position against history or peers describes the price, not whether it is right.');
  built.lead = { headline, text: parts.join(' '), cites: [src], computed: true };

  built.metric_table = {
    title: 'Against its own history',
    asOf: model.asOf,
    cites: [src],
    rows: metrics.map((m) => ({
      label: m.label,
      value: fmt(m, m.value),
      note:
        m.percentile != null
          ? `${ordinal(m.percentile)} percentile; median ${fmt(m, m.median)}, middle half ${fmt(m, m.p25)} to ${fmt(m, m.p75)}`
          : m.note || 'No percentile',
      method:
        m.basis ||
        (m.window
          ? `${m.observations} month-end readings, ${day(m.window.from)} to ${day(m.window.to)}.${m.direction === 'yield' ? ' On a yield, a higher percentile means a lower valuation.' : ''}`
          : ''),
    })),
  };
  if (comp)
    built.valuation = peerTable(comp, {
      title: 'Against industry peers',
      note:
        [comp.logic?.note, comp.logic?.scaleNote].filter(Boolean).join(' ') ||
        'Trailing twelve months.',
      cites: [src],
    });
  const KIND = {
    observation: 'Observation',
    model: 'Model output',
    interpretation: 'Interpretation',
    risk: 'Sensitivity',
  };
  const statements = (model.conclusion || []).filter((c) => c.kind !== 'observation');
  if (statements.length)
    built.key_findings = {
      title: 'What the model says',
      label: 'A discounted cash flow under stated assumptions. Not a forecast.',
      items: statements.slice(0, 4).map((c) => ({
        kicker: KIND[c.kind] || 'Note',
        title:
          c.kind === 'model'
            ? 'Discounted cash flow'
            : c.kind === 'risk'
              ? 'What moves the result'
              : 'What the price implies',
        text: c.text,
        note: c.kind === 'interpretation' ? 'Analyst interpretation' : null,
        cites: [src],
      })),
    };
  built.followups = {
    placeholder: `Ask a follow-up about ${symbol}’s valuation…`,
    related: questions(plan, [
      `How have ${symbol}’s revenue, margins and free cash flow trended?`,
      `Which institutions hold ${symbol}?`,
      `Is ${symbol} technically oversold?`,
    ]),
  };
  const limits = [
    'Percentiles compare the company with its own past and with a fixed peer list. Neither says what the shares are worth.',
    'Multiples use reported trailing figures. A quarter is counted only from its filing date, so history is not restated with hindsight.',
  ];
  if (!comp)
    limits.push('No peer set was available for this industry, so no peer comparison is shown.');
  built.limitations = { items: limits };
  return {
    built,
    sources: sources.list,
    thread: { subject: name, ticker: symbol, headline, summary: parts[0] },
  };
}

/* ── B02: reported fundamentals, and risks where asked ──────────────────── */

const RISK_QUESTION =
  /\b(risks?|thesis|bull|bear|what could go wrong|downside|depends? on|moat)\b/i;

export async function runFundamentals(plan, deps, now, telemetry, deadlineAt) {
  const who = subjectOf(plan);
  const { symbol, name } = who;
  const wantsRisks = RISK_QUESTION.test(plan.resolvedQuestion);
  const [inputs, research] = await Promise.all([
    deps.statements
      ? step(telemetry, 'financial_statements', 9000, () => deps.statements(symbol, { now }))
      : null,
    wantsRisks && deps.synthesize
      ? step(telemetry, 'live_research', researchBudget(deadlineAt), () =>
          researchFindings(
            { synthesize: deps.synthesize },
            {
              mode: 'risks',
              question: plan.resolvedQuestion,
              company: name,
              ticker: symbol,
              now,
              deadlineAt: deadlineAt ? deadlineAt - 2500 : undefined,
            },
          ),
        )
      : null,
  ]);
  if (wantsRisks && deps.synthesize && !research && !telemetry.degraded.includes('live_research'))
    telemetry.degraded.push('live_research');
  const trend = inputs ? statementTrend(inputs) : null;
  const sources = sourceBook();
  const cite = citer(sources, research);
  const built = {};

  if (!trend && !research) return unavailable(plan, who, 'Reported financial statements');

  let headline = null;
  const parts = [];
  let src = null;
  if (trend) {
    const q = trend.latest;
    src = sources.add({
      key: `statements:${symbol}`,
      title: `${symbol} quarterly financial statements`,
      publisher: 'Company filings (10-Q and 10-K), as reported',
      date: q.period,
      detail: 'Income statement, cash flow statement and balance sheet by fiscal quarter.',
      kind: 'dataset',
    });
    const dir = q.revenueYoyPct == null ? null : q.revenueYoyPct >= 0 ? 'up' : 'down';
    headline = `${name} reported ${money(q.revenue)} of revenue in the quarter ended ${day(q.period)}${
      dir ? `, ${dir} ${Math.abs(q.revenueYoyPct).toFixed(1)}% from a year earlier` : ''
    }`;
    if (q.operatingMarginPct != null)
      parts.push(
        `The operating margin was ${p1(q.operatingMarginPct)}${
          trend.marginChangePts != null
            ? `, ${Math.abs(trend.marginChangePts).toFixed(1)} points ${trend.marginChangePts >= 0 ? 'higher' : 'lower'} than the same quarter a year earlier`
            : ''
        }.`,
      );
    if (trend.ttm.fcf != null)
      parts.push(
        `Free cash flow over the trailing four quarters was ${money(trend.ttm.fcf)}${
          trend.ttm.fcfMarginPct != null ? `, ${p1(trend.ttm.fcfMarginPct)} of revenue` : ''
        }.`,
      );
    if (trend.netDebt != null)
      parts.push(
        trend.netDebt <= 0
          ? `It held ${money(-trend.netDebt)} more cash than debt at ${day(trend.balanceAsOf)}.`
          : `Net debt was ${money(trend.netDebt)} at ${day(trend.balanceAsOf)}.`,
      );
    built.fundamentals = {
      title: 'Reported position',
      note: `Trailing four quarters to ${day(q.period)}. Figures are as reported and are not adjusted.`,
      items: [
        trend.ttm.revenue != null && {
          label: 'Revenue (TTM)',
          value: money(trend.ttm.revenue),
          sub:
            trend.ttm.revenueYoyPct != null
              ? `${pct(trend.ttm.revenueYoyPct)} on the prior four quarters`
              : null,
        },
        q.operatingMarginPct != null && {
          label: 'Operating margin',
          value: p1(q.operatingMarginPct),
          sub: 'Latest quarter',
        },
        trend.ttm.fcf != null && {
          label: 'Free cash flow (TTM)',
          value: money(trend.ttm.fcf),
          sub:
            trend.ttm.cashConversionPct != null
              ? `${Math.round(trend.ttm.cashConversionPct)}% of net income`
              : null,
        },
        trend.netDebt != null && {
          label: trend.netDebt <= 0 ? 'Net cash' : 'Net debt',
          value: money(Math.abs(trend.netDebt)),
          sub: `Debt ${money(trend.debt)}, cash ${money(trend.cash)}`,
        },
      ]
        .filter(Boolean)
        .map((i) => ({ ...i, cites: [src] })),
    };
    built.data_table = {
      title: 'Quarter by quarter',
      note: 'Growth compares each quarter with the same quarter a year earlier.',
      cites: [src],
      columns: [
        { key: 'period', label: 'Quarter ended' },
        { key: 'revenue', label: 'Revenue', num: true },
        { key: 'yoy', label: 'Year over year', num: true },
        { key: 'opm', label: 'Operating margin', num: true },
        { key: 'npm', label: 'Net margin', num: true },
        { key: 'fcf', label: 'Free cash flow', num: true },
      ],
      rows: [...trend.rows].reverse().map((r) => ({
        id: r.period,
        cells: {
          period: day(r.period),
          revenue: money(r.revenue),
          yoy: r.revenueYoyPct == null ? NA : pct(r.revenueYoyPct),
          opm: p1(r.operatingMarginPct),
          npm: p1(r.netMarginPct),
          fcf: money(r.fcf),
        },
      })),
    };
  }
  if (research) {
    built.risk = {
      title: 'Risks and what the case depends on',
      label: 'From filings and reporting. Items without a source are marked as interpretation.',
      items: findingItems(research, cite),
    };
    if (research.watch.length)
      built.watchpoints = { title: 'What to monitor', items: research.watch };
    if (research.answer) parts.unshift(research.answer);
  }
  if (!headline)
    headline = research.headline || `What filings and reporting say about the risks to ${name}`;
  if (!parts.length)
    parts.push('Reported statements were not available, so no financial figures are shown.');
  built.lead = {
    headline: wantsRisks && research?.headline ? research.headline : headline,
    text: parts.join(' '),
    cites: src ? [src] : [],
    computed: Boolean(trend) && !research,
  };
  built.followups = {
    placeholder: `Ask a follow-up about ${symbol}’s financials…`,
    related: questions(plan, [
      `Is ${symbol} expensive compared with its peers?`,
      wantsRisks ? null : `What are ${symbol}’s biggest risks?`,
      `Which institutions hold ${symbol}?`,
      ...(research?.followups || []),
    ]),
  };
  const limits = [
    'Figures are as reported by the company. Non-GAAP adjustments and guidance are not included.',
  ];
  if (wantsRisks && !research && deps.synthesize)
    limits.push(
      'The search for stated risks did not complete, so only the reported figures are shown.',
    );
  if (!trend)
    limits.push('Reported statements could not be retrieved, so no financial figures are shown.');
  built.limitations = { items: limits };
  return {
    built,
    sources: sources.list,
    thread: { subject: name, ticker: symbol, headline: built.lead.headline, summary: parts[0] },
  };
}

/* ── B05: industry competition ──────────────────────────────────────────── */

export async function runCompetition(plan, deps, now, telemetry, deadlineAt) {
  const who = subjectOf(plan);
  const { symbol, name } = who;
  const [set, disclosures, chain] = await Promise.all([
    deps.peerSet ? step(telemetry, 'peer_set', 9000, () => deps.peerSet(symbol)) : null,
    deps.disclosures
      ? step(telemetry, 'company_disclosures', 6000, () => deps.disclosures(symbol))
      : null,
    deps.valueChain
      ? step(telemetry, 'industry_registry', 6000, () => deps.valueChain(symbol))
      : null,
  ]);
  const comp = set?.rows?.length ? set : null;
  const disclosed = (disclosures || []).filter((d) => d.url && d.quote);
  const stages = (chain?.stages || []).filter((st) => st.companies.length);
  const research = deps.synthesize
    ? await step(telemetry, 'live_research', researchBudget(deadlineAt), () =>
        researchFindings(
          { synthesize: deps.synthesize },
          {
            mode: 'competition',
            question: plan.resolvedQuestion,
            company: name,
            ticker: symbol,
            peers: comp ? comp.rows.map((p) => p.ticker) : [],
            now,
            deadlineAt: deadlineAt ? deadlineAt - 2500 : undefined,
          },
        ),
      )
    : null;
  if (deps.synthesize && !research && !telemetry.degraded.includes('live_research'))
    telemetry.degraded.push('live_research');
  if (!comp && !research && !disclosed.length && !stages.length)
    return unavailable(plan, who, 'Peer data');

  const sources = sourceBook();
  const cite = citer(sources, research);
  const built = {};
  const src = comp
    ? sources.add({
        key: `peers:${symbol}`,
        title: `${symbol} and industry peers, trailing measures`,
        publisher: 'Company filings and market data',
        date: now.toISOString().slice(0, 10),
        detail:
          'Trailing twelve-month multiples and margins; revenue growth for the latest fiscal year.',
        kind: 'dataset',
      })
    : null;
  const parts = [];
  if (research?.answer) parts.push(research.answer);
  if (comp) {
    const lead = (k) =>
      [comp.subject, ...comp.rows]
        .filter((p) => p && num(p[k]) != null)
        .sort((a, b) => b[k] - a[k])[0];
    const g = lead('revenueGrowth');
    const m = lead('operatingMargin');
    if (g && m)
      parts.push(
        `Among ${comp.rows.length + (comp.subject ? 1 : 0)} listed companies in the group, ${g.ticker} has the highest reported revenue growth (${pct(g.revenueGrowth)}) and ${m.ticker} the highest operating margin (${p1(m.operatingMargin)}).`,
      );
    built.ranking = peerTable(comp, {
      title: `${name} and its listed peers`,
      note:
        [comp.logic?.note, comp.logic?.scaleNote].filter(Boolean).join(' ') ||
        'A fixed industry peer list.',
      cites: [src],
    });
  }
  if (research) {
    built.key_findings = {
      title: 'How the competitors are positioned',
      label: 'From filings and reporting. Items without a source are marked as interpretation.',
      items: findingItems(research, cite),
    };
    if (research.watch.length)
      built.watchpoints = { title: 'What to monitor', items: research.watch };
  }
  /* Relationships the company itself disclosed: customers, purchase commitments, export
     exposure. Each row is a quotation from a filing, with the filing it came from. A
     relationship is never inferred from two companies sharing an industry. */
  if (disclosed.length) {
    const KIND = {
      customer_concentration: 'Customer',
      purchase_obligations: 'Supply commitment',
      infrastructure_commitments: 'Capacity commitment',
      export_risk: 'Export exposure',
      cloud_ai_metrics: 'Reported metric',
    };
    const order = Object.keys(KIND);
    const rows = [...disclosed]
      .sort(
        (x, y) =>
          order.indexOf(x.kind) - order.indexOf(y.kind) ||
          String(y.filedAt).localeCompare(String(x.filedAt)),
      )
      .filter(
        (d, i, all) =>
          all.findIndex(
            (e) => e.kind === d.kind && e.party === d.party && e.period === d.period,
          ) === i,
      )
      .slice(0, 8);
    built.impact_network = {
      title: 'Relationships the company has disclosed',
      note: 'Quoted from the company’s own filings. Each row links to the filing.',
      columns: ['Type', 'What the filing says', 'Period', 'Filing'],
      rows: rows.map((d) => ({
        name: KIND[d.kind] || 'Disclosure',
        tag: d.party || 'unnamed',
        channel: String(d.quote).length > 260 ? `${String(d.quote).slice(0, 257)}…` : d.quote,
        evidence: d.period || NA,
        assessment: 'confirmed',
        assessmentLabel: `Form ${d.form}, ${day(d.filedAt)}`,
        cites: [
          sources.add({
            url: d.url,
            title: `${symbol} Form ${d.form}, filed ${day(d.filedAt)}`,
            publisher: 'SEC EDGAR',
            date: d.filedAt,
          }),
        ],
      })),
    };
    const customers = [
      ...new Set(
        rows.filter((d) => d.kind === 'customer_concentration' && d.party).map((d) => d.party),
      ),
    ];
    if (customers.length)
      parts.push(`Its filings name ${customers.join(', ')} among its customers.`);
  }
  /* The Industry Registry's value chain, where the company's industry is mapped. */
  if (stages.length) {
    const reg = sources.add({
      key: `registry:${chain.industry}`,
      title: `Ezana Industry Registry: ${chain.industry} value chain`,
      publisher: 'Ezana Industry Registry',
      date:
        stages
          .flatMap((st) => st.companies.map((c) => c.asOf))
          .filter(Boolean)
          .sort()
          .pop() || null,
      detail:
        'Companies by stage of the value chain. A stage lists who operates there; it does not state who supplies whom.',
      kind: 'dataset',
    });
    built.sector_exposure = {
      title: 'Where it sits in the value chain',
      note: 'Stages in order from inputs to end products. Companies in the same or a neighbouring stage are not thereby suppliers or customers of one another.',
      cites: [reg],
      columns: [
        { key: 'stage', label: 'Stage' },
        { key: 'what', label: 'What happens there' },
        { key: 'who', label: 'Companies in the registry' },
      ],
      rows: stages.map((st) => ({
        id: st.id,
        emphasis: st.isSubject,
        cells: {
          stage: st.label,
          what: st.description || '',
          who: st.companies.map((c) => (c.ticker ? `${c.name} (${c.ticker})` : c.name)).join(', '),
        },
      })),
    };
  }
  const headline =
    research?.headline ||
    (comp
      ? `${name} against ${comp.rows.length} listed peers on reported growth, margins and multiples`
      : `What ${name}’s filings and the Industry Registry show about its position`);
  built.lead = { headline, text: parts.join(' '), cites: src ? [src] : [] };
  built.followups = {
    placeholder: `Ask a follow-up about ${name}’s industry…`,
    related: questions(plan, [
      `Is ${symbol} expensive compared with its peers?`,
      `How have ${symbol}’s revenue, margins and free cash flow trended?`,
      ...(research?.followups || []),
    ]),
  };
  const limits = [
    'The peer table compares reported company figures. Sonar holds no verified market-share series for this industry, so no share is computed: a share appears only where a cited source reports it.',
    'Total industry revenue is not market share, and neither is inferred from the other.',
  ];
  if (!research && deps.synthesize)
    limits.push(
      'The search for reporting on positioning did not complete, so only the computed comparison is shown.',
    );
  if (!comp)
    limits.push('No peer set was available for this industry, so no comparison table is shown.');
  built.limitations = { items: limits };
  return {
    built,
    sources: sources.list,
    thread: { subject: name, ticker: symbol, headline, summary: parts[0] || '' },
  };
}
