/**
 * Sonar 6.2 (Nov 28 2026): evidence demand, the router's typed signal.
 *
 * The analyst router scored specialists on the research spec's coarse domains and the
 * macro router's themes. The analyst evaluations (253 cases) showed that this misses
 * what a question asks to measure: "Which ETFs hold the most Palantir?" went to the
 * congress analyst, prediction-market questions to the macroeconomist, "Is Italy's
 * government debt sustainable?" to the FX strategist, "What was Intel's free cash
 * flow?" to no one. 108 of the 181 failing cases had the wrong lead.
 *
 * A question demands evidence. Each concept below is a kind of financial evidence, bound
 * to the dataset capabilities (dataset-capabilities.js) it needs and to the analyst whose
 * profile owns that evidence. The concepts are generic financial vocabulary (holders,
 * filings, flows, measures, instruments), never company, person or country names, so a
 * new subject needs no new rule.
 *
 * evidenceDemand(question) returns the concepts in the order the question states them;
 * the router lets the owner of the first concept lead and the owners of the others
 * support, and plans every demanded capability.
 *
 * Pure, client-safe.
 */

/* id, owner analyst, capabilities, pattern (case-insensitive, word-bounded). Ordered from
   specific to general where two concepts can match the same words. */
export const CONCEPTS = [
  /* Holders and flows */
  {
    id: 'etf_holdings',
    owner: 'ownership-analyst',
    caps: ['etf_holdings', 'holdings_13f'],
    re: /\betfs?\b(?=[^.?!]{0,40}\b(?:hold|own|weight|exposure))|\b(?:hold|own)\w*\b[^.?!]{0,25}\betfs?\b/,
  },
  {
    id: 'activist_stakes',
    owner: 'ownership-analyst',
    caps: ['activist_stakes', 'holdings_13f'],
    re: /\bactivists?\b|\b13d\b|\bschedule 13[dg]\b/,
  },
  {
    id: 'insider_transactions',
    owner: 'ownership-analyst',
    caps: ['insider_transactions'],
    re: /\binsiders?\b|\bexecutives?\b[^.?!]{0,30}\b(?:sold|sell|selling|bought|buy|buying)\b|\bform 4\b/,
  },
  {
    id: 'institutional_holdings',
    owner: 'ownership-analyst',
    caps: ['holdings_13f'],
    re: /\b13f\b|\binstitution(?:s|al)\b|\b(?:hedge|mutual|pension|index)\s+funds?\b|\bbig funds\b|\bwhich funds\b|\bfunds?\s+(?:added|sold|bought|own|hold|dumping|selling|buying)\b|\bsmart money\b|\bcrowded\b|\b(?:asset|money|fund)\s+managers?\b|\bwhat does [\w.& ]+ own\b|\bowned by investment firms\b/,
  },
  {
    id: 'committee_trades',
    owner: 'congress-analyst',
    caps: ['congress_trades', 'committee_members', 'congress_members'],
    re: /\bcommittee\s+members?\b[^.?!]{0,60}\b(?:trad|bought|buy|sold|sell)\w*|\b(?:sit|sits|serve|serves)\s+on\s+the\s+[\w\s]{2,30}committee\b[^.?!]{0,60}\b(?:trad|bought|sold)\w*/,
  },
  {
    id: 'congress_trades',
    owner: 'congress-analyst',
    caps: ['congress_trades', 'congress_members'],
    /* The skill: votes or speeches with no trading angle are out of scope. */
    needs:
      /\b(?:trad\w*|bought|buy\w*|sold|sell\w*|disclos\w*|portfolio|holdings?|stocks?|shares|basket)\b/,
    re: /\b(?:members?\s+of\s+)?congress(?:ional|man|woman)?\b|\bsenators?\b|\brepresentatives?\b|\blawmakers?\b|\bstock act\b|\bmembers\b[^.?!]{0,30}\btrad\w*/,
  },
  /* The organization's own book (the router admits it only with an organization). */
  {
    id: 'portfolio_book',
    owner: 'portfolio-analyst',
    caps: ['org_portfolio', 'org_ips', 'market_prices'],
    framing: true,
    re: /\bour (?:student )?(?:fund|portfolio|book)(?:'s)?\b[^.?!]{0,40}\b(?:exposed|exposure|crowded|weights?|concentrat\w*|performance|beta|value at risk|var|drawdown|risk)\b|\b(?:exposed|exposure)\b[^.?!]{0,30}\bour (?:student )?(?:fund|portfolio|book)\b|\b(?:stocks|positions|names|holdings) in our (?:fund|portfolio|book)\b|\bour ips\b|\bips (?:rules|requires)\b|\bsector weights\b|\bour fund mirrors\b|\bhow (?:did|does) our (?:fund|portfolio)\b|\baffect\w* our (?:fund|portfolio)\b|\bin our (?:student )?(?:fund|portfolio|book)\b(?=[^.?!]*\b(?:rates?|stress|scenario|fall|jump)\b)/,
  },
  /* Government money */
  {
    id: 'contract_awards',
    owner: 'contracts-analyst',
    caps: ['contract_awards', 'contract_history', 'contractor_tickers', 'contract_rollups'],
    re: /\brevenues?\b[^.?!]{0,30}\bfrom\b[^.?!]{0,25}\b(?:federal|government|u\.?s\.? government|dod|pentagon)\b|(?<!\b(?:employment|labou?r|futures|options|smart|swap|derivatives?|forward)\s)\bcontracts?\b|\bcontractors?\b|\bawards?\b|\bobligations\b|\bpentagon\b|\bdod\b|\bprime contract\b|\bgovernment business\b|\bagencies\b[^.?!]{0,30}\bdepend\w*|\bdepend\w*\b[^.?!]{0,30}\bagencies\b|\bfederal (?:revenue|spending)\b/,
  },
  {
    id: 'lobbying',
    owner: 'lobbying-analyst',
    caps: ['lobbying_filings', 'lobbying_client_tickers'],
    /* The skill: state lobbying is not in the federal LDA data. */
    unless: /\blegislature\b|\bstate (?:house|senate|capitol|lobbying)\b/,
    re: /\blobby\w*\b/,
  },
  {
    id: 'legislation',
    owner: 'lobbying-analyst',
    caps: ['congress_bills', 'lobbying_filings'],
    re: /\bbill\b[^.?!]{0,40}\bpass\w*|\blegislation\b|\bmarket structure bill\b/,
  },
  {
    id: 'sanctions',
    owner: 'sanctions-analyst',
    caps: ['sanctions_ofac', 'sanctions_intl', 'export_controls'],
    re: /\bsanction\w*\b|\bentity list\b|\bexport controls?\b|\bofac\b/,
  },
  /* Markets and statistics */
  {
    id: 'prediction_markets',
    owner: 'prediction-analyst',
    caps: ['prediction_markets'],
    framing: true,
    re: /\bprediction markets?\b|\bpolymarket\b|\bkalshi\b|\bbetting (?:odds|markets?)\b|\b(?:what|which) (?:do )?markets? (?:say|price)\b|\bmarkets? price for\b|\bodds\b|\bcalibrat\w*\b|\bcontract settles?\b|\bsettles? on\b|\bmarket says \d/,
  },
  {
    id: 'statistical_test',
    owner: 'quant-analyst',
    caps: ['market_prices'],
    framing: true,
    re: /\bback-?test\w*\b|\brelationship between\b|\bcorrelat\w*\b|\breact(?:ed|ion)?\b[^.?!]{0,30}\b(?:to|after)\b|\bvolatil\w*\b[^.?!]{0,40}\bcompared\b|\bstatistic\w*\b|\btest it\b|\bbeat the (?:market|s&p)\b|\bmoving[- ]average\b|\bover-?fit\w*\b|\bdata[- ]mining\b|\brun the numbers\b|\bdo stocks (?:rise|fall)\b|\boutperform\w*\b/,
  },
  /* Company fundamentals and valuation */
  {
    id: 'valuation',
    owner: 'valuation',
    caps: ['sec_fundamentals', 'market_prices', 'analyst_estimates'],
    framing: true,
    /* "Overvalued" said of a currency, or "expensive" said of bread, is not equity valuation. */
    unlessConcept: ['currency', 'food_security'],
    re: /\bvaluations?\b|\bworth\b|\bprice target\b|\bdcf\b|\bintrinsic\b|\bunder-?valued\b|\bover-?valued\b|\bcheap\b|\bexpensive\b|\bmultiples?\b|\bp\/e\b|\bfree cash flow yield\b|\bfcf yield\b|\bpricing in(?:to)?\b|\bpriced in\b|\bbull,? base and bear\b|\bexact price\b|\bwill hit\b/,
  },
  {
    id: 'company_fundamentals',
    owner: 'equity-research',
    caps: ['sec_fundamentals', 'company_profile_segments', 'sec_filings'],
    re: /\bmargins?\b|\brevenues?\b|\bfree cash flow\b|\bfcf\b|\bdebt maturit\w*\b|\bearnings\b|\binventor(?:y|ies)\b|\bsegments?\b|\bbalance sheet\b|\bcash flow\b|\bgross profit\b|\boperating income\b|\bguidance\b|\bcooks? (?:its|the) books\b|\baccounting\b|\bsales\b/,
  },
  {
    id: 'competition',
    owner: 'industry-analyst',
    caps: ['peer_set', 'company_profile_segments', 'industry_registry', 'competitor_milestones'],
    framing: true,
    re: /\bmarket share\b|\b(?:gaining|taking|losing) share\b|\bshare of\b[^.?!]{0,30}\b(?:market|dollars|spending)\b|\bcompetitors?\b|\bcompetition\b|\bcompeting\b|\bvalue chain\b|\bmoat\b|\bvalue capture\b|\bcapturing\b|\bmarket structure\b(?![^.?!]{0,10}\bbill)|\bmarket growing\b|\bsustainable for\b[^.?!]{0,30}\bsuppliers\b|\boutlook for\b[^.?!]{0,40}\b(?:stocks|sector|industry)\b|\btariffs?\b[^.?!]{0,60}\baffect\b/,
  },
  /* Macro, rates, currencies, sovereigns */
  {
    id: 'sovereign_debt',
    owner: 'sovereign-risk',
    caps: ['gov_debt', 'external_debt', 'current_account', 'fx_reserves'],
    framing: true,
    re: /\b(?:government|public|sovereign)\s+debt\b|\bdebt (?:path|dynamics|sustainab\w*)\b|\binterest bill\b|\bdefault\w*\b|\bexternal (?:debt|financing|position|funding)\b|\bfunding squeeze\b|\breserves\b|\bcurrent account\b|\bshort-term obligations\b|\bcds\b|\bfinancing crisis\b|\bin crisis\b|\bimf (?:program|programme|bailout)\b|\bdebt (?:is )?sustainable\b/,
  },
  {
    id: 'rates',
    owner: 'rates-strategist',
    caps: ['policy_rate', 'inflation_monthly', 'market_prices'],
    re: /\byield curve\b|\btreasur(?:y|ies)\b|\b10-year\b|\bbond yields?\b|\breal (?:interest )?rates?\b|\b(?:finished|stop|start)\w* (?:cutting|hiking)\b|\bcentral banks?\b[^.?!]{0,40}\b(?:rates?|cut|hike)\w*|\brates? (?:cuts?|hikes?)\b|\bfed cuts?\b|\bduration\b|\bconvexity\b|\blong bonds?\b|\bbank of (?:england|japan|canada)\b|\bthe fed\b/,
  },
  {
    id: 'currency',
    owner: 'fx-strategist',
    caps: ['fx_spot', 'fx_effective'],
    re: /\bcurrenc(?:y|ies)\b|\bexchange rates?\b|\bfx\b|\b(?:krone|krona|peso|real|lira|rupee|rupiah|yen|yuan|renminbi|won|rand|ruble|euro|sterling|naira|cedi|shilling|forint|zloty)\b|\bstronger (?:us )?dollar\b|\bweaker (?:us )?dollar\b|\bdollar strength\b/,
  },
  {
    id: 'macro_cycle',
    owner: 'macroeconomist',
    caps: ['gdp_growth', 'inflation_monthly', 'unemployment', 'policy_rate'],
    re: /\binflation\b|\bgdp\b|\brecession\b|\bgrowth (?:slowdown|rate)\b|\bslowdown\b|\bunemployment\b|\beconomy\b|\bprovinces?\b/,
  },
  /* Real economy */
  {
    id: 'food_security',
    owner: 'food-analyst',
    caps: ['food_prices_local', 'commodity_price'],
    re: /\bfood (?:prices?|crisis|inflation|security|insecurity)\b|\bsorghum\b|\bmaize\b|\bwheat\b|\bbread\b|\brice prices?\b|\bstaples?\b|\bgrain-importing\b|\blean season\b|\bfamine\b|\bcrop failure\b|\bdrought\b/,
  },
  {
    id: 'commodities',
    owner: 'commodities-analyst',
    caps: ['commodity_price', 'gas_stocks', 'gas_demand', 'oil_production'],
    re: /\boil\b|\bcrude\b|\bnatural gas\b|\bgas (?:storage|prices?|supply|stocks)\b|\blng\b|\bfertili[sz]ers?\b|\bcrop costs\b|\bcopper\b|\bgold\b|\bmetals?\b|\bopec\b|\bcommodit\w*\b/,
  },
  {
    id: 'geopolitics',
    owner: 'geopolitical-analyst',
    caps: ['geopolitical_risk', 'conflict', 'ports_chokepoints'],
    re: /\belections?\b|\bceasefire\b|\bwar\b|\bconflict\b|\bdisrupt\w*\b|\bhormuz\b|\bred sea\b|\bstrait\b|\bcoup\b|\binvasion\b|\bshipping\b|\bblockade\b/,
  },
];

const RES = CONCEPTS.map((c) => ({ ...c, rx: new RegExp(c.re.source, 'gi') }));

/**
 * The concepts a question demands, in the order it states them (first mention first).
 * @returns {{ id: string, owner: string, caps: string[], at: number }[]}
 */
export function evidenceDemand(question) {
  const q = String(question || '');
  let hits = [];
  for (const c of RES) {
    c.rx.lastIndex = 0;
    const m = c.rx.exec(q);
    if (!m) continue;
    if (c.needs && !new RegExp(c.needs.source, 'i').test(q)) continue;
    if (c.unless && new RegExp(c.unless.source, 'i').test(q)) continue;
    hits.push({
      id: c.id,
      owner: c.owner,
      caps: c.caps,
      at: m.index,
      framing: Boolean(c.framing),
      unlessConcept: c.unlessConcept || null,
    });
  }
  const ids = new Set(hits.map((h) => h.id));
  hits = hits.filter((h) => !(h.unlessConcept || []).some((x) => ids.has(x)));
  /* Earliest first; at the same position the more specific concept (earlier in CONCEPTS). */
  return hits.sort((a, b) => a.at - b.at);
}

/**
 * The concept that defines the question: the earliest framing concept (a test, a market
 * price, a valuation, a competitive share, a debt sustainability question, the
 * organization's book), else the earliest concept. A framing asks what to do with the
 * measures around it ("what revenue growth is the market pricing in" is a valuation).
 */
export function primaryConcept(demand, { orgId = null } = {}) {
  const usable = demand.filter((d) => d.id !== 'portfolio_book' || orgId);
  return usable.find((d) => d.framing) || usable[0] || null;
}

/** The owners in demand order, each once. */
export function demandedOwners(demand) {
  const out = [];
  for (const d of demand) if (!out.includes(d.owner)) out.push(d.owner);
  return out;
}
