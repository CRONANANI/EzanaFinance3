/**
 * Sonar adaptive research: executors built on disclosure records (Nov 2026).
 *
 *   B06 institutional ownership   reported 13F positions in a company: holders, share counts,
 *                                 concentration, and changes among managers that filed in
 *                                 both quarters. Fund (ETF) portfolio holdings are a separate
 *                                 table from a separate filing, and are never called flows.
 *   B07 disclosed transactions    a named member of Congress, one company, or a whole chamber;
 *                                 company insiders (Forms 3, 4, 5) in their own table.
 *   C02 country rankings          one measure, ranked from the macro series store or the
 *                                 World Bank snapshot, with the period mix stated.
 *
 * Rules that hold throughout: a change is measured in shares, never inferred from value; a
 * disclosure is reported with its transaction date, report date and range as filed; nothing
 * here says why someone traded, or that a trade was improper.
 */
import {
  tradeSummary,
  insiderSummary,
  insiderKind,
  tradesByMonth,
  topTickers,
  rankingOf,
} from './company-metrics';
import {
  day,
  pct,
  step,
  sourceBook,
  num,
  NA,
  money,
  count,
  quarterOf,
  freshQuestions,
} from './kit';

const companyOf = (plan) => {
  const c = plan.entities.find((e) => e.type === 'company');
  return c?.ticker ? { symbol: c.ticker, name: c.label || c.ticker } : null;
};
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const notAvailable = (plan, what, related = [], verb = null) => ({
  built: {
    lead: {
      headline: `${what} ${verb || (/s$/.test(what) ? 'are' : 'is')} not available right now`,
      text: 'Sonar builds this answer from stored disclosure records. They could not be read, so nothing is shown and nothing is estimated in their place. Try again shortly.',
    },
    followups: { placeholder: 'Ask a follow-up…', related: freshQuestions(plan, related) },
  },
  sources: [],
  thread: {},
});
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(2, 4)}`;

/* ── B06: institutional ownership ───────────────────────────────────────── */

const STATUS = {
  new: 'New position',
  exited: 'Exited',
  added: 'Added',
  reduced: 'Reduced',
  unchanged: 'Unchanged',
};

export async function runInstitutional(plan, deps, now, telemetry) {
  const who = companyOf(plan);
  const { symbol, name } = who;
  const related = [
    `Which members of Congress traded ${symbol}?`,
    `Is ${symbol} expensive compared with its peers?`,
    `Why is ${symbol} stock moving this week?`,
  ];
  const [pos, etfs] = await Promise.all([
    deps.positioning13f
      ? step(telemetry, 'holdings_13f', 9000, () => deps.positioning13f(symbol))
      : null,
    deps.etfHolders ? step(telemetry, 'fund_holdings', 6000, () => deps.etfHolders(symbol)) : null,
  ]);
  if (!pos?.top?.length) {
    const out = notAvailable(plan, `13F holdings for ${symbol}`, related, 'are');
    out.thread = { subject: name, ticker: symbol };
    return out;
  }
  const q = quarterOf(pos.period);
  const prevQ = quarterOf(pos.previousPeriod);
  const sources = sourceBook();
  const src = sources.add({
    key: `13f:${symbol}`,
    title: `Form 13F positions in ${symbol}, ${q}`,
    publisher: 'SEC Form 13F filings',
    date: pos.period,
    detail: `${pos.filersInPeriod?.toLocaleString('en-US') || 'An unknown number of'} managers' filings for the quarter are indexed${pos.latestFiledAt ? `, the latest filed ${day(pos.latestFiledAt)}` : ''}. One filing per manager is counted: the latest full filing, plus any amendment that adds holdings.`,
    kind: 'dataset',
  });
  const top = pos.top[0];
  const headline = `${top.filer} is the largest reported 13F holder of ${name} for ${q}`;
  const parts = [
    `It reported ${count(top.shares)} shares worth ${money(top.valueUsd)} at the quarter end.`,
    `${plural(pos.holders, 'indexed manager')} reported a position, ${count(pos.shares)} shares in all${
      pos.top10Share != null
        ? `; the ten largest hold ${(pos.top10Share * 100).toFixed(1)}% of that reported value`
        : ''
    }.`,
  ];
  const c = pos.counts;
  const compared = pos.comparedFilers || 0;
  const thin = pos.filersInPeriod ? compared / pos.filersInPeriod < 0.25 : true;
  if (prevQ && compared > 0) {
    parts.push(
      `Among the ${plural(compared, 'manager')} with filings indexed for both ${prevQ} and ${q}, ${c.added} added shares, ${c.reduced} reduced, ${c.opened} opened a position and ${c.exited} exited.${
        thin
          ? ` That is a small part of the ${pos.filersInPeriod.toLocaleString('en-US')} managers in ${q}, so it is not a picture of institutions as a whole.`
          : ''
      }`,
    );
  } else {
    parts.push(`No earlier quarter is indexed widely enough to compare, so no change is shown.`);
  }
  const built = {
    lead: { headline, text: parts.join(' '), cites: [src], computed: true },
    ranking: {
      title: 'Largest reported holders',
      note: `Long share positions at ${day(pos.period)}. Options are excluded.`,
      cites: [src],
      columns: [
        { key: 'rank', label: '#', num: true },
        { key: 'filer', label: 'Manager' },
        { key: 'shares', label: 'Shares reported', num: true },
        { key: 'value', label: 'Reported value', num: true },
        { key: 'share', label: 'Share of reported value', num: true },
      ],
      rows: pos.top.map((r, i) => ({
        id: `${i}-${r.filer}`,
        cells: {
          rank: String(i + 1),
          filer: r.filer,
          shares: count(r.shares),
          value: money(r.valueUsd),
          share: r.shareOfReported == null ? NA : `${(r.shareOfReported * 100).toFixed(1)}%`,
        },
      })),
    },
  };
  /* Chart: reported shares across quarters when at least two are indexed widely; otherwise the
     holders' share counts for the one quarter there is. */
  const trend = (pos.trend || []).filter((p) => num(p.shares) != null);
  if (trend.length >= 2)
    built.series_chart = {
      title: 'Reported shares by quarter',
      note: 'Total long shares reported by indexed managers. The number of managers indexed differs by quarter, so a change here is not all buying or selling.',
      kind: 'bar',
      format: 'count',
      categories: trend.map((p) => quarterOf(p.period)),
      series: [{ name: 'Shares reported', values: trend.map((p) => p.shares) }],
      cites: [src],
    };
  else
    built.series_chart = {
      title: `Shares reported by the largest holders, ${q}`,
      note: 'One quarter is indexed widely enough to chart, so positions are compared across holders and not across time.',
      kind: 'bar',
      format: 'count',
      categories: pos.top.slice(0, 8).map((r) => r.filer),
      series: [{ name: 'Shares reported', values: pos.top.slice(0, 8).map((r) => r.shares) }],
      cites: [src],
    };
  const moves = [...(pos.adds || []), ...(pos.cuts || [])].filter((m) => num(m.changeShares));
  if (prevQ && moves.length)
    built.data_table = {
      title: `Largest changes in shares, ${prevQ} to ${q}`,
      note: `Among the ${plural(compared, 'manager')} with both quarters indexed. Measured in shares reported, not in value.`,
      cites: [src],
      columns: [
        { key: 'filer', label: 'Manager' },
        { key: 'change', label: 'Change in shares', num: true },
        { key: 'shares', label: `Shares, ${q}`, num: true },
        { key: 'status', label: 'Position' },
      ],
      rows: moves.map((m, i) => ({
        id: `${i}-${m.filer}`,
        cells: {
          filer: m.filer,
          change: `${m.changeShares > 0 ? '+' : ''}${count(m.changeShares)}`,
          shares: count(m.shares),
          status: STATUS[m.status] || 'Not stated',
        },
      })),
    };
  if (etfs?.length) {
    const esrc = sources.add({
      key: `nport:${symbol}`,
      title: `Fund portfolio holdings of ${symbol}`,
      publisher: 'SEC Form N-PORT filings',
      date: etfs[0].reportDate,
      detail:
        'Holdings each fund reported in its portfolio. These are positions, not creations, redemptions or flows.',
      kind: 'dataset',
    });
    built.sector_exposure = {
      title: 'Exchange-traded funds holding it',
      note: 'From each fund’s own portfolio report. A fund manager’s 13F position can include these same shares, so the two tables are not added together.',
      cites: [esrc],
      columns: [
        { key: 'etf', label: 'Fund' },
        { key: 'shares', label: 'Shares held', num: true },
        { key: 'value', label: 'Value', num: true },
        { key: 'pct', label: 'Share of the fund', num: true },
        { key: 'date', label: 'Reported as of' },
      ],
      rows: etfs.map((e) => ({
        id: e.etf,
        cells: {
          etf: e.fund ? `${e.etf} (${e.fund})` : e.etf,
          shares: count(e.shares),
          value: money(e.valueUsd),
          pct: e.pctOfFund == null ? NA : `${e.pctOfFund.toFixed(2)}%`,
          date: day(e.reportDate),
        },
      })),
    };
  }
  built.followups = {
    placeholder: `Ask a follow-up about who holds ${symbol}…`,
    related: freshQuestions(plan, related),
  };
  built.limitations = {
    items: [
      `These are positions at ${day(pos.period)}, filed up to 45 days after the quarter end${pos.latestFiledAt ? ` (the latest indexed filing is dated ${day(pos.latestFiledAt)})` : ''}. They do not show what a manager holds today.`,
      'Form 13F covers long positions in US-listed securities held by managers above the reporting threshold. Short positions, most derivatives and holdings outside the United States are not in it.',
      'A position is matched to the company by the security identifier the manager filed. Rows whose implied price is far from the quarter’s median for the security are left out as likely filing errors.',
      'Sonar’s index does not hold every manager’s filing for every quarter, so totals are for indexed managers and are not total institutional ownership.',
    ],
  };
  return {
    built,
    sources: sources.list,
    thread: { subject: name, ticker: symbol, headline, summary: parts[0] },
  };
}

/* ── B07: congressional and insider transactions ────────────────────────── */

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
const CONGRESS_LIMITS = [
  'A disclosed trade shows that a transaction was reported. It does not show what the member knew or why they traded, and no conclusion about either is drawn here.',
  'Amounts are disclosed in ranges, so no exact value or total is given. Trades by spouses and dependants are reported on the member’s form and are included.',
];
const lagSentence = (s) =>
  s.medianLagDays == null
    ? null
    : `The median report came ${Math.round(s.medianLagDays)} days after the transaction${
        s.lateCount ? `; ${s.lateCount} came more than 45 days after` : ''
      }.`;
const tradeColumns = (withMember, withAsset) =>
  [
    { key: 'date', label: 'Transaction' },
    withMember && { key: 'member', label: 'Member' },
    withAsset && { key: 'asset', label: 'Security' },
    { key: 'type', label: 'Type' },
    { key: 'amount', label: 'Disclosed range', num: true },
    { key: 'reported', label: 'Reported' },
  ].filter(Boolean);
const tradeCells = (t) => ({
  date: day(t.transactionDate),
  member: [t.member, t.chamber === 'senate' ? 'Senate' : t.chamber === 'house' ? 'House' : null]
    .filter(Boolean)
    .join(', '),
  asset: t.ticker || t.asset || 'Not stated',
  type: TRADE_LABEL[t.type] || 'Transaction',
  amount: range(t.amountMin, t.amountMax),
  reported: t.disclosureDate ? day(t.disclosureDate) : 'Not stated',
});
const monthChart = (trades, now, months, src, title) => {
  const by = tradesByMonth(trades, { months, now });
  if (by.reduce((s, m) => s + m.purchases + m.sales, 0) < 3) return null;
  return {
    title,
    note: 'Counts of disclosed transactions by the month of the transaction. Recent months can rise as late reports arrive.',
    kind: 'bar',
    format: 'number',
    categories: by.map((m) => monthLabel(m.month)),
    series: [
      { name: 'Purchases', values: by.map((m) => m.purchases) },
      { name: 'Sales', values: by.map((m) => m.sales) },
    ],
    cites: [src],
  };
};
const congressSource = (sources, key, title, date) =>
  sources.add({
    key,
    title,
    publisher: 'House Clerk and Senate financial disclosures',
    date,
    detail: 'Periodic transaction reports as filed by members. Amounts are reported in ranges.',
    kind: 'dataset',
  });

async function memberReport(plan, deps, now, telemetry, person) {
  const since = new Date(now.getTime() - 730 * 86400000).toISOString().slice(0, 10);
  const data = await step(telemetry, 'congress_disclosures', 9000, () =>
    deps.memberTrades(person, { since }),
  );
  const related = [
    'How active has Congress been in the market this year?',
    'What are the largest economies in the world?',
  ];
  if (!data) return notAvailable(plan, 'Congressional trade disclosures', related);
  if (!data.member)
    return {
      built: {
        lead: {
          headline: `Sonar could not match “${person}” to one member of Congress`,
          text: 'The name did not match a single current or former member in the index, so no trades are shown. Try the member’s full name.',
        },
        followups: {
          placeholder: 'Ask about a member by full name…',
          related: freshQuestions(plan, related),
        },
      },
      sources: [],
      thread: {},
    };
  const m = data.member;
  const trades = data.trades;
  const s = tradeSummary(trades);
  const sources = sourceBook();
  const src = congressSource(
    sources,
    `congress:member:${m.id}`,
    `Periodic transaction reports filed by ${m.name}`,
    trades[0]?.disclosureDate || null,
  );
  const who =
    [m.name, [m.party, m.state].filter(Boolean).join('-')].filter(Boolean).join(' (') +
    (m.party || m.state ? ')' : '');
  const built = {};
  let headline;
  const parts = [];
  if (!s.total) {
    headline = `${m.name} has disclosed no trades since ${day(since)}`;
    parts.push(
      'Sonar’s index of House and Senate transaction reports holds none for this member in the past two years. A recent trade may not have been reported yet.',
    );
  } else {
    headline = `${m.name} disclosed ${plural(s.total, 'trade')} over the past two years: ${plural(s.purchases, 'purchase')} and ${plural(s.sales, 'sale')}`;
    const tops = topTickers(trades, 5);
    if (tops.length)
      parts.push(
        `The securities named most often were ${tops.map((t) => `${t.ticker} (${t.trades})`).join(', ')}.`,
      );
    const lag = lagSentence(s);
    if (lag) parts.push(lag);
    parts.push('Amounts are disclosed in ranges, so no exact value or total is given.');
    built.ranking = {
      title: 'Disclosed transactions',
      note: `Most recent first, ${day(s.from)} to ${day(s.to)}.`,
      cites: [src],
      columns: tradeColumns(false, true),
      rows: trades.slice(0, 30).map((t, i) => ({
        id: `${i}-${t.transactionDate}-${t.ticker || t.asset}`,
        cells: tradeCells(t),
      })),
    };
    const chart = monthChart(trades, now, 24, src, 'Disclosed transactions by month');
    if (chart) built.series_chart = chart;
    if (tops.length)
      built.data_table = {
        title: 'Securities named most often',
        note: 'Counts of disclosed transactions. A count says nothing about the size of a position.',
        cites: [src],
        columns: [
          { key: 'ticker', label: 'Security' },
          { key: 'trades', label: 'Transactions', num: true },
          { key: 'buys', label: 'Purchases', num: true },
          { key: 'sells', label: 'Sales', num: true },
        ],
        rows: topTickers(trades, 10).map((t) => ({
          id: t.ticker,
          cells: {
            ticker: t.ticker,
            trades: String(t.trades),
            buys: String(t.purchases),
            sells: String(t.sales),
          },
        })),
      };
  }
  if (data.committees?.length)
    built.policy_tracker = {
      title: 'Committee seats',
      note: 'Current assignments from the congressional committee rosters. Listed as context: a seat on a committee is not evidence about any trade.',
      cites: [
        sources.add({
          key: `committees:${m.id}`,
          title: `Committee assignments of ${m.name}`,
          publisher: 'Congressional committee rosters',
          kind: 'dataset',
        }),
      ],
      columns: [{ key: 'committee', label: 'Committee' }],
      rows: data.committees.slice(0, 12).map((c) => ({ id: c, cells: { committee: c } })),
    };
  built.lead = {
    headline,
    text: [who !== m.name ? `${who}.` : null, ...parts].filter(Boolean).join(' '),
    cites: [src],
    computed: true,
  };
  const firstTicker = topTickers(trades, 1)[0]?.ticker;
  built.followups = {
    placeholder: `Ask a follow-up about ${m.name}’s disclosures…`,
    related: freshQuestions(plan, [
      firstTicker ? `Which members of Congress traded ${firstTicker}?` : null,
      'How active has Congress been in the market this year?',
      firstTicker ? `Which institutions hold ${firstTicker}?` : null,
    ]),
  };
  built.limitations = { items: CONGRESS_LIMITS };
  return {
    built,
    sources: sources.list,
    thread: { person: m.name, headline, summary: parts[0] || '' },
  };
}

async function chamberReport(plan, deps, now, telemetry) {
  const since = new Date(now.getTime() - 365 * 86400000).toISOString().slice(0, 10);
  const data = await step(telemetry, 'congress_disclosures', 9000, () =>
    deps.chamberTrades({ since }),
  );
  const related = [
    'Which members of Congress traded NVDA?',
    'What are the largest economies in the world?',
  ];
  if (!data) return notAvailable(plan, 'Congressional trade disclosures', related);
  const trades = data.trades;
  if (!trades.length)
    return notAvailable(plan, 'Congressional trade disclosures for the past year', related, 'are');
  const sources = sourceBook();
  const src = congressSource(
    sources,
    'congress:all',
    'Congressional periodic transaction reports, past twelve months',
    trades[0]?.disclosureDate || null,
  );
  const all = tradeSummary(trades);
  const house = tradeSummary(trades.filter((t) => t.chamber === 'house'));
  const senate = tradeSummary(trades.filter((t) => t.chamber === 'senate'));
  const headline = `Members of Congress disclosed ${all.total.toLocaleString('en-US')}${data.capped ? ' or more' : ''} trades over the past twelve months`;
  const parts = [
    `${all.purchases.toLocaleString('en-US')} were purchases and ${all.sales.toLocaleString('en-US')} were sales, reported by ${plural(all.members, 'member')}.`,
    `The House accounts for ${house.total.toLocaleString('en-US')} and the Senate for ${senate.total.toLocaleString('en-US')}.`,
    lagSentence(all),
  ].filter(Boolean);
  const tops = topTickers(trades, 10);
  const built = {
    lead: { headline, text: parts.join(' '), cites: [src], computed: true },
    ranking: {
      title: 'By chamber',
      note: `Transactions dated ${day(all.from)} to ${day(all.to)}.`,
      cites: [src],
      columns: [
        { key: 'chamber', label: 'Chamber' },
        { key: 'members', label: 'Members reporting', num: true },
        { key: 'trades', label: 'Transactions', num: true },
        { key: 'buys', label: 'Purchases', num: true },
        { key: 'sells', label: 'Sales', num: true },
        { key: 'lag', label: 'Median days to report', num: true },
      ],
      rows: [
        ['House', house],
        ['Senate', senate],
      ].map(([label, s]) => ({
        id: label,
        cells: {
          chamber: label,
          members: String(s.members),
          trades: s.total.toLocaleString('en-US'),
          buys: s.purchases.toLocaleString('en-US'),
          sells: s.sales.toLocaleString('en-US'),
          lag: s.medianLagDays == null ? NA : String(Math.round(s.medianLagDays)),
        },
      })),
    },
    followups: {
      placeholder: 'Ask about a member or a company…',
      related: freshQuestions(plan, [
        tops[0] ? `Which members of Congress traded ${tops[0].ticker}?` : null,
        ...related,
      ]),
    },
    limitations: {
      items: [
        ...CONGRESS_LIMITS,
        data.capped
          ? 'The window holds more transactions than Sonar reads in one answer, so the counts are a floor.'
          : null,
        'The Senate files fewer reports in a form that can be read by machine, so its counts are less complete than the House’s.',
      ].filter(Boolean),
    },
  };
  const chart = monthChart(trades, now, 12, src, 'Disclosed transactions by month');
  if (chart) built.series_chart = chart;
  if (tops.length)
    built.data_table = {
      title: 'Securities named most often',
      note: 'Counts of disclosed transactions and of the members who reported them.',
      cites: [src],
      columns: [
        { key: 'ticker', label: 'Security' },
        { key: 'members', label: 'Members', num: true },
        { key: 'trades', label: 'Transactions', num: true },
        { key: 'buys', label: 'Purchases', num: true },
        { key: 'sells', label: 'Sales', num: true },
      ],
      rows: tops.map((t) => ({
        id: t.ticker,
        cells: {
          ticker: t.ticker,
          members: String(t.members),
          trades: String(t.trades),
          buys: String(t.purchases),
          sells: String(t.sales),
        },
      })),
    };
  return { built, sources: sources.list, thread: { headline, summary: parts[0] } };
}

const INSIDER_QUESTION = /\binsiders?\b|\bform 4\b|\bexecutives?\b.{0,30}\b(buy|sell|sold|bought)/i;
const CONGRESS_QUESTION = /\b(congress|senat|representative|politician|member)/i;

async function companyReport(plan, deps, now, telemetry, who) {
  const { symbol, name } = who;
  const since = new Date(now.getTime() - 365 * 86400000).toISOString().slice(0, 10);
  const insiderLed =
    INSIDER_QUESTION.test(plan.resolvedQuestion) && !CONGRESS_QUESTION.test(plan.resolvedQuestion);
  const [trades, insiders] = await Promise.all([
    deps.congressTrades
      ? step(telemetry, 'congress_disclosures', 8000, () => deps.congressTrades(symbol, { since }))
      : null,
    deps.insiderTrades
      ? step(telemetry, 'insider_filings', 8000, () => deps.insiderTrades(symbol))
      : null,
  ]);
  const related = [
    `Which institutions hold ${symbol}?`,
    `Why is ${symbol} stock moving this week?`,
    `Is ${symbol} technically oversold?`,
  ];
  if (!trades && !insiders) {
    const out = notAvailable(plan, `Trade disclosures for ${symbol}`, related, 'are');
    out.thread = { subject: name, ticker: symbol };
    return out;
  }
  const sources = sourceBook();
  const built = {};
  const limits = [];
  let congressLead = null;
  if (trades) {
    const src = congressSource(
      sources,
      `congress:${symbol}`,
      `Congressional periodic transaction reports naming ${symbol}`,
      trades[0]?.disclosureDate || null,
    );
    const s = tradeSummary(trades);
    if (!s.total)
      congressLead = {
        headline: `No member of Congress has disclosed a trade in ${name} since ${day(since)}`,
        parts: [
          `Sonar's index of House and Senate transaction reports holds no trade naming ${symbol} in the past twelve months. A trade made recently may not have been reported yet.`,
        ],
        src,
      };
    else {
      congressLead = {
        headline: `${plural(s.members, 'member')} of Congress disclosed ${plural(s.total, 'trade')} in ${name} over the past twelve months`,
        parts: [
          `${s.purchases} ${s.purchases === 1 ? 'was a purchase' : 'were purchases'} and ${s.sales} ${s.sales === 1 ? 'was a sale' : 'were sales'}${s.exchanges ? `, with ${plural(s.exchanges, 'exchange')}` : ''}.`,
          lagSentence(s),
          'Amounts are disclosed in ranges, so no exact value or total is given.',
        ].filter(Boolean),
        src,
      };
      built.ranking = {
        title: 'Congressional transactions',
        note: `Most recent first, ${day(s.from)} to ${day(s.to)}.`,
        cites: [src],
        columns: tradeColumns(true, false),
        rows: trades
          .slice(0, 25)
          .map((t, i) => ({ id: `${i}-${t.member}-${t.transactionDate}`, cells: tradeCells(t) })),
      };
      const chart = monthChart(
        trades,
        now,
        12,
        src,
        `Congressional transactions in ${symbol} by month`,
      );
      if (chart) built.series_chart = chart;
    }
    limits.push(...CONGRESS_LIMITS);
  }
  let insiderLead = null;
  if (insiders?.length) {
    const isrc = sources.add({
      key: `insiders:${symbol}`,
      title: `Insider filings for ${symbol} (Forms 3, 4 and 5)`,
      publisher: 'SEC ownership filings',
      date: insiders[0].filedAt,
      detail:
        'Transactions reported by the company’s officers, directors and 10% owners. Indexed from September 30, 2026.',
      kind: 'dataset',
    });
    const s = insiderSummary(insiders);
    insiderLead = {
      headline: `Insiders at ${name} reported ${plural(s.sales, 'open-market sale')} and ${plural(s.purchases, 'open-market purchase')} since ${day(s.from)}`,
      parts: [
        s.sales ? `The sales were worth ${money(s.saleValue)} at the reported prices.` : null,
        s.purchases ? `The purchases were worth ${money(s.purchaseValue)}.` : null,
        s.other
          ? `${plural(s.other, 'other filing')} recorded awards, option exercises, tax withholding or gifts, which are not market trades.`
          : null,
      ].filter(Boolean),
      src: isrc,
    };
    built.data_table = {
      title: 'Company insider filings',
      note: 'A separate record from the congressional reports above: these are the company’s own officers, directors and large holders.',
      cites: [isrc],
      columns: [
        { key: 'date', label: 'Transaction' },
        { key: 'who', label: 'Reporting person' },
        { key: 'kind', label: 'Type' },
        { key: 'shares', label: 'Shares', num: true },
        { key: 'value', label: 'Value', num: true },
        { key: 'filed', label: 'Filed' },
      ],
      rows: insiders.slice(0, 20).map((r, i) => ({
        id: `${i}-${r.reporter}-${r.date}`,
        cells: {
          date: day(r.date),
          who: [r.reporter, r.title].filter(Boolean).join(', '),
          kind: insiderKind(r.code),
          shares: count(r.shares),
          value: r.code === 'P' || r.code === 'S' ? money(r.valueUsd) : NA,
          filed: `${day(r.filedAt)} (Form ${r.form})`,
        },
      })),
    };
    limits.push(
      'Insider filings are indexed from September 30, 2026, so earlier transactions are not shown. Many sales are made under pre-arranged trading plans, which the filing may or may not state.',
    );
  } else if (insiders && insiderLed) {
    limits.push(
      'No insider filing for this company is in the index, which begins on September 30, 2026.',
    );
  }
  const lead = insiderLed && insiderLead ? insiderLead : congressLead || insiderLead;
  if (!lead) {
    const out = notAvailable(plan, `Trade disclosures for ${symbol}`, related, 'are');
    out.thread = { subject: name, ticker: symbol };
    return out;
  }
  built.lead = {
    headline: lead.headline,
    text: lead.parts.join(' '),
    cites: [lead.src],
    computed: true,
  };
  built.followups = {
    placeholder: `Ask a follow-up about trades in ${symbol}…`,
    related: freshQuestions(plan, related),
  };
  built.limitations = { items: limits };
  return {
    built,
    sources: sources.list,
    thread: {
      subject: name,
      ticker: symbol,
      headline: lead.headline,
      summary: lead.parts[0] || '',
    },
  };
}

export async function runCongressTrades(plan, deps, now, telemetry) {
  const person = plan.entities.find((e) => e.type === 'person')?.label || null;
  const who = companyOf(plan);
  if (person && deps.memberTrades) return memberReport(plan, deps, now, telemetry, person);
  if (who) return companyReport(plan, deps, now, telemetry, who);
  if (deps.chamberTrades) return chamberReport(plan, deps, now, telemetry);
  return null;
}

/* ── C02: country rankings ──────────────────────────────────────────────── */

const fmtValue = (v, unit) => {
  if (num(v) == null) return NA;
  const u = String(unit || '');
  if (/us\$|usd|dollar/i.test(u) && Math.abs(v) >= 1e6) return money(v);
  if (u.startsWith('%')) return `${v.toFixed(1)}%`;
  return v.toLocaleString('en-US', { maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 1 });
};

export async function runCountryRanking(plan, deps, now, telemetry) {
  const want = rankingOf(plan.resolvedQuestion);
  if (!want) return null;
  const follow = {
    placeholder: 'Ask a follow-up about these economies…',
    related: freshQuestions(plan, [
      want.id === 'gdp_nominal_usd'
        ? 'Which countries have the highest inflation?'
        : 'What are the largest economies by GDP?',
      want.id === 'oil_production'
        ? 'Which countries have the largest foreign exchange reserves?'
        : 'Which countries produce the most crude oil?',
      'Which countries have the most government debt?',
    ]),
  };
  const dark = {
    built: {
      lead: {
        headline: 'This country ranking is not available right now',
        text: 'Sonar ranks countries from stored official series. They could not be read, so no ranking is shown and none is recalled from memory. Try again shortly.',
      },
      followups: follow,
    },
    sources: [],
    thread: {},
  };
  const sources = sourceBook();
  let table;
  if (want.kind === 'gdp') {
    const payload = deps.rankings
      ? await step(telemetry, 'macro_rankings', 8000, () => deps.rankings())
      : null;
    const m = payload?.metrics?.[want.id];
    if (!m?.ranked?.length) return dark;
    table = {
      label: m.label,
      unit: m.unit,
      period: String(m.year),
      attribution: payload.attribution || 'World Bank, World Development Indicators',
      coverage:
        `${m.of || m.ranked.length} economies, all measured for ${m.year}. ${payload.scope || ''}`.trim(),
      mixed: false,
      order: 'desc',
      rows: m.ranked.slice(0, 15).map(([iso3, rank, value]) => ({
        rank,
        name: payload.names?.[iso3] || iso3,
        value,
        period: String(m.year),
      })),
      fmt: (v) => (want.id === 'gdp_growth_real' ? pct(v) : money(v)),
    };
  } else {
    const items = deps.macroRank
      ? await step(telemetry, 'macro_series', 9000, () =>
          deps.macroRank(want.id, { limit: 15, order: want.order, now }),
        )
      : null;
    if (items === null) return dark;
    const meta = items?.[0]?.meta;
    const r = meta?.ranking;
    /* Nothing comparable is stored for this measure: leave the ping to the existing pipeline. */
    if (!r?.rows?.length) return null;
    const pm = r.periodMix || {};
    table = {
      label: String(meta.name || '').replace(/^(Highest|Lowest)\s+/i, ''),
      unit: r.unit || meta.unit || '',
      period: String(pm.leader || meta.period),
      attribution: meta.attribution,
      coverage: `Each country’s latest observation: ${r.mix}.`,
      mixed: Boolean(pm.older),
      order: r.order,
      rows: r.rows.map((x) => ({
        rank: x.rank,
        name: x.name,
        value: x.value,
        period: String(x.period),
      })),
      fmt: (v) => fmtValue(v, r.unit || meta.unit),
    };
  }
  const src = sources.add({
    key: `rank:${want.id}`,
    title: `${table.label.charAt(0).toUpperCase()}${table.label.slice(1)}, ${table.period}`,
    publisher: table.attribution,
    date: table.period,
    detail: `${table.unit ? `Unit: ${table.unit}. ` : ''}${table.coverage}`,
    kind: 'dataset',
  });
  const [a, b, c] = table.rows;
  const edge = table.order === 'asc' ? 'lowest' : 'highest';
  const headline = `${a.name} has the ${edge} ${table.label
    .toLowerCase()
    .replace(/^gdp/, 'GDP')
    .replace(/\bgdp\b/g, 'GDP')} in the data for ${table.period}`;
  const parts = [
    `${a.name} is at ${table.fmt(a.value)}${b ? `, followed by ${b.name} at ${table.fmt(b.value)}` : ''}${c ? ` and ${c.name} at ${table.fmt(c.value)}` : ''}${table.unit && !/us\$|^%/i.test(table.unit) ? ` (${table.unit})` : ''}.`,
    table.coverage,
    table.mixed
      ? 'Not every country has reported the same period, so the period is shown beside each one.'
      : null,
  ].filter(Boolean);
  const built = {
    lead: { headline, text: parts.join(' '), cites: [src], computed: true },
    series_chart: {
      title: `${table.label.charAt(0).toUpperCase()}${table.label.slice(1)}: the first ten`,
      note: table.unit || '',
      kind: 'bar',
      format: /us\$|usd/i.test(table.unit)
        ? 'money'
        : String(table.unit).startsWith('%')
          ? 'percent'
          : 'number',
      categories: table.rows.slice(0, 10).map((r) => r.name),
      series: [{ name: table.label, values: table.rows.slice(0, 10).map((r) => r.value) }],
      cites: [src],
    },
    ranking: {
      title: `${table.label.charAt(0).toUpperCase()}${table.label.slice(1)}`,
      note: [table.unit, table.attribution].filter(Boolean).join('. '),
      cites: [src],
      sortable: true,
      columns: [
        { key: 'rank', label: 'Rank', num: true },
        { key: 'name', label: 'Country' },
        { key: 'value', label: 'Value', num: true },
        { key: 'period', label: 'Period' },
      ],
      rows: table.rows.map((r) => ({
        id: `${r.rank}-${r.name}`,
        cells: { rank: String(r.rank), name: r.name, value: table.fmt(r.value), period: r.period },
        sort: { rank: r.rank, name: r.name, value: r.value, period: r.period },
      })),
    },
    followups: follow,
    limitations: {
      items: [
        table.mixed
          ? 'Countries are ranked on their latest observation, and those periods differ. A country more than 18 months behind the most recent is left out.'
          : 'Every country is ranked on the same period. A country that has not reported it is left out, not carried forward.',
        /imf/i.test(table.attribution)
          ? 'Recent years in the IMF World Economic Outlook are estimates until national accounts are final.'
          : 'Figures are as published by the source and are not adjusted by Sonar.',
      ],
    },
  };
  return { built, sources: sources.list, thread: { headline, summary: parts[0] } };
}
