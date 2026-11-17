/**
 * Sonar adaptive research: executors for company and ranking questions (Nov 2026).
 *
 *   B03 valuation            today's multiples against the company's own five-year history
 *                            and against its industry peers, from Ezana's valuation model
 *   B02 fundamentals         growth, margins, cash flow and net debt from reported quarters;
 *                            for a risk or thesis question, sourced risks beside the numbers
 *   B05 competition          the company against its listed peers on reported measures, with
 *                            sourced findings on positioning
 *   B06 institutional        the largest reported 13F holders and how their positions changed
 *   B07 congressional trades trades members of Congress disclosed in a security
 *   C02 country rankings     a same-year ranking of economies on one World Bank measure
 *
 * Every figure here is computed from stored or provider data and says how. The model is
 * asked only for what filings and reporting say (risks, positioning) and its reply is
 * checked before use. No executor calls something cheap or expensive, good or bad.
 */
import { hostOf } from './news-intelligence';
import { researchFindings } from './findings-research';
import { statementTrend, tradeSummary, holderChanges, rankingMetricOf } from './company-metrics';
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
  const set = deps.peerSet
    ? await step(telemetry, 'peer_set', 9000, () => deps.peerSet(symbol))
    : null;
  const comp = set?.rows?.length ? set : null;
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
  if (!comp && !research) return unavailable(plan, who, 'Peer data');

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
  const headline =
    research?.headline ||
    `${name} against ${comp.rows.length} listed peers on reported growth, margins and multiples`;
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
    'The peer table compares reported company figures. Sonar holds no market-share dataset: a share is shown only where a cited source reports it.',
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

/* ── B06: institutional ownership (13F) ─────────────────────────────────── */

const CHANGE_LABEL = (c) => {
  const s = String(c || '').toLowerCase();
  if (/new|open|initiat/.test(s)) return 'New position';
  if (/increas|add|bought|buy/.test(s)) return 'Added';
  if (/decreas|reduc|trim|sold|sell/.test(s)) return 'Reduced';
  if (/unchanged|hold|same/.test(s)) return 'Unchanged';
  return 'Not stated';
};

export async function runInstitutional(plan, deps, now, telemetry) {
  const who = subjectOf(plan);
  const { symbol, name } = who;
  const data = deps.holders13f
    ? await step(telemetry, 'holdings_13f', 8000, () => deps.holders13f(symbol))
    : null;
  const rows = (data?.rows || []).filter((r) => r?.filer && num(r.valueUsd) != null);
  if (!rows.length) return unavailable(plan, who, '13F holdings');
  const sources = sourceBook();
  const src = sources.add({
    key: `13f:${symbol}`,
    title: `Form 13F holdings of ${symbol}${data.quarter ? `, ${data.quarter}` : ''}`,
    publisher: 'SEC Form 13F filings',
    date: data.period || null,
    detail: 'Quarter-end long positions reported by institutional managers.',
    kind: 'dataset',
  });
  const ch = holderChanges(rows);
  const top = rows[0];
  const headline = `${top.filer} is the largest reported 13F holder of ${name}${data.quarter ? ` for ${data.quarter}` : ''}`;
  const moves = [
    ch.added && `${ch.added} added`,
    ch.reduced && `${ch.reduced} reduced`,
    ch.opened && `${ch.opened} opened a new position`,
    ch.unchanged && `${ch.unchanged} were unchanged`,
  ].filter(Boolean);
  const parts = [
    `Its reported position was worth ${money(top.valueUsd)} at the quarter end.`,
    moves.length
      ? `Of the ${rows.length} largest holders shown, ${moves.join(', ')} against the prior quarter.`
      : null,
    'These are quarter-end positions filed up to 45 days later, so they do not show what a manager holds today.',
  ].filter(Boolean);
  const built = {
    lead: { headline, text: parts.join(' '), cites: [src], computed: true },
    ranking: {
      title: 'Largest reported holders',
      note: data.quarter
        ? `Positions as of the end of ${data.quarter}.`
        : 'Latest reported quarter.',
      cites: [src],
      columns: [
        { key: 'rank', label: '#', num: true },
        { key: 'filer', label: 'Manager' },
        { key: 'value', label: 'Reported value', num: true },
        { key: 'change', label: 'Against prior quarter' },
      ],
      rows: rows.map((r, i) => ({
        id: `${i}-${r.filer}`,
        cells: {
          rank: String(i + 1),
          filer: r.filer,
          value: money(r.valueUsd),
          change: CHANGE_LABEL(r.changeType),
        },
      })),
    },
    followups: {
      placeholder: `Ask a follow-up about who holds ${symbol}…`,
      related: questions(plan, [
        `Which members of Congress traded ${symbol}?`,
        `Is ${symbol} expensive compared with its peers?`,
        `Why is ${symbol} stock moving this week?`,
      ]),
    },
    limitations: {
      items: [
        'Form 13F covers long positions in US-listed securities held by managers above the reporting threshold. Short positions, most derivatives and holdings outside the United States are not in it.',
        'A change in reported value reflects price as well as shares bought or sold.',
      ],
    },
  };
  return {
    built,
    sources: sources.list,
    thread: { subject: name, ticker: symbol, headline, summary: parts[0] },
  };
}

/* ── B07: congressional trading ─────────────────────────────────────────── */

const TRADE_LABEL = {
  purchase: 'Purchase',
  sale: 'Sale',
  sale_partial: 'Partial sale',
  exchange: 'Exchange',
};
const range = (lo, hi) =>
  num(lo) == null && num(hi) == null
    ? 'Not stated'
    : num(hi) == null
      ? `Over ${money(lo)}`
      : `${money(lo || 0)} to ${money(hi)}`;

export async function runCongressTrades(plan, deps, now, telemetry) {
  const who = subjectOf(plan);
  const { symbol, name } = who;
  const since = new Date(now.getTime() - 365 * 86400000).toISOString().slice(0, 10);
  const trades = deps.congressTrades
    ? await step(telemetry, 'congress_disclosures', 8000, () =>
        deps.congressTrades(symbol, { since }),
      )
    : null;
  if (!trades) return unavailable(plan, who, 'Congressional trade disclosures');
  const sources = sourceBook();
  const src = sources.add({
    key: `congress:${symbol}`,
    title: `Congressional periodic transaction reports naming ${symbol}`,
    publisher: 'House Clerk and Senate financial disclosures',
    date: trades[0]?.disclosureDate || trades[0]?.transactionDate || null,
    detail: 'Transactions as disclosed by members. Amounts are reported in ranges.',
    kind: 'dataset',
  });
  const s = tradeSummary(trades);
  const built = {};
  let headline;
  const parts = [];
  if (!s.total) {
    headline = `No member of Congress has disclosed a trade in ${name} since ${day(since)}`;
    parts.push(
      `Sonar's index of House and Senate transaction reports holds no trade naming ${symbol} in the past twelve months. A trade made recently may not have been reported yet.`,
    );
  } else {
    headline = `${s.members} member${s.members === 1 ? '' : 's'} of Congress disclosed ${s.total} trade${s.total === 1 ? '' : 's'} in ${name} over the past twelve months`;
    parts.push(
      `${s.purchases} ${s.purchases === 1 ? 'was a purchase' : 'were purchases'} and ${s.sales} ${s.sales === 1 ? 'was a sale' : 'were sales'}${s.exchanges ? `, with ${s.exchanges} exchange${s.exchanges === 1 ? '' : 's'}` : ''}.`,
    );
    if (s.medianLagDays != null)
      parts.push(
        `The median report came ${Math.round(s.medianLagDays)} days after the transaction${
          s.lateCount ? `; ${s.lateCount} came more than 45 days after` : ''
        }.`,
      );
    parts.push('Amounts are disclosed in ranges, so no exact value or total is given.');
    built.ranking = {
      title: 'Disclosed transactions',
      note: `Most recent first, ${day(s.from)} to ${day(s.to)}.`,
      cites: [src],
      columns: [
        { key: 'date', label: 'Transaction' },
        { key: 'member', label: 'Member' },
        { key: 'type', label: 'Type' },
        { key: 'amount', label: 'Disclosed range', num: true },
        { key: 'reported', label: 'Reported' },
      ],
      rows: trades.slice(0, 25).map((t, i) => ({
        id: `${i}-${t.member}-${t.transactionDate}`,
        cells: {
          date: day(t.transactionDate),
          member: [
            t.member,
            t.chamber === 'senate' ? 'Senate' : t.chamber === 'house' ? 'House' : null,
          ]
            .filter(Boolean)
            .join(', '),
          type: TRADE_LABEL[t.type] || 'Transaction',
          amount: range(t.amountMin, t.amountMax),
          reported: t.disclosureDate ? day(t.disclosureDate) : 'Not stated',
        },
      })),
    };
  }
  built.lead = { headline, text: parts.join(' '), cites: [src], computed: true };
  built.followups = {
    placeholder: `Ask a follow-up about trades in ${symbol}…`,
    related: questions(plan, [
      `Which institutions hold ${symbol}?`,
      `Why is ${symbol} stock moving this week?`,
      `Is ${symbol} technically oversold?`,
    ]),
  };
  built.limitations = {
    items: [
      'A disclosed trade shows that a transaction was reported. It does not show what the member knew or why they traded.',
      'Trades by spouses and dependants are reported on the member’s form and are included. Company insiders are not covered in this answer.',
    ],
  };
  return {
    built,
    sources: sources.list,
    thread: { subject: name, ticker: symbol, headline, summary: parts[0] },
  };
}

/* ── C02: country rankings on a World Bank measure ──────────────────────── */

const rankValue = (id, v) => (id === 'gdp_growth_real' ? pct(v) : money(v));

export async function runCountryRanking(plan, deps, now, telemetry) {
  const id = rankingMetricOf(plan.resolvedQuestion);
  const payload = deps.rankings
    ? await step(telemetry, 'macro_rankings', 8000, () => deps.rankings())
    : null;
  const m = payload?.metrics?.[id];
  const follow = {
    placeholder: 'Ask a follow-up about these economies…',
    related: questions(plan, [
      id === 'gdp_nominal_usd'
        ? 'Which countries have the highest GDP per capita?'
        : 'What are the largest economies by GDP?',
      id === 'gdp_growth_real' ? null : 'Which economies are growing the fastest?',
    ]),
  };
  if (!m?.ranked?.length)
    return {
      built: {
        lead: {
          headline: 'The country rankings are not available right now',
          text: 'Sonar ranks economies from stored World Bank series. They could not be read, so no ranking is shown and none is recalled from memory. Try again shortly.',
        },
        followups: follow,
      },
      sources: [],
      thread: {},
    };
  const sources = sourceBook();
  const src = sources.add({
    key: `wb:${id}`,
    title: `${m.label}, ${m.year}`,
    publisher: payload.attribution || 'World Bank, World Development Indicators',
    date: String(m.year),
    detail: payload.scope || null,
    kind: 'dataset',
  });
  const ranked = m.ranked.map(([iso3, rank, value]) => ({
    iso3,
    rank,
    value,
    name: payload.names?.[iso3] || iso3,
  }));
  const top = ranked.slice(0, 15);
  const [a, b, c] = top;
  const headline = `${a.name} ranks first on ${lower(m.label)} in ${m.year}`;
  const parts = [
    `${a.name} is at ${rankValue(id, a.value)}${b ? `, followed by ${b.name} at ${rankValue(id, b.value)}` : ''}${c ? ` and ${c.name} at ${rankValue(id, c.value)}` : ''}.`,
    `The ranking covers ${m.of || ranked.length} economies, all measured for ${m.year}, the latest year most of them have reported.`,
  ];
  return {
    built: {
      lead: { headline, text: parts.join(' '), cites: [src], computed: true },
      ranking: {
        title: `${m.label}, ${m.year}`,
        note: `${m.unit}. ${payload.scope || ''}`.trim(),
        cites: [src],
        columns: [
          { key: 'rank', label: 'Rank', num: true },
          { key: 'name', label: 'Economy' },
          { key: 'value', label: m.label, num: true },
        ],
        rows: top.map((r) => ({
          id: r.iso3,
          cells: { rank: String(r.rank), name: r.name, value: rankValue(id, r.value) },
        })),
      },
      followups: follow,
      limitations: {
        items: [
          'Every economy is ranked on the same year. A country that has not reported that year is left out, not carried forward.',
          id === 'gdp_growth_real'
            ? 'A single year of growth can reflect a rebound from a weak year. Small economies move the most.'
            : 'Values in current US dollars move with exchange rates as well as output.',
        ],
      },
    },
    sources: sources.list,
    thread: { headline, summary: parts[0] },
  };
}
