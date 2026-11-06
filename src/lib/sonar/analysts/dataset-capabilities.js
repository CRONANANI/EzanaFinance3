/**
 * Ezana Sonar dataset contracts: logical evidence capabilities -> verified sources.
 *
 * Analysts ask for capabilities ("fx_spot", "contract_awards"), never tables. Each contract says
 * where the data really lives (catalogue families in macro_series_latest / macro_series_values,
 * engine sources in src/lib/sonar/engine/sources*.js, or tables), what a value means, its
 * units, period and release semantics, coverage, what it can and cannot support, and what to
 * do when it is missing. Row counts were verified against production on 6 Nov 2026.
 *
 * Access always goes through the existing engine sources / readers (getAdminClient for public
 * data, tenant-aware readers for org data). Analysts never query tables directly.
 *
 * Pure data + two helpers. Client-safe.
 */

const M = (families, extra = {}) => ({ kind: 'macro', families, ...extra });

export const CAPABILITIES = {
  /* ── Macro and markets (macro catalogue families) ─────────────────────────────── */
  gdp_growth: M(['gdp_growth'], {
    label: 'Real GDP growth',
    unit: '% y/y',
    period: 'annual (IMF WEO incl. projections to 2031)',
    semantics: 'IMF WEO observed and projected; projections must be labelled',
    freshDays: 400,
  }),
  inflation_annual: M(['inflation_annual'], {
    label: 'Annual inflation',
    unit: '% y/y',
    period: 'annual',
    semantics: 'IMF WEO average annual CPI inflation; projections labelled',
    freshDays: 400,
  }),
  inflation_monthly: M(['inflation_monthly'], {
    label: 'Monthly inflation',
    unit: '% y/y (computed from index where needed)',
    period: 'monthly',
    semantics:
      'headline only: IMF CPI index (y/y computed), ECB/Eurostat HICP, national CPI. No food or core sub-index',
    freshDays: 75,
  }),
  unemployment: M(['unemployment'], {
    label: 'Unemployment rate',
    unit: '% of labour force',
    period: 'monthly or annual',
    freshDays: 120,
  }),
  gov_debt: M(['gov_debt'], {
    label: 'General government gross debt',
    unit: '% of GDP',
    period: 'annual',
    freshDays: 400,
  }),
  gov_balance: M(['gov_balance'], {
    label: 'Government net lending/borrowing',
    unit: '% of GDP',
    period: 'annual',
    freshDays: 400,
  }),
  current_account: M(['current_account'], {
    label: 'Current account balance',
    unit: '% of GDP',
    period: 'annual',
    freshDays: 400,
  }),
  trade_goods: M(['trade_goods'], {
    label: 'Goods exports and imports',
    unit: 'USD',
    period: 'monthly (IMF IMTS)',
    freshDays: 120,
  }),
  bop: M(['bop'], {
    label: 'Balance of payments, financial account',
    unit: 'USD',
    period: 'quarterly (IMF BOP)',
    semantics:
      'financial account only (direct, portfolio, other investment); the current account comes from annual IMF WEO',
    freshDays: 200,
  }),
  external_debt: M(['external_debt'], {
    label: 'External debt (World Bank IDS)',
    unit: 'USD / % of GNI / % of exports; short-term debt as % of total (derive the amount from the total)',
    period: 'annual',
    freshDays: 500,
  }),
  remittances: M(['remittances'], {
    label: 'Personal remittances',
    unit: 'USD / % of GDP',
    period: 'annual',
    freshDays: 500,
  }),
  fx_spot: M(['fx_usd'], {
    label: 'Exchange rate against the US dollar',
    unit: 'local currency per USD',
    period:
      'monthly (BIS); daily only from some national banks (BCB, BCRA, CBN, SARB, BOJ, BoE) until the ECB daily crosses from the macro-intel work load',
    semantics:
      'BIS monthly average or end of period; never a live quote. ECB and BoE publish USD per EUR/GBP: invert before computing',
    freshDays: 10,
    freshDaysMonthlyOnly: 45,
  }),
  fx_effective: M(['fx_effective'], {
    label: 'Effective exchange rates',
    unit: 'index',
    period: 'monthly (BIS nominal and real, broad basket)',
    semantics: 'higher = stronger currency (BIS convention)',
    freshDays: 60,
  }),
  fx_reserves: M(['fx_reserves'], {
    label: 'Official reserve assets',
    unit: 'USD',
    period: 'monthly (IMF reserves; being added)',
    semantics:
      'today only Brazil and Argentina (national series); IMF reserves for all countries come with the macro-intel work. Gross only; net and usable reserves are NOT available',
    freshDays: 75,
  }),
  policy_rate: M(['policy_rate'], {
    label: 'Central bank policy rate',
    unit: '% per year',
    period: 'monthly (BIS); daily being added; national banks',
    freshDays: 45,
  }),
  credit_gap: M(['credit_gap'], {
    label: 'Credit-to-GDP gap',
    unit: 'percentage points',
    period: 'quarterly (BIS)',
    freshDays: 200,
  }),
  debt_service: M(['debt_service'], {
    label: 'Debt service ratios',
    unit: '% of income',
    period: 'quarterly (BIS)',
    freshDays: 200,
  }),
  total_credit: M(['total_credit'], {
    label: 'Total credit to the non-financial sector',
    unit: 'local currency / % of GDP',
    period: 'quarterly (BIS)',
    freshDays: 200,
  }),
  house_prices: M(['house_prices'], {
    label: 'Residential property prices',
    unit: 'index',
    period: 'quarterly (BIS)',
    freshDays: 200,
  }),
  activity: M(['activity'], {
    label: 'Activity indices',
    unit: 'index',
    period: 'monthly',
    freshDays: 90,
  }),
  employment_sector: M(['employment_sector'], {
    label: 'Employment by sector (ILO)',
    unit: 'thousands',
    period: 'annual',
    freshDays: 500,
  }),
  governance: M(['governance'], {
    label: 'Worldwide Governance Indicators',
    unit: 'score (-2.5 to 2.5)',
    period: 'annual',
    freshDays: 500,
  }),
  geopolitical_risk: M(['geopolitical_risk'], {
    label: 'Geopolitical Risk index',
    unit: 'index',
    period: 'monthly (world and 44 countries)',
    semantics:
      'share of news articles on geopolitical tension; a media measure, not an event count',
    freshDays: 60,
  }),
  uncertainty: M(['uncertainty'], {
    label: 'World Uncertainty and Economic Policy Uncertainty indices',
    unit: 'index',
    period: 'quarterly (WUI), monthly (EPU)',
    freshDays: 120,
  }),
  conflict: M(['conflict'], {
    label: 'Organized violence (UCDP)',
    unit: 'deaths / events per month',
    period: 'monthly',
    semantics: 'pending access token: usually unavailable',
    freshDays: 120,
  }),
  news_tone: M(['news_tone'], {
    label: 'News coverage tone (GDELT)',
    unit: 'average tone',
    period: 'daily',
    semantics: 'partial coverage (40 countries)',
    freshDays: 14,
  }),
  oil_production: M(['oil_production'], {
    label: 'Crude oil production',
    unit: 'thousand barrels per day',
    period: 'monthly (EIA, JODI)',
    freshDays: 150,
  }),
  oil_demand: M(['oil_demand'], {
    label: 'Oil demand',
    unit: 'thousand barrels per day',
    period: 'monthly (JODI)',
    freshDays: 150,
  }),
  oil_stocks: M(['oil_stocks'], {
    label: 'Crude oil closing stocks (not products)',
    unit: 'thousand barrels',
    period: 'monthly (JODI)',
    freshDays: 150,
  }),
  refined_products: M(['refined_products'], {
    label: 'Refinery output and diesel demand (intake not shown)',
    unit: 'thousand barrels per day',
    period: 'monthly (JODI)',
    freshDays: 150,
  }),
  gas_production: M(['gas_production'], {
    label: 'Natural gas production',
    unit: 'TJ or million m3',
    period: 'monthly (JODI)',
    freshDays: 150,
  }),
  gas_demand: M(['gas_demand'], {
    label: 'Natural gas demand',
    unit: 'TJ or million m3',
    period: 'monthly (JODI)',
    freshDays: 150,
  }),
  gas_imports: M(['gas_imports'], {
    label: 'Natural gas imports',
    unit: 'TJ or million m3',
    period: 'monthly (JODI)',
    freshDays: 150,
  }),
  gas_stocks: M(['gas_stocks'], {
    label: 'Natural gas stocks',
    unit: 'TJ or million m3',
    period: 'monthly (JODI)',
    freshDays: 150,
  }),
  commodity_price: {
    kind: 'macro',
    families: ['commodity_price'],
    engineSources: ['commodity_series'],
    label: 'Commodity prices',
    unit: 'as published ($/mt, $/bbl, $/kg ...)',
    period: 'monthly (World Bank Pink Sheet, 71 series); daily for a few (kairos_commodity_prices)',
    freshDays: 45,
  },
  power_mix: M(['power_mix'], {
    label: 'Electricity generation mix (Ember)',
    unit: 'TWh / %',
    period: 'annual',
    semantics: 'family exists; Ember rows not loaded yet',
    freshDays: 500,
  }),
  food_prices_local: M(['food_prices_local'], {
    label: 'Local food market prices (FEWS NET)',
    unit: 'local currency per unit',
    period: 'monthly',
    semantics:
      '8,582 FEWS NET retail market-product series; aggregate per country by product median with aggregateFews (macro/catalog.js); report market count',
    freshDays: 90,
  }),
  food_producer_prices: {
    kind: 'macro',
    families: ['food_prices_local'],
    sources: ['faostat'],
    label: 'Producer prices (FAOSTAT, inside the food_prices_local family, source faostat)',
    unit: 'USD per tonne',
    period: 'annual',
    freshDays: 600,
  },
  oecd_macro: {
    kind: 'table',
    tables: ['oecd_series_observations'],
    engineSources: ['macro_country'],
    label: 'OECD Economic Outlook series',
    period: 'annual, often ending 2023-2024 with projections',
    semantics: 'prefer fresher catalogue series when both exist',
    freshDays: 400,
  },
  empire_scores: {
    kind: 'table',
    tables: ['country_dimension_scores_mat', 'empire_countries', 'country_scores_raw'],
    engineSources: ['macro_country'],
    label: 'Ezana Global Empire Rankings',
    period: 'annual composite',
    semantics: 'Ezana composite of long-run national strength dimensions',
    freshDays: 500,
  },
  ports_chokepoints: {
    kind: 'table',
    tables: ['eyes_port_activity', 'eyes_chokepoint_transits', 'eyes_ports'],
    label: 'Shipping activity at ports and chokepoints (IMF PortWatch)',
    period: 'daily/weekly',
    freshDays: 30,
  },

  /* ── Corporate ─────────────────────────────────────────────────────────────── */
  sec_fundamentals: {
    kind: 'engine',
    engineSources: ['company_financials', 'peer_financials', 'capex_monetization'],
    tables: ['sec_fundamentals'],
    label: 'SEC XBRL reported financials (frames API)',
    unit: 'reporting currency',
    period: 'calendar frames (e.g. CY2026Q2), not fiscal periods; about 3 years and 4 quarters',
    release: 'no filed-date column',
    semantics:
      '529k facts, 6,408 tickers, 20 fixed concepts (no SG&A, interest, tax, dividends, buybacks, leases, short-term debt, minorities); latest filed value overwrites restatements, so no as-first-reported history',
    freshDays: 140,
  },
  sec_filings: {
    kind: 'engine',
    engineSources: ['sec_filings', 'disclosures'],
    tables: ['sec_filings', 'company_disclosures'],
    label: 'SEC filing index and disclosures',
    period: 'filing date',
    freshDays: 200,
  },
  filing_passages: {
    kind: 'engine',
    engineSources: ['disclosures'],
    label: 'Filing full text',
    semantics:
      'only 13 companies have full-text passages; management commentary claims are limited elsewhere',
    freshDays: 200,
  },
  company_profile_segments: {
    kind: 'engine',
    engineSources: ['market_snapshot', 'product_segments', 'revenue_geo'],
    label: 'Company profile, segment and geographic revenue (market data provider)',
    period: 'fiscal',
    freshDays: 140,
  },
  analyst_estimates: {
    kind: 'engine',
    engineSources: ['analysts', 'estimates'],
    label: 'Analyst ratings, targets and estimates (attributed)',
    semantics: 'third-party opinions; attribute to the firm',
    freshDays: 60,
  },
  market_prices: {
    kind: 'engine',
    engineSources: ['price_performance', 'market_snapshot'],
    tables: ['price_data_cache'],
    label: 'Market prices and returns',
    period: 'daily',
    semantics:
      'only currently tracked tickers (delisted missing: survivorship risk); single-precision storage',
    freshDays: 5,
  },
  peer_set: {
    kind: 'engine',
    engineSources: ['peer_financials', 'competitive_products', 'value_chain'],
    label: 'Listed peers',
    freshDays: 140,
  },
  exec_comp: {
    kind: 'table',
    tables: ['sec_exec_comp'],
    label: 'Executive compensation',
    period: 'fiscal year',
    freshDays: 500,
  },
  capex_customers: {
    kind: 'engine',
    engineSources: ['customer_capex', 'hyperscaler_capex'],
    label: 'Customer and hyperscaler capex',
    period: 'fiscal quarter',
    freshDays: 140,
  },

  /* ── Ownership ─────────────────────────────────────────────────────────────── */
  holdings_13f: {
    kind: 'engine',
    engineSources: ['holder_positioning'],
    tables: ['sec_13f_holdings', 'titans_13f_positions', 'titans_13f_filers'],
    label:
      '13F institutional holdings (titans_13f_filers is keyed by period and CIK: manager-quarters, not managers)',
    period: 'calendar quarter',
    release: 'up to 45 days after quarter end',
    semantics:
      'long US-listed positions only; no shorts; not current holdings; dedupe across tables',
    freshDays: 140,
  },
  etf_holdings: {
    kind: 'table',
    tables: ['sec_etf_holdings', 'sec_etf_funds'],
    label: 'ETF holdings (46 funds)',
    freshDays: 120,
  },
  activist_stakes: {
    kind: 'table',
    tables: ['sec_activist_positions'],
    label: '13D/G beneficial ownership stakes',
    release: 'filing date',
    freshDays: 200,
  },
  insider_transactions: {
    kind: 'table',
    tables: ['sec_insider_transactions'],
    label: 'Form 4 insider transactions (2,006)',
    release: 'filing date',
    freshDays: 60,
  },

  /* ── Government and politics ─────────────────────────────────────────────── */
  contract_awards: {
    kind: 'engine',
    engineSources: ['contracts_history', 'contracts_profile'],
    tables: [
      'usaspending_contract_awards',
      'company_contract_award_facts',
      'company_contract_top_awards',
    ],
    label: 'Federal prime contract awards (USAspending, types A-D, no subawards)',
    unit: 'USD',
    period:
      'action_date holds the period-of-performance START date (can be future); fiscal_year derived from it; federal FY starts 1 Oct',
    semantics:
      'award_amount = total obligated at sync time, not a ceiling and not an outlay; ceilings and current value only in company_contract_award_facts (limited coverage); no outlays anywhere; never company revenue',
    freshDays: 45,
  },
  contract_history: {
    kind: 'engine',
    engineSources: ['contracts_history', 'contracts_profile'],
    tables: [
      'company_contract_history',
      'gov_contract_recipient_rollup',
      'gov_contract_agency_rollup',
      'contractor_tickers',
    ],
    label: 'Company contract history and rollups',
    period: 'fiscal year',
    semantics: 'recipient-to-ticker mapping is approximate (subsidiaries, joint ventures)',
    freshDays: 60,
  },
  lobbying_filings: {
    kind: 'engine',
    engineSources: [
      'lobbying_company',
      'lobbying_leaders',
      'lobbying_profile',
      'lobbying_associations',
    ],
    tables: ['lobbying_filings', 'lobbying_page_fact', 'lobbying_client_tickers'],
    label: 'Lobbying Disclosure Act filings (2024-2026)',
    unit: 'USD per quarter: one amount column holding income (outside firm) or expenses (self-filer)',
    period: 'quarter',
    semantics:
      "never add a self-filer's expenses to its outside firms' income; registrations carry no spend; specific_issues text only on recent ingests; disclosed advocacy, not proven influence; 370 clients mapped to tickers",
    freshDays: 120,
  },
  lobbying_contributions: {
    kind: 'table',
    tables: ['lobbying_contribution_items', 'lobbying_contribution_reports'],
    label: 'LD-203 contribution reports',
    period: 'semi-annual',
    freshDays: 240,
  },
  congress_trades: {
    kind: 'engine',
    engineSources: ['congress_company', 'congress_sector', 'politician_dossier'],
    tables: ['congress_trades', 'house_trades', 'senate_trades'],
    label: 'Congressional trade disclosures (STOCK Act)',
    unit: 'USD range',
    period:
      'congress_trades (canonical): transaction_date vs disclosure_date, owner, source; house/senate tables: tx_date, notification_date, filing date on the parent filing',
    semantics:
      'show the filed range; a midpoint only as a labelled estimate with bounds; disclosure can be late; no motive',
    freshDays: 60,
  },
  congress_members: {
    kind: 'engine',
    engineSources: ['politician_dossier'],
    tables: ['congress_members', 'congress_committee_members', 'congress_committees'],
    label: 'Members and committee assignments',
    semantics: 'committee seats have no dates: current seats only',
    freshDays: 200,
  },
  congress_bills: {
    kind: 'table',
    tables: ['congress_bills', 'congress_bill_actions', 'congress_bill_subjects'],
    label: 'Bills (small coverage: 90)',
    semantics: 'not a complete legislative record',
    freshDays: 60,
  },
  fec_candidates: {
    kind: 'table',
    tables: ['fec_candidate_totals', 'fec_candidate_donors', 'fec_candidate_outside'],
    label: 'FEC candidate finance (538 candidates)',
    freshDays: 200,
  },
  committee_members: {
    kind: 'table',
    tables: ['congress_committee_members', 'congress_committees'],
    label: 'Committee assignments (3,895 seats)',
    semantics: 'current seats only, no membership dates',
    freshDays: 200,
  },
  contractor_tickers: {
    kind: 'table',
    tables: ['contractor_tickers', 'contractor_recipients', 'contractor_ticker_prefixes'],
    label: 'Contract recipient to ticker mapping (4,040)',
    semantics: 'approximate: subsidiaries and joint ventures may be missed or mismatched',
    freshDays: 200,
  },
  contract_rollups: {
    kind: 'table',
    tables: [
      'gov_contract_recipient_rollup',
      'gov_contract_agency_rollup',
      'mv_contract_award_tickers',
    ],
    label: 'Contract rollups by recipient and agency',
    freshDays: 60,
  },
  lobbying_client_tickers: {
    kind: 'table',
    tables: ['lobbying_client_tickers'],
    label: 'Lobbying clients mapped to tickers (370)',
    freshDays: 200,
  },
  company_disclosures: {
    kind: 'engine',
    engineSources: ['disclosures'],
    tables: ['company_disclosures'],
    label: 'Company disclosures (169 rows)',
    freshDays: 200,
  },
  chips_awards: {
    kind: 'table',
    tables: ['chips_awards', 'chips_award_facilities'],
    label: 'CHIPS Act awards and facilities',
    semantics:
      'NOT in production yet (migration exists, tables absent): always report as unavailable',
    available: false,
    freshDays: 365,
  },
  sanctions_ofac: {
    kind: 'engine',
    engineSources: ['sanctions'],
    tables: [
      'sanctions_entries',
      'sanctions_aliases',
      'sanctions_identifiers',
      'sanctions_links',
      'sanctions_listing_dates',
    ],
    label: 'OFAC SDN list',
    semantics:
      'name match is not identity; not a legal determination. Listing date = sanctions_listing_dates.listed_on (first_seen is Ezana load date; removed_on is when Ezana noticed removal)',
    freshDays: 7,
  },
  sanctions_intl: {
    kind: 'engine',
    engineSources: ['sanctions'],
    tables: ['sanctions_intl_entries'],
    label: 'EU, UK and UN sanctions lists',
    semantics: 'EU asset-freeze list does not cover sectoral measures',
    freshDays: 7,
  },
  export_controls: {
    kind: 'engine',
    engineSources: ['export_controls'],
    tables: ['export_control_entries', 'export_control_rules'],
    label: 'US export controls (Entity List, Military End-User List, Unverified List)',
    semantics: 'rule publication and effective dates in export_control_rules',
    freshDays: 30,
  },

  /* ── Other ─────────────────────────────────────────────────────────────────── */
  prediction_markets: {
    kind: 'engine',
    engineSources: ['prediction_markets'],
    tables: ['prediction_market_index', 'prediction_market_snapshots'],
    label: 'Prediction markets (Polymarket, Kalshi, Manifold play money)',
    unit: 'price 0-1; volume in dollars (Polymarket), contracts (Kalshi), mana (Manifold)',
    semantics:
      'open markets only, closed rows deleted about 30 days after end, no resolved outcomes stored (no Brier score from Ezana data alone); snapshots every ~2 hours kept 35 days; price is last trade or displayed price, not a calibrated probability',
    freshDays: 2,
  },
  news: {
    kind: 'engine',
    engineSources: ['news'],
    tables: ['news_articles_cache'],
    label: 'News (about five weeks of history)',
    freshDays: 3,
  },
  echo: { kind: 'engine', engineSources: ['echo'], label: 'Ezana Echo editorial', freshDays: 365 },
  industry_registry: {
    kind: 'engine',
    engineSources: ['industry_registry', 'value_chain'],
    label:
      'Industry registry (semiconductors: 19 companies; aerospace and defense stages without companies)',
    semantics: 'not comprehensive sector intelligence',
    freshDays: 365,
  },
  competitor_milestones: {
    kind: 'engine',
    engineSources: ['competitive_products'],
    tables: ['competitive_products'],
    label:
      'Competitor product milestones (competitive_products: 6 approved rows, all accelerators vs NVIDIA and AMD)',
    freshDays: 365,
  },
  ipo_filings: {
    kind: 'engine',
    engineSources: ['ipo_filings'],
    label: 'IPO filings',
    freshDays: 30,
  },
  org_portfolio: {
    kind: 'tenant',
    engineSources: ['fund_mandate'],
    tables: ['org_fund_snapshots'],
    label: 'Organization fund positions (org position book)',
    semantics:
      'active organization only, membership and RLS enforced; positions carry no cash; org_fund_snapshots.return_pct is unrealised gain on current holdings over cost, not time-weighted; benchmark may be a proxy (benchmark_source)',
    tenantScoped: true,
    freshDays: 7,
  },
  org_ips: {
    kind: 'tenant',
    engineSources: ['fund_mandate'],
    tables: ['org_ips_rules', 'org_research_methodology'],
    label: 'Organization investment policy (org_ips_rules) and research methodology',
    semantics:
      'fund-fit check evaluates prohibited_sector and min_market_cap (unknown when the profile lacks the field), reports min_positions and max_single_trade_pct as information, and cannot check cash_floor_pct (positions carry no cash)',
    tenantScoped: true,
    freshDays: 365,
  },
  org_research_notes: {
    kind: 'tenant',
    tables: ['org_research_notes', 'org_pitches'],
    label: 'Organization research notes and pitches',
    tenantScoped: true,
    freshDays: 365,
  },
};

/** Engine source ids needed for a set of capabilities (deduplicated, for the planner). */
export function engineSourcesFor(capabilityIds = []) {
  const out = new Set();
  for (const id of capabilityIds) {
    const c = CAPABILITIES[id];
    if (!c) continue;
    if (c.kind === 'macro') out.add('macro_series');
    (c.engineSources || []).forEach((s) => out.add(s));
  }
  return [...out];
}

/** Macro catalogue families needed for a set of capabilities. */
export function macroFamiliesFor(capabilityIds = []) {
  const out = new Set();
  for (const id of capabilityIds) (CAPABILITIES[id]?.families || []).forEach((f) => out.add(f));
  return [...out];
}

/** Is an observation stale for its capability? `period` is the observation's period string. */
export function isStale(capabilityId, period, { now = new Date(), monthlyOnly = false } = {}) {
  const c = CAPABILITIES[capabilityId];
  if (!c || !period) return true;
  const limit = monthlyOnly && c.freshDaysMonthlyOnly ? c.freshDaysMonthlyOnly : c.freshDays || 365;
  const end = periodEnd(period);
  if (!end) return true;
  return (now - end) / 864e5 > limit;
}

/** Last day covered by a period string: YYYY, YYYY-Qn, YYYY-MM, YYYY-MM-DD. */
export function periodEnd(p) {
  const s = String(p);
  let m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s))) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if ((m = /^(\d{4})-(\d{2})$/.exec(s))) return new Date(Date.UTC(+m[1], +m[2], 0));
  if ((m = /^(\d{4})-Q([1-4])$/.exec(s))) return new Date(Date.UTC(+m[1], +m[2] * 3, 0));
  if ((m = /^(\d{4})$/.exec(s))) return new Date(Date.UTC(+m[1], 11, 31));
  return null;
}
