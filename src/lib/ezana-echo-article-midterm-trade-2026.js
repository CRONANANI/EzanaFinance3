// src/lib/ezana-echo-article-midterm-trade-2026.js
// Ezana Echo DRAFT article: the November 2026 midterms as a market event.
// Written from the Aug 11, 2026 vantage. status: 'draft' keeps this off every
// public surface until the FACT CHECK MANIFEST below is cleared.
// ============================================================
// FACT CHECK MANIFEST (status: draft, nothing publishes until cleared)
// 1. Election day is November 3, 2026, and Aug 11 is 84 days out -> [VERIFY: US election calendar]
// 2. Polymarket prices Democrats at roughly 62% to win House control -> [VERIFY: Polymarket "Which party will control the House after the 2026 midterms?" market]
// 3. Polymarket / Kalshi price Republicans at roughly 71% to hold Senate control -> [VERIFY: Polymarket Senate-control market; Kalshi Senate CONTROL contract]
// 4. Crossing the two chamber markets implies roughly 46% for a D-House / R-Senate split -> [VERIFY: derived from live Polymarket/Kalshi pricing; independence assumption noted in text]
// 5. Congressional trade filings are running roughly 40% above the 2025 pace -> [VERIFY: Quiver Quantitative congressional trading dashboard]
// 6. Roughly 7,700 periodic-transaction-report line items filed YTD through Aug 8 -> [VERIFY: Quiver Quantitative filing counts]
// 7. Polymarket House-control market lifetime volume roughly $180 million -> [VERIFY: Polymarket market page volume readout]
// 8. Kalshi lists CFTC-regulated House-control and Senate-control event contracts -> [VERIFY: Kalshi CONTROL-series tickers, e.g. the House/Senate control listings]
// 9. Kalshi's 2024 federal court win allowed US-regulated congressional-control contracts -> [VERIFY: Kalshi v. CFTC, DC district court ruling, Sep 2024]
// 10. Kalshi and Polymarket odds on chamber control sit within 2-3 points of each other -> [VERIFY: side-by-side odds comparison on pull date]
// 11. Tarek Mansour is Kalshi's co-founder and CEO -> [VERIFY: Kalshi corporate site]
// 12. The president's party has lost an average of roughly 26 House seats in postwar midterms -> [VERIFY: American Presidency Project / Brookings midterm seat-loss tables]
// 13. Republicans hold the House by roughly a 220-215 margin, so Democrats need a net gain of only about 3 seats -> [VERIFY: current House party division, Clerk of the House]
// 14. The 2026 Senate map has 33 Class 2 seats up, with roughly 22 Republican-held, mostly in safe states -> [VERIFY: Cook Political Report 2026 Senate ratings]
// 15. Democrats need a net gain of 4 Senate seats for outright control -> [VERIFY: current 53-47 Senate party division]
// 16. In October 2022 prediction markets priced a Republican Senate takeover near 75%, and Democrats held 51-49 -> [VERIFY: Polymarket/PredictIt 2022 price history; 2022 election results]
// 17. STOCK Act requires disclosure of trades above $1,000 within 45 days -> [VERIFY: STOCK Act of 2012 statutory text]
// 18. Monthly congressional filing counts Jan-Aug 2026 (FIG. 1 bars: 820, 760, 1140, 980, 1060, 1210, 1330, 410 partial) -> [VERIFY: Quiver Quantitative monthly filing counts]
// 19. House GOP control odds path Jan-Aug 2026 (FIGs 1 and 3 line: 48, 46, 44, 43, 41, 40, 39, 38) -> [VERIFY: Polymarket/Kalshi House-control price history]
// 20. Senate GOP control odds path Jan-Aug 2026 (FIGs 1 and 3 line: 66, 65, 67, 68, 69, 70, 72, 71) -> [VERIFY: Polymarket/Kalshi Senate-control price history]
// 21. Defense and aerospace buys (LMT, GD, RTX) clustered ahead of the summer NDAA markup -> [VERIFY: Quiver Quantitative sector tagging; House/Senate Armed Services markup calendar]
// 22. Bank and financial-sector purchases concentrated among members sitting on House Financial Services -> [VERIFY: Quiver Quantitative committee cross-reference]
// 23. Marjorie Taylor Greene ranks among the most frequent individual filers in 2026 -> [VERIFY: Quiver Quantitative / Unusual Whales filer leaderboards]
// 24. Ro Khanna's high filing count is driven by diversified family-trust accounts -> [VERIFY: Khanna periodic transaction reports; prior press coverage of his trust disclosures]
// 25. Scenario odds: R sweep ~29%, D-House/R-Senate ~46%, D sweep ~17%, R-House/D-Senate ~8% -> [VERIFY: derived from chamber-market pricing on pull date]
// 26. FY-2027 government funding deadline of October 1, 2026 falls 33 days before the election -> [VERIFY: federal fiscal-year calendar]
// 27. The S&P 500 has been higher in the 12 months following every midterm election since 1946 -> [VERIFY: US Bank / Deutsche Bank midterm studies]
// 28. Average 12-month post-midterm S&P 500 return roughly +15% -> [VERIFY: same midterm studies]
// 29. Midterm years carry the largest average intra-year drawdowns of the cycle, roughly 17-19% -> [VERIFY: LPL/Carson presidential-cycle drawdown data]
// 30. Health care has historically been among the best-performing sectors in post-midterm windows -> [VERIFY: Strategas / Fidelity sector seasonality research]
// 31. Defense budgets have grown under both sweep and divided-government configurations -> [VERIFY: historical DoD topline appropriations by Congress control]
// 32. Roughly 45 House members are retiring or seeking other office, elevating open-seat counts -> [VERIFY: Ballotpedia 2026 House retirement tracker]
// 33. Democrats have overperformed 2024 partisan baselines by mid-single digits in 2025-26 special elections -> [VERIFY: special-election margin trackers, e.g. Split Ticket / DDHQ]
// 34. Mid-decade redistricting fights in Texas and California shifted several seats' partisan lean -> [VERIFY: 2025-26 redistricting litigation and map coverage]
// 35. Mike Johnson is Speaker of the House -> [VERIFY: current House leadership]
// 36. Sector-implication mapping in FIG. 2 (defense, banks, drug pricing, permitting, shutdown risk by scenario) -> [VERIFY: editorial synthesis; each cell note against cited policy agendas]
// 37. Globe-rail metric series (House GOP odds Jan 48% to Aug 38%) -> [VERIFY: same price history as claim 19]
// 38. Kalshi and Polymarket are both headquartered in New York -> [VERIFY: company registrations / corporate sites]
// 39. ITA holds a broad basket of US aerospace and defense primes including LMT -> [VERIFY: iShares ITA holdings list]
// 40. Stat-grid values (62%, 71%, ~46%, ~7,700 filings +40%) -> [VERIFY: claims 2, 3, 4, 5, 6 above]
// ============================================================

export const midtermTrade2026 = {
  id: 'midterm-trade-2026',
  title:
    'The Midterm Trade: Markets Price a Split Verdict in November While Congress Repositions Its Own Portfolios',
  excerpt:
    'Eighty-four days from the November 2026 midterms, prediction markets price Democrats near 62% to take the House and Republicans near 71% to hold the Senate [VERIFY: Polymarket/Kalshi]. Congressional trade filings are running roughly 40% above their 2025 pace [VERIFY: Quiver Quantitative], and the sectors being bought are the ones divided government historically rewards.',
  heroImage: {
    src: '/images/ezana-echo/midterm-trade-2026-hero.png',
    alt: 'Illustration of the US Capitol dome split between red and blue, overlaid with a prediction-market price chart and a ballot box.',
    caption:
      'Editorial illustration. Chamber-control odds in this article are drawn from Polymarket and Kalshi event-contract pricing; congressional trading figures from STOCK Act disclosures as compiled by Quiver Quantitative.',
  },
  category: 'politics-policy',
  subcategory: 'Elections',
  globeRail: {
    metric: {
      title: 'HOUSE GOP CONTROL ODDS · 2026',
      data: [
        { x: 0, y: 48 },
        { x: 1, y: 46 },
        { x: 2, y: 44 },
        { x: 3, y: 43 },
        { x: 4, y: 41 },
        { x: 5, y: 40 },
        { x: 6, y: 39 },
        { x: 7, y: 38 },
      ],
      startLabel: 'Jan · 48%',
      endLabel: 'Aug · 38%',
      note: 'Prediction markets have marked House Republicans down from a near coin-flip in January to roughly 38% by August 11, while Senate GOP hold odds firmed from 66% to 71% over the same stretch. The modal outcome is a split verdict: a Democratic House against a Republican Senate.',
    },
    cities: [
      {
        name: 'Washington',
        country: 'US',
        lat: 38.9,
        lng: -77.04,
        impact:
          'Congress votes on an FY-2027 funding deadline of October 1, just 33 days before the election, while its members have filed roughly 7,700 STOCK Act trade disclosures year to date, about 40% above the 2025 pace. Defense, financial, and energy names dominate the buy-side clusters as the November map firms up.',
      },
      {
        name: 'New York',
        country: 'US',
        lat: 40.71,
        lng: -74.01,
        impact:
          'Both major US prediction-market venues, Polymarket and CFTC-regulated Kalshi, operate from New York. Their chamber-control contracts have absorbed nine-figure volume and now serve as the market consensus on November: Democrats favored in the House, Republicans favored in the Senate.',
      },
      {
        name: 'Austin',
        country: 'US',
        lat: 30.27,
        lng: -97.74,
        impact:
          'Texas sits at the center of the mid-decade redistricting fight that reshaped several districts before the filing deadlines. The litigation, and California countermoves, injected the largest single-month swings into House-control odds during the spring.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  meta: {
    sectors: ['Financials', 'Energy', 'Health Care', 'Industrials'],
    industries: ['Aerospace & Defense', 'Regional Banks', 'Pharmaceuticals'],
    investors: ['Marjorie Taylor Greene', 'Ro Khanna'],
    institutions: ['Quiver Quantitative', 'Lockheed Martin', 'Unusual Whales'],
    government: ['US Congress', 'CFTC'],
    geos: ['United States'],
    assetClasses: ['Equities', 'Event Contracts'],
    themes: ['Elections', 'Congressional Trading', 'Prediction Markets', 'Divided Government'],
    datasets: ['Congressional trading', 'Prediction-market odds'],
    markets: ['Polymarket', 'Kalshi'],
  },
  tickers: ['ITA', 'LMT', 'XLF', 'KRE', 'XLV', 'XLE', 'GD', 'SPY'],
  entities: {
    people: [
      {
        id: 'tarek-mansour',
        label: 'Tarek Mansour',
        role: 'Co-founder and CEO, Kalshi',
      },
      {
        id: 'marjorie-taylor-greene',
        label: 'Marjorie Taylor Greene',
        role: 'US Representative; among the most frequent 2026 trade filers',
      },
      {
        id: 'ro-khanna',
        label: 'Ro Khanna',
        role: 'US Representative; high filing count via family trusts',
      },
      {
        id: 'mike-johnson',
        label: 'Mike Johnson',
        role: 'Speaker of the House',
      },
    ],
    terms: [
      { id: 'leading-vs-lagging-indicators', label: 'Leading vs. lagging indicators' },
      { id: 'regulatory-catalyst', label: 'Regulatory catalyst' },
      { id: 'sector-rotation', label: 'Sector rotation' },
      { id: 'concentration-risk', label: 'Concentration risk' },
    ],
  },
  readTime: 9,
  publishedAt: '2026-08-11',
  listMeta: '11 Aug 2026',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  status: 'draft',
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'Eighty-four days before the November 3 midterms [VERIFY: US election calendar], the market has already voted. Prediction markets price Democrats at roughly 62% to take the House [VERIFY: Polymarket House-control market] while giving Republicans roughly 71% to hold the Senate [VERIFY: Polymarket/Kalshi Senate-control pricing], a combination that makes a split verdict, not a wave, the modal outcome at roughly 46% [VERIFY: derived from chamber-market pricing]. Congress itself is trading as if it agrees: members have filed roughly 7,700 securities-transaction disclosures year to date, about 40% above the 2025 pace [VERIFY: Quiver Quantitative], with the buy-side clusters concentrated in exactly the sectors that divided-government history rewards. This article crosses the two datasets, the odds and the trades, and maps what each November scenario would do to them.',
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'House control · Democrats',
          value: '~62%',
          change: 'Polymarket/Kalshi, Aug 11 [VERIFY]',
        },
        {
          label: 'Senate control · GOP hold',
          value: '~71%',
          change: 'Event-contract pricing [VERIFY]',
        },
        {
          label: 'Split-verdict odds',
          value: '~46%',
          change: 'D House x R Senate, crossed [VERIFY]',
        },
        {
          label: 'Congressional trade filings YTD',
          value: '~7,700',
          change: '+40% vs 2025 pace [VERIFY: Quiver]',
        },
      ],
    },
    {
      type: 'heading',
      text: 'What the prediction markets are pricing',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "The chamber-control markets are no longer a curiosity. Polymarket's House-control market has absorbed roughly $180 million in lifetime volume [VERIFY: Polymarket market page], and Kalshi, the CFTC-regulated exchange run by co-founder [[person:tarek-mansour]]Tarek Mansour[[/person]], lists parallel House and Senate control contracts whose prices sit within 2 to 3 points of Polymarket's [VERIFY: side-by-side odds on pull date]. Kalshi's 2024 federal court victory made congressional-control contracts legal for US traders [VERIFY: Kalshi v. CFTC ruling], which means the November odds now carry regulated, dollar-weighted conviction rather than pundit sentiment. Treated as [[kw:leading-vs-lagging-indicators]]leading indicators[[/kw]], the contracts have one clear advantage over polling: they update continuously, and they force whoever disagrees to pay for the privilege.",
    },
    {
      type: 'paragraph',
      text: "The split the markets price is structurally grounded. The president's party has lost an average of roughly 26 House seats in postwar midterms [VERIFY: American Presidency Project seat-loss tables], and Republicans defend a majority of only about 220 to 215, so Democrats need a net gain of just 3 seats [VERIFY: House party division]. The Senate math runs the other way: the 2026 map puts 33 Class 2 seats up, roughly 22 of them Republican-held but concentrated in safe states [VERIFY: Cook Political Report ratings], and Democrats need a net gain of 4 for outright control [VERIFY: 53-47 division]. A hostile House map for the incumbent party and a friendly Senate map for the same party is precisely the configuration that produces a 62/71 divergence.",
    },
    {
      type: 'paragraph',
      text: 'The markets also deserve their caveat paragraph. In mid-October 2022, prediction markets priced a Republican Senate takeover near 75%; Democrats held the chamber 51 to 49 three weeks later [VERIFY: 2022 price history and results]. Event-contract liquidity thins badly in state-level markets, tail buyers can distort prices ahead of catalysts, and a chamber market is only as good as the seat-by-seat markets beneath it. The honest read is that the odds are the best single summary of the race available on any given day, not a forecast with error bars small enough to lever.',
    },
    {
      type: 'heading',
      text: 'Congress trades its own map',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'While the odds moved, the filers filed. Under the STOCK Act, members must disclose securities trades above $1,000 within 45 days [VERIFY: STOCK Act text], and those periodic transaction reports, as compiled by Quiver Quantitative, are running at roughly 7,700 line items year to date through August 8, about 40% above the comparable 2025 pace [VERIFY: Quiver Quantitative filing counts]. The monthly shape matters as much as the level: filing volume spiked in March, as candidate filing deadlines locked the November map, and again in June and July as the primary calendar and the appropriations fight converged [VERIFY: monthly filing counts]. FIG. 1 lays that filing rhythm against the chamber-control odds.',
    },
    {
      type: 'multi-axis',
      figureLabel: 'FIG. 1 · TRADES AGAINST THE ODDS',
      kicker:
        'BARS: DISCLOSED CONGRESSIONAL TRADE FILINGS PER MONTH · LINES: HOUSE GOP AND SENATE GOP CONTROL ODDS (%) · JAN-AUG 2026 · AUG IS PARTIAL (THROUGH AUG 11). EACH SERIES ON ITS OWN AXIS.',
      hint: 'Hover any month for all three series; August bar is a partial month.',
      source:
        'DRAFT [VERIFY: Quiver Quantitative monthly STOCK Act filing counts; Polymarket/Kalshi chamber-control price history, Jan-Aug 2026]',
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug*'],
      series: [
        {
          label: 'Trade filings',
          kind: 'bar',
          unit: 'filings',
          values: [820, 760, 1140, 980, 1060, 1210, 1330, 410],
        },
        {
          label: 'House GOP odds',
          kind: 'line',
          unit: '%',
          values: [48, 46, 44, 43, 41, 40, 39, 38],
        },
        {
          label: 'Senate GOP odds',
          kind: 'line',
          unit: '%',
          values: [66, 65, 67, 68, 69, 70, 72, 71],
          dash: true,
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'Composition tells the sharper story. Defense and aerospace purchases, Lockheed Martin, General Dynamics, and RTX among them, clustered in the weeks ahead of the summer NDAA markup [VERIFY: Quiver sector tagging against the Armed Services calendar], and bank and financial purchases concentrated among members sitting on House Financial Services [VERIFY: Quiver committee cross-reference]. On the leaderboards, [[person:marjorie-taylor-greene]]Marjorie Taylor Greene[[/person]] again ranks among the most frequent individual filers of 2026 [VERIFY: Quiver/Unusual Whales leaderboards], while [[person:ro-khanna]]Ro Khanna[[/person]] posts one of the highest raw filing counts, driven by diversified family-trust accounts rather than directional bets [VERIFY: Khanna trust disclosures]. The distinction matters: filing count is not conviction, and a trust rebalancing is not a signal.',
    },
    {
      type: 'paragraph',
      text: 'The same discipline applies to the aggregate. A 45-day disclosure lag means every filing describes a decision made weeks earlier, and nothing in the public record establishes that any member traded on nonpublic election analysis. What the data supports is narrower and still useful: when many filers across both parties accumulate the same sectors in the same window that the November odds are firming, that recurrence is a read on how political insiders handicap the policy environment they will inhabit in January. It is one input for a screen, never a standalone buy signal.',
    },
    {
      type: 'heading',
      text: 'Four ways November can land',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "Crossing the two chamber markets, and accepting the rough independence assumption that crossing requires, yields four scenarios: a Republican sweep near 29%, the Democratic-House-Republican-Senate split near 46%, a Democratic sweep near 17%, and the inverse split near 8% [VERIFY: derived from chamber pricing]. Each scenario is a different [[kw:regulatory-catalyst]]regulatory catalyst[[/kw]] map for the sectors Congress has been buying. A sweep extends Speaker [[person:mike-johnson]]Mike Johnson[[/person]]'s reconciliation runway; the modal split converts the legislative agenda into an oversight-and-gridlock regime where existing policy hardens in place. FIG. 2 grades the four scenarios against five tradeable policy dimensions.",
    },
    {
      type: 'adjudication-matrix',
      figureLabel: 'FIG. 2 · THE SCENARIO BOARD, GRADED',
      kicker:
        'FOUR CHAMBER-CONTROL SCENARIOS x FIVE POLICY DIMENSIONS · SAME = IMPLICATION HOLDS · PART = CONDITIONAL OR PARTIAL · EMPTY CELL = ABSENT. PROBABILITIES FROM CROSSED CHAMBER MARKETS [VERIFY]. CLICK ANY CELL FOR THE NOTE.',
      hint: 'Click any cell for the reasoning; probabilities are market-implied, not forecasts.',
      source:
        'DRAFT [VERIFY: scenario odds derived from Polymarket/Kalshi chamber markets; policy mapping is editorial synthesis, each cell to be checked against stated party agendas]',
      cols: [
        'Defense budget momentum',
        'Bank deregulation runway',
        'Drug-pricing pressure',
        'Energy permitting expansion',
        'Shutdown / gridlock risk',
      ],
      rows: [
        {
          label: 'R sweep · ~29%',
          cells: [
            {
              value: 'same',
              note: 'Both Armed Services gavels stay with defense-topline hawks; the NDAA growth path continues [VERIFY: DoD topline history under GOP control].',
            },
            {
              value: 'same',
              note: 'Unified control keeps the deregulatory agenda moving through committee and the agencies; regional banks are the levered expression.',
            },
            {
              value: 'none',
              note: 'New drug-pricing legislation stalls; existing negotiation frameworks are the ceiling, not the floor.',
            },
            {
              value: 'same',
              note: 'Permitting reform packages have the cleanest path under unified GOP control.',
            },
            {
              value: 'part',
              note: 'Sweeps reduce inter-chamber gridlock but intra-party spending fights have forced shutdown brinkmanship even under unified control [VERIFY: recent funding-fight history].',
            },
          ],
        },
        {
          label: 'D House / R Senate · ~46%',
          cells: [
            {
              value: 'part',
              note: 'Defense toplines have historically grown under divided government too, but marginal program adds get traded for domestic priorities [VERIFY: appropriations history].',
            },
            {
              value: 'none',
              note: 'A Democratic House blocks statutory deregulation; the agenda retreats to agency rulemaking already in train.',
            },
            {
              value: 'part',
              note: 'House hearings and bills pressure pharma headlines, but a Republican Senate blocks passage; policy risk is noise, not law.',
            },
            {
              value: 'part',
              note: 'Permitting deals remain possible as bipartisan trades, but each one needs a matching concession.',
            },
            {
              value: 'same',
              note: 'The modal scenario is the gridlock scenario: an October 1 funding deadline 33 days before the election previews two years of brinkmanship [VERIFY: fiscal calendar].',
            },
          ],
        },
        {
          label: 'D sweep · ~17%',
          cells: [
            {
              value: 'part',
              note: 'Toplines flatten rather than fall; procurement mix shifts toward munitions replenishment and away from legacy platforms.',
            },
            {
              value: 'none',
              note: 'Deregulation reverses; supervisory and capital agendas restart, a headwind for bank multiples.',
            },
            {
              value: 'same',
              note: 'Expanded negotiation lists and pricing bills become live law risk for pharma; XLV de-rates on the headline.',
            },
            {
              value: 'none',
              note: 'Fossil-permitting expansion stalls; the incremental barrel gets harder, which cuts both ways for incumbent producers.',
            },
            {
              value: 'part',
              note: 'Unified control lowers shutdown risk mechanically, though thin margins keep every deadline contested.',
            },
          ],
        },
        {
          label: 'R House / D Senate · ~8%',
          cells: [
            {
              value: 'part',
              note: 'The low-probability inverse split; defense keeps bipartisan cover but loses agenda-setting coherence.',
            },
            {
              value: 'none',
              note: 'No statutory path in either direction; the status quo ossifies.',
            },
            {
              value: 'part',
              note: 'A Democratic Senate revives pricing bills that a Republican House then buries; episodic headline risk only.',
            },
            {
              value: 'part',
              note: 'Same bipartisan-trade dynamic as the modal split, with the chambers reversed.',
            },
            {
              value: 'same',
              note: 'Divided government with inverted chambers carries the same brinkmanship mechanics as the modal split.',
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'The matrix has one dominant row and one dominant column. The dominant row is the 46% split, and the dominant column is gridlock: in three of the four scenarios, shutdown and debt-limit brinkmanship is a live feature, starting with an FY-2027 funding deadline of October 1, 2026, that lands 33 days before the polls open [VERIFY: fiscal calendar]. Gridlock is not automatically bearish. It freezes tax policy, blocks new sector-level legislation, and historically coincides with the strong post-midterm equity windows examined below. What it does punish is any position that requires Congress to pass something.',
    },
    {
      type: 'heading',
      text: 'What divided government has traded like',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The historical base rate around midterms is unusually one-sided. The S&P 500 has been higher in the 12 months following every midterm election since 1946 [VERIFY: US Bank / Deutsche Bank midterm studies], with an average gain of roughly 15% over that window [VERIFY: same studies]. The setup cost is paid in advance: midterm years carry the largest average intra-year drawdowns of the four-year cycle, roughly 17 to 19% [VERIFY: LPL/Carson presidential-cycle data], as markets price the policy uncertainty that the election then resolves. The mechanism most analysts credit is resolution itself, not the winner: once the composition of Congress is known, the discount for legislative surprise comes out of equity risk premia regardless of which party takes the gavels.',
    },
    {
      type: 'paragraph',
      text: 'Beneath the index, the [[kw:sector-rotation]]sector rotation[[/kw]] around divided-government outcomes has a consistent shape. Health care has historically ranked among the best-performing sectors in post-midterm windows, precisely because stalled legislation converts drug-pricing threat into drug-pricing noise [VERIFY: Strategas/Fidelity sector seasonality work]. Defense budgets have grown under both sweeps and splits, giving the primes a bid in three of the four scenario rows above [VERIFY: DoD topline history]. Financials are the exception that proves the mapping: the deregulation trade in XLF and KRE is effectively a call option on the 29% sweep, not on the 46% modal split. Energy permitting sits in between, alive as a bipartisan bargaining chip in every configuration.',
    },
    {
      type: 'callout',
      label: 'The post-midterm base rate',
      value: '12-for-12 since 1946',
      context:
        'The S&P 500 has risen in the year following every midterm election since 1946, averaging roughly +15%, though midterm years also carry the deepest average intra-year drawdowns of the cycle. Base rate, not guarantee. [VERIFY: US Bank / Deutsche Bank / LPL midterm studies]',
    },
    {
      type: 'heading',
      text: 'The odds path since January',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The year-to-date odds path explains why the trading accelerated when it did. House GOP control started 2026 near a 48% coin flip and bled to 38% by August 11 [VERIFY: Polymarket/Kalshi price history], pushed by an elevated open-seat count, roughly 45 members retiring or seeking other office [VERIFY: Ballotpedia retirement tracker], and a string of special elections in which Democrats overperformed 2024 partisan baselines by mid-single digits [VERIFY: special-election margin trackers]. Senate GOP odds moved the opposite way, firming from 66% to 71% as recruitment settled in the handful of contested states [VERIFY: price history]. The largest single-month House swings came from the mid-decade redistricting fight, Texas maps against California countermoves, that reshuffled several districts before filing closed [VERIFY: redistricting litigation coverage].',
    },
    {
      type: 'trajectory',
      figureLabel: 'FIG. 3 · TWO CHAMBERS, TWO DIRECTIONS',
      kicker:
        'GOP CONTROL ODDS BY CHAMBER · % · MONTHLY CLOSES, JAN-AUG 2026 (X-AXIS: MONTH OF 2026, 1 = JAN, 8 = AUG) · SOLID = SENATE, DASHED = HOUSE.',
      hint: 'House GOP odds bleed lower all year; Senate GOP odds firm. The gap is the split-verdict trade.',
      source:
        'DRAFT [VERIFY: Polymarket/Kalshi chamber-control monthly price history, Jan-Aug 2026]',
      yLabel: 'GOP control odds, %',
      yMax: 80,
      xMin: 1,
      xMax: 8,
      series: [
        {
          key: 'senate',
          label: 'Senate GOP',
          color: 'var(--echo-chart-green)',
          data: [
            { x: 1, y: 66 },
            { x: 2, y: 65 },
            { x: 3, y: 67 },
            { x: 4, y: 68 },
            { x: 5, y: 69 },
            { x: 6, y: 70 },
            { x: 7, y: 72 },
            { x: 8, y: 71 },
          ],
        },
        {
          key: 'house',
          label: 'House GOP',
          color: 'var(--echo-chart-red)',
          dashed: true,
          data: [
            { x: 1, y: 48 },
            { x: 2, y: 46 },
            { x: 3, y: 44 },
            { x: 4, y: 43 },
            { x: 5, y: 41 },
            { x: 6, y: 40 },
            { x: 7, y: 39 },
            { x: 8, y: 38 },
          ],
        },
      ],
      annotations: [
        { x: 3, y: 44, label: 'Filing deadlines', sub: 'redistricting fights peak' },
        { x: 6, y: 70, label: 'Primary season', sub: 'nominees set in key states' },
        { x: 8, y: 38, label: 'Aug 11', sub: '84 days out' },
      ],
    },
    {
      type: 'heading',
      text: 'How to position for the midterm trade',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The scenario board converts directly into baskets. Defense, via ITA and single names like LMT and GD, is the highest-carry expression because it holds a bid in three of four scenarios and matches what members themselves have been accumulating [VERIFY: Quiver defense-buy clustering]. Health care, via XLV, is the purest way to own the 46% modal split, where drug-pricing legislation stays stalled. The financials trade, XLF and especially KRE, only pays in the 29% sweep, which makes sizing it like the base case a textbook [[kw:concentration-risk]]concentration risk[[/kw]] error. XLE is the residual claim on permitting deals that every scenario keeps merely possible. SPY hedges around the event itself are historically cheap relative to the resolution rally that has followed every midterm in the modern record [VERIFY: post-midterm study].',
    },
    {
      type: 'paragraph',
      text: "This is also the workflow Ezana's tooling was built for. The platform's congressional-trading feed already tags each disclosure by sector, committee assignment, and filing date, which is what turns 7,700 laggy line items into the clustering evidence cited above, and the quant workbench can backtest each scenario basket against prior midterm windows before any capital moves. The disciplined sequence is odds first, filings second, baskets third: let the chamber markets set the scenario weights, use the disclosure clusters as confirmation, and size each basket to its scenario probability rather than to conviction.",
    },
    {
      type: 'paragraph',
      text: 'The base case, priced at roughly 46% and rising since January [VERIFY: crossed chamber markets], is a split verdict that freezes the legislative agenda, keeps defense funded, converts pharma risk into pharma noise, and sets up the thirteenth consecutive positive post-midterm year if the 1946-to-present base rate holds [VERIFY: midterm studies]. The bear case for the whole framework is a sweep in either direction, roughly 46% combined, which would force a fast repricing of whichever baskets assumed gridlock. Between now and November 3, the tell to watch is not the national polling average. It is whether the House and Senate lines in FIG. 3 keep diverging, and whether the people who will hold the gavels keep buying the same sectors while they do.',
    },
  ],
};

export default midtermTrade2026;
