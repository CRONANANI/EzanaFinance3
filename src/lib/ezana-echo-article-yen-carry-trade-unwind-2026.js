// src/lib/ezana-echo-article-yen-carry-trade-unwind-2026.js
// Ezana Echo DRAFT article: Japan rate normalization and the global yen carry trade.
// status: 'draft' keeps this module off every public surface until fact-checking clears.
// ============================================================
// FACT CHECK MANIFEST (status: draft, nothing publishes until cleared)
// 1. BoJ policy rate at 0.75% after the December 2025 hike, highest since 1995 -> [VERIFY: BoJ policy statement, December 2025 meeting]
// 2. BoJ held its policy rate at or below zero for most of the period 1999-2024 (ZIRP from 1999, NIRP from January 2016) -> [VERIFY: BoJ historical policy timeline]
// 3. Speculative USD-yen carry positioning estimated near $500 billion, roughly $200 billion unwound in August 2024 -> [VERIFY: UBS strategy research, August 2024]
// 4. Yen carry exposure exceeds $1 trillion once FX-swap and cross-border loan funding is included -> [VERIFY: BIS Quarterly Review, September 2024]
// 5. BIS-reported yen-denominated cross-border claims roughly $2 trillion, up about $740 billion from end-2021 to the 2024 peak -> [VERIFY: BIS locational banking statistics]
// 6. USDJPY hit 161.9 on July 3, 2024, the weakest yen since 1986 -> [VERIFY: FX market data / Reuters]
// 7. Nikkei 225 fell 12.4% on August 5, 2024, its worst single day since October 1987 -> [VERIFY: JPX exchange data / Aug 2024 reporting]
// 8. Nikkei lost roughly 18% over the two sessions of August 2 and August 5, 2024 -> [VERIFY: JPX exchange data]
// 9. VIX spiked above 65 intraday on August 5, 2024, at the time its third-highest print on record -> [VERIFY: Cboe data]
// 10. USDJPY traded near 141.7 on August 5, 2024, roughly 12% off the July peak -> [VERIFY: FX market data]
// 11. Nasdaq Composite fell about 3.4% on August 5, 2024; Nvidia fell about 6% and Apple about 4.8% that session -> [VERIFY: exchange data, Aug 5 2024]
// 12. JPMorgan estimated roughly 75% of global carry trades had been unwound by mid-August 2024 -> [VERIFY: JPMorgan research note, Aug 2024]
// 13. CFTC leveraged-fund net yen shorts peaked near 184,000 contracts (roughly $14 billion notional) in early July 2024 and flipped net long by mid-August -> [VERIFY: CFTC Commitments of Traders]
// 14. Japan's Ministry of Finance spent about 9.8 trillion yen on intervention in April-May 2024 and about 5.5 trillion yen in July 2024 -> [VERIFY: MoF intervention disclosures]
// 15. Deputy Governor Shinichi Uchida said on August 7, 2024 the BoJ would not raise rates while markets were unstable -> [VERIFY: BoJ speech transcript, Aug 7 2024]
// 16. March 19, 2024: BoJ ended negative rates (-0.1% to a 0-0.1% target), its first hike in 17 years, and scrapped yield-curve control and ETF purchases -> [VERIFY: BoJ statement, Mar 19 2024]
// 17. July 31, 2024: BoJ hiked to 0.25% and announced a plan to halve monthly JGB purchases from about 5.7 trillion yen to about 3 trillion by Q1 2026 -> [VERIFY: BoJ statement, Jul 31 2024]
// 18. January 24, 2025: BoJ hiked to 0.5%, the highest policy rate since 2008 -> [VERIFY: BoJ statement, Jan 24 2025]
// 19. December 2025: BoJ hiked to 0.75% -> [VERIFY: BoJ statement, December 2025 meeting]
// 20. Japanese core CPI has run at or above the BoJ's 2% target since April 2022 -> [VERIFY: Statistics Bureau of Japan CPI series]
// 21. OECD Economic Outlook shows Japan headline inflation near 2.7% for 2025, projected to ease toward 2.1% in 2026 -> [VERIFY: OECD Economic Outlook, November 2025 edition, Japan tables]
// 22. OECD projects Japan real GDP growth slowing to roughly 0.7% in 2026 from about 1.1% in 2025 -> [VERIFY: OECD Economic Outlook, November 2025 edition]
// 23. OECD baseline has the BoJ policy rate reaching about 1% by end-2026 -> [VERIFY: OECD Economic Outlook Japan country note]
// 24. Real BoJ policy rate is still roughly -1.2% (0.75% nominal vs. ~2% inflation) -> [VERIFY: derived from BoJ rate and Japan CPI, flag as computed]
// 25. 10-year JGB yield near 1.9% in early 2026, its highest since 2007-08 -> [VERIFY: JGB market data]
// 26. Japan's gross government debt is roughly 250% of GDP -> [VERIFY: IMF / MoF debt statistics]
// 27. Sanae Takaichi became prime minister in October 2025; her fiscal package pushed the yen back toward 157 per dollar in late 2025 -> [VERIFY: election coverage and FX data, Q4 2025]
// 28. Japanese megabank shares rallied on rate normalization; MUFG gained roughly 40% over 2025 -> [VERIFY: TSE price data]
// 29. Toyota sensitivity: a 1-yen move in USDJPY shifts operating profit by roughly 50 billion yen -> [VERIFY: Toyota FY guidance materials]
// 30. The Mexican peso, a top carry target, fell roughly 6% against the yen in the first week of August 2024 -> [VERIFY: FX market data, Aug 2024]
// 31. FIG. 1 policy-rate series (0.10 / 0.25 / 0.50 / 0.75 / 0.75 by half-year) -> [VERIFY: BoJ policy statements]
// 32. FIG. 1 USDJPY period-end series (161 / 157 / 144 / 156 / 149) -> [VERIFY: FX market data]
// 33. FIG. 1 yen cross-border claims series ($1.9T / $1.7T / $1.75T / $1.85T / $1.7T) -> [VERIFY: BIS locational banking statistics]
// 34. FIG. 2 USDJPY quarterly path 2024 through mid-2026 (all eleven points) -> [VERIFY: FX market data]
// 35. FIG. 3 ledger rows: the four policy-rate moves and the JGB purchase taper -> [VERIFY: BoJ statements, 2024-2025]
// 36. Stat-grid values (carry-size range, 0.75% rate, 12.4% Nikkei drop, 20-yen USDJPY round trip) -> covered by items 1, 3, 4, 6, 7, 10
// 37. FXY is unhedged long-yen exposure; DXJ hedges its yen exposure while EWJ does not -> [VERIFY: fund prospectuses, WisdomTree / iShares / Invesco]
// 38. Globe-rail metric series (policy rate 0.10 -> 0.75 across four hikes) -> covered by items 16-19
// ============================================================

export const yenCarryTradeUnwind2026 = {
  id: 'yen-carry-trade-unwind-2026',
  title:
    'The Carry Trade That Moves Everything: Japan Leaves Zero Behind and a Trillion-Dollar Funding Question Follows',
  excerpt:
    "The Bank of Japan's policy rate now sits at 0.75%, its highest since 1995 [VERIFY: BoJ statements], against an estimated $500 billion to $1 trillion-plus in yen-funded carry positions [VERIFY: UBS, BIS]. August 2024's 12.4% Nikkei crash [VERIFY: JPX data] previewed what the next leg of unwinding could do to global assets.",
  heroImage: {
    src: '/images/ezana-echo/yen-carry-trade-unwind-2026-hero.png',
    alt: 'Stylized illustration of the Bank of Japan headquarters with a coiled spring of yen banknotes releasing toward Wall Street skyscrapers.',
    caption:
      'Editorial illustration. Three decades of near-zero Japanese rates built the funding leg beneath global risk assets; the BoJ is now dismantling it one 25-basis-point step at a time.',
  },
  category: 'global-emerging',
  subcategory: 'Asia',
  globeRail: {
    metric: {
      title: 'BOJ POLICY RATE · PERCENT',
      data: [
        { x: 0, y: 0.1 },
        { x: 1, y: 0.25 },
        { x: 2, y: 0.5 },
        { x: 3, y: 0.75 },
      ],
      startLabel: 'Mar 2024 · 0.10%',
      endLabel: 'Dec 2025 · 0.75%',
      note: 'Four hikes in under two years took the Bank of Japan from negative rates to 0.75%, its highest policy rate since 1995. Each step repriced the cheapest funding leg in global markets, and the July 2024 step triggered the largest one-day Nikkei crash since 1987. All figures pending verification against BoJ statements.',
    },
    cities: [
      {
        name: 'Tokyo',
        country: 'Japan',
        lat: 35.68,
        lng: 139.69,
        impact:
          'Home of the funding currency. The BoJ ended negative rates in March 2024, its first hike in 17 years, and has since moved to 0.75% while halving monthly JGB purchases toward roughly 3 trillion yen. Core inflation has held at or above the 2% target since April 2022, so the real policy rate remains deeply negative, and the OECD baseline points to roughly 1% by end-2026. All pending verification.',
      },
      {
        name: 'New York',
        country: 'US',
        lat: 40.71,
        lng: -74.01,
        impact:
          'The destination of much of the borrowed yen. On August 5, 2024 the unwind reached US markets directly: the Nasdaq fell about 3.4%, Nvidia about 6%, and the VIX spiked above 65 intraday, at the time its third-highest print on record. Crowded mega-cap longs sit at the far end of the yen funding chain. All pending verification.',
      },
      {
        name: 'Mexico City',
        country: 'Mexico',
        lat: 19.43,
        lng: -99.13,
        impact:
          'The classic high-yield carry target. Peso-yen was among the most crowded currency trades of the cycle, and it fell roughly 6% in the first week of August 2024 as leveraged funds cut positions. Emerging-market carry targets absorb the sharpest FX moves when yen funding reprices. Pending verification.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  // Seven core metadata dimensions (docs/ECHO_ARTICLE_AUTHORING.md), every value
  // justified by the article's own text. Central banks and ministries live in
  // `government`, not `institutions`.
  meta: {
    sectors: ['Financials', 'Information Technology', 'Consumer Discretionary'],
    industries: ['Diversified Banks', 'Semiconductors', 'Automobile Manufacturers'],
    institutions: [
      'Mitsubishi UFJ Financial Group',
      'Sumitomo Mitsui Financial Group',
      'Nvidia',
      'Apple',
      'Toyota',
      'UBS',
      'JPMorgan',
    ],
    government: ['Bank of Japan', 'Ministry of Finance (Japan)', 'Federal Reserve'],
    geos: ['Japan', 'United States', 'Mexico'],
    assetClasses: ['Currencies', 'Equities', 'Fixed Income'],
    themes: ['Monetary Policy', 'Carry Trade', 'Global Liquidity', 'Rate Normalization'],
    datasets: [
      'OECD Economic Outlook',
      'BIS locational banking statistics',
      'CFTC Commitments of Traders',
    ],
    // markets: no named exchange or trading venue is discussed as a venue; the
    // Nikkei 225 and USDJPY appear as instruments, covered by tickers/themes.
    markets: [],
    // investors: the text names institutions (UBS, JPMorgan) as researchers, not
    // named individual investors or funds taking positions.
    investors: [],
  },
  tickers: ['EWJ', 'FXY', 'DXJ', 'MUFG', 'SMFG', 'TM', 'NVDA', 'AAPL'],
  entities: {
    people: [
      {
        id: 'kazuo-ueda',
        label: 'Kazuo Ueda',
        role: 'Governor, Bank of Japan (2023- )',
      },
      {
        id: 'haruhiko-kuroda',
        label: 'Haruhiko Kuroda',
        role: 'Former BoJ governor; architect of the 2013-2023 easing era',
      },
      {
        id: 'shinichi-uchida',
        label: 'Shinichi Uchida',
        role: 'BoJ deputy governor; author of the August 2024 walk-back',
      },
      {
        id: 'sanae-takaichi',
        label: 'Sanae Takaichi',
        role: 'Prime minister of Japan (October 2025- ) [VERIFY]',
      },
    ],
    terms: [
      { id: 'deleveraging', label: 'Deleveraging' },
      { id: 'foreign-exchange-reserves', label: 'Foreign Exchange Reserves' },
      { id: 'long-term-debt-cycle', label: 'Long-Term Debt Cycle' },
      { id: 'concentration-risk', label: 'Concentration Risk' },
      { id: 'mag-7', label: 'Magnificent Seven' },
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
      text: "The cheapest money in the world is getting more expensive, and the repricing touches nearly every asset class on earth. The Bank of Japan's policy rate now stands at 0.75% after the December 2025 hike [VERIFY: BoJ policy statement, December 2025 meeting], the highest since 1995 [VERIFY: BoJ historical policy timeline], ending a regime in which Japan held rates at or below zero for most of the period from 1999 through early 2024 [VERIFY: BoJ historical policy timeline]. Three decades of free yen built the carry trade: borrow in yen at nothing, buy dollars, pesos, Treasuries, or Nvidia, and pocket the spread. Estimates of that stack run from roughly $500 billion in speculative dollar-yen positions [VERIFY: UBS strategy research, August 2024] to more than $1 trillion once FX-swap and cross-border loan funding is counted [VERIFY: BIS Quarterly Review, September 2024]. The question for 2026 is not whether that funding leg reprices. It is already repricing. The question is how fast, and what sits on the other end when it does.",
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'Estimated yen carry positioning',
          value: '$500B-$1T+',
          change: 'UBS speculative estimate to BIS-inclusive range [VERIFY: UBS; BIS]',
        },
        {
          label: 'BoJ policy rate',
          value: '0.75%',
          change: 'Highest since 1995, from -0.1% in early 2024 [VERIFY: BoJ]',
        },
        {
          label: 'Nikkei 225, Aug 5 2024',
          value: '-12.4%',
          change: 'Worst single day since October 1987 [VERIFY: JPX data]',
        },
        {
          label: 'USDJPY round trip, Jul-Aug 2024',
          value: '161.9 to 141.7',
          change: 'A 12% yen surge in five weeks [VERIFY: FX market data]',
        },
      ],
    },
    {
      type: 'heading',
      text: 'The funding currency beneath global risk',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'A carry trade is structurally simple: borrow in a currency with low interest rates, convert the proceeds, and invest them where yields or expected returns are higher. The profit is the rate differential; the risk is the funding currency appreciating, which raises the cost of paying the loan back in an instant. For thirty years the yen was the least likely currency on earth to appreciate on rate differentials, because the Bank of Japan, under [[person:haruhiko-kuroda]]Haruhiko Kuroda[[/person]] and his predecessors, pinned its policy rate at or below zero from 1999 onward and added negative rates in January 2016 [VERIFY: BoJ historical policy timeline]. That made the yen the default funding leg for hedge funds, banks, and Japanese households alike, and it made everything from Mexican government bonds to US mega-cap tech an indirect beneficiary of Tokyo monetary policy.',
    },
    {
      type: 'paragraph',
      text: "Sizing the trade is notoriously hard, because most of it never shows up in a single ledger. The visible speculative layer, leveraged-fund yen shorts in CFTC futures data, peaked near 184,000 contracts, roughly $14 billion notional, in early July 2024 [VERIFY: CFTC Commitments of Traders]. The next layer is bank credit: BIS locational statistics put yen-denominated cross-border claims at roughly $2 trillion at the 2024 peak, up about $740 billion from end-2021 [VERIFY: BIS locational banking statistics], growth driven almost entirely by the widening rate gap after the Federal Reserve's 2022-23 hiking cycle. The deepest layer, yen borrowed synthetically through FX swaps, is what pushes credible totals past $1 trillion [VERIFY: BIS Quarterly Review, September 2024]. No single number is authoritative; the honest statement is that the trade is measured in the high hundreds of billions of dollars, with wide error bars.",
    },
    {
      type: 'multi-axis',
      figureLabel: 'FIG. 1 · THE FUNDING LEG REPRICES',
      kicker:
        'BAR = BOJ POLICY RATE (%, LEFT AXIS) · LINES = USDJPY AND BIS YEN CROSS-BORDER CLAIMS ($T) · PERIOD-END VALUES BY HALF-YEAR, H1 2024 TO H1 2026 · ALL VALUES PENDING VERIFICATION.',
      hint: 'Bar = policy rate; solid line = USDJPY; dashed line = yen cross-border claims.',
      source:
        'DRAFT [VERIFY: BoJ policy statements; FX market data; BIS locational banking statistics]',
      categories: ['H1 24', 'H2 24', 'H1 25', 'H2 25', 'H1 26'],
      series: [
        {
          label: 'BoJ policy rate',
          kind: 'bar',
          unit: '%',
          values: [0.1, 0.25, 0.5, 0.75, 0.75],
        },
        {
          label: 'USDJPY',
          kind: 'line',
          unit: '¥',
          values: [161, 157, 144, 156, 149],
        },
        {
          label: 'Yen cross-border claims',
          kind: 'line',
          unit: '$T',
          values: [1.9, 1.7, 1.75, 1.85, 1.7],
          dash: true,
        },
      ],
    },
    {
      type: 'paragraph',
      text: "The figure's third series is the tell. Yen cross-border claims contracted after the August 2024 shock, rebuilt through 2025 as the rate gap stayed wide and the yen re-weakened toward 156 [VERIFY: FX market data], and began rolling over again after the December 2025 hike [VERIFY: BIS locational banking statistics]. Carry does not die when the funding rate rises 25 basis points; the dollar-yen differential still exceeded three percentage points through 2025 [VERIFY: Fed and BoJ policy rates]. It dies when the funding currency starts appreciating faster than the differential pays, and that is precisely the dynamic a credible BoJ hiking path creates.",
    },
    {
      type: 'heading',
      text: 'August 2024: the rehearsal everyone should study',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "The historical anchor for what an unwind looks like is the first week of August 2024. The setup: USDJPY hit 161.9 on July 3, 2024, the weakest yen since 1986 [VERIFY: FX market data], after Japan's Ministry of Finance had already burned about 9.8 trillion yen of [[kw:foreign-exchange-reserves]]foreign exchange reserves[[/kw]] on intervention in April and May and another 5.5 trillion in July [VERIFY: MoF intervention disclosures]. Then the BoJ hiked to 0.25% on July 31 and paired it with a bond-taper plan [VERIFY: BoJ statement, Jul 31 2024], while soft US payrolls stoked recession fears. The yen snapped higher, and every leveraged position funded in yen faced the same margin call at once. On August 5 the Nikkei 225 fell 12.4%, its worst single session since October 1987 [VERIFY: JPX exchange data], capping a two-day loss of roughly 18% [VERIFY: JPX exchange data]. USDJPY traded near 141.7, a 12% yen surge in five weeks [VERIFY: FX market data].",
    },
    {
      type: 'paragraph',
      text: "The contagion map mattered more than the epicenter. The VIX spiked above 65 intraday on August 5, at the time its third-highest print on record [VERIFY: Cboe data]. The Nasdaq fell about 3.4% that session, with Nvidia down about 6% and Apple about 4.8% [VERIFY: exchange data, Aug 5 2024], names with no operational tie to Japanese rates but a strong positioning tie to yen-funded leverage. The Mexican peso, the cycle's favorite carry target, dropped roughly 6% against the yen inside a week [VERIFY: FX market data, Aug 2024]. By mid-August, JPMorgan estimated roughly 75% of global carry trades had been unwound [VERIFY: JPMorgan research note, Aug 2024], and CFTC data showed leveraged funds flipping to net-long yen for the first time in years [VERIFY: CFTC Commitments of Traders]. Forced [[kw:deleveraging]]deleveraging[[/kw]] is the mechanism: when the funding currency gaps higher, positions are cut not because views changed but because financing broke.",
    },
    {
      type: 'trajectory',
      figureLabel: 'FIG. 2 · THE ROUND TRIP, CHARTED',
      kicker:
        'USDJPY, QUARTERLY, Q1 2024 TO MID-2026 · HIGHER = WEAKER YEN = CHEAPER CARRY · ALL POINTS PENDING VERIFICATION.',
      hint: 'The August 2024 air pocket is the template for what a fast unwind does to the funding leg.',
      source: 'DRAFT [VERIFY: FX market data, quarterly closes 2024-2026]',
      yLabel: 'JPY per USD',
      yMax: 170,
      xMin: 2024,
      xMax: 2026.5,
      series: [
        {
          key: 'usdjpy',
          label: 'USDJPY',
          color: 'var(--echo-chart-blue)',
          data: [
            { x: 2024, y: 151 },
            { x: 2024.25, y: 161 },
            { x: 2024.5, y: 143 },
            { x: 2024.75, y: 157 },
            { x: 2025, y: 150 },
            { x: 2025.25, y: 144 },
            { x: 2025.5, y: 148 },
            { x: 2025.75, y: 156 },
            { x: 2026, y: 152 },
            { x: 2026.25, y: 149 },
            { x: 2026.5, y: 148 },
          ],
        },
      ],
      annotations: [
        { x: 2024.25, y: 161, label: '¥161.9', sub: 'Jul 3 2024 · weakest yen since 1986' },
        { x: 2024.5, y: 143, label: 'The unwind', sub: 'Aug 5 2024 · Nikkei -12.4%' },
      ],
    },
    {
      type: 'quote',
      text: 'The bank will not raise its policy interest rate when financial and capital markets are unstable.',
      source:
        'Shinichi Uchida, BoJ deputy governor, August 7, 2024 [VERIFY: BoJ speech transcript]',
    },
    {
      type: 'paragraph',
      text: "That single sentence from [[person:shinichi-uchida]]Shinichi Uchida[[/person]], delivered two days after the crash, stopped the unwind [VERIFY: BoJ speech transcript, Aug 7 2024]. Markets recovered most of the losses within weeks, and the episode was filed away as a flash event. That filing is a mistake. August 2024 demonstrated the transmission channel at roughly one-quarter unwound [VERIFY: JPMorgan research note, Aug 2024]: a 20-yen currency move, an 18% two-day drawdown in the world's third-largest equity market, and a volatility spike that reached Chicago within hours. The positions rebuilt because the rate differential survived. The next leg starts from a higher Japanese policy rate and a thinner cushion.",
    },
    {
      type: 'heading',
      text: 'The long walk off zero, meeting by meeting',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Governor [[person:kazuo-ueda]]Kazuo Ueda[[/person]] has run the slowest hiking cycle in modern central banking, and deliberately so. Each step has been small, well-telegraphed, and separated by two to four quarters, because the BoJ is unwinding not just a rate but an entire balance-sheet architecture: yield-curve control, ETF purchases, and a bond-buying program that at its peak absorbed most of net JGB issuance [VERIFY: BoJ balance sheet data]. The ledger below tracks the four rate moves and the taper. The through-line is consistency: every meeting since March 2024 has moved policy in exactly one direction [VERIFY: BoJ policy statements, 2024-2025].',
    },
    {
      type: 'revision-ledger',
      figureLabel: 'FIG. 3 · THE BOJ LEDGER, 2024-2025',
      kicker:
        'POLICY RATE BEFORE → AFTER, BASIS POINTS, PER MEETING · √-SCALE · GREEN MARKS A STEP TOWARD NORMALIZATION · CLICK A ROW FOR THE RECORD · ALL ENTRIES PENDING VERIFICATION.',
      hint: 'Four hikes and a taper; every move since March 2024 has pointed the same direction.',
      source: 'DRAFT [VERIFY: BoJ policy statements, March 2024 through December 2025]',
      scale: 'sqrt',
      unit: ' bp',
      rows: [
        {
          label: 'March 19, 2024',
          sub: 'ends negative rates and yield-curve control',
          before: -10,
          after: 10,
          beforeDisplay: '-0.10%',
          afterDisplay: '0.00-0.10%',
          delta: 20,
          deltaDisplay: '+20 bp',
          favorable: 'up',
          record:
            'The first hike in 17 years: the BoJ scrapped its -0.1% rate for a 0-0.1% target, formally ended yield-curve control, and halted ETF purchases in a single meeting. [VERIFY: BoJ statement, Mar 19 2024]',
        },
        {
          label: 'July 31, 2024',
          sub: 'hike plus bond-taper plan',
          before: 10,
          after: 25,
          beforeDisplay: '0.10%',
          afterDisplay: '0.25%',
          delta: 15,
          deltaDisplay: '+15 bp',
          favorable: 'up',
          record:
            'A 15 bp hike paired with a plan to halve monthly JGB purchases from about 5.7 trillion yen toward 3 trillion by Q1 2026. Five days later the Nikkei posted its worst session since 1987. [VERIFY: BoJ statement, Jul 31 2024; JPX data]',
        },
        {
          label: 'January 24, 2025',
          sub: 'highest rate since 2008',
          before: 25,
          after: 50,
          beforeDisplay: '0.25%',
          afterDisplay: '0.50%',
          delta: 25,
          deltaDisplay: '+25 bp',
          favorable: 'up',
          record:
            'A 25 bp hike to 0.5%, the highest since 2008, justified by wage growth and inflation holding above target. Markets absorbed it without an August-style rupture. [VERIFY: BoJ statement, Jan 24 2025]',
        },
        {
          label: 'December 2025',
          sub: 'highest rate since 1995',
          before: 50,
          after: 75,
          beforeDisplay: '0.50%',
          afterDisplay: '0.75%',
          delta: 25,
          deltaDisplay: '+25 bp',
          favorable: 'up',
          record:
            'A 25 bp hike to 0.75%, the highest policy rate since 1995, delivered after the new government signaled tolerance for continued normalization. [VERIFY: BoJ statement, December 2025 meeting]',
        },
        {
          label: 'JGB purchase taper',
          sub: 'delta-only · monthly buying, 2024 to Q1 2026',
          delta: -47,
          deltaDisplay: '-¥2.7T/mo',
          favorable: 'down',
          record:
            'Monthly JGB purchases stepping down from about 5.7 trillion yen to about 3 trillion by Q1 2026, roughly a 47% reduction, withdrawing the standing bid beneath the bond market. [VERIFY: BoJ taper plan, Jul 31 2024]',
        },
      ],
      verdict:
        'Every policy move since March 2024 has pointed in one direction: away from zero. The pace is glacial; the direction has not wavered once. [VERIFY: BoJ policy statements]',
    },
    {
      type: 'heading',
      text: 'What the OECD dataset shows',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "The macro dataset behind the hiking path is unambiguous about direction. OECD Economic Outlook figures show Japanese headline inflation near 2.7% for 2025, easing toward a projected 2.1% in 2026 [VERIFY: OECD Economic Outlook, November 2025 edition], the fourth and fifth consecutive years at or above the BoJ's 2% target, a streak running since April 2022 [VERIFY: Statistics Bureau of Japan CPI series]. The same outlook has real GDP growth slowing to roughly 0.7% in 2026 from about 1.1% in 2025 [VERIFY: OECD Economic Outlook, November 2025 edition], and its baseline puts the policy rate near 1% by end-2026 [VERIFY: OECD Economic Outlook Japan country note]. The arithmetic that matters for carry: even at 0.75%, the real policy rate is roughly -1.2% against inflation near 2% [VERIFY: computed from BoJ rate and Japan CPI]. Policy remains stimulative by any textbook measure, which is exactly why the dataset argues the hikes continue.",
    },
    {
      type: 'paragraph',
      text: "The constraint on the other side is debt. Japan's gross government debt stands near 250% of GDP [VERIFY: IMF and MoF debt statistics], so every 25 basis points eventually flows into a debt-service bill measured in trillions of yen. This is the [[kw:long-term-debt-cycle]]long-term debt cycle[[/kw]] problem in its purest form: inflation finally gives the BoJ a mandate to normalize, while the state's balance sheet argues for keeping rates suppressed. The 10-year JGB yield near 1.9% in early 2026, its highest since 2007-08 [VERIFY: JGB market data], shows the bond market pricing the tension in real time. Prime Minister [[person:sanae-takaichi]]Sanae Takaichi[[/person]], in office since October 2025 [VERIFY: election coverage, Q4 2025], adds a fiscal-expansion impulse that weakened the yen back toward 157 late last year [VERIFY: FX market data, Q4 2025], a reminder that politics can re-cheapen the funding leg even as the central bank raises its price.",
    },
    {
      type: 'heading',
      text: 'Mapping the next leg: who is exposed',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "Exposure to a carry unwind is a positioning question, not a fundamentals question, which makes it a [[kw:concentration-risk]]concentration risk[[/kw]] map. The most exposed assets share three traits: they are crowded, they are levered, and they sit at the high-yield or high-momentum end of the risk spectrum. That screen flags emerging-market carry targets first, with the Mexican peso the canonical example after its August 2024 drop [VERIFY: FX market data, Aug 2024]. It flags US mega-cap tech second: Nvidia and Apple fell 6% and 4.8% respectively on August 5, 2024 [VERIFY: exchange data] not on any earnings news but because they were the most crowded longs in the world when leveraged financing broke. And it flags Japanese exporters third: Toyota's guidance implies a single yen of USDJPY movement shifts operating profit by roughly 50 billion yen [VERIFY: Toyota FY guidance materials], so a fast move from 156 to the low 140s compresses earnings across the export complex.",
    },
    {
      type: 'paragraph',
      text: "The other side of the ledger is real. Japanese megabanks are structural winners of normalization: wider net interest margins on domestic loan books drove MUFG's roughly 40% gain over 2025 [VERIFY: TSE price data], with Sumitomo Mitsui tracking the same trade. A stronger yen is also a mechanical tailwind for unhedged Japan equity exposure held in dollars, since the currency translation adds to local returns. The distinction is visible in the ETF wrappers themselves: EWJ carries unhedged yen exposure while DXJ hedges it away, and FXY is a direct long-yen position [VERIFY: fund prospectuses]. In an unwind, those three instruments, tracking the same country, produce three very different outcomes.",
    },
    {
      type: 'callout',
      label: 'The asymmetry that matters',
      value: '3%+ carry vs. 12% gap risk',
      context:
        'The dollar-yen rate differential paid over three percentage points annually through 2025 [VERIFY: Fed and BoJ policy rates], while the August 2024 episode showed the funding currency can move 12% against the trade in five weeks [VERIFY: FX market data]. Carry earns slowly and loses fast; that asymmetry is the entire risk profile.',
    },
    {
      type: 'heading',
      text: 'How to position for the next leg',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "For investors, the actionable screen has three layers. Direct expressions: FXY benefits mechanically from yen appreciation, DXJ is the vehicle for owning Japanese equities while neutralizing that same currency move, and EWJ is the blended bet that Japan's market rises with the yen [VERIFY: fund prospectuses]. Beneficiary equities: MUFG and SMFG monetize each hike through loan repricing [VERIFY: bank NII disclosures]. Risk hedges: the August 2024 template says the assets to stress-test are the crowded ones, [[kw:mag-7]]Magnificent Seven[[/kw]] positions like NVDA and AAPL that sold off hardest in the last unwind [VERIFY: exchange data, Aug 5 2024], and exporters like TM whose earnings carry embedded short-yen exposure [VERIFY: Toyota FY guidance materials]. Position sizing matters more than direction here: unwinds are fast, and the 2024 episode reversed most of its damage within weeks [VERIFY: market data, Aug-Sep 2024].",
    },
    {
      type: 'paragraph',
      text: "The base case is a slow bleed rather than a crash: the OECD path of roughly 1% by end-2026 [VERIFY: OECD Economic Outlook], continued taper, and a yen that grinds toward the mid-140s [VERIFY: analyst FX forecasts] as the differential narrows, eroding carry economics gradually enough for positions to exit in order. The bear case is a repeat of August 2024 with less cushion: a surprise hike or US growth scare that forces the remaining stack through the exit simultaneously, with the VIX-above-65 mechanics [VERIFY: Cboe data] hitting assets far from Tokyo. Either way, the yen is the single most important funding price in global markets, and it is being repriced on a public schedule. Ezana users can track the BoJ meeting calendar and USDJPY alongside cross-asset positioning on the platform's macro dashboard, and stress-test yen-shock scenarios against their own holdings in the quant workbench before the next leg arrives, not after.",
    },
  ],
};

export default yenCarryTradeUnwind2026;
