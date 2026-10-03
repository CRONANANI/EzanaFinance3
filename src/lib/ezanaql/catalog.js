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

export const CATALOG_VERSION = '1.2.0';

/** Fields present in the design/spec but NOT backed by the real ingest yet. */
export const CATALOG_GAPS = {
  'capitol.lobbying': {
    unavailableFields: ['issues', 'entities', 'lobbyists', 'entity_buckets', 'issue_buckets'],
    note: 'lobbying_filings stores these as JSONB and text arrays. The v1 grammar has no containment or array operator, so binding them would offer a filter that cannot be expressed. Omitted rather than exposed as unfilterable.',
  },
  'prediction.markets': {
    unavailableFields: ['embedding', 'tsv', 'description', 'adj_ticker'],
    note: 'embedding and tsv drive semantic and full-text search, not attribute filtering; description is noise in a result grid. Bound from prediction_market_index, which holds the rows, rather than polymarket_market_index, which is empty.',
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
    /* Derived in-engine, not a column. Declared so the executor needs no
       special case; see DERIVATION_KINDS there. */
    derived: { fiscal_year: { kind: 'fiscal_year', from: 'action_date' } },
    defaultProjection: ['recipient', 'awarding_agency', 'award_value', 'action_date'],
    fields: {
      recipient: { type: 'string' },
      awarding_agency: { type: 'string' },
      award_value: { type: 'money' },
      action_date: { type: 'date' },
      ticker: { type: 'string', nullable: true },
      fiscal_year: { type: 'int', derived: true },
    },
    joinableWith: ['capitol.congress_trades'],
    joinKeys: ['ticker'],
  },

  // ── Declared for the roadmap, but their real EzanaQL query path is not wired
  // yet. Marked unavailable so the executor returns an honest error instead of
  // a fabricated source. Adding one = bind `table`/`columnMap` (or an adapter)
  // and flip `available: true`. ────────────────────────────────────────────
  /* Bound to the congress_trades_enriched view (migration
     20261003130000_ezanaql_joins.sql): every STOCK Act trade the tracker
     shows, House PTRs and Senate eFD alike, with the member's name, party and
     state joined in from congress_members. The old binding pointed at the
     empty Quiver table and was held unavailable for that reason. */
  'capitol.congress_trades': {
    name: 'capitol.congress_trades',
    label: 'Congressional Trades',
    source: 'house-clerk + senate-efd',
    access: 'public',
    rlsColumn: null,
    available: true,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'congress_trades_enriched',
    columnMap: {
      politician: 'member_name',
      bioguide_id: 'bioguide_id',
      chamber: 'chamber',
      party: 'party',
      state: 'state',
      ticker: 'ticker',
      asset_name: 'asset_name',
      transaction_type: 'type',
      transaction_date: 'transaction_date',
      disclosure_date: 'disclosure_date',
      owner: 'owner',
      amount_low: 'amount_min',
      amount_high: 'amount_max',
      amount_est: 'amount_mid',
      disclosure_lag_days: null,
    },
    derived: {
      disclosure_lag_days: { kind: 'day_diff', from: 'transaction_date', to: 'disclosure_date' },
    },
    defaultProjection: [
      'politician',
      'ticker',
      'transaction_type',
      'transaction_date',
      'amount_low',
      'amount_high',
    ],
    fields: {
      politician: { type: 'string' },
      bioguide_id: { type: 'string' },
      chamber: { type: 'string', enum: ['house', 'senate'] },
      party: { type: 'string', enum: ['D', 'R', 'I'], nullable: true },
      state: { type: 'string', nullable: true },
      ticker: { type: 'string', nullable: true },
      asset_name: { type: 'string', nullable: true },
      transaction_type: {
        type: 'string',
        enum: ['purchase', 'sale', 'sale_partial', 'exchange'],
      },
      transaction_date: { type: 'date' },
      disclosure_date: { type: 'date', nullable: true },
      owner: { type: 'string', nullable: true },
      amount_low: { type: 'money', nullable: true },
      amount_high: { type: 'money', nullable: true },
      amount_est: { type: 'money', nullable: true, estimate: true },
      disclosure_lag_days: { type: 'int', derived: true, nullable: true },
    },
    /* Joins are on `ticker` only (see joinKeys). Both sides must list each
       other, so a join is a deliberate, declared pairing. */
    joinableWith: ['gov.contracts'],
    joinKeys: ['ticker'],
  },

  'capitol.lobbying': {
    name: 'capitol.lobbying',
    label: 'Corporate Lobbying',
    source: 'inside-capitol',
    access: 'public',
    rlsColumn: null,
    available: true,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'lobbying_filings',
    columnMap: {
      filing_uuid: 'uuid',
      filing_year: 'filing_year',
      period: 'filing_period',
      posted_on: 'dt_posted',
      amount: 'amount',
      filing_type: 'filing_type',
      registrant: 'registrant_name',
      client: 'client_name',
      lobbyist_count: 'lobbyist_count',
      document_url: 'document_url',
    },
    defaultProjection: ['client', 'registrant', 'filing_year', 'period', 'amount'],
    fields: {
      filing_uuid: { type: 'string' },
      filing_year: { type: 'int', nullable: true },
      period: { type: 'string', nullable: true },
      posted_on: { type: 'date', nullable: true },
      amount: { type: 'money', nullable: true },
      filing_type: { type: 'string', nullable: true },
      registrant: { type: 'string', nullable: true },
      client: { type: 'string', nullable: true },
      lobbyist_count: { type: 'int', nullable: true },
      document_url: { type: 'string', nullable: true },
    },
    joinableWith: [],
  },
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
  /* prediction_market_index, NOT polymarket_market_index. The latter is empty
     (0 rows) while this holds 18,264 markets and is what the related-markets
     route reads. Its embedding and tsvector make it look like a pure search
     index; the market attributes beside them are real, and are what is bound. */
  'prediction.markets': {
    name: 'prediction.markets',
    label: 'Prediction Markets',
    source: 'polymarket',
    access: 'public',
    rlsColumn: null,
    available: true,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'prediction_market_index',
    columnMap: {
      market_id: 'market_id',
      question: 'question',
      category: 'category',
      platform: 'platform',
      probability: 'probability',
      volume: 'volume',
      liquidity: 'liquidity',
      ends_on: 'end_date',
      status: 'status',
      link: 'link',
    },
    defaultProjection: ['question', 'category', 'probability', 'volume', 'ends_on'],
    fields: {
      market_id: { type: 'string' },
      question: { type: 'string' },
      category: { type: 'string', nullable: true },
      platform: { type: 'string' },
      probability: { type: 'float', nullable: true },
      volume: { type: 'float', nullable: true },
      liquidity: { type: 'float', nullable: true },
      ends_on: { type: 'date', nullable: true },
      status: { type: 'string', nullable: true },
      link: { type: 'string', nullable: true },
    },
    joinableWith: [],
  },
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
  /* house_trades is EMPTY: 0 rows, verified. house_disclosure_filings holds
     9,034 rows but trades_parsed is false on every one of them, so
     parse-house-ptrs has not yet produced a single trade. The binding is
     complete; left unavailable for the same reason as congress_trades, so the
     page does not answer "no trades" when it means "not extracted yet".

     amount_est is the bracket midpoint. It exists so a size ORDER BY is
     possible at all, is marked `estimate` so the formatter labels it, and is
     kept out of the default projection. What the filer disclosed is
     amount_bracket, with amount_low and amount_high as its bounds. */
  'house.trades': {
    name: 'house.trades',
    label: 'House Member Trades',
    source: 'house-clerk',
    access: 'public',
    rlsColumn: null,
    available: false,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'house_trades',
    columnMap: {
      doc_id: 'doc_id',
      member_last: 'last_name',
      member_first: 'first_name',
      state_dst: 'state_dst',
      ticker: 'ticker',
      asset: 'asset_name',
      transaction_type: 'tx_type',
      transaction_date: 'tx_date',
      filed_on: 'notification_date',
      amount_low: 'amount_low',
      amount_high: 'amount_high',
      amount_est: 'amount_midpoint',
      amount_bracket: 'amount_bracket_label',
      disclosure_lag_days: null,
    },
    derived: {
      disclosure_lag_days: { kind: 'day_diff', from: 'transaction_date', to: 'filed_on' },
    },
    defaultProjection: [
      'member_last',
      'ticker',
      'transaction_type',
      'transaction_date',
      'amount_bracket',
    ],
    fields: {
      doc_id: { type: 'string' },
      member_last: { type: 'string', nullable: true },
      member_first: { type: 'string', nullable: true },
      state_dst: { type: 'string', nullable: true },
      ticker: { type: 'string', nullable: true },
      asset: { type: 'string' },
      transaction_type: { type: 'string', enum: ['P', 'S', 'E'], nullable: true },
      transaction_date: { type: 'date', nullable: true },
      filed_on: { type: 'date', nullable: true },
      amount_low: { type: 'money', nullable: true },
      amount_high: { type: 'money', nullable: true },
      amount_est: { type: 'money', nullable: true, estimate: true },
      amount_bracket: { type: 'string', nullable: true },
      disclosure_lag_days: { type: 'int', derived: true, nullable: true },
    },
    joinableWith: ['house.filings'],
  },
  /* The filing INDEX, one row per disclosure document; 9,034 rows today. No
     trades here, those are in house.trades. */
  'house.filings': {
    name: 'house.filings',
    label: 'House Disclosure Filings',
    source: 'house-clerk',
    access: 'public',
    rlsColumn: null,
    available: true,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'house_disclosure_filings',
    columnMap: {
      doc_id: 'doc_id',
      member_last: 'last_name',
      member_first: 'first_name',
      state_dst: 'state_dst',
      filing_type: 'filing_type',
      filing_year: 'filing_year',
      covered_year: 'covered_year',
      filing_date: 'filing_date',
      is_ptr: 'is_ptr',
      pdf_url: 'pdf_url',
    },
    defaultProjection: ['member_last', 'filing_type', 'filing_year', 'filing_date'],
    fields: {
      doc_id: { type: 'string' },
      member_last: { type: 'string' },
      member_first: { type: 'string' },
      state_dst: { type: 'string', nullable: true },
      filing_type: { type: 'string' },
      filing_year: { type: 'int' },
      covered_year: { type: 'int', nullable: true },
      /* Nullable on purpose: withdrawals carry no date by convention, and a
         source date that failed the plausibility check is stored as absent
         rather than corrected into a plausible one. */
      filing_date: { type: 'date', nullable: true },
      is_ptr: { type: 'bool' },
      pdf_url: { type: 'string', nullable: true },
    },
    joinableWith: ['house.trades'],
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

/** The part after the namespace: gov.contracts → contracts. It prefixes the
 *  joined dataset's fields in a JOIN (congress_trades.politician). */
export function shortName(datasetName) {
  return String(datasetName).split('.').pop();
}

/** Compact schema handed to the NL→EzanaQL model (names, fields, types, enums). */
export function catalogSchemaForPrompt() {
  const live = Object.values(CATALOG)
    .filter((d) => d.available)
    .map((d) => {
      const fields = Object.entries(d.fields)
        .map(([f, meta]) => `${f}:${meta.type}${meta.enum ? ` [${meta.enum.join('|')}]` : ''}`)
        .join(', ');
      const joins = (d.joinableWith || [])
        .filter((j) => CATALOG[j]?.available)
        .map((j) => `${j} ON ${(d.joinKeys || []).join('|')}`);
      return `${d.name} (${d.label}) fields: ${fields}${
        joins.length ? `; joinable with ${joins.join(', ')}` : ''
      }`;
    })
    .join('\n');
  /* Named, not hidden. The model needs to know these exist so it does not
     invent a name for one, and needs to know it cannot target them so it does
     not write a query the executor will refuse. */
  const notYet = Object.values(CATALOG)
    .filter((d) => !d.available)
    .map((d) => d.name)
    .join(', ');
  return notYet ? `${live}\n\nNot yet queryable: ${notYet}` : live;
}
