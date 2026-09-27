/**
 * EzanaQL Data Catalog — the whitelist that defines every queryable dataset,
 * its fields/types, the underlying source binding, RLS rule, and hard limits.
 *
 * SECURITY: EzanaQL can ONLY reference datasets and fields declared here. The
 * validator rejects anything outside this catalog; the compiler parameterizes
 * everything. Extending the language = adding an entry here, never widening DB
 * access. There is no raw table access and no cross-user reads.
 *
 * `available: false` marks a dataset whose real query path is NOT yet wired in
 * the codebase — it is declared for documentation/roadmap but the executor
 * refuses to run it (honest "not available" rather than a fabricated source).
 *
 * NOTE on field reality: the only fully-wired source in v1 is `gov.contracts`,
 * backed by the Supabase table `usaspending_contract_awards`, whose real columns
 * are: recipient_name, award_amount, awarding_agency, ticker, action_date. Its
 * fiscal_year is DERIVED from action_date (US federal FY starts Oct 1). Fields
 * the USAspending ingest does not currently store (hq_state, hq_city, naics_code,
 * psc_code, award_type) are intentionally OMITTED from the catalog rather than
 * exposed as always-null — see CATALOG_GAPS below.
 *
 * @typedef {'string'|'money'|'int'|'float'|'date'|'bool'} FieldType
 */

export const CATALOG_VERSION = '1.0.0';

/** Fields present in the design/spec but NOT backed by the real ingest yet. */
export const CATALOG_GAPS = {
  'house.trades': {
    unavailableFields: ['amount_midpoint', 'filed_on'],
    note: 'amount_midpoint exists on house_trades but is a bracket midpoint kept for sorting only; exposing it would let an estimate be queried as a filed figure, so the disclosed bracket and its bounds are offered instead. filed_on is not a column of house_trades at all — the filing date lives on house_disclosure_filings; traded_on and notified_on are the dates a trade row actually carries.',
  },
  'gov.contracts': {
    unavailableFields: ['hq_state', 'hq_city', 'naics_code', 'psc_code', 'award_type'],
    note: 'The usaspending_contract_awards ingest stores recipient, agency, amount, ticker, action_date only. HQ location, NAICS/PSC codes and award type are not ingested, so they are omitted from the catalog (querying them returns a clear "unknown field" error) rather than fabricated.',
  },
};

/**
 * @type {Record<string, {
 *   name: string, label: string, source: string,
 *   access: 'public'|'user_private', rlsColumn: string|null,
 *   available: boolean, hardLimit: number, defaultLimit: number,
 *   defaultProjection: string[],
 *   // real Supabase table + column map, present only for wired datasets:
 *   table?: string, columnMap?: Record<string,string>,
 *   fields: Record<string, { type: FieldType, enum?: string[], nullable?: boolean, derived?: boolean }>,
 *   joinableWith: string[],
 * }>}
 */
export const CATALOG = {
  'gov.contracts': {
    name: 'gov.contracts',
    label: 'Federal Contract Awards',
    source: 'usaspending',
    access: 'public',
    rlsColumn: null,
    available: true,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'usaspending_contract_awards',
    // catalog field -> real DB column (null = derived in-engine, not a column)
    columnMap: {
      recipient: 'recipient_name',
      awarding_agency: 'awarding_agency',
      award_value: 'award_amount',
      action_date: 'action_date',
      ticker: 'ticker',
      fiscal_year: null,
    },
    defaultProjection: ['recipient', 'awarding_agency', 'award_value', 'action_date'],
    fields: {
      recipient: { type: 'string' },
      awarding_agency: { type: 'string' },
      award_value: { type: 'money' },
      action_date: { type: 'date' },
      ticker: { type: 'string', nullable: true },
      fiscal_year: { type: 'int', derived: true },
    },
    joinableWith: [],
  },

  // ── Declared for the roadmap, but their real EzanaQL query path is not wired
  // yet. Marked unavailable so the executor returns an honest error instead of
  // a fabricated source. Adding one = bind `table`/`columnMap` (or an adapter)
  // and flip `available: true`. ────────────────────────────────────────────
  'capitol.congress_trades': mkUnavailable(
    'capitol.congress_trades',
    'Congressional Trades',
    'quiver',
    'public',
    {
      politician: { type: 'string' },
      chamber: { type: 'string' },
      party: { type: 'string' },
      ticker: { type: 'string', nullable: true },
      transaction_type: { type: 'string' },
      amount_range: { type: 'string' },
      transaction_date: { type: 'date' },
      disclosure_date: { type: 'date' },
    },
  ),
  'capitol.lobbying': mkUnavailable(
    'capitol.lobbying',
    'Corporate Lobbying',
    'inside-capitol',
    'public',
    {
      client: { type: 'string' },
      registrant: { type: 'string' },
      amount: { type: 'money' },
      issue: { type: 'string' },
      filing_date: { type: 'date' },
    },
  ),
  'market.quotes': mkUnavailable('market.quotes', 'Market Quotes', 'alpaca', 'public', {
    ticker: { type: 'string' },
    price: { type: 'float' },
    change: { type: 'float' },
    change_pct: { type: 'float' },
    volume: { type: 'int' },
    market_cap: { type: 'money' },
    day_high: { type: 'float' },
    day_low: { type: 'float' },
    updated_at: { type: 'date' },
  }),
  'market.ohlcv': mkUnavailable('market.ohlcv', 'OHLCV History', 'alpha-vantage', 'public', {
    ticker: { type: 'string' },
    date: { type: 'date' },
    open: { type: 'float' },
    high: { type: 'float' },
    low: { type: 'float' },
    close: { type: 'float' },
    volume: { type: 'int' },
  }),
  'market.fundamentals': mkUnavailable(
    'market.fundamentals',
    'Company Fundamentals',
    'fmp',
    'public',
    {
      ticker: { type: 'string' },
      company: { type: 'string' },
      sector: { type: 'string' },
      industry: { type: 'string' },
      pe_ratio: { type: 'float' },
      eps: { type: 'float' },
      revenue: { type: 'money' },
      net_income: { type: 'money' },
      market_cap: { type: 'money' },
      dividend_yield: { type: 'float' },
    },
  ),
  'market.earnings': mkUnavailable('market.earnings', 'Earnings', 'fmp', 'public', {
    ticker: { type: 'string' },
    report_date: { type: 'date' },
    eps_estimate: { type: 'float' },
    eps_actual: { type: 'float' },
    surprise_pct: { type: 'float' },
    revenue_estimate: { type: 'money' },
    revenue_actual: { type: 'money' },
  }),
  'commodities.prices': mkUnavailable(
    'commodities.prices',
    'Commodity Prices',
    'commodities',
    'public',
    {
      commodity: { type: 'string' },
      price: { type: 'float' },
      change_pct: { type: 'float' },
      unit: { type: 'string' },
      date: { type: 'date' },
    },
  ),
  'institutions.holdings': mkUnavailable(
    'institutions.holdings',
    'Institutional Holdings',
    'isr',
    'public',
    {
      institution: { type: 'string' },
      ticker: { type: 'string' },
      shares: { type: 'int' },
      value: { type: 'money' },
      pct_portfolio: { type: 'float' },
      quarter: { type: 'string' },
      change: { type: 'float' },
    },
  ),
  'prediction.markets': mkUnavailable(
    'prediction.markets',
    'Prediction Markets',
    'polymarket',
    'public',
    {
      market: { type: 'string' },
      outcome: { type: 'string' },
      probability: { type: 'float' },
      volume: { type: 'money' },
      resolution_date: { type: 'date' },
    },
  ),
  'insider.trades': mkUnavailable('insider.trades', 'Insider Trades', 'sec', 'public', {
    company: { type: 'string' },
    ticker: { type: 'string' },
    insider_name: { type: 'string' },
    role: { type: 'string' },
    transaction_type: { type: 'string' },
    shares: { type: 'int' },
    value: { type: 'money' },
    transaction_date: { type: 'date' },
  }),
  'portfolio.positions': mkUnavailable(
    'portfolio.positions',
    'Portfolio Positions',
    'plaid',
    'user_private',
    {
      ticker: { type: 'string' },
      quantity: { type: 'float' },
      cost_basis: { type: 'money' },
      market_value: { type: 'money' },
      unrealized_pl: { type: 'money' },
      account: { type: 'string' },
      as_of: { type: 'date' },
    },
    'user_id',
  ),
  /* Parsed trades from House PTR filings. Wired: public.house_trades is
     populated by the parse-house-ptrs cron. amount_midpoint is deliberately
     NOT exposed — it is a bracket midpoint kept for sorting, and a queryable
     field would let an estimate be read as a filed figure. The bracket the
     filer actually disclosed, and its two bounds, are the honest values. */
  'house.trades': {
    name: 'house.trades',
    label: 'House Member Trades',
    source: 'house-clerk',
    access: 'public',
    rlsColumn: null,
    available: true,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'house_trades',
    columnMap: {
      member_last: 'last_name',
      member_first: 'first_name',
      state_dst: 'state_dst',
      ticker: 'ticker',
      asset_name: 'asset_name',
      tx_type: 'tx_type',
      traded_on: 'tx_date',
      notified_on: 'notification_date',
      amount_bracket: 'amount_bracket_label',
      amount_low: 'amount_low',
      amount_high: 'amount_high',
      doc_id: 'doc_id',
    },
    defaultProjection: ['member_last', 'ticker', 'tx_type', 'traded_on', 'amount_bracket'],
    fields: {
      member_last: { type: 'string' },
      member_first: { type: 'string' },
      state_dst: { type: 'string', nullable: true },
      ticker: { type: 'string', nullable: true },
      asset_name: { type: 'string' },
      tx_type: { type: 'string', enum: ['P', 'S', 'E'], nullable: true },
      traded_on: { type: 'date', nullable: true },
      notified_on: { type: 'date', nullable: true },
      amount_bracket: { type: 'string', nullable: true },
      amount_low: { type: 'money', nullable: true },
      amount_high: { type: 'money', nullable: true },
      doc_id: { type: 'string' },
    },
    joinableWith: [],
  },
  /* Declared, not wired: there is no Senate ingest yet, so the executor
     refuses to run it rather than returning an empty result that reads like
     "no trades". Flip to available: true with a table/columnMap when
     senate_trades has rows. */
  'senate.trades': mkUnavailable('senate.trades', 'Senate Member Trades', 'senate-opr', 'public', {
    member_last: { type: 'string' },
    member_first: { type: 'string' },
    state: { type: 'string', nullable: true },
    ticker: { type: 'string', nullable: true },
    asset_name: { type: 'string' },
    tx_type: { type: 'string', enum: ['P', 'S', 'E'], nullable: true },
    traded_on: { type: 'date', nullable: true },
    notified_on: { type: 'date', nullable: true },
    amount_bracket: { type: 'string', nullable: true },
    doc_id: { type: 'string' },
  }),
  'portfolio.transactions': mkUnavailable(
    'portfolio.transactions',
    'Portfolio Transactions',
    'plaid',
    'user_private',
    {
      ticker: { type: 'string' },
      side: { type: 'string' },
      quantity: { type: 'float' },
      price: { type: 'float' },
      amount: { type: 'money' },
      executed_at: { type: 'date' },
      account: { type: 'string' },
    },
    'user_id',
  ),
};

function mkUnavailable(name, label, source, access, fields, rlsColumn = null) {
  return {
    name,
    label,
    source,
    access,
    rlsColumn,
    available: false,
    hardLimit: 5000,
    defaultLimit: 100,
    defaultProjection: Object.keys(fields).slice(0, 4),
    fields,
    joinableWith: [],
  };
}

export function getDataset(name) {
  return CATALOG[name] || null;
}

/** Compact schema handed to the NL→EzanaQL model (names, fields, types, enums). */
export function catalogSchemaForPrompt() {
  return Object.values(CATALOG)
    .filter((d) => d.available)
    .map((d) => {
      const fields = Object.entries(d.fields)
        .map(([f, meta]) => `${f}:${meta.type}${meta.enum ? ` [${meta.enum.join('|')}]` : ''}`)
        .join(', ');
      return `${d.name} (${d.label}) — fields: ${fields}`;
    })
    .join('\n');
}
