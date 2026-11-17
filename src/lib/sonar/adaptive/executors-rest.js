/**
 * Sonar adaptive research: the remaining scenarios (Nov 2026).
 *
 *   A01 event verification   whether sources confirm, contradict or do not establish a claim
 *   A09 catalysts            the dated events on record for a company
 *   B09 performance          sectors, or the securities named, over matched windows
 *   C06 sanctions            listings that name an entity or a country, by list and programme
 *   C07 crypto               a crypto asset's price, range and risk statistics
 *
 * (A06 mergers runs as a sourced brief in executors-macro.js.) The same rules as every other
 * executor: figures are computed, a claim carries its source, an absence is said once.
 */
import { sourceClass, hostOf } from './news-intelligence';
import { discoverMarkets } from './prediction-intelligence';
import { researchFindings } from './findings-research';
import { riskStats, rangeStats, earningsRecord } from './series-metrics';
import { countryOf } from './country-ref';
import { EVENT_STATUSES } from './schema';
import {
  day,
  pct,
  isoDaysAgo,
  ADJUSTMENT,
  step,
  sourceBook,
  newsItems,
  num,
  NA,
  money,
  freshQuestions,
} from './kit';

const companyOf = (plan) => {
  const c = plan.entities.find((e) => e.type === 'company');
  return c ? { symbol: c.ticker || null, name: c.label || c.ticker } : null;
};
const dark = (plan, what, related = [], thread = {}) => ({
  built: {
    lead: {
      headline: `${what} not available right now`,
      text: 'Sonar builds this answer from stored and reported data. It could not be read, so nothing is shown and nothing is estimated in its place. Try again shortly.',
    },
    followups: { placeholder: 'Ask a follow-up…', related: freshQuestions(plan, related) },
  },
  sources: [],
  thread,
});

/* ── A01: event verification ────────────────────────────────────────────── */

export async function runVerification(plan, deps, now, telemetry, deadlineAt) {
  if (!deps.synthesize) return null;
  const company = companyOf(plan);
  const person = plan.entities.find((e) => e.type === 'person')?.label || null;
  const terms = [company?.name, company?.symbol, person].filter(Boolean);
  const [research, clusters] = await Promise.all([
    step(
      telemetry,
      'live_research',
      Math.max(4000, (deadlineAt || Date.now() + 30000) - Date.now() - 4000),
      () =>
        researchFindings(
          { synthesize: deps.synthesize },
          {
            mode: 'verification',
            question: plan.resolvedQuestion,
            company: company?.name || person,
            ticker: company?.symbol,
            now,
            deadlineAt: deadlineAt ? deadlineAt - 4000 : undefined,
          },
        ),
    ),
    terms.length
      ? newsItems(deps, telemetry, {
          tickers: company?.symbol ? [company.symbol] : [],
          phrase: terms.join(' '),
          entityTerms: terms,
          eventTerms: ['confirm', 'announce', 'resign', 'deny', 'filing', 'statement'],
          now,
          limit: 6,
        })
      : [],
  ]);
  if (!research) telemetry.degraded.push('live_research');
  /* With no checked research and no coverage there is nothing to verify against: decline. */
  if (!research && !clusters.length) return null;
  const sources = sourceBook();
  const cite = (urls) =>
    (urls || []).map((u) =>
      sources.add({ url: u, title: research?.titles?.[u] || hostOf(u), publisher: hostOf(u) }),
    );
  /* The verdict is derived from the checked evidence, not taken from the model's headline:
     confirmed or contradicted needs a regulator, issuer or established news source saying so. */
  const strong = (f) => f.sourceUrls.some((u) => sourceClass(u) !== 'other');
  const supports = (research?.findings || []).filter((f) => /^support/i.test(f.label) && strong(f));
  const contradicts = (research?.findings || []).filter(
    (f) => /^contradict/i.test(f.label) && strong(f),
  );
  const status =
    supports.length && !contradicts.length
      ? 'event_verified'
      : contradicts.length && !supports.length
        ? 'event_contradicted'
        : 'event_unconfirmed';
  const built = {};
  const verdictLine = {
    event_verified: 'Sources reviewed confirm it.',
    event_contradicted: 'Sources reviewed contradict it.',
    event_unconfirmed:
      supports.length && contradicts.length
        ? 'Sources reviewed disagree, so it is not established.'
        : 'Sources reviewed do not establish it. That is not the same as showing it is false.',
  }[status];
  const headline =
    research?.headline && status !== 'event_unconfirmed'
      ? research.headline
      : status === 'event_unconfirmed'
        ? 'The sources reviewed do not establish this'
        : research?.headline;
  built.lead = {
    headline: headline || 'Sonar could not verify this just now',
    text: research
      ? `${verdictLine}${status !== 'event_unconfirmed' && research.answer ? ` ${research.answer}` : ''}`
      : `The research step did not complete, so no verdict is given. ${clusters.length ? 'Recent coverage from the news cache is listed below. ' : ''}Nothing is filled in from memory.`,
    cites: cite([...supports, ...contradicts].flatMap((f) => f.sourceUrls).slice(0, 3)),
  };
  if (research) {
    built.verified_event_status = {
      status,
      statusLabel: EVENT_STATUSES[status],
      summary: verdictLine,
      facts: [
        {
          label: 'Sources that support it',
          value: String(supports.length),
          cites: cite(supports.flatMap((f) => f.sourceUrls)),
        },
        {
          label: 'Sources that contradict it',
          value: String(contradicts.length),
          cites: cite(contradicts.flatMap((f) => f.sourceUrls)),
        },
      ],
      cites: cite([...supports, ...contradicts].flatMap((f) => f.sourceUrls)),
      checkedAt: now.toISOString().slice(0, 10),
    };
    built.key_findings = {
      title: 'What the sources say',
      label:
        'Each item is what one source states. Items without a source are marked as interpretation.',
      items: research.findings.map((f) => ({
        kicker: f.label,
        title: f.title,
        text: f.text,
        note: f.interpretation ? 'Analyst interpretation' : null,
        cites: cite(f.sourceUrls),
      })),
    };
  }
  const timeline = clusters.map((c) => {
    const date = c.lead.publishedAt ? String(c.lead.publishedAt).slice(0, 10) : null;
    return {
      date,
      title: c.lead.title,
      publisher: c.lead.publisher,
      url: c.lead.url,
      sourceClass: c.lead.sourceClass,
      corroboration: c.corroboration,
      cites: [
        sources.add({ url: c.lead.url, title: c.lead.title, publisher: c.lead.publisher, date }),
      ],
    };
  });
  if (timeline.length)
    built.news_timeline = {
      title: 'Recent coverage',
      note: 'Context from the news cache, in date order.',
      items: timeline
        .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
        .slice(-8),
    };
  const subject = company?.name || person || null;
  built.followups = {
    placeholder: 'Ask a follow-up about this event…',
    related: freshQuestions(plan, [
      status === 'event_verified' && company
        ? `How will this affect ${company.name} and its industry?`
        : null,
      company?.symbol ? `Why is ${company.symbol} stock moving this week?` : null,
      ...(research?.followups || []),
    ]),
  };
  built.limitations = {
    items: [
      'A verdict needs a regulator, the company itself or an established news organisation stating it. Anything less is reported as not established.',
      !research ? 'The research step did not complete for this answer.' : null,
    ].filter(Boolean),
  };
  return {
    built,
    sources: sources.list,
    thread: {
      subject,
      ticker: company?.symbol || null,
      person,
      headline: built.lead.headline,
      summary: built.lead.text,
      event: status,
    },
  };
}

/* ── A09: dated catalysts ───────────────────────────────────────────────── */

export async function runCatalysts(plan, deps, now, telemetry) {
  const who = companyOf(plan);
  if (!who?.symbol) return null;
  const { symbol, name } = who;
  const [rows, market, clusters] = await Promise.all([
    deps.earnings ? step(telemetry, 'earnings_history', 8000, () => deps.earnings(symbol)) : null,
    deps.retrieveMarkets
      ? step(telemetry, 'prediction_markets', 6000, () =>
          discoverMarkets(
            { retrieve: deps.retrieveMarkets, admin: deps.admin },
            {
              query: `${name} ${symbol}`,
              eventType: 'topic',
              entityTerms: [name, symbol],
              now,
              limit: 6,
            },
          ),
        )
      : null,
    newsItems(deps, telemetry, {
      tickers: [symbol],
      phrase: name,
      entityTerms: [name, symbol],
      eventTerms: ['earnings', 'guidance', 'launch', 'ruling', 'approval', 'investor day'],
      now,
      limit: 5,
    }),
  ]);
  const rec = rows ? earningsRecord(rows, now) : null;
  const related = [
    `When does ${symbol} report earnings next?`,
    `Why is ${symbol} stock moving this week?`,
    `What are ${symbol}’s biggest risks?`,
  ];
  const sources = sourceBook();
  const events = [];
  if (rec?.next) {
    const src = sources.add({
      key: `earnings:${symbol}`,
      title: `${symbol} earnings calendar`,
      publisher: 'Earnings calendar and analyst consensus',
      date: rec.next.date,
      detail: 'The date is the calendar’s and may be an estimate until the company confirms it.',
      kind: 'dataset',
    });
    events.push({
      date: rec.next.date,
      event: 'Earnings report',
      basis: 'Expected date, not confirmed',
      detail:
        rec.next.epsEstimated != null
          ? `Consensus EPS $${rec.next.epsEstimated.toFixed(2)}`
          : 'No consensus on record',
      cite: src,
    });
  }
  for (const m of market?.markets || []) {
    if (!m.endDate) continue;
    const d = String(m.endDate).slice(0, 10);
    if (d < now.toISOString().slice(0, 10)) continue;
    const src = sources.add({
      url: m.url,
      title: m.question,
      publisher: m.venue || hostOf(m.url),
      date: d,
    });
    events.push({
      date: d,
      event: 'Prediction contract closes',
      basis: 'The contract’s own end date',
      detail: m.question,
      cite: src,
    });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  if (rows === null && market === null && !clusters.length)
    return dark(plan, `Dated events for ${symbol} are`, related, { subject: name, ticker: symbol });
  const built = {};
  const first = events[0];
  const headline = first
    ? `The next dated event on record for ${name} is ${first.event === 'Earnings report' ? 'its earnings report' : 'a contract close'}, ${first.event === 'Earnings report' ? 'expected' : 'on'} ${day(first.date)}`
    : `No dated event is on record for ${name}`;
  const text = first
    ? `${events.length === 1 ? 'It is the only dated event' : `${events.length} dated events are`} on record. Dates from an earnings calendar can move until the company confirms them.`
    : `Sonar holds no upcoming earnings date and no open contract with an end date for ${symbol}. Product launches, court dates and regulatory deadlines are not in a calendar Sonar reads.`;
  built.lead = { headline, text, cites: first ? [first.cite] : [] };
  if (events.length)
    built.catalyst_calendar = {
      title: 'Dated events on record',
      note: 'In date order. The basis says how firm each date is.',
      cites: [...new Set(events.map((e) => e.cite))],
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'event', label: 'Event' },
        { key: 'detail', label: 'Detail' },
        { key: 'basis', label: 'Basis for the date' },
      ],
      rows: events.slice(0, 10).map((e, i) => ({
        id: `${i}-${e.date}`,
        cells: { date: day(e.date), event: e.event, detail: e.detail, basis: e.basis },
      })),
    };
  const timeline = clusters.map((c) => {
    const date = c.lead.publishedAt ? String(c.lead.publishedAt).slice(0, 10) : null;
    return {
      date,
      title: c.lead.title,
      publisher: c.lead.publisher,
      url: c.lead.url,
      sourceClass: c.lead.sourceClass,
      corroboration: c.corroboration,
      cites: [
        sources.add({ url: c.lead.url, title: c.lead.title, publisher: c.lead.publisher, date }),
      ],
    };
  });
  if (timeline.length)
    built.news_timeline = {
      title: 'Recent coverage',
      note: 'Context from the news cache.',
      items: timeline.sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))),
    };
  built.followups = {
    placeholder: `Ask a follow-up about ${symbol}…`,
    related: freshQuestions(plan, related),
  };
  built.limitations = {
    items: [
      'Only events with a date in a source Sonar reads are listed: the earnings calendar and open prediction contracts. This is not a complete calendar of corporate events.',
    ],
  };
  return {
    built,
    sources: sources.list,
    thread: { subject: name, ticker: symbol, headline, summary: text },
  };
}

/* ── B09: cross-asset and sector performance ────────────────────────────── */

const SECTORS = [
  ['XLK', 'Technology'],
  ['XLC', 'Communication services'],
  ['XLY', 'Consumer discretionary'],
  ['XLP', 'Consumer staples'],
  ['XLE', 'Energy'],
  ['XLF', 'Financials'],
  ['XLV', 'Health care'],
  ['XLI', 'Industrials'],
  ['XLB', 'Materials'],
  ['XLRE', 'Real estate'],
  ['XLU', 'Utilities'],
];
const ASSETS = [
  ['SPY', 'US large-cap equities'],
  ['QQQ', 'Nasdaq 100'],
  ['IWM', 'US small-cap equities'],
  ['EFA', 'Developed markets ex-US'],
  ['EEM', 'Emerging markets'],
  ['TLT', 'Long US Treasuries'],
  ['LQD', 'Investment-grade credit'],
  ['GLD', 'Gold'],
  ['USO', 'Crude oil'],
  ['UUP', 'US dollar'],
];
/* Return from the close on or before `days` ago to the latest close, on the bars given. */
function trailing(bars, days) {
  const rows = (bars || []).filter((b) => b?.date && num(b.close) != null && b.close > 0);
  if (rows.length < 2) return null;
  const last = rows.at(-1);
  const cut = new Date(Date.parse(`${last.date}T00:00:00Z`) - days * 86400000)
    .toISOString()
    .slice(0, 10);
  const base = [...rows].reverse().find((r) => r.date <= cut);
  return base ? (last.close / base.close - 1) * 100 : null;
}
function ytd(bars) {
  const rows = (bars || []).filter((b) => b?.date && num(b.close) != null && b.close > 0);
  if (rows.length < 2) return null;
  const year = rows.at(-1).date.slice(0, 4);
  const base = [...rows].reverse().find((r) => r.date < `${year}-01-01`);
  return base ? (rows.at(-1).close / base.close - 1) * 100 : null;
}

export async function runPerformance(plan, deps, now, telemetry) {
  if (!deps.getOhlcv) return null;
  const named = plan.entities
    .filter((e) => e.type === 'company' && e.ticker)
    .map((e) => [e.ticker, e.label && e.label !== e.ticker ? e.label : e.ticker]);
  const q = plan.resolvedQuestion;
  const mode =
    named.length >= 2
      ? 'named'
      : /\bsectors?\b|\bindustr/i.test(q)
        ? 'sectors'
        : /\basset/i.test(q)
          ? 'assets'
          : named.length === 1
            ? 'named'
            : null;
  if (!mode) return null;
  let universe = mode === 'sectors' ? SECTORS : mode === 'assets' ? ASSETS : named;
  if (mode === 'named' && named.length === 1)
    universe = [named[0], ['SPY', 'US large-cap equities']];
  const from = isoDaysAgo(now, 400);
  const got = await Promise.all(
    universe.map(([sym]) => step(telemetry, `bars_${sym}`, 8000, () => deps.getOhlcv(sym, from))),
  );
  const rows = universe
    .map(([sym, label], i) => {
      const bars = got[i]?.bars || [];
      return {
        sym,
        label,
        bars,
        asOf: bars.at(-1)?.date || null,
        m1: trailing(bars, 30),
        m3: trailing(bars, 91),
        y: ytd(bars),
        y1: trailing(bars, 365),
      };
    })
    .filter((r) => r.m3 != null || r.m1 != null);
  const related = [
    'Which sectors are leading the market?',
    'Which asset classes are outperforming?',
    named[0] ? `Is ${named[0][0]} technically oversold?` : null,
  ];
  if (!rows.length) return dark(plan, 'Daily prices for this comparison are', related);
  /* One matched window for every row: the latest date they all share. */
  const asOf = rows.map((r) => r.asOf).sort()[0];
  const sources = sourceBook();
  const src = sources.add({
    key: 'perf',
    title: `Daily closing prices: ${rows.map((r) => r.sym).join(', ')}`,
    publisher: 'Market data',
    date: asOf,
    detail:
      `${ADJUSTMENT[got.find(Boolean)?.adjustment] || 'Daily closes.'} ${mode === 'named' ? '' : 'Each row is an exchange-traded fund standing in for its sector or asset class.'}`.trim(),
    kind: 'dataset',
  });
  const key = /\b(year|12 months|ytd)\b/i.test(q)
    ? /\bytd|year to date\b/i.test(q)
      ? 'y'
      : 'y1'
    : /\bmonth\b/i.test(q) && !/\b(3|three) months?\b/i.test(q)
      ? 'm1'
      : 'm3';
  const KEY_LABEL = { m1: 'one month', m3: 'three months', y: 'the year to date', y1: 'one year' };
  const ranked = [...rows].filter((r) => r[key] != null).sort((a, b) => b[key] - a[key]);
  if (!ranked.length) return dark(plan, 'Daily prices for this comparison are', related);
  const best = ranked[0];
  const worst = ranked.at(-1);
  const headline =
    mode === 'named' && ranked.length === 2
      ? `${best.label} has returned ${pct(best[key])} over ${KEY_LABEL[key]}, against ${pct(worst[key])} for ${worst.label}`
      : `${best.label} leads over ${KEY_LABEL[key]} at ${pct(best[key])}; ${worst.label} trails at ${pct(worst[key])}`;
  const parts = [
    `Returns are measured to ${day(asOf)} from daily closes, the same window for every row.`,
  ];
  /* Two named securities: how closely they moved together, from daily returns. */
  let pair = null;
  if (mode === 'named' && rows.length === 2) {
    pair = riskStats(rows[0].bars, rows[1].bars, { sessions: 252 });
    if (pair?.correlation != null)
      parts.push(
        `Over the past ${pair.sessions} sessions their daily returns had a correlation of ${pair.correlation.toFixed(2)}${pair.beta != null ? `, and ${rows[0].sym} moved ${pair.beta.toFixed(2)} for each 1 in ${rows[1].sym}` : ''}.`,
      );
  }
  parts.push('Past returns describe what happened. They are not a forecast.');
  const fmt = (v) => (v == null ? NA : pct(v));
  const built = {
    lead: { headline, text: parts.join(' '), cites: [src], computed: true },
    series_chart: {
      title: `Return over ${KEY_LABEL[key]}`,
      note: `To ${day(asOf)}. Price return from daily closes.`,
      kind: 'bar',
      format: 'percent',
      categories: ranked.map((r) => (mode === 'named' ? r.sym : r.label)),
      series: [{ name: `Return, ${KEY_LABEL[key]}`, values: ranked.map((r) => r[key]) }],
      cites: [src],
    },
    heatmap: {
      title:
        mode === 'sectors'
          ? 'Sectors over matched windows'
          : mode === 'assets'
            ? 'Asset classes over matched windows'
            : 'Returns over matched windows',
      note: `Sorted by ${KEY_LABEL[key]}. Select a column to re-sort.`,
      cites: [src],
      sortable: true,
      columns: [
        {
          key: 'name',
          label: mode === 'named' ? 'Security' : mode === 'sectors' ? 'Sector' : 'Asset class',
        },
        { key: 'sym', label: mode === 'named' ? 'Ticker' : 'Fund' },
        { key: 'm1', label: '1 month', num: true },
        { key: 'm3', label: '3 months', num: true },
        { key: 'y', label: 'Year to date', num: true },
        { key: 'y1', label: '1 year', num: true },
      ],
      rows: ranked.map((r) => ({
        id: r.sym,
        cells: {
          name: r.label,
          sym: r.sym,
          m1: fmt(r.m1),
          m3: fmt(r.m3),
          y: fmt(r.y),
          y1: fmt(r.y1),
        },
        sort: { name: r.label, sym: r.sym, m1: r.m1, m3: r.m3, y: r.y, y1: r.y1 },
      })),
    },
    followups: {
      placeholder: 'Ask a follow-up about these returns…',
      related: freshQuestions(plan, related),
    },
    limitations: {
      items: [
        mode === 'named'
          ? 'Price return only: dividends are not included unless the data provider adjusts for them.'
          : 'Each sector or asset class is represented by one exchange-traded fund, so the figures include that fund’s own composition and fees.',
        pair?.correlation != null
          ? 'A correlation describes how two series moved together in the window. It does not show that one moves the other.'
          : null,
      ].filter(Boolean),
    },
  };
  return {
    built,
    sources: sources.list,
    thread: {
      headline,
      summary: parts[0],
      ticker: named[0]?.[0] || null,
      subject: named[0]?.[1] || null,
    },
  };
}

/* ── C06: sanctions listings ────────────────────────────────────────────── */

const LIST_LABEL = {
  ofac: 'US Treasury (OFAC SDN)',
  eu: 'European Union',
  uk: 'United Kingdom',
  un: 'United Nations',
};

export async function runSanctions(plan, deps, now, telemetry) {
  if (!deps.sanctions) return null;
  const company = companyOf(plan);
  const country = countryOf(plan.resolvedQuestion);
  const quoted = plan.resolvedQuestion.match(
    /\b(?:affect|on|against|target(?:ing)?|sanction(?:s|ed)?)\s+([A-Z][\w&.-]+(?:\s+[A-Z][\w&.-]+){0,3})/,
  );
  const subject =
    company?.name && company.name !== company.symbol
      ? company.name
      : country?.name || quoted?.[1] || company?.name || null;
  if (!subject) return null;
  const data = await step(telemetry, 'sanctions_lists', 9000, () =>
    deps.sanctions(subject, { country: country && !company ? country.name : null }),
  );
  const related = [
    'How would new chip export restrictions affect ASML?',
    country ? `How is ${country.name}’s economy doing?` : null,
    company?.symbol ? `What are ${company.symbol}’s biggest risks?` : null,
  ];
  if (!data) return dark(plan, 'The sanctions lists are', related, { subject });
  const sources = sourceBook();
  const src = sources.add({
    key: `sanctions:${subject}`,
    title: `Sanctions list entries naming ${subject}`,
    publisher:
      'US Treasury (OFAC), European Union, United Kingdom and United Nations consolidated lists',
    date: data.syncedAt || now.toISOString().slice(0, 10),
    detail: `Lists as last synced${data.syncedAt ? ` on ${day(data.syncedAt)}` : ''}. An entry is matched by name${data.byCountry ? ' or by the country recorded on it' : ''}.`,
    kind: 'dataset',
  });
  const entries = data.entries || [];
  const built = {};
  let headline;
  const parts = [];
  if (!entries.length) {
    headline = `No current sanctions list entry names ${subject}`;
    parts.push(
      `Sonar searched the OFAC SDN list and the EU, UK and UN consolidated lists by name${data.byCountry ? ' and country' : ''} and found no active entry. A company can still be restricted in other ways (export controls, sectoral rules, ownership by a listed party) that these lists do not show.`,
    );
  } else {
    const lists = [...new Set(entries.map((e) => e.list))];
    headline = `${entries.length}${data.capped ? ' or more' : ''} active sanctions list ${entries.length === 1 ? 'entry names' : 'entries name'} ${subject}`;
    parts.push(`They are on ${lists.map((l) => LIST_LABEL[l] || l).join(', ')}.`);
    const progs = new Map();
    for (const e of entries)
      for (const p of e.programs || []) progs.set(p, (progs.get(p) || 0) + 1);
    const top = [...progs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (top.length) {
      parts.push(`The programme named most often is ${top[0][0]} (${top[0][1]}).`);
      built.policy_tracker = {
        title: 'By programme',
        note: 'A programme is the legal authority an entry was listed under. One entry can sit under several.',
        cites: [src],
        columns: [
          { key: 'program', label: 'Programme' },
          { key: 'n', label: 'Entries', num: true },
        ],
        rows: top.map(([p, n]) => ({ id: p, cells: { program: p, n: String(n) } })),
      };
    }
    built.ranking = {
      title: 'Entries',
      note: 'Most recently listed first, where a listing date is recorded.',
      cites: [src],
      columns: [
        { key: 'name', label: 'Listed name' },
        { key: 'type', label: 'Type' },
        { key: 'list', label: 'List' },
        { key: 'programs', label: 'Programme' },
        { key: 'listed', label: 'Listed' },
      ],
      rows: entries.slice(0, 25).map((e, i) => ({
        id: `${i}-${e.name}`,
        cells: {
          name: e.name,
          type: e.type || NA,
          list: LIST_LABEL[e.list] || e.list,
          programs: (e.programs || []).slice(0, 3).join(', ') || NA,
          listed: e.listedOn ? day(e.listedOn) : 'Not recorded',
        },
      })),
    };
  }
  built.lead = { headline, text: parts.join(' '), cites: [src], computed: true };
  built.followups = {
    placeholder: `Ask a follow-up about ${subject}…`,
    related: freshQuestions(plan, related),
  };
  built.limitations = {
    items: [
      'A name match is not an identification. Entries are matched on the listed name and aliases, so a different party with a similar name can appear, and a listed party under another spelling can be missed.',
      'These lists are designations. The US Commerce Department’s Entity List and other export controls are separate and are not searched here.',
      'This is information, not a compliance screening result.',
    ],
  };
  return {
    built,
    sources: sources.list,
    thread: { subject, ticker: company?.symbol || null, headline, summary: parts[0] || '' },
  };
}

/* ── C07: a crypto asset ────────────────────────────────────────────────── */

const CRYPTO_NAME = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  XRP: 'XRP',
  DOGE: 'Dogecoin',
  ADA: 'Cardano',
};

export async function runCrypto(plan, deps, now, telemetry) {
  const asset = plan.entities.find((e) => e.type === 'crypto');
  if (!asset || !deps.getOhlcv) return null;
  const sym = asset.label;
  const name = CRYPTO_NAME[sym] || sym;
  const pairSym = `${sym}USD`;
  const [data, btc] = await Promise.all([
    step(telemetry, 'daily_bars', 8000, () => deps.getOhlcv(pairSym, isoDaysAgo(now, 400))),
    sym === 'BTC'
      ? null
      : step(telemetry, 'benchmark_bars', 8000, () =>
          deps.getOhlcv('BTCUSD', isoDaysAgo(now, 400)),
        ),
  ]);
  const bars = (data?.bars || []).filter((b) => b?.date && num(b.close) != null && b.close > 0);
  const related = [
    'Which asset classes are outperforming?',
    sym === 'BTC' ? 'How is Ethereum doing?' : 'How is Bitcoin doing?',
  ];
  const range = rangeStats(bars.slice(-366).map((b) => ({ date: b.date, value: b.close })));
  if (!range) return dark(plan, `Daily prices for ${name} are`, related, { subject: name });
  const risk = riskStats(bars, btc?.bars || [], { sessions: 365 });
  const sources = sourceBook();
  const src = sources.add({
    key: `crypto:${sym}`,
    title: `${name} (${pairSym}) daily closes`,
    publisher: 'Market data',
    date: range.asOf,
    detail: `${range.observations} daily closes in US dollars. Crypto trades every day, so a "close" is the provider’s daily cut-off.`,
    kind: 'dataset',
  });
  const price = (v) =>
    v >= 100 ? money(v, 0) : `$${v.toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
  const dir = range.change1mPct == null ? null : range.change1mPct >= 0 ? 'up' : 'down';
  const headline = `${name} is at ${price(range.last)}${dir ? `, ${dir} ${Math.abs(range.change1mPct).toFixed(1)}% in a month` : ''}`;
  const parts = [
    range.rangePositionPct != null
      ? `That is ${range.rangePositionPct}% of the way from its one-year low of ${price(range.low.value)} (${day(range.low.date)}) to its high of ${price(range.high.value)} (${day(range.high.date)}).`
      : null,
    risk
      ? `Its daily moves annualise to ${risk.volPct.toFixed(0)}% volatility, and its largest fall from a peak in the window was ${Math.abs(risk.maxDrawdown.pct).toFixed(1)}%.`
      : null,
  ].filter(Boolean);
  const shown = bars.slice(-366);
  const nth = Math.max(1, Math.ceil(shown.length / 60));
  const pts = shown.filter((_, i) => i % nth === 0 || i === shown.length - 1);
  const rows = [
    {
      label: 'Latest',
      value: price(range.last),
      note: day(range.asOf),
      method: 'Last daily close in the series.',
    },
    range.change1mPct != null && {
      label: 'One month',
      value: pct(range.change1mPct),
      note: '',
      method: 'Against the close 30 days earlier.',
    },
    range.change3mPct != null && {
      label: 'Three months',
      value: pct(range.change3mPct),
      note: '',
      method: 'Against the close 91 days earlier.',
    },
    range.change1yPct != null && {
      label: 'One year',
      value: pct(range.change1yPct),
      note: '',
      method: 'Against the close 365 days earlier.',
    },
    risk && {
      label: 'Volatility',
      value: `${risk.volPct.toFixed(0)}%`,
      note: 'Annualised',
      method: 'Standard deviation of daily returns, scaled by the square root of 252.',
    },
    risk && {
      label: 'Largest drawdown',
      value: `${risk.maxDrawdown.pct.toFixed(1)}%`,
      note: `${day(risk.maxDrawdown.from)} to ${day(risk.maxDrawdown.to)}`,
      method: 'Largest fall from a prior peak in the window.',
    },
    risk?.correlation != null && {
      label: 'Correlation with Bitcoin',
      value: risk.correlation.toFixed(2),
      note: `${risk.sessions} days`,
      method: 'Correlation of daily returns on shared dates.',
    },
  ].filter(Boolean);
  const built = {
    lead: { headline, text: parts.join(' '), cites: [src], computed: true },
    series_chart: {
      title: `${name}: one year of daily closes`,
      note: `${day(pts[0].date)} to ${day(pts.at(-1).date)}, in US dollars.`,
      kind: 'line',
      format: 'money',
      categories: pts.map((p) => day(p.date).replace(/ \d+, (\d{4})$/, ' $1')),
      series: [{ name, values: pts.map((p) => p.close) }],
      cites: [src],
    },
    metric_table: { title: 'The price, measured', asOf: range.asOf, rows, cites: [src] },
    followups: {
      placeholder: `Ask a follow-up about ${name}…`,
      related: freshQuestions(plan, related),
    },
    limitations: {
      items: [
        'Sonar holds prices for crypto assets. It holds no on-chain series (addresses, fees, exchange balances) and no fund-flow data, so none is shown.',
        'Sonar reports the measured price. It does not forecast where the price goes.',
      ],
    },
  };
  return {
    built,
    sources: sources.list,
    thread: { subject: name, headline, summary: parts[0] || '' },
  };
}
