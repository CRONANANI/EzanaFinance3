/**
 * Ezana API catalog: titans dimension. Pure, client-safe (read by the docs
 * page). See registry.js for the route shape.
 *
 *   PARAMS  query params this dimension adds (names must be new)
 *   ROUTES  { groupKey: [route, ...] } appended to an existing group
 *   GROUPS  new groups, each with dimension: 'titans'
 */

export const PARAMS = {
  period: {
    type: 'string',
    pattern: /^[0-9]{4}-(03-31|06-30|09-30|12-31)$/,
    desc: '13F reporting quarter, as its quarter-end date (for example 2026-06-30).',
  },
  span_days: {
    type: 'int',
    min: 0,
    max: 365,
    desc: 'Longest gap allowed between the first and last buy in a cluster, in days (default 30).',
  },
  min_insiders: {
    type: 'int',
    min: 2,
    max: 20,
    desc: 'Fewest distinct officers or directors buying for a cluster to count (default 2).',
  },
};

const LIST = ['limit', 'cursor'];
const FILER = 'object';

export const ROUTES = {
  institutional: [
    {
      id: 'institutional.security_holders',
      kind: 'insight',
      method:
        "Each fund's position in the stock this quarter is compared with its position last quarter, among funds that filed for both quarters: new, doubled, added, trimmed, exited or flat by share count.",
      path: '/v1/institutional/securities/{ticker}/holders',
      scope: 'institutional',
      status: 'live',
      delayed: true,
      list: true,
      params: ['period', 'limit'],
      fields: {
        rank: 'integer',
        filer: FILER,
        shares: 'number',
        value: 'number',
        weight: 'number',
        shares_prior: 'number',
        change: 'string',
      },
      summary:
        'The largest 13F holders of a stock for a quarter (default: the latest quarter whose filing deadline has passed), with shares, value, the weight in each fund and the change from the prior quarter. change is null for a fund with no prior-quarter filing on record. Top results only (limit up to 100); counts of buyers, sellers, new and exited holders are in meta.',
    },
    {
      id: 'institutional.filer_portfolio',
      kind: 'data',
      path: '/v1/institutional/filers/{cik}/portfolio',
      scope: 'institutional',
      status: 'live',
      delayed: true,
      params: ['period', ...LIST],
      fields: {
        ticker: 'string',
        cusip: 'string',
        issuer: 'string',
        put_call: 'string',
        shares: 'number',
        value: 'number',
        weight: 'number',
        shares_prior: 'number',
        value_prior: 'number',
        change: 'string',
      },
      summary:
        "One fund's 13F book for a quarter (default: its latest filing), largest position first, with each position's weight in the book and the change against the prior quarter (null when the fund did not file for it). Positions sold out entirely are not listed. The filer and book totals are in meta.",
    },
    {
      id: 'institutional.fund_twins',
      kind: 'insight',
      method:
        "Among the 500 largest 13F filers of the quarter, overlap is the sum over shared stocks of the smaller of the two funds' weights; the three highest overlaps are returned.",
      path: '/v1/institutional/filers/{cik}/twins',
      scope: 'institutional',
      status: 'live',
      delayed: true,
      list: true,
      params: ['period'],
      fields: {
        filer: FILER,
        book: 'number',
        overlap: 'number',
        shared_positions: 'integer',
        shared_tickers: 'array',
        only_this_fund: 'array',
        only_twin: 'array',
      },
      summary:
        "The three funds whose 13F books look most like this fund's for a quarter (default: the latest complete quarter), with the overlap score from 0 to 1, the largest shared names and the largest names each holds alone.",
    },
    {
      id: 'institutional.filing_progress',
      kind: 'insight',
      method:
        'Filed counts distinct funds with a 13F for the quarter; expected is the number that filed for the prior quarter; pace compares the share filed with the share of last quarter filed by the same day after quarter end.',
      path: '/v1/institutional/filing-progress',
      scope: 'institutional',
      status: 'live',
      delayed: true,
      params: [],
      fields: {
        period: 'date',
        prior_period: 'date',
        deadline: 'date',
        days_left: 'integer',
        day: 'integer',
        closed: 'boolean',
        filed: 'integer',
        expected: 'integer',
        pct_filed: 'number',
        prior_pct_by_same_day: 'number',
        pace: 'string',
        curve: 'object',
        early_filers: 'array',
      },
      summary:
        "How far into the current 13F filing season we are: funds filed against funds expected, the deadline, and last quarter's pace on the same day (ahead, on_pace or behind). curve holds cumulative filers by day after quarter end for this quarter and the prior one.",
    },
    {
      id: 'institutional.confluence',
      kind: 'insight',
      method:
        'Tickers with whale 13F moves (other than trims) filed in the window plus 45 days, joined with open-market insider buys and sells and congressional purchases in the window and activist 13D or 13G stakes filed in the last 180 days; signals counts how many of insiders, activists and Congress line up with the whales.',
      path: '/v1/institutional/confluence',
      scope: 'institutional',
      status: 'live',
      delayed: true,
      list: true,
      params: ['days', 'limit'],
      fields: {
        ticker: 'string',
        whale_filers: 'integer',
        whale_value: 'number',
        latest_quarter: 'string',
        insider_buys: 'integer',
        insider_buy_value: 'number',
        insider_sells: 'integer',
        activist_stakes: 'integer',
        congress_buys: 'integer',
        signals: 'integer',
      },
      summary:
        'Tickers where whales, insiders and activists line up in one window (days, default 90): whale filers and value, insider buys and sells, activist stakes and congressional buys, most signals first. Top results only (limit up to 100). Needs an undelayed key.',
    },
    {
      id: 'insider.clusters',
      kind: 'insight',
      method:
        'Open-market Form 4 purchases (code P) by officers and directors are grouped per issuer and buyer; an issuer counts when at least min_insiders distinct buyers bought within span_days of each other. Funds and other entities, and 10% owners who are neither officers nor directors, are left out.',
      path: '/v1/insider/clusters',
      scope: 'insider',
      status: 'live',
      delayed: true,
      list: true,
      params: ['days', 'span_days', 'min_insiders', 'limit'],
      fields: {
        ticker: 'string',
        issuer: 'string',
        insiders: 'integer',
        officers: 'integer',
        directors: 'integer',
        total_value: 'number',
        first_buy: 'date',
        last_buy: 'date',
        span_days: 'integer',
        buyers: 'array',
      },
      summary:
        'Issuers where two or more officers or directors bought on the open market close together, with each buyer, their role and value, most buyers first. days is the look-back (default 90, up to 730). Top results only.',
    },
    {
      id: 'insider.issuer_summary',
      kind: 'insight',
      method:
        'Open-market buys (code P) and sales (code S) for the issuer are summed over the 90 and 365 days to the latest date the key may see; each transaction counts under every role its filer holds, and once in the total.',
      path: '/v1/insider/issuers/{ticker}/summary',
      scope: 'insider',
      status: 'live',
      delayed: true,
      params: [],
      fields: {
        ticker: 'string',
        issuer: 'object',
        as_of: 'date',
        days_90: 'object',
        days_365: 'object',
        recent: 'array',
      },
      summary:
        'Net open-market insider buying and selling for one stock over 90 and 365 days, in total and by role (officer, director, 10% owner), plus its last 10 Form 4 transactions of any kind.',
    },
  ],
};

export const GROUPS = [
  {
    key: 'exec-comp',
    dimension: 'titans',
    title: 'Executive compensation',
    base: '/v1/executive-compensation',
    icon: 'bi-person-badge',
    framing:
      'Pay against performance: what CEOs were paid, what that pay was actually worth, and how it tracked the return shareholders got.',
    source: 'SEC EDGAR (proxy statement pay-versus-performance tables)',
    routes: [
      {
        id: 'exec_comp.list',
        kind: 'data',
        path: '/v1/executive-compensation',
        scope: 'exec-comp',
        status: 'live',
        params: ['ticker', 'year', 'q', ...LIST],
        fields: {
          cik: 'string',
          ticker: 'string',
          company: 'string',
          fiscal_year: 'integer',
          ceo_total_comp: 'number',
          ceo_comp_actually_paid: 'number',
          ceos: 'array',
          other_neo_avg_total_comp: 'number',
          other_neo_avg_comp_actually_paid: 'number',
          company_tsr: 'number',
          peer_group_tsr: 'number',
          net_income: 'number',
          company_selected_measure: 'object',
          filed_at: 'date',
        },
        summary:
          "Per company and fiscal year: CEO total pay, CEO compensation actually paid, the other named executives' average, company and peer-group TSR (the value of $100 invested), net income and the company's own chosen measure. When a year had more than one CEO the single-CEO figures are null and each CEO is in ceos. Newest fiscal year first; year filters by fiscal year.",
      },
      {
        id: 'exec_comp.pay_vs_performance',
        kind: 'insight',
        method:
          "Compensation actually paid is the SEC pay-versus-performance figure; for each company's most recent run of at least 3 consecutive years with one CEO, CAP growth and the change in TSR are measured from the first year to the last, and the gap is CAP growth minus TSR change in percentage points.",
        path: '/v1/executive-compensation/pay-vs-performance',
        scope: 'exec-comp',
        status: 'live',
        list: true,
        params: ['ticker', 'sort', 'direction', 'limit'],
        paramEnums: { sort: ['gap', 'cap_growth', 'tsr'], direction: ['up', 'down'] },
        fields: {
          cik: 'string',
          ticker: 'string',
          company: 'string',
          from_year: 'integer',
          to_year: 'integer',
          years: 'integer',
          ceo_cap_first: 'number',
          ceo_cap_last: 'number',
          cap_growth_pct: 'number',
          tsr_first: 'number',
          tsr_last: 'number',
          tsr_change_pct: 'number',
          peer_tsr_change_pct: 'number',
          gap: 'number',
        },
        summary:
          'Companies ranked by the gap between CEO pay growth and shareholder return. direction=up (default) lists pay that outgrew return, down lists return that outgrew pay; sort=gap (default) ranks by the size of the gap, cap_growth or tsr by that measure, highest first. Top results only.',
      },
    ],
  },
  {
    key: 'etf',
    dimension: 'titans',
    title: 'ETF holdings',
    base: '/v1/etfs',
    icon: 'bi-pie-chart',
    framing:
      'Passive ownership: what the largest ETFs hold, which funds own a stock, and how much two funds overlap.',
    source: 'SEC EDGAR (Form N-PORT)',
    routes: [
      {
        id: 'etf.funds',
        kind: 'data',
        path: '/v1/etfs',
        scope: 'etf',
        status: 'live',
        list: true,
        params: ['limit'],
        fields: {
          ticker: 'string',
          name: 'string',
          series_id: 'string',
          net_assets: 'number',
          holdings_count: 'integer',
          report_date: 'date',
        },
        summary:
          'The tracked ETFs with net assets, holdings count and the date of their latest monthly portfolio report, largest first.',
      },
      {
        id: 'etf.holdings',
        kind: 'data',
        path: '/v1/etfs/{ticker}/holdings',
        scope: 'etf',
        status: 'live',
        params: LIST,
        fields: {
          name: 'string',
          title: 'string',
          ticker: 'string',
          cusip: 'string',
          isin: 'string',
          balance: 'number',
          units: 'string',
          value: 'number',
          weight_pct: 'number',
          asset_category: 'string',
          issuer_category: 'string',
          country: 'string',
        },
        summary:
          "An ETF's holdings from its latest monthly portfolio report, largest value first, with % of net assets, value, country and asset category. The fund and report date are in meta.",
      },
      {
        id: 'etf.exposure',
        kind: 'insight',
        method:
          "Each tracked ETF's latest portfolio report is searched for the stock by ticker and by the CUSIPs that ticker maps to; weights are % of each fund's net assets.",
        path: '/v1/etfs/exposure/{ticker}',
        scope: 'etf',
        status: 'live',
        list: true,
        params: [],
        fields: {
          etf: 'object',
          weight_pct: 'number',
          value: 'number',
          balance: 'number',
          report_date: 'date',
        },
        summary:
          "Every tracked ETF that holds a stock, with the stock's weight in the fund and the value held, highest weight first. meta.total_value sums the value across those funds.",
      },
      {
        id: 'etf.overlap',
        kind: 'insight',
        method:
          "Holdings are matched by CUSIP (or ISIN, then ticker); overlap is the sum over shared holdings of the smaller of the two funds' weights, from 0 to 100% of net assets.",
        path: '/v1/etfs/overlap',
        scope: 'etf',
        status: 'live',
        params: ['a', 'b'],
        fields: {
          a: 'object',
          b: 'object',
          overlap_pct: 'number',
          shared_holdings: 'integer',
          top_shared: 'array',
        },
        summary:
          'How much two ETFs (a and b, both required, by ticker) overlap: the weight overlap from 0 to 100, the number of shared holdings and the ten largest shared holdings with both weights.',
      },
    ],
  },
];
