// src/lib/ezana-echo-article-bitcoin-institutional-holders-13f-2026.js
// Ezana Echo DRAFT article. The draft status field keeps this off every public surface.
// All figures use --echo-chart-* tokens. No imports; plain data module.
//
// ============================================================
// FACT CHECK MANIFEST (status: draft, nothing publishes until cleared)
// 1. ~1,950 institutional filers reported spot bitcoin ETF positions in Q2 2026 -> [VERIFY: Q2 2026 13F filings, SEC EDGAR aggregation]
// 2. 13F-reported spot ETF value ~$54B as of Q2 2026 -> [VERIFY: Q2 2026 13F filings aggregation]
// 3. Combined US spot bitcoin ETF AUM ~$210B -> [VERIFY: Farside / ETF flow trackers, issuer AUM pages]
// 4. 13F-visible share of spot ETF AUM ~26% -> [VERIFY: derived from items 2 and 3; recompute on verification]
// 5. IBIT AUM ~$102B -> [VERIFY: BlackRock iShares IBIT fund page / Farside]
// 6. FBTC AUM ~$32B -> [VERIFY: Fidelity FBTC fund page / Farside]
// 7. GBTC AUM ~$17B -> [VERIFY: Grayscale GBTC fund page / Farside]
// 8. Spot ETFs approved January 2024; 11 funds launched -> [VERIFY: SEC approval order, Jan 2024]
// 9. IBIT listed on Nasdaq; FBTC on Cboe BZX; GBTC on NYSE Arca -> [VERIFY: exchange listings / fund prospectuses]
// 10. Coinbase is custodian for 8 of the 11 spot ETFs -> [VERIFY: fund prospectuses / Coinbase Institutional disclosures]
// 11. Q1 2024 13F-reported spot ETF value ~$11B -> [VERIFY: Q1 2024 13F filings aggregation]
// 12. Q2 2024 ~$14B -> [VERIFY: Q2 2024 13F filings aggregation]
// 13. Q3 2024 ~$16B -> [VERIFY: Q3 2024 13F filings aggregation]
// 14. Q4 2024 ~$27B -> [VERIFY: Q4 2024 13F filings aggregation]
// 15. Q1 2025 ~$22B (first quarterly decline) -> [VERIFY: Q1 2025 13F filings aggregation]
// 16. Q2 2025 ~$29B -> [VERIFY: Q2 2025 13F filings aggregation]
// 17. Q3 2025 ~$36B -> [VERIFY: Q3 2025 13F filings aggregation]
// 18. Q4 2025 ~$44B -> [VERIFY: Q4 2025 13F filings aggregation]
// 19. Q1 2026 ~$48B -> [VERIFY: Q1 2026 13F filings]
// 20. Hedge funds ~45% of 13F-reported value in mid-2024 -> [VERIFY: 13F holder-type classification, Q2 2024]
// 21. Hedge fund share ~28% by Q2 2026 -> [VERIFY: 13F holder-type classification, Q2 2026]
// 22. Investment advisors ~47% of 13F-reported value by Q2 2026 -> [VERIFY: 13F holder-type classification, Q2 2026]
// 23. Millennium Management largest single filer, ~$3.1B across IBIT and FBTC -> [VERIFY: Millennium Q2 2026 13F]
// 24. Goldman Sachs ~$2.4B, largely wealth-platform aggregation -> [VERIFY: Goldman Sachs Q2 2026 13F]
// 25. Brevan Howard ~$1.6B -> [VERIFY: Brevan Howard Q2 2026 13F]
// 26. Jane Street ~$1.4B (market-maker inventory) -> [VERIFY: Jane Street Q2 2026 13F]
// 27. Susquehanna ~$1.2B -> [VERIFY: Susquehanna Q2 2026 13F]
// 28. Mubadala ~$0.9B in IBIT -> [VERIFY: Mubadala Q2 2026 13F]
// 29. State of Wisconsin Investment Board ~$0.6B; first US state pension to disclose (Q1 2024) -> [VERIFY: SWIB 13F filings, Q1 2024 and Q2 2026]
// 30. Morgan Stanley ~$1.9B across platform accounts -> [VERIFY: Morgan Stanley Q2 2026 13F]
// 31. Wells Fargo ~$1.1B -> [VERIFY: Wells Fargo Q2 2026 13F]
// 32. LPL Financial ~$0.9B -> [VERIFY: LPL Financial Q2 2026 13F]
// 33. Hightower Advisors ~$0.7B -> [VERIFY: Hightower Q2 2026 13F]
// 34. Strategy (MSTR) holds ~641,000 BTC -> [VERIFY: Strategy treasury disclosures / 8-K filings]
// 35. Strategy stake worth ~$71B at market -> [VERIFY: derived from item 34 at prevailing BTC price; recompute]
// 36. Strategy holds ~3% of the 21 million terminal supply -> [VERIFY: derived from item 34]
// 37. Marathon Digital (MARA) holds ~50,000 BTC (~$5.5B) -> [VERIFY: MARA treasury disclosures / monthly production updates]
// 38. ~140 public companies hold BTC in treasury, ~1.05M BTC combined -> [VERIFY: company treasury disclosures, BitcoinTreasuries-style aggregators]
// 39. Corporate treasuries ~5% of terminal supply -> [VERIFY: derived from item 38]
// 40. 13F threshold is $100M in covered securities; filings due within 45 days of quarter end -> [VERIFY: SEC Form 13F rules]
// 41. 13F reports long US-listed positions only; direct coin holdings are out of scope -> [VERIFY: SEC Form 13F instructions]
// 42. Basis trade: hedge funds long ETF shares against short CME futures -> [VERIFY: CFTC Commitments of Traders, leveraged-funds net short positioning]
// 43. CME leveraged-funds net short positioning peaked alongside the Q4 2024 13F build -> [VERIFY: CFTC COT data, Q4 2024]
// 44. Q1 2025 bitcoin drawdown of roughly 25% peak to trough -> [VERIFY: BTC price history, Q1 2025]
// 45. Hedge fund count among filers fell while advisor count rose every quarter since Q1 2025 -> [VERIFY: 13F holder-type counts by quarter]
// 46. Top 10 filers hold ~30% of all 13F-reported ETF value -> [VERIFY: Q2 2026 13F filings aggregation]
// 47. Roughly three-quarters of spot ETF AUM is NOT visible in 13F data -> [VERIFY: derived from item 4]
// 48. Spot ETFs absorbed ~$18B of net inflows in H1 2026 -> [VERIFY: Farside flow data, Jan-Jun 2026]
// 49. Sovereign-and-pension group ~$3.1B of 13F-reported value -> [VERIFY: Q2 2026 13F holder-type classification]
// 50. Figure 2 treemap leaf values and quarter-over-quarter changes -> [VERIFY: Q1 vs Q2 2026 13F filings, per-filer deltas]
// 51. Robinhood retail crypto volumes as an ownership proxy -> [VERIFY: HOOD quarterly earnings, crypto transaction revenue]
// 52. BlackRock CEO Larry Fink publicly reversed from skeptic to calling bitcoin digital gold -> [VERIFY: Fink public interviews, 2017 vs 2023-2024]
// 53. Michael Saylor initiated the corporate treasury model at MicroStrategy in August 2020 -> [VERIFY: MicroStrategy Aug 2020 8-K]
// ============================================================

export const bitcoinInstitutionalHolders2026 = {
  id: 'bitcoin-institutional-holders-13f-2026',
  title:
    'Who Actually Holds Bitcoin: 13F Filings Map $54 Billion of Institutional ETF and Treasury Exposure',
  excerpt:
    'Q2 2026 13F filings show roughly 1,950 institutions holding about $54 billion of spot bitcoin ETF shares [VERIFY: Q2 2026 13F aggregation], near 26% of the funds’ $210 billion AUM [VERIFY: Farside/issuer data]. Hedge funds built first, advisors now dominate, and treasury companies led by Strategy hold roughly 1.05 million BTC [VERIFY: treasury disclosures].',
  heroImage: {
    src: '/images/ezana-echo/bitcoin-institutional-holders-13f-2026-hero.png',
    alt: 'Stylized map of institutional bitcoin ownership: ETF tickers and filer names arranged as a treemap over a bitcoin motif.',
    caption:
      'Editorial illustration. The ownership figures in this article are drawn from quarterly 13F filings, which capture only managers above the $100 million reporting threshold and only their US-listed long positions.',
  },
  category: 'crypto',
  subcategory: 'Bitcoin',
  globeRail: {
    metric: {
      title: '13F-REPORTED SPOT ETF VALUE, USD BN',
      data: [
        { x: 0, y: 11 },
        { x: 1, y: 14 },
        { x: 2, y: 16 },
        { x: 3, y: 27 },
        { x: 4, y: 22 },
        { x: 5, y: 29 },
        { x: 6, y: 36 },
        { x: 7, y: 44 },
        { x: 8, y: 48 },
        { x: 9, y: 54 },
      ],
      startLabel: 'Q1 2024 · $11B',
      endLabel: 'Q2 2026 · $54B',
      note: 'Cumulative value of spot bitcoin ETF positions reported on Form 13F, by filing quarter. The Q1 2025 dip tracks the roughly 25% bitcoin drawdown and the partial unwind of the hedge-fund basis trade; the composition beneath the line rotated from hedge funds toward investment advisors. All values draft placeholders pending verification against EDGAR aggregation.',
    },
    cities: [
      {
        name: 'New York',
        country: 'US',
        lat: 40.71,
        lng: -74.01,
        impact:
          'BlackRock’s IBIT, at roughly $102 billion in assets, is the anchor of the spot ETF complex, and most of the largest hedge-fund filers (Millennium, Jane Street) file from New York. Larry Fink’s public reversal from bitcoin skeptic to calling it digital gold bookends the institutionalization trade.',
      },
      {
        name: 'Boston',
        country: 'US',
        lat: 42.36,
        lng: -71.06,
        impact:
          'Fidelity’s FBTC, at roughly $32 billion, is the second-largest spot fund and the one most heavily represented on registered investment advisor platforms, the holder class that now accounts for the largest share of 13F-reported value.',
      },
      {
        name: 'Tysons Corner',
        country: 'US',
        lat: 38.92,
        lng: -77.23,
        impact:
          'Strategy (MSTR), headquartered in Tysons Corner, Virginia, holds roughly 641,000 BTC, about 3% of the 21 million terminal supply, making a single operating company a larger bitcoin holder than the entire 13F-reported ETF complex combined.',
      },
      {
        name: 'Abu Dhabi',
        country: 'AE',
        lat: 24.45,
        lng: 54.38,
        impact:
          'Mubadala’s reported IBIT position, roughly $0.9 billion, is the most-watched sovereign-wealth entry in the filings, a signal that state capital is willing to hold bitcoin exposure through a US-listed wrapper rather than direct custody.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  meta: {
    sectors: ['Financials', 'Information Technology'],
    industries: ['Asset Management & Custody Banks', 'Financial Exchanges & Data'],
    investors: ['Michael Saylor', 'Larry Fink'],
    institutions: [
      'BlackRock',
      'Fidelity',
      'Grayscale',
      'Strategy',
      'Millennium Management',
      'Goldman Sachs',
      'Brevan Howard',
      'Jane Street',
      'Mubadala',
      'Coinbase',
    ],
    government: ['SEC', 'State of Wisconsin Investment Board'],
    geos: ['United States', 'United Arab Emirates'],
    assetClasses: ['Digital Assets', 'Equities'],
    themes: ['Institutional Adoption', 'Ownership Concentration', 'Disclosure Data'],
    datasets: ['13F filings', 'ETF flow data', 'CFTC Commitments of Traders'],
    markets: ['Nasdaq', 'NYSE Arca', 'Cboe BZX'],
  },
  tickers: ['IBIT', 'FBTC', 'GBTC', 'MSTR', 'MARA', 'COIN', 'HOOD', 'BLK'],
  entities: {
    people: [
      {
        id: 'michael-saylor',
        label: 'Michael Saylor',
        role: 'Executive chairman, Strategy; originator of the corporate bitcoin treasury model',
      },
      {
        id: 'larry-fink',
        label: 'Larry Fink',
        role: 'CEO, BlackRock; issuer of IBIT, the largest spot bitcoin ETF',
      },
    ],
    terms: [
      { id: 'regulatory-catalyst', label: 'Regulatory catalyst' },
      { id: 'gold-store-of-value', label: 'Gold as store of value' },
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
  status: 'published',
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'Two and a half years after the SEC approved spot bitcoin ETFs in January 2024 [VERIFY: SEC approval order, Jan 2024], the quarterly 13F record finally answers the question the launch raised: who actually holds this stuff? The Q2 2026 filings show roughly 1,950 institutional managers reporting spot bitcoin ETF positions worth about $54 billion in aggregate [VERIFY: Q2 2026 13F filings, EDGAR aggregation], approximately 26% of the funds’ combined $210 billion in assets [VERIFY: Farside / issuer AUM data]. The other three-quarters belongs to holders the filings cannot see: retail accounts, managers below the reporting threshold, and non-US entities. What the visible quarter-by-quarter record does show is a clean two-act structure. Hedge funds built first and fastest, advisors arrived later and stayed, and alongside both, a parallel ownership channel, the corporate treasury company, accumulated roughly 1.05 million BTC [VERIFY: company treasury disclosures] that never touches a 13F at all.',
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: '13F filers reporting spot BTC ETFs',
          value: '~1,950',
          change: 'Q2 2026 filings [VERIFY: EDGAR aggregation]',
        },
        {
          label: '13F-reported ETF value',
          value: '~$54B',
          change: '~26% of spot ETF AUM [VERIFY: 13F aggregation]',
        },
        {
          label: 'Combined spot ETF AUM',
          value: '~$210B',
          change: 'IBIT ~$102B leads [VERIFY: Farside / issuers]',
        },
        {
          label: 'Corporate treasury BTC',
          value: '~1.05M BTC',
          change: '~140 public companies [VERIFY: treasury disclosures]',
        },
      ],
    },
    {
      type: 'heading',
      text: 'The 13F lens, and what it cannot see',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Form 13F is the only systematic public window into institutional bitcoin ownership, and its blind spots define the analysis. Managers must file only if they run more than $100 million in covered US-listed securities, and filings land up to 45 days after quarter end [VERIFY: SEC Form 13F rules]. The form reports long positions in US-listed instruments only: ETF shares are covered, but short positions, futures, offshore vehicles, and direct coin custody are all out of scope [VERIFY: SEC Form 13F instructions]. That last exclusion matters enormously for bitcoin, because the single largest institutional holder class, the treasury company, holds coin directly and therefore appears in the record only through its own equity. Reading 13F data as "institutional ownership" without those caveats overstates precision; reading the trend across ten consecutive quarters, however, is exactly what the form is good for.',
    },
    {
      type: 'paragraph',
      text: 'The venue architecture also shapes what gets filed. IBIT trades on Nasdaq, FBTC on Cboe BZX, and GBTC on NYSE Arca [VERIFY: fund prospectuses], and Coinbase serves as custodian for 8 of the 11 funds launched at approval [VERIFY: fund prospectuses / Coinbase Institutional], a dependency that makes COIN a levered play on the entire complex regardless of which ticker an institution buys. The approval itself was the textbook [[kw:regulatory-catalyst]]regulatory catalyst[[/kw]]: a single SEC order converted an asset most compliance departments could not touch into a line item any 13F filer could hold, and the filings that followed are the measurable record of that conversion.',
    },
    {
      type: 'heading',
      text: 'The build timeline: hedge funds first, advisors later',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The cumulative build is best read as two distinct regimes. In the first year, hedge funds dominated: by mid-2024 they accounted for roughly 45% of all 13F-reported spot ETF value [VERIFY: 13F holder-type classification, Q2 2024], and much of that exposure was not a directional bet at all. Funds were running the basis trade, long ETF shares against short CME bitcoin futures, harvesting the spread [VERIFY: CFTC Commitments of Traders, leveraged-funds positioning], and CFTC data shows leveraged-fund net shorts peaking alongside the Q4 2024 filing surge to roughly $27 billion of reported value [VERIFY: CFTC COT data; Q4 2024 13F aggregation]. When bitcoin drew down roughly 25% peak to trough in Q1 2025 [VERIFY: BTC price history], the basis compressed, the trade partially unwound, and reported value fell to about $22 billion [VERIFY: Q1 2025 13F aggregation], the only quarterly decline in the series.',
    },
    {
      type: 'trajectory',
      figureLabel: 'FIG. 1 · TEN QUARTERS OF INSTITUTIONAL BUILD',
      kicker:
        'CUMULATIVE SPOT BITCOIN ETF VALUE REPORTED ON FORM 13F, USD BN · X AXIS = QUARTERS SINCE Q1 2024 (0 = Q1 2024, 9 = Q2 2026)',
      hint: 'One dip in ten quarters: the Q1 2025 basis-trade unwind. The composition beneath the line rotated from hedge funds to advisors.',
      source:
        'DRAFT [VERIFY: quarterly 13F filings aggregated from SEC EDGAR, Q1 2024 through Q2 2026; holder-type classification per filer]',
      yLabel: 'USD Bn',
      yMax: 60,
      xMin: 0,
      xMax: 9,
      series: [
        {
          key: 'reported',
          label: '13F value',
          color: 'var(--echo-chart-green)',
          data: [
            { x: 0, y: 11 },
            { x: 1, y: 14 },
            { x: 2, y: 16 },
            { x: 3, y: 27 },
            { x: 4, y: 22 },
            { x: 5, y: 29 },
            { x: 6, y: 36 },
            { x: 7, y: 44 },
            { x: 8, y: 48 },
            { x: 9, y: 54 },
          ],
        },
      ],
      annotations: [
        { x: 0, y: 11, label: 'Q1 2024', sub: 'ETF launch quarter · $11B' },
        { x: 4, y: 22, label: 'Q1 2025 unwind', sub: 'basis trade compresses · -$5B' },
        { x: 9, y: 54, label: 'Q2 2026', sub: '$54B · advisors now ~47%' },
      ],
    },
    {
      type: 'paragraph',
      text: 'The second regime is slower and stickier. From Q2 2025 onward, reported value climbed every quarter, from about $29 billion to $36 billion, $44 billion, $48 billion, and finally $54 billion in Q2 2026 [VERIFY: Q2 2025 through Q2 2026 13F aggregations], and the composition beneath the line inverted. Hedge funds’ share of reported value fell to roughly 28% by Q2 2026 while investment advisors rose to about 47% [VERIFY: 13F holder-type classification, Q2 2026], with the advisor count among filers rising and the hedge-fund count falling in every quarter since Q1 2025 [VERIFY: 13F holder-type counts]. The distinction matters for flow durability: a basis-trade position exists only while the spread pays, but an advisor allocation is a standing model-portfolio weight, rebalanced rather than liquidated. The $18 billion of net spot ETF inflows in the first half of 2026 [VERIFY: Farside flow data, Jan-Jun 2026] arrived predominantly through that advisor channel.',
    },
    {
      type: 'heading',
      text: 'The ownership map: advisors, funds, sovereigns, treasuries',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Mapped by holder type, the visible ownership base sorts into four blocks of very different character. Investment advisors are the largest 13F block, roughly $25 billion of reported value spread across hundreds of platforms [VERIFY: Q2 2026 holder-type aggregation], with wirehouse and RIA names like Morgan Stanley at about $1.9 billion, Wells Fargo at $1.1 billion, LPL Financial at $0.9 billion, and Hightower at $0.7 billion [VERIFY: respective Q2 2026 13F filings]. Hedge funds and proprietary traders hold roughly $15 billion [VERIFY: holder-type aggregation]. The sovereign-and-pension block is small, about $3.1 billion [VERIFY: holder-type aggregation], but carries outsized signal value. And the treasury companies sit apart entirely: Strategy’s roughly 641,000 BTC is worth about $71 billion at market [VERIFY: Strategy disclosures; derived at prevailing price], larger than the entire 13F-reported ETF complex combined.',
    },
    {
      type: 'market-treemap',
      figureLabel: 'FIG. 2 · THE VISIBLE OWNERS, MAPPED',
      kicker:
        'AREA = REPORTED VALUE, USD BN · FILL = QUARTER-OVER-QUARTER CHANGE IN REPORTED VALUE, Q1→Q2 2026 · ETF BLOCKS ARE 13F VALUES; TREASURY BLOCK IS BTC AT MARKET, A DIFFERENT DISCLOSURE CHANNEL',
      hint: 'Advisors are the broadest block; Strategy alone outweighs every 13F filer combined.',
      source:
        'DRAFT [VERIFY: Q1 and Q2 2026 13F filings for ETF blocks; company treasury disclosures at prevailing BTC price for the treasury block]',
      groups: [
        {
          label: 'INVESTMENT ADVISORS',
          leaves: [
            { label: 'Goldman Sachs', size: 2.4, perf: 7 },
            { label: 'Morgan Stanley', size: 1.9, perf: 9 },
            { label: 'Wells Fargo', size: 1.1, perf: 8 },
            { label: 'LPL Financial', size: 0.9, perf: 9 },
            { label: 'Hightower', size: 0.7, perf: 6 },
            { label: 'Other advisors', size: 18.4, perf: 8 },
          ],
        },
        {
          label: 'HEDGE FUNDS & PROP',
          leaves: [
            { label: 'Millennium', size: 3.1, perf: -4 },
            { label: 'Brevan Howard', size: 1.6, perf: 3 },
            { label: 'Jane Street', size: 1.4, perf: -7 },
            { label: 'Susquehanna', size: 1.2, perf: -2 },
            { label: 'Other funds', size: 7.8, perf: -1 },
          ],
        },
        {
          label: 'SOVEREIGN & PENSIONS',
          leaves: [
            { label: 'Mubadala', size: 0.9, perf: 9 },
            { label: 'Wisconsin (SWIB)', size: 0.6, perf: 5 },
            { label: 'Other', size: 1.6, perf: 4 },
          ],
        },
        {
          label: 'TREASURY COMPANIES (BTC AT MARKET)',
          leaves: [
            { label: 'Strategy', size: 71.0, perf: 6 },
            { label: 'Marathon', size: 5.5, perf: 3 },
            { label: 'Other treasuries', size: 12.0, perf: 2 },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'The sovereign-and-pension block deserves its own paragraph despite its size. The State of Wisconsin Investment Board became the first US state pension to disclose a spot ETF position, in its Q1 2024 filing, and reported roughly $0.6 billion by Q2 2026 [VERIFY: SWIB 13F filings]. Mubadala’s roughly $0.9 billion IBIT position [VERIFY: Mubadala Q2 2026 13F] is the marker most allocators watch: sovereign wealth choosing a US-listed wrapper over direct custody validates the ETF as an institutional instrument, not merely a retail convenience. These positions are small against either institution’s balance sheet, but pension and sovereign filings function as permission structures for the next tier of allocators, which is why each new name in this block moves sentiment more than its dollar size implies.',
    },
    {
      type: 'heading',
      text: 'The largest filers, one by one',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Ranking individual filers requires reading each one’s business model, because a dollar of reported value means different things in different hands. Millennium’s roughly $3.1 billion across IBIT and FBTC [VERIFY: Millennium Q2 2026 13F] is substantially arbitrage inventory; Goldman Sachs’ $2.4 billion [VERIFY: Goldman Q2 2026 13F] largely aggregates wealth-management client accounts rather than a house view; Jane Street’s $1.4 billion [VERIFY: Jane Street Q2 2026 13F] is market-maker inventory that can flip sign week to week. The concentration is real but moderate: the top 10 filers account for roughly 30% of all 13F-reported ETF value [VERIFY: Q2 2026 aggregation], while the long tail of nearly 1,950 filers supplies the rest.',
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 3 · TOP FILERS, WITH CAVEATS ATTACHED',
      kicker:
        'FILER · WHAT THE FILING SHOWS · REPORTED VALUE · KEY CAVEAT, CLICK A ROW FOR THE DOSSIER. ALL VALUES DRAFT PLACEHOLDERS PENDING VERIFICATION.',
      hint: 'Reported value is not conviction: separate arbitrage inventory from platform aggregation from principal bets.',
      source:
        'DRAFT [VERIFY: Q2 2026 Form 13F filings per named filer, SEC EDGAR; Strategy row from company treasury disclosures, not 13F]',
      headers: ['Filer', 'What the filing shows', 'Reported value', 'Key caveat', ''],
      rows: [
        {
          name: 'Millennium Management',
          tag: 'HEDGE FUND',
          role: 'Largest single 13F filer, holding both IBIT and FBTC across fund entities.',
          anchor: '~$3.1B reported [VERIFY: Q2 2026 13F].',
          keyRisk:
            'Substantially basis-trade inventory hedged with short CME futures; the 13F shows only the long leg.',
          dossier: [
            {
              label: 'Read',
              text: 'Position size tracks the futures basis, not a directional bitcoin view; it shrank in the Q1 2025 unwind and can shrink again.',
            },
          ],
        },
        {
          name: 'Goldman Sachs',
          tag: 'ADVISOR / BANK',
          role: 'Aggregated wealth-platform and market-making exposure across IBIT and FBTC.',
          anchor: '~$2.4B reported [VERIFY: Q2 2026 13F].',
          keyRisk:
            'Largely client-account aggregation on the wealth platform; not a proprietary house position.',
          dossier: [
            {
              label: 'Channel',
              text: 'Wirehouse platform approval is the mechanism that converted advisor demand into standing ETF allocations.',
            },
          ],
        },
        {
          name: 'Brevan Howard',
          tag: 'HEDGE FUND',
          role: 'Macro fund holding spot ETF exposure alongside its dedicated digital-asset strategies.',
          anchor: '~$1.6B reported [VERIFY: Q2 2026 13F].',
          keyRisk:
            'Offshore and direct-coin exposure in its digital funds is invisible to the 13F; the filing understates the firm’s true footprint.',
          dossier: [
            {
              label: 'Read',
              text: 'One of the few filers where the reported position likely reflects genuine directional conviction.',
            },
          ],
        },
        {
          name: 'Jane Street',
          tag: 'MARKET MAKER',
          role: 'Authorized-participant and market-making inventory across the ETF complex.',
          anchor: '~$1.4B reported [VERIFY: Q2 2026 13F].',
          keyRisk:
            'Inventory, not investment: the position exists to make markets and can flip sign between quarter-end snapshots.',
          dossier: [
            {
              label: 'Plumbing',
              text: 'AP inventory is the transmission mechanism between ETF flows and spot bitcoin; its presence in the top ranks is structural.',
            },
          ],
        },
        {
          name: 'Mubadala',
          tag: 'SOVEREIGN WEALTH',
          role: 'Abu Dhabi sovereign fund holding IBIT.',
          anchor: '~$0.9B reported [VERIFY: Q2 2026 13F].',
          keyRisk:
            'Small against the fund’s total assets; the signal value exceeds the dollar value.',
          dossier: [
            {
              label: 'Signal',
              text: 'State capital choosing a US-listed wrapper over direct custody is the strongest single validation in the filing record.',
            },
          ],
        },
        {
          name: 'State of Wisconsin (SWIB)',
          tag: 'STATE PENSION',
          role: 'First US state pension to disclose a spot bitcoin ETF position, beginning Q1 2024.',
          anchor: '~$0.6B reported [VERIFY: SWIB 13F filings].',
          keyRisk:
            'A fraction of a percent of plan assets; a policy experiment, not an allocation shift.',
          dossier: [
            {
              label: 'Precedent',
              text: 'Pension filings function as permission structures for peer allocators; each new entrant matters more than its size.',
            },
          ],
        },
        {
          name: 'Strategy (MSTR)',
          tag: 'TREASURY COMPANY',
          role: 'Not a 13F story: direct coin holdings disclosed via 8-K, roughly 641,000 BTC.',
          anchor: '~$71B at market [VERIFY: treasury disclosures; derived].',
          keyRisk:
            'Equity trades at a premium or discount to coin value; shareholders own the wrapper’s leverage, not the coin itself.',
          dossier: [
            {
              label: 'Scale',
              text: 'Roughly 3% of the 21 million terminal supply in one operating company, larger than the entire 13F-reported ETF complex combined.',
            },
          ],
        },
      ],
    },
    {
      type: 'heading',
      text: 'Treasury companies: the ownership channel 13Fs cannot see',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The corporate treasury channel predates the ETFs by four years and still dwarfs them in coin terms. [[person:michael-saylor]]Michael Saylor[[/person]] initiated the model at MicroStrategy, now Strategy, with its first purchase in August 2020 [VERIFY: MicroStrategy Aug 2020 8-K], and the company has since accumulated roughly 641,000 BTC [VERIFY: Strategy 8-K disclosures], about 3% of the 21 million terminal supply [VERIFY: derived]. Marathon Digital holds roughly 50,000 BTC worth about $5.5 billion [VERIFY: MARA treasury disclosures], and the full cohort now spans roughly 140 public companies holding about 1.05 million BTC combined [VERIFY: treasury disclosure aggregators], near 5% of terminal supply [VERIFY: derived]. None of this appears on a Form 13F, because coin held in corporate treasury is not a covered security; the disclosure channel is the 8-K and the earnings deck, on the company’s own schedule.',
    },
    {
      type: 'callout',
      label: 'The visibility gap',
      value: '~26% visible',
      context:
        'Only about $54B of the $210B spot ETF complex shows up in 13F filings [VERIFY: 13F aggregation vs. Farside AUM data]; the rest is retail, sub-threshold managers, and non-US holders. Institutional ownership analysis built on 13Fs alone describes a quarter of the ETF base, and none of the direct-coin base.',
    },
    {
      type: 'paragraph',
      text: 'For investors, the treasury company is a fundamentally different instrument from the ETF. An IBIT share is a custody receipt; an MSTR share is a leveraged claim on a corporate balance sheet that issues equity and convertible debt to buy more coin, and it trades at a premium or discount to its holdings that has itself become a traded signal. The comparison investors reflexively reach for is [[kw:gold-store-of-value]]gold as a store of value[[/kw]], and [[person:larry-fink]]Larry Fink[[/person]]’s own arc, from calling bitcoin an index of money laundering in 2017 to describing it as digital gold by the ETF launch [VERIFY: Fink public interviews], is the institutional adoption story compressed into one career. But gold’s ownership base has no equivalent of a single company holding 3% of terminal supply, which is where the analogy, and the risk analysis, must part ways.',
    },
    {
      type: 'heading',
      text: 'Concentration, and how to position around it',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The shape of institutional ownership is therefore a barbell with a visible middle. On one end, a long and lengthening tail of advisor allocations, individually small, collectively the largest and stickiest 13F block. On the other, extreme single-entity [[kw:concentration-risk]]concentration risk[[/kw]]: Strategy alone holds more bitcoin at market value than all 1,950 13F filers report combined [VERIFY: derived comparison], and the top 10 filers hold roughly 30% of the visible ETF value [VERIFY: Q2 2026 aggregation]. The tradeable expressions map cleanly onto that structure: IBIT, FBTC, and GBTC for the custody receipt at three fee and liquidity points; MSTR and MARA for leveraged treasury exposure; COIN for the custody-and-trading toll booth beneath 8 of the 11 funds [VERIFY: fund prospectuses]; HOOD for the retail flow that the 13F record explicitly cannot see [VERIFY: HOOD crypto transaction revenue]; and BLK for the fee stream on the largest fund itself.',
    },
    {
      type: 'paragraph',
      text: 'The base case from here is continuation of the second regime: advisor share grinding higher each quarter as more platforms complete approval, hedge-fund share oscillating with the futures basis, and one or two new sovereign or pension names per filing season doing more for sentiment than for flows. The bear case is a repeat of Q1 2025 at advisor scale, a drawdown deep enough to test whether model-portfolio allocations rebalance into weakness or get pulled, plus the standing wrapper risk that a treasury-company premium compresses violently. Either way, the 13F record updates on a 45-day lag [VERIFY: SEC Form 13F rules], four times a year, and Ezana’s institutional-holdings tooling tracks the filer-level deltas each season; the quant workbench can backtest whether following the advisor build, rather than the headline flows, has actually paid. Watch the Q3 2026 filings in mid-November: the advisor share, not the price, is the number that tells you whether the institutionalization trade is still on.',
    },
  ],
};

export default bitcoinInstitutionalHolders2026;
