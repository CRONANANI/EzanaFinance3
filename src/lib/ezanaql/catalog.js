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

export const CATALOG_VERSION = '1.5.0';

/* Every Titans Shadow dataset keys on ticker, so each is joinable with all the
   others. Joins stay inside a dimension. */
const TITANS = [
  'titans.holdings_13f',
  'titans.activist_stakes',
  'titans.whale_moves',
  'titans.insider_trades',
  'titans.fundamentals',
  'titans.exec_comp',
  'titans.etf_holdings',
];
const TITANS_PEERS = (self) => TITANS.filter((n) => n !== self);

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
    note: 'The usaspending ingest stores recipient, recipient_id, agency, amount, action_date. HQ location, NAICS/PSC codes and award type are not ingested, so they are omitted from the catalog (querying them returns a clear "unknown field" error) rather than fabricated. ticker / parent / is_public come from contract_awards_resolved.',
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
  /* Bound to contract_awards_resolved (migration 20261003140000): the awards
     table plus the USAspending parent and the resolved ticker. `ticker` is the
     parent's where one is known (CACI NSS → CACI, FedEx Supply Chain → FDX);
     `is_public` is true / false / null (unknown); `ticker_source` says how
     the ticker was arrived at. Known-private contractors (Deloitte, Bechtel,
     Kiewit) read is_public = false, not "missing". */
  'gov.contracts': {
    name: 'gov.contracts',
    label: 'Federal Contract Awards',
    source: 'usaspending',
    access: 'public',
    rlsColumn: null,
    available: true,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'contract_awards_resolved',
    // catalog field -> real DB column (null = derived in-engine, not a column)
    columnMap: {
      recipient: 'recipient_name',
      parent: 'parent_name',
      awarding_agency: 'awarding_agency',
      award_value: 'award_amount',
      action_date: 'action_date',
      ticker: 'ticker',
      is_public: 'is_public',
      ticker_source: 'ticker_source',
      fiscal_year: null,
    },
    /* Derived in-engine, not a column. Declared so the executor needs no
       special case; see DERIVATION_KINDS there. */
    derived: { fiscal_year: { kind: 'fiscal_year', from: 'action_date' } },
    defaultProjection: ['recipient', 'awarding_agency', 'award_value', 'action_date'],
    fields: {
      recipient: { type: 'string' },
      parent: { type: 'string', nullable: true },
      awarding_agency: { type: 'string' },
      award_value: { type: 'money' },
      action_date: { type: 'date' },
      ticker: { type: 'string', nullable: true },
      is_public: { type: 'bool', nullable: true },
      ticker_source: { type: 'string', nullable: true },
      fiscal_year: { type: 'int', derived: true },
    },
    joinableWith: ['capitol.congress_trades', 'capitol.holdings'],
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
    joinableWith: ['gov.contracts', 'capitol.committee_seats', 'capitol.campaign_finance'],
    joinKeys: ['ticker', 'bioguide_id'],
  },

  /* Positions members still hold, inferred the way the tracker's Most-held
     chart and member portfolio infer them: the member has a buy and their
     latest action on the ticker is a purchase or partial sale. Bound to the
     congress_open_positions view (migration 20261003150000). est_value is a
     midpoint estimate, never a reported holding; STOCK Act filings report
     trades in ranges, not positions. "Politicians who own X" is this
     dataset; "politicians who traded X" is capitol.congress_trades. */
  'capitol.holdings': {
    name: 'capitol.holdings',
    label: 'Congressional Holdings (inferred open positions)',
    source: 'house-clerk + senate-efd',
    access: 'public',
    rlsColumn: null,
    available: true,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'congress_open_positions',
    columnMap: {
      politician: 'member_name',
      bioguide_id: 'bioguide_id',
      chamber: 'chamber',
      party: 'party',
      state: 'state',
      ticker: 'ticker',
      est_value: 'est_value',
      first_buy: 'first_buy',
      last_trade: 'last_date',
      last_action: 'last_type',
      trades: 'trades',
    },
    defaultProjection: ['politician', 'party', 'ticker', 'last_action', 'last_trade'],
    fields: {
      politician: { type: 'string' },
      bioguide_id: { type: 'string' },
      chamber: { type: 'string', enum: ['house', 'senate'], nullable: true },
      party: { type: 'string', enum: ['D', 'R', 'I'], nullable: true },
      state: { type: 'string', nullable: true },
      ticker: { type: 'string' },
      est_value: { type: 'money', estimate: true },
      first_buy: { type: 'date', nullable: true },
      last_trade: { type: 'date' },
      last_action: { type: 'string', enum: ['purchase', 'sale_partial'] },
      trades: { type: 'int' },
    },
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
  /* ── Capitol Watch: committee seats and campaign finance (migration
     20261006000900). Both key on bioguide_id, the member id the trades carry. */
  'capitol.committee_seats': {
    name: 'capitol.committee_seats',
    label: 'Committee Assignments',
    source: 'congress-legislators',
    access: 'public',
    rlsColumn: null,
    available: true,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'ezq_committee_seats',
    columnMap: {
      committee_id: 'committee_thomas_id',
      committee: 'committee',
      chamber: 'chamber',
      is_subcommittee: 'is_subcommittee',
      parent_committee: 'parent_committee',
      bioguide_id: 'bioguide_id',
      politician: 'member_name',
      party: 'party',
      state: 'state',
      side: 'side',
      rank: 'rank',
      title: 'title',
    },
    defaultProjection: ['politician', 'party', 'committee', 'side', 'title'],
    fields: {
      committee_id: { type: 'string' },
      committee: { type: 'string' },
      chamber: { type: 'string', nullable: true },
      is_subcommittee: { type: 'bool', nullable: true },
      parent_committee: { type: 'string', nullable: true },
      bioguide_id: { type: 'string' },
      politician: { type: 'string', nullable: true },
      party: { type: 'string', nullable: true },
      state: { type: 'string', nullable: true },
      side: { type: 'string', nullable: true },
      rank: { type: 'int', nullable: true },
      title: { type: 'string', nullable: true },
    },
    joinableWith: ['capitol.congress_trades', 'capitol.campaign_finance'],
    joinKeys: ['bioguide_id'],
  },
  'capitol.campaign_finance': {
    name: 'capitol.campaign_finance',
    label: 'Campaign Finance (FEC candidate totals)',
    source: 'fec',
    access: 'public',
    rlsColumn: null,
    available: true,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'ezq_campaign_finance',
    columnMap: {
      bioguide_id: 'bioguide_id',
      cycle: 'cycle',
      candidate_id: 'candidate_id',
      politician: 'member_name',
      party: 'party',
      office: 'office',
      state: 'state',
      receipts: 'receipts',
      disbursements: 'disbursements',
      cash_on_hand: 'cash_on_hand',
      individual_contributions: 'individual_itemized_contributions',
      pac_contributions: 'pac_contributions',
      debts: 'debts',
      coverage_start: 'coverage_start_date',
      coverage_end: 'coverage_end_date',
    },
    defaultProjection: ['politician', 'party', 'cycle', 'receipts', 'cash_on_hand'],
    fields: {
      bioguide_id: { type: 'string' },
      cycle: { type: 'int' },
      candidate_id: { type: 'string', nullable: true },
      politician: { type: 'string', nullable: true },
      party: { type: 'string', nullable: true },
      office: { type: 'string', nullable: true },
      state: { type: 'string', nullable: true },
      receipts: { type: 'money', nullable: true },
      disbursements: { type: 'money', nullable: true },
      cash_on_hand: { type: 'money', nullable: true },
      individual_contributions: { type: 'money', nullable: true },
      pac_contributions: { type: 'money', nullable: true },
      debts: { type: 'money', nullable: true },
      coverage_start: { type: 'date', nullable: true },
      coverage_end: { type: 'date', nullable: true },
    },
    joinableWith: ['capitol.congress_trades', 'capitol.committee_seats'],
    joinKeys: ['bioguide_id'],
  },

  /* ── Titans Shadow (migration 20261006000900). Every entry keys on ticker
     and declares the others joinable, so any two can be joined or semi
     joined; joins never cross a dimension. */
  'titans.holdings_13f': {
    name: 'titans.holdings_13f',
    label: 'Institutional Holdings (13F)',
    source: 'sec',
    access: 'public',
    rlsColumn: null,
    available: true,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'ezq_13f_holdings',
    columnMap: {
      accession_no: 'accession_no',
      filer_cik: 'filer_cik',
      filer: 'filer_name',
      form_type: 'form_type',
      period: 'period_of_report',
      filed_on: 'filed_at',
      issuer: 'issuer',
      cusip: 'cusip',
      ticker: 'ticker',
      value: 'value_usd',
      shares: 'shares',
      share_type: 'share_type',
      put_call: 'put_call',
    },
    defaultProjection: ['filer', 'ticker', 'value', 'shares', 'period'],
    fields: {
      accession_no: { type: 'string' },
      filer_cik: { type: 'string', nullable: true },
      filer: { type: 'string', nullable: true },
      form_type: { type: 'string', nullable: true },
      period: { type: 'date', nullable: true },
      filed_on: { type: 'date', nullable: true },
      issuer: { type: 'string', nullable: true },
      cusip: { type: 'string', nullable: true },
      ticker: { type: 'string', nullable: true },
      value: { type: 'money', nullable: true },
      shares: { type: 'float', nullable: true },
      share_type: { type: 'string', nullable: true },
      put_call: { type: 'string', nullable: true },
    },
    joinableWith: TITANS_PEERS('titans.holdings_13f'),
    joinKeys: ['ticker'],
  },
  'titans.activist_stakes': {
    name: 'titans.activist_stakes',
    label: 'Activist Stakes (Schedule 13D and 13G)',
    source: 'sec',
    access: 'public',
    rlsColumn: null,
    available: true,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'ezq_activist_stakes',
    columnMap: {
      accession_no: 'accession_no',
      filer_cik: 'filer_cik',
      filer: 'filer_name',
      form_type: 'form_type',
      filed_on: 'filed_at',
      event_date: 'event_date',
      company: 'subject_name',
      company_cik: 'subject_cik',
      ticker: 'ticker',
      percent_of_class: 'percent_of_class',
      shares: 'shares',
      is_amendment: 'is_amendment',
    },
    defaultProjection: ['filer', 'company', 'ticker', 'percent_of_class', 'filed_on'],
    fields: {
      accession_no: { type: 'string' },
      filer_cik: { type: 'string', nullable: true },
      filer: { type: 'string', nullable: true },
      form_type: { type: 'string', nullable: true },
      filed_on: { type: 'date', nullable: true },
      event_date: { type: 'date', nullable: true },
      company: { type: 'string', nullable: true },
      company_cik: { type: 'string', nullable: true },
      ticker: { type: 'string', nullable: true },
      percent_of_class: { type: 'float', nullable: true },
      shares: { type: 'float', nullable: true },
      is_amendment: { type: 'bool', nullable: true },
    },
    joinableWith: TITANS_PEERS('titans.activist_stakes'),
    joinKeys: ['ticker'],
  },
  'titans.whale_moves': {
    name: 'titans.whale_moves',
    label: 'Whale Moves (scored fund moves)',
    source: 'sec',
    access: 'public',
    rlsColumn: null,
    available: true,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'whale_moves',
    columnMap: {
      kind: 'kind',
      filer: 'filer_name',
      filer_cik: 'filer_cik',
      ticker: 'ticker',
      issuer: 'issuer',
      quarter: 'quarter',
      value: 'value_usd',
      conviction_pct: 'conviction_pct',
      change_type: 'change_type',
      percent_of_class: 'percent_of_class',
      form: 'form',
      whale_score: 'whale_score',
      tier: 'tier',
      filed_on: 'filed_at',
    },
    defaultProjection: ['filer', 'ticker', 'change_type', 'whale_score', 'quarter'],
    fields: {
      kind: { type: 'string', nullable: true },
      filer: { type: 'string', nullable: true },
      filer_cik: { type: 'string', nullable: true },
      ticker: { type: 'string', nullable: true },
      issuer: { type: 'string', nullable: true },
      quarter: { type: 'string', nullable: true },
      value: { type: 'money', nullable: true },
      conviction_pct: { type: 'float', nullable: true },
      change_type: { type: 'string', nullable: true },
      percent_of_class: { type: 'float', nullable: true },
      form: { type: 'string', nullable: true },
      whale_score: { type: 'float', nullable: true },
      tier: { type: 'string', nullable: true },
      filed_on: { type: 'date', nullable: true },
    },
    joinableWith: TITANS_PEERS('titans.whale_moves'),
    joinKeys: ['ticker'],
  },
  /* Bound to sec_insider_transactions (migration 20261006000500): one row per
     Form 4 transaction line. transaction_type is the SEC code (P open-market
     buy, S sale, A award, M exercise, F tax withholding, G gift). price and
     value are null when the filing did not report them.
     available: false until the table has rows (0 on Oct 6, 2026). */
  'titans.insider_trades': {
    name: 'titans.insider_trades',
    label: 'Insider Trades (Form 4)',
    source: 'sec',
    access: 'public',
    rlsColumn: null,
    available: false,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'sec_insider_transactions',
    columnMap: {
      company: 'issuer_name',
      ticker: 'issuer_ticker',
      insider_name: 'reporter_name',
      role: 'reporter_title',
      transaction_type: 'transaction_code',
      shares: 'shares',
      price: 'price',
      value: 'value_usd',
      shares_after: 'shares_owned_after',
      transaction_date: 'transaction_date',
      filed_on: 'filed_at',
    },
    defaultProjection: ['ticker', 'insider_name', 'transaction_type', 'transaction_date', 'value'],
    fields: {
      company: { type: 'string', nullable: true },
      ticker: { type: 'string', nullable: true },
      insider_name: { type: 'string', nullable: true },
      role: { type: 'string', nullable: true },
      transaction_type: { type: 'string', nullable: true },
      shares: { type: 'float', nullable: true },
      price: { type: 'float', nullable: true },
      value: { type: 'money', nullable: true },
      shares_after: { type: 'float', nullable: true },
      transaction_date: { type: 'date', nullable: true },
      filed_on: { type: 'date', nullable: true },
    },
    joinableWith: TITANS_PEERS('titans.insider_trades'),
    joinKeys: ['ticker'],
  },
  /* Bound to sec_fundamentals (migration 20261006000600): one row per company,
     metric and XBRL frame (CY2025, CY2025Q3, CY2025Q3I). Values as reported;
     nothing derived. available: false until the table has rows. */
  'titans.fundamentals': {
    name: 'titans.fundamentals',
    label: 'Company Fundamentals (SEC XBRL)',
    source: 'sec',
    access: 'public',
    rlsColumn: null,
    available: false,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'sec_fundamentals',
    columnMap: {
      cik: 'cik',
      ticker: 'ticker',
      company: 'entity_name',
      metric: 'concept',
      frame: 'frame',
      period_type: 'period_type',
      period_end: 'period_end',
      value: 'value',
      unit: 'unit',
    },
    defaultProjection: ['ticker', 'metric', 'frame', 'value'],
    fields: {
      cik: { type: 'string' },
      ticker: { type: 'string', nullable: true },
      company: { type: 'string', nullable: true },
      metric: { type: 'string' },
      frame: { type: 'string' },
      period_type: { type: 'string', nullable: true },
      period_end: { type: 'date', nullable: true },
      value: { type: 'float', nullable: true },
      unit: { type: 'string', nullable: true },
    },
    joinableWith: TITANS_PEERS('titans.fundamentals'),
    joinKeys: ['ticker'],
  },
  /* Bound to sec_exec_comp (migration 20261006000700): pay versus performance
     from proxy XBRL, one row per company, fiscal year and PEO.
     available: false until the table has rows. */
  'titans.exec_comp': {
    name: 'titans.exec_comp',
    label: 'Executive Compensation (pay versus performance)',
    source: 'sec',
    access: 'public',
    rlsColumn: null,
    available: false,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'sec_exec_comp',
    columnMap: {
      ticker: 'ticker',
      company: 'entity_name',
      fiscal_year: 'fiscal_year',
      ceo: 'peo_name',
      ceo_total_pay: 'peo_total_comp',
      ceo_comp_actually_paid: 'peo_comp_actually_paid',
      neo_avg_total_pay: 'non_peo_neo_avg_total_comp',
      neo_avg_comp_actually_paid: 'non_peo_neo_avg_comp_actually_paid',
      tsr: 'company_tsr',
      peer_tsr: 'peer_group_tsr',
      net_income: 'net_income',
    },
    defaultProjection: ['ticker', 'fiscal_year', 'ceo_total_pay', 'ceo_comp_actually_paid', 'tsr'],
    fields: {
      ticker: { type: 'string', nullable: true },
      company: { type: 'string', nullable: true },
      fiscal_year: { type: 'int' },
      ceo: { type: 'string', nullable: true },
      ceo_total_pay: { type: 'money', nullable: true },
      ceo_comp_actually_paid: { type: 'money', nullable: true },
      neo_avg_total_pay: { type: 'money', nullable: true },
      neo_avg_comp_actually_paid: { type: 'money', nullable: true },
      tsr: { type: 'float', nullable: true },
      peer_tsr: { type: 'float', nullable: true },
      net_income: { type: 'money', nullable: true },
    },
    joinableWith: TITANS_PEERS('titans.exec_comp'),
    joinKeys: ['ticker'],
  },
  /* Bound to the ezq_etf_holdings view: Form N-PORT holdings of the tracked
     ETFs with the fund's own ticker. ticker is the holding's, from the CUSIP
     map, null when unmapped. available: false until sec_etf_holdings has rows. */
  'titans.etf_holdings': {
    name: 'titans.etf_holdings',
    label: 'ETF Holdings (Form N-PORT)',
    source: 'sec',
    access: 'public',
    rlsColumn: null,
    available: false,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'ezq_etf_holdings',
    columnMap: {
      series_id: 'series_id',
      etf: 'etf_ticker',
      fund_name: 'fund_name',
      report_date: 'report_date',
      holding: 'holding_name',
      ticker: 'ticker',
      cusip: 'cusip',
      value: 'value_usd',
      weight_pct: 'pct_value',
      asset_category: 'asset_category',
      country: 'country',
    },
    defaultProjection: ['etf', 'holding', 'ticker', 'weight_pct', 'value'],
    fields: {
      series_id: { type: 'string' },
      etf: { type: 'string', nullable: true },
      fund_name: { type: 'string', nullable: true },
      report_date: { type: 'date' },
      holding: { type: 'string', nullable: true },
      ticker: { type: 'string', nullable: true },
      cusip: { type: 'string', nullable: true },
      value: { type: 'money', nullable: true },
      weight_pct: { type: 'float', nullable: true },
      asset_category: { type: 'string', nullable: true },
      country: { type: 'string', nullable: true },
    },
    joinableWith: TITANS_PEERS('titans.etf_holdings'),
    joinKeys: ['ticker'],
  },

  /* ── Global Empire Lighthouse: OECD annual observations, one row per
     indicator (ezana slug), country and year. No join key: nothing else in
     the dimension shares one yet. */
  'lighthouse.oecd': {
    name: 'lighthouse.oecd',
    label: 'OECD Macro Data',
    source: 'oecd',
    access: 'public',
    rlsColumn: null,
    available: true,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'oecd_series_observations',
    columnMap: {
      indicator: 'ezana_slug',
      country_code: 'ref_area',
      country: 'ref_area_name',
      year: 'year',
      value: 'obs_value',
      status: 'obs_status',
      unit: 'unit_label',
    },
    defaultProjection: ['indicator', 'country', 'year', 'value', 'unit'],
    fields: {
      indicator: { type: 'string' },
      country_code: { type: 'string' },
      country: { type: 'string', nullable: true },
      year: { type: 'int' },
      value: { type: 'float', nullable: true },
      status: { type: 'string', nullable: true },
      unit: { type: 'string', nullable: true },
    },
    joinableWith: [],
  },
  /* ── Eyes Above: open-data views (migration 20261008000300). No shared
     join key across the three, so no joins. ezq_eyes_chokepoints and
     ezq_eyes_ports carry the IMF PortWatch daily series (published several
     weeks behind); ezq_eyes_patents the USPTO grants, ticker matched by
     assignee name (null when unmatched). */
  'eyes.chokepoints': {
    name: 'eyes.chokepoints',
    label: 'Chokepoint Transits (IMF PortWatch)',
    source: 'imf-portwatch',
    access: 'public',
    rlsColumn: null,
    available: true,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'ezq_eyes_chokepoints',
    columnMap: {
      date: 'date',
      chokepoint: 'chokepoint',
      transits: 'transits',
      tankers: 'tankers',
      container_ships: 'container_ships',
      dry_bulk: 'dry_bulk',
      capacity: 'capacity',
    },
    defaultProjection: ['date', 'chokepoint', 'transits', 'tankers', 'container_ships'],
    fields: {
      date: { type: 'date' },
      chokepoint: { type: 'string' },
      transits: { type: 'int', nullable: true },
      tankers: { type: 'int', nullable: true },
      container_ships: { type: 'int', nullable: true },
      dry_bulk: { type: 'int', nullable: true },
      capacity: { type: 'float', nullable: true },
    },
    joinableWith: [],
  },
  'eyes.ports': {
    name: 'eyes.ports',
    label: 'Port Activity (IMF PortWatch)',
    source: 'imf-portwatch',
    access: 'public',
    rlsColumn: null,
    available: true,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'ezq_eyes_ports',
    columnMap: {
      date: 'date',
      port: 'port',
      country: 'country',
      port_calls: 'port_calls',
      imports_tonnes: 'imports_tonnes',
      exports_tonnes: 'exports_tonnes',
    },
    defaultProjection: ['date', 'port', 'country', 'port_calls', 'imports_tonnes'],
    fields: {
      date: { type: 'date' },
      port: { type: 'string' },
      country: { type: 'string', nullable: true },
      port_calls: { type: 'int', nullable: true },
      imports_tonnes: { type: 'float', nullable: true },
      exports_tonnes: { type: 'float', nullable: true },
    },
    joinableWith: [],
  },
  'eyes.patents': {
    name: 'eyes.patents',
    label: 'Patent Grants (USPTO PatentsView)',
    source: 'uspto-patentsview',
    access: 'public',
    rlsColumn: null,
    available: true,
    hardLimit: 5000,
    defaultLimit: 100,
    table: 'ezq_eyes_patents',
    columnMap: {
      patent_id: 'patent_id',
      patent_date: 'patent_date',
      title: 'title',
      assignee: 'assignee',
      ticker: 'ticker',
      cpc_section: 'cpc_section',
      filing_date: 'filing_date',
    },
    defaultProjection: ['patent_id', 'patent_date', 'assignee', 'ticker', 'title'],
    fields: {
      patent_id: { type: 'string' },
      patent_date: { type: 'date' },
      title: { type: 'string', nullable: true },
      assignee: { type: 'string', nullable: true },
      ticker: { type: 'string', nullable: true },
      cpc_section: {
        type: 'string',
        enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'Y'],
        nullable: true,
      },
      filing_date: { type: 'date', nullable: true },
    },
    joinableWith: [],
  },
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
    joinKeys: ['doc_id'],
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
    joinKeys: ['doc_id'],
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

/**
 * Catalog datasets per dataset dimension. EzanaQL runs on the dimension hubs
 * only, and a hub's bar can reach only its own dimension's datasets: the
 * validator refuses anything else. Ids match DATASET_TAXONOMY; the labels are
 * repeated here so this module stays import free for the check scripts.
 */
export const DIMENSION_DATASETS = {
  capitol: [
    'gov.contracts',
    'capitol.congress_trades',
    'capitol.holdings',
    'capitol.lobbying',
    'capitol.committee_seats',
    'capitol.campaign_finance',
    'house.trades',
    'house.filings',
  ],
  titans: TITANS,
  eyes: ['eyes.chokepoints', 'eyes.ports', 'eyes.patents'],
  whispers: [],
  hive: ['prediction.markets'],
  lighthouse: ['lighthouse.oecd'],
  regulatory: [],
};

export const DIMENSION_LABELS = {
  capitol: 'Capitol Watch',
  titans: 'Titans Shadow',
  eyes: 'Eyes Above',
  whispers: 'Consumer Whispers',
  hive: 'The Hive',
  lighthouse: 'Global Empire Lighthouse',
  regulatory: 'Regulatory Winds',
};

export const isDimension = (id) =>
  typeof id === 'string' && Object.prototype.hasOwnProperty.call(DIMENSION_DATASETS, id);

/** The dimension a catalog dataset belongs to, or null. */
export function dimensionOfDataset(name) {
  return Object.keys(DIMENSION_DATASETS).find((d) => DIMENSION_DATASETS[d].includes(name)) || null;
}

/** True when at least one of the dimension's datasets can be queried today. */
export function dimensionHasQueryableData(dimension) {
  return (DIMENSION_DATASETS[dimension] || []).some((n) => CATALOG[n]?.available);
}

/**
 * Compact schema handed to the NL→EzanaQL model (names, fields, types, enums).
 * With a dimension, only that dimension's datasets are listed.
 */
export function catalogSchemaForPrompt(dimension = null) {
  const inScope = (d) => !dimension || (DIMENSION_DATASETS[dimension] || []).includes(d.name);
  const live = Object.values(CATALOG)
    .filter((d) => d.available && inScope(d))
    .map((d) => {
      const fields = Object.entries(d.fields)
        .map(([f, meta]) => `${f}:${meta.type}${meta.enum ? ` [${meta.enum.join('|')}]` : ''}`)
        .join(', ');
      const joins = (d.joinableWith || [])
        .filter((j) => CATALOG[j]?.available && inScope(CATALOG[j]))
        .map((j) => {
          const keys = (d.joinKeys || []).filter((k) => (CATALOG[j].joinKeys || []).includes(k));
          return `${j} ON ${keys.join('|')}`;
        });
      return `${d.name} (${d.label}) fields: ${fields}${
        joins.length ? `; joinable with ${joins.join(', ')}` : ''
      }`;
    })
    .join('\n');
  /* Named, not hidden. The model needs to know these exist so it does not
     invent a name for one, and needs to know it cannot target them so it does
     not write a query the executor will refuse. */
  const notYet = Object.values(CATALOG)
    .filter((d) => !d.available && inScope(d))
    .map((d) => d.name)
    .join(', ');
  return notYet ? `${live}\n\nNot yet queryable: ${notYet}` : live;
}
