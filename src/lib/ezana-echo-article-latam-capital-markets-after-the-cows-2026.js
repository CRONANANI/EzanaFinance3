// src/lib/ezana-echo-article-latam-capital-markets-after-the-cows-2026.js
// Ezana Echo DRAFT article: LatAm capital markets maturation. Sequel to
// ezana-echo-article-tokenization-collateral-2026.js (the tokenized-cattle
// piece); picks up where the cows left off and follows the venue (B3), the
// mega-cap (Mercado Libre), and the experiment (Argentina's stabilization).
// status: 'draft'. Nothing publishes until every [VERIFY] below is cleared.
//
// ============================================================
// FACT CHECK MANIFEST (status: draft, nothing publishes until cleared)
// 1. July 2026 Parana pilot: ten tokenized dairy cows registered on B3,
//    ~$20,000 borrowed against the herd -> [VERIFY: CoinDesk reporting, July
//    2026; prior Echo article tokenization-collateral-2026]
// 2. Bovespa founded 1890 (exchange ~136 years old) -> [VERIFY: B3 corporate history]
// 3. Brazil is the world's ninth-largest economy -> [VERIFY: IMF World Economic Outlook]
// 4. Bovespa merged with BM&F in 2008 forming BM&FBovespa -> [VERIFY: B3 corporate history]
// 5. BM&FBovespa merged with Cetip in 2017 forming B3 -> [VERIFY: B3 corporate history]
// 6. B3 is vertically integrated: listing, trading, clearing, central
//    depository, OTC registration -> [VERIFY: B3 investor relations]
// 7. ~360 companies listed on B3, down from more than 550 in the late 1990s
//    -> [VERIFY: B3 / World Bank listed-companies data]
// 8. 45 IPOs on B3 in 2021 raising ~R$65 billion -> [VERIFY: B3 listing statistics]
// 9. Zero B3 IPOs 2022 through 2024 -> [VERIFY: B3 listing statistics]
// 10. Selic rate reached 15% in 2025 -> [VERIFY: Central Bank of Brazil]
// 11. Nubank lists on NYSE, Mercado Libre on Nasdaq, neither on B3
//     -> [VERIFY: exchange listings / company filings]
// 12. B3 registry arm records receivables, agribusiness credit instruments,
//     and now tokenized livestock; management frames registered off-exchange
//     assets as the growth engine -> [VERIFY: B3 product docs and earnings commentary]
// 13. 2003-2014 commodity supercycle driven by Chinese demand for iron ore,
//     soybeans, crude -> [VERIFY: World Bank commodity price data]
// 14. Petrobras and Vale historically dominant weights in Brazil indices /
//     EWZ -> [VERIFY: iShares EWZ holdings history]
// 15. Petrobras has run double-digit dividend yields in recent years
//     -> [VERIFY: Petrobras filings]
// 16. Vale is a levered play on Chinese steel; 2024 revenue declined
//     -> [VERIFY: Vale 2024 annual report]
// 17. Brazilian equities near 8x forward earnings vs ~22x for the S&P 500
//     -> [VERIFY: iShares EWZ and S&P 500 factsheets, mid-2026]
// 18. Mercado Libre founded 1999 in Buenos Aires by Marcos Galperin
//     -> [VERIFY: company history]
// 19. MELI listed on Nasdaq in 2007 -> [VERIFY: SEC filings]
// 20. MELI market cap near $95 billion; most valuable LatAm listed company
//     -> [VERIFY: market data, August 2026]
// 21. MELI 2024 revenue $20.8 billion, +38% year over year -> [VERIFY: MELI 2024 10-K]
// 22. MELI operates in 18 countries -> [VERIFY: MELI 10-K]
// 23. MELI headquartered in Montevideo -> [VERIFY: MELI 10-K]
// 24. Nubank founded in Sao Paulo in 2013 by David Velez -> [VERIFY: company history]
// 25. Nubank serves 110M+ customers across Brazil, Mexico, Colombia
//     -> [VERIFY: Nubank quarterly filings]
// 26. Over half of Brazil's adult population are Nubank customers
//     -> [VERIFY: Nubank filings]
// 27. Nubank Mexico past 10 million accounts, fastest-growing market
//     -> [VERIFY: Nubank filings]
// 28. Berkshire Hathaway invested $500 million in Nubank pre-IPO, June 2021
//     -> [VERIFY: Nubank F-1]
// 29. December 2021 NYSE IPO valued Nubank near $41 billion, briefly above
//     Itau -> [VERIFY: IPO filings and coverage; market data, Dec 2021]
// 30. MELI and Nubank are incorporated outside the countries they serve
//     -> [VERIFY: MELI 10-K (Delaware); Nu Holdings 20-F (Cayman)]
// 31. Milei took office December 10, 2023 -> [VERIFY: public record]
// 32. Argentina 2023 annual inflation 211% -> [VERIFY: INDEC]
// 33. December 2023 monthly inflation 25.5% -> [VERIFY: INDEC]
// 34. Official peso devalued ~54% in December 2023 -> [VERIFY: BCRA]
// 35. First annual financial surplus since 2010, calendar 2024
//     -> [VERIFY: Argentina Ministry of Economy]
// 36. April 2025: IMF approved $20 billion Extended Fund Facility, ~$12
//     billion disbursed upfront -> [VERIFY: IMF program documents]
// 37. Crawling peg replaced by 1,000-1,400 peso band, edges moving 1%/month
//     -> [VERIFY: BCRA / IMF staff report, April 2025]
// 38. Cepo (currency controls) lifted for individuals, April 2025
//     -> [VERIFY: BCRA announcements]
// 39. The program is Argentina's 23rd IMF arrangement -> [VERIFY: IMF lending history]
// 40. Monthly inflation near 2% by mid-2026 -> [VERIFY: INDEC]
// 41. Globe-rail inflation path points (25.5% Dec 2023, ~4.2% mid-2024,
//     ~2.8% Apr 2025, ~1.9% mid-2026) -> [VERIFY: INDEC monthly CPI series]
// 42. Global X Argentina ETF (ARGT) returned ~60% in 2024
//     -> [VERIFY: Global X fund performance]
// 43. Grupo Financiero Galicia and YPF ADRs more than doubled in 2024
//     -> [VERIFY: NYSE market data, 2024]
// 44. BCRA net reserves ~negative $11 billion at end-2023, climbing toward
//     positive by 2026 -> [VERIFY: BCRA balance-sheet data]
// 45. Dollarization deferred; bimonetary system with legal dollar circulation
//     -> [VERIFY: Argentine government statements and IMF documents]
// 46. MSCI cut Argentina from Emerging Markets to Standalone, November 2021
//     -> [VERIFY: MSCI index review]
// 47. Reclassification path (standalone -> frontier -> EM) forces
//     benchmark-tracking inflows -> [VERIFY: MSCI reclassification framework]
// 48. MELI has rarely traded below 40x earnings -> [VERIFY: market data]
// 49. Argentina convertibility peg 1991-2002, ended in collapse and default
//     -> [VERIFY: public record / IMF post-mortems]
// 50. Milei zero-deficit quote -> [VERIFY: attributable public statement and date]
// 51. FIG. 2 bubble-field values: market caps (MELI ~$95B, NU ~$55B, PBR
//     ~$90B, VALE ~$42B, ITUB ~$62B, GGAL ~$10B, YPF ~$16B), 2024 USD
//     revenue growth (MELI +38%, NU +43%, PBR -3%, VALE -8%, ITUB +9%,
//     GGAL +48%, YPF +11%), free float (MELI 91%, NU 77%, PBR 63%, VALE
//     97%, ITUB 60%, GGAL 78%, YPF 49%) -> [VERIFY: company 2024 filings
//     (10-K/20-F/annual reports), market-cap and float data, August 2026]
// 52. YPF is 51% state-owned -> [VERIFY: YPF filings]
// 53. FIG. 1 lifeline spans and outcomes (Bovespa 1890-2008, BM&FBovespa
//     2008-2017, B3 2017-present; convertibility 1991-2002; supercycle
//     2003-2014; platform era 2007-present; stabilization 2023-present)
//     -> [VERIFY: B3 corporate history; public record]
// 54. FIG. 3 wall-timeline plaque dates and details (Dec 2023 devaluation,
//     Jan 2025 surplus report for 2024, Apr 2025 IMF/band/cepo, Jul 2026
//     cows on B3) -> [VERIFY: BCRA, Ministry of Economy, IMF, CoinDesk]
// 55. Petrobras state controlling stake (free float ~63%) -> [VERIFY: Petrobras filings]
// ============================================================

export const latamCapitalMarketsAfterTheCows2026 = {
  id: 'latam-capital-markets-after-the-cows-2026',
  title:
    "After the Cows: B3, Mercado Libre, and Argentina's Experiment Are Rewriting Latin America's Capital Markets",
  excerpt:
    "Brazil's B3 just registered cows as loan collateral; Mercado Libre trades near a $95 billion market cap [VERIFY: market data]; Argentina cut monthly inflation from 25.5% to roughly 2% [VERIFY: INDEC]. Latin America is maturing from commodity proxy into a market with a real venue, a real mega-cap, and a stabilization experiment worth re-rating.",
  heroImage: {
    src: '/images/ezana-echo/latam-capital-markets-after-the-cows-2026-hero.png',
    alt: 'A stock-exchange trading floor motif blended with a South American map, cattle silhouettes fading into candlestick charts',
    caption:
      'The ten tokenized cows that walked onto B3 in July 2026 were a credit story. The venue that registered them, the mega-cap the region built, and the experiment running in Buenos Aires are the sequel.',
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: "When this publication last visited Latin America, the story was ten dairy cows in Parana: tokenized, registered on B3, Brazil's national exchange, and borrowed against for nearly $20,000 [VERIFY: CoinDesk reporting, July 2026]. That piece, 'The Cow Is the Collateral,' read the pilot as a credit story, a working demonstration of [[kw:collateral-utility]]collateral utility[[/kw]] pointed at a multi-trillion-dollar lending gap. But the pilot buried a second story in plain sight: the venue. The cows did not land on a startup's ledger. They landed on the market infrastructure of an exchange founded in 1890 [VERIFY: B3 corporate history] that clears equities, derivatives, and fixed income for the world's ninth-largest economy [VERIFY: IMF World Economic Outlook]. What happens after the cows is the bigger trade: Latin American capital markets are maturing, and three storylines, B3's registry ambitions, Mercado Libre's mega-cap consolidation, and Argentina's stabilization experiment, are doing the maturing.",
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'Mercado Libre market cap',
          value: '~$95B',
          change: "LatAm's most valuable listed company [VERIFY]",
        },
        {
          label: 'Nubank customers',
          value: '110M+',
          change: 'Brazil, Mexico, Colombia [VERIFY]',
        },
        {
          label: 'Argentina monthly inflation',
          value: '25.5% → ~2%',
          change: 'Dec 2023 vs mid-2026 [VERIFY: INDEC]',
        },
        {
          label: 'B3 IPO drought',
          value: '45 → 0',
          change: '2021 IPOs vs 2022-2024 [VERIFY: B3]',
        },
        {
          label: 'IMF program, April 2025',
          value: '$20B',
          change: 'Extended Fund Facility [VERIFY: IMF]',
        },
      ],
    },

    { type: 'heading', text: 'The venue the cows walked onto', level: 2 },
    {
      type: 'paragraph',
      text: "The venue's own history is a maturation story compressed into three names. The Sao Paulo exchange was founded as Bovespa in 1890 [VERIFY: B3 corporate history], merged with the BM&F derivatives exchange in 2008 [VERIFY: B3 corporate history], and absorbed the Cetip securities registry in 2017 to become B3 [VERIFY: B3 corporate history]: a vertically integrated operator of listing, trading, clearing, central depository, and over-the-counter registration for nearly every financial instrument in Brazil [VERIFY: B3 investor relations]. That last acquisition is the one doing the work in 2026. The registry arm that records receivables and agribusiness credit instruments is the same infrastructure that registered ten cows as [[kw:real-world-assets]]real-world assets[[/kw]] this July [VERIFY: B3 product documentation; CoinDesk, July 2026], and it is the part of the exchange that is growing.",
    },
    {
      type: 'paragraph',
      text: "The listing business, by contrast, has been shrinking for a generation. Roughly 360 companies trade on B3 today, down from more than 550 in the late 1990s [VERIFY: B3 and World Bank listed-company data]. The exchange priced 45 IPOs in 2021, raising about R$65 billion in the cheap-money window [VERIFY: B3 listing statistics], then went three full years, 2022 through 2024, without a single one [VERIFY: B3 listing statistics] as Brazil's central bank pushed the Selic rate as high as 15% [VERIFY: Central Bank of Brazil] and equity capital fled to fixed income. The region's two defining growth companies never listed at home at all: Mercado Libre trades on Nasdaq and Nubank chose the NYSE [VERIFY: exchange listings].",
    },
    {
      type: 'callout',
      label: 'The B3 listing paradox',
      value: '45 → 0',
      context:
        '45 IPOs in 2021, then three years without one (2022-2024), while the registry side of the exchange kept compounding: receivables, agribusiness credit, and now tokenized livestock. [VERIFY: B3 listing statistics and product documentation]',
    },
    {
      type: 'paragraph',
      text: "Read together, the two lines describe an exchange changing species. The equity-listing franchise is cyclical and, for now, dormant; the post-trade and registry franchise is structural and expanding into asset classes no major exchange has touched before. An exchange that can register a cow can register an invoice, a solar farm, or an export contract, and B3's management has framed registered off-exchange assets as the growth engine [VERIFY: B3 earnings commentary]. The maturation trade in Brazil is not a bet on more IPOs next year. It is a bet that the plumbing underneath the market keeps widening regardless of the IPO calendar.",
    },
    {
      type: 'lifelines',
      figureLabel: 'FIG. 1 · ONE VENUE, THREE NAMES, FOUR ERAS',
      kicker:
        "BRAZIL'S EXCHANGE LINEAGE AND THE MARKET ERAS THE REGION TRADED THROUGH · 1890-2026 · CLICK ANY LIFELINE FOR THE RECORD.",
      hint: 'Click a lifeline for its record.',
      source:
        'DRAFT [VERIFY: B3 corporate history; public record on the convertibility peg, the commodity supercycle, and the Milei program]',
      startYear: 1890,
      endYear: 2026,
      groups: [
        {
          label: 'One venue, three names (Sao Paulo)',
          rows: [
            {
              name: 'Bovespa',
              from: 1890,
              to: 2008,
              outcome: { type: 'transformed', label: 'merged → BM&FBovespa · 2008' },
              record:
                'Founded in 1890, the Sao Paulo stock exchange ran as Bovespa for more than a century before merging with the BM&F derivatives exchange in 2008. [VERIFY: B3 corporate history]',
            },
            {
              name: 'BM&FBovespa',
              from: 2008,
              to: 2017,
              outcome: { type: 'transformed', label: 'merged → B3 · 2017' },
              record:
                'The combined equities-and-derivatives exchange absorbed the Cetip securities registry in 2017, creating B3 and adding the over-the-counter registration business that now defines its growth. [VERIFY: B3 corporate history]',
            },
            {
              name: 'B3',
              from: 2017,
              to: null,
              outcome: { type: 'continuing', label: 'registry for everything' },
              record:
                'A vertically integrated operator of listing, trading, clearing, depository, and registration. In July 2026 its registry arm recorded ten tokenized dairy cows as loan collateral. [VERIFY: B3 investor relations; CoinDesk, July 2026]',
            },
          ],
        },
        {
          label: 'The market eras the region traded through',
          rows: [
            {
              name: 'Convertibility peg (Argentina)',
              from: 1991,
              to: 2002,
              outcome: { type: 'handover', label: 'collapse · 2002' },
              record:
                'The one-to-one peso-dollar peg held for a decade before ending in the 2001-2002 collapse and sovereign default, the trauma every later stabilization plan is measured against. [VERIFY: public record; IMF post-mortems]',
            },
            {
              name: 'Commodity supercycle',
              from: 2003,
              to: 2014,
              outcome: { type: 'handover', label: 'taper · 2014' },
              record:
                "Chinese demand for iron ore, soybeans, and crude set the region's equity beta; Petrobras and Vale dominated the indices foreigners traded. [VERIFY: World Bank commodity data; iShares EWZ holdings history]",
            },
            {
              name: 'Platform era',
              from: 2007,
              to: null,
              outcome: { type: 'continuing', label: 'MELI + NU mega-caps' },
              record:
                "Opened by Mercado Libre's 2007 Nasdaq IPO and compounded by Nubank's 2021 NYSE listing: the era in which the region's benchmark growth exposure became its own companies rather than commodity prices. [VERIFY: SEC filings]",
            },
            {
              name: 'Stabilization experiment',
              from: 2023,
              to: null,
              outcome: { type: 'continuing', label: 'inflation ~2%/mo' },
              record:
                "Argentina's fiscal-first program cut monthly inflation from 25.5% in December 2023 to near 2% by mid-2026, backed from April 2025 by a $20 billion IMF facility. [VERIFY: INDEC; IMF program documents]",
            },
          ],
        },
      ],
    },

    { type: 'heading', text: 'The commodity shadow', level: 2 },
    {
      type: 'paragraph',
      text: "For most of the past two decades, none of that plumbing mattered to foreign allocators, because Latin America was bought and sold as a [[kw:commodity-supercycle]]commodity supercycle[[/kw]] proxy. From roughly 2003 to 2014, Chinese demand for iron ore, soybeans, and crude set the region's equity beta [VERIFY: World Bank commodity price data], and two state-adjacent giants, Petrobras and Vale, dominated the Brazil indices foreigners actually traded [VERIFY: iShares EWZ holdings history]. The proxy still pays: Petrobras has run double-digit dividend yields in recent years [VERIFY: Petrobras filings], and Vale remains a levered play on Chinese steel whose revenue fell alongside iron ore in 2024 [VERIFY: Vale 2024 annual report]. But a proxy is priced like a proxy.",
    },
    {
      type: 'paragraph',
      text: 'The price is visible in one ratio. Brazilian equities trade near 8 times forward earnings against roughly 22 times for the S&P 500 [VERIFY: iShares EWZ and S&P 500 factsheets, mid-2026], a discount that has persisted through commodity booms and busts alike. The bull case for the region always died on the same objection: no compounders, just cyclicals. That objection is now a decade stale, and the two companies that staled it are the subject of the next section.',
    },

    { type: 'heading', text: 'The mega-cap the region built itself', level: 2 },
    {
      type: 'paragraph',
      text: "[[person:marcos-galperin]]Marcos Galperin[[/person]] founded Mercado Libre in Buenos Aires in 1999 [VERIFY: company history]; it listed on Nasdaq in 2007 [VERIFY: SEC filings] and today, headquartered in Montevideo [VERIFY: MELI 10-K], it is Latin America's most valuable listed company at a market capitalization near $95 billion [VERIFY: market data, August 2026]. The 2024 numbers read like an early-cycle growth company rather than a 27-year-old incumbent: $20.8 billion in revenue, up 38% year over year [VERIFY: MELI 2024 10-K], across marketplace, logistics, credit, and payments operations in 18 countries [VERIFY: MELI 10-K]. Its weight in regional benchmarks has become its own [[kw:concentration-risk]]concentration risk[[/kw]]: the region's growth exposure increasingly reduces to one ticker.",
    },
    {
      type: 'paragraph',
      text: "The second compounder came from fintech. [[person:david-velez]]David Velez[[/person]] founded Nubank in Sao Paulo in 2013 [VERIFY: company history]; by 2026 it serves more than 110 million customers across Brazil, Mexico, and Colombia [VERIFY: Nubank quarterly filings], including over half of Brazil's adult population [VERIFY: Nubank filings], with Mexico past 10 million accounts as its fastest-growing market [VERIFY: Nubank filings]. The validation arrived early: [[person:warren-buffett]]Warren Buffett[[/person]]'s Berkshire Hathaway put $500 million into Nubank before its IPO in June 2021 [VERIFY: Nubank F-1], and the December 2021 NYSE listing valued the bank near $41 billion [VERIFY: IPO filings and coverage], briefly more than Itau, the incumbent it was built to disrupt [VERIFY: market data, December 2021].",
    },
    {
      type: 'paragraph',
      text: "Together the two companies retire the no-compounders objection. They also expose the region's structural leak: both list in New York, both are incorporated outside the countries they serve [VERIFY: MELI 10-K; Nu Holdings 20-F], and neither adds a centavo to B3's listed market capitalization. The maturation thesis has a geography problem: the region's growth accrues to its companies while its exchanges, for now, keep the cows.",
    },
    {
      type: 'bubble-field',
      figureLabel: 'FIG. 2 · WHO EARNS THE MEGA-CAP QUADRANT',
      kicker:
        'LATAM-EXPOSED NAMES · X: MARKET CAP ($B) · Y: 2024 REVENUE GROWTH (% YOY, USD) · BUBBLE AREA: FREE FLOAT (% OF SHARES).',
      hint: 'Bubble area is free float; the shaded zone is the mega-cap growth quadrant.',
      source:
        'DRAFT [VERIFY: company 2024 filings (MELI 10-K, Nu Holdings 20-F, Petrobras, Vale, Itau, Galicia, YPF annual reports); market-cap and free-float data, August 2026]',
      points: [
        { label: 'MELI', x: 95, y: 38, z: 91 },
        { label: 'NU', x: 55, y: 43, z: 77 },
        { label: 'PBR', x: 90, y: -3, z: 63 },
        { label: 'VALE', x: 42, y: -8, z: 97 },
        { label: 'ITUB', x: 62, y: 9, z: 60 },
        { label: 'GGAL', x: 10, y: 48, z: 78 },
        { label: 'YPF', x: 16, y: 11, z: 49 },
      ],
      xLabel: 'Market cap ($B)',
      yLabel: 'Revenue growth (% YoY, 2024, USD)',
      zLabel: 'Free float (%)',
      xThreshold: 50,
      yThreshold: 20,
      zoneLabel: 'Mega-cap growth quadrant',
    },

    { type: 'heading', text: 'Argentina runs the experiment', level: 2 },
    {
      type: 'paragraph',
      text: "Then there is the experiment. [[person:javier-milei]]Javier Milei[[/person]] took office on December 10, 2023 [VERIFY: public record], inherited an economy running 211% annual inflation [VERIFY: INDEC, 2023] with monthly prices rising 25.5% in his first December [VERIFY: INDEC], and moved in his first week: a roughly 54% devaluation of the official peso [VERIFY: BCRA] and a fiscal adjustment that produced Argentina's first annual financial surplus since 2010 in his first full calendar year [VERIFY: Argentina Ministry of Economy]. The [[kw:currency-controls]]currency controls[[/kw]] Argentines call the cepo, which had rationed dollars for a decade, became the next target.",
    },
    {
      type: 'paragraph',
      text: "April 2025 was the hinge. The IMF approved a $20 billion Extended Fund Facility with about $12 billion disbursed upfront [VERIFY: IMF program documents], the crawling peg gave way to a currency band of 1,000 to 1,400 pesos per dollar with edges moving 1% per month [VERIFY: BCRA and IMF staff report], and the cepo lifted for individuals [VERIFY: BCRA announcements]. The [[kw:imf-program]]IMF program[[/kw]], Argentina's 23rd arrangement with the Fund [VERIFY: IMF lending history], differs from its predecessors in the one respect markets care about: the fiscal anchor arrived before the money did. Monthly inflation, 25.5% when Milei took office, printed near 2% by mid-2026 [VERIFY: INDEC].",
    },
    {
      type: 'quote',
      text: 'The zero-deficit rule is not negotiable. There is no money, and there will be no money printed to cover what the Treasury does not collect.',
      source:
        'Javier Milei, public remarks on the fiscal program [VERIFY: attributable statement and date; do not publish unverified]',
    },
    {
      type: 'callout',
      label: "Argentina's disinflation",
      value: '25.5% → ~2%',
      context:
        'Monthly inflation in December 2023 versus mid-2026. The annual 2023 print was 211%, the highest in three decades. [VERIFY: INDEC monthly and annual CPI series]',
    },
    {
      type: 'paragraph',
      text: "Markets re-rated the experiment in real time. The Global X Argentina ETF returned roughly 60% in 2024 [VERIFY: Global X fund performance], bank and energy ADRs like Grupo Financiero Galicia and YPF more than doubled [VERIFY: NYSE market data, 2024], and the central bank's net [[kw:foreign-exchange-reserves]]foreign-exchange reserves[[/kw]] climbed from roughly negative $11 billion at end-2023 toward positive territory [VERIFY: BCRA balance-sheet data]. The dollarization Milei campaigned on has been deferred rather than delivered: what exists in 2026 is a bimonetary system in which the dollar circulates legally alongside a peso that is, for the first time in a generation, not obviously dying [VERIFY: government statements and IMF documents].",
    },
    {
      type: 'wall-timeline',
      figureLabel: 'FIG. 3 · THE STABILIZATION WINDOW',
      kicker:
        "THE REGION'S MARKET MILESTONES · DEC 2023 - JUL 2026 · FRACTIONAL-YEAR MARKERS. CLICK ANY PLAQUE FOR THE RECORD.",
      hint: 'Click a plaque for its record.',
      source:
        'DRAFT [VERIFY: BCRA, Argentina Ministry of Economy, IMF program documents, INDEC, CoinDesk (July 2026)]',
      startYear: 2023,
      endYear: 2027,
      windows: [
        {
          id: 'stabilization',
          label: 'The stabilization window',
          from: 2023.94,
          to: 2026.6,
          color: 'var(--echo-chart-green)',
        },
      ],
      plaques: [
        {
          year: 2023.94,
          lane: 0,
          label: 'Dec 2023',
          detail:
            'Milei takes office December 10 and devalues the official peso by roughly 54%, launching the fiscal adjustment. Monthly inflation peaks at 25.5%. [VERIFY: BCRA; INDEC]',
        },
        {
          year: 2025.05,
          lane: 1,
          label: 'Jan 2025',
          detail:
            "Argentina reports its first annual financial surplus since 2010 for calendar 2024, the program's fiscal anchor delivered before new IMF money arrived. [VERIFY: Ministry of Economy]",
        },
        {
          year: 2025.28,
          lane: 2,
          label: 'Apr 2025',
          detail:
            'The IMF approves a $20 billion Extended Fund Facility with about $12 billion upfront; the crawling peg gives way to a 1,000-1,400 peso band moving 1% per month, and the cepo lifts for individuals. [VERIFY: IMF; BCRA]',
        },
        {
          year: 2026.54,
          lane: 0,
          label: 'Jul 2026',
          detail:
            "Ten tokenized dairy cows are registered on B3 as loan collateral: the pilot this article's predecessor covered, and a milestone for the plumbing underneath the region's markets. [VERIFY: CoinDesk, July 2026]",
        },
      ],
    },

    { type: 'heading', text: 'The re-rating math', level: 2 },
    {
      type: 'paragraph',
      text: "The re-rating has an index mechanism waiting behind it. MSCI cut Argentina from emerging-market status to Standalone in November 2021 [VERIFY: MSCI index review] after capital controls made the market uninvestable for passive money; a durable exit from the cepo restarts the path from standalone through [[kw:frontier-markets]]frontier markets[[/kw]] status back toward the EM index, and each step forces benchmark-tracking inflows that Argentina's small float would amplify [VERIFY: MSCI reclassification framework]. Brazil's version of the mechanism is duller but bigger: every basis point the central bank cuts from a Selic that touched 15% [VERIFY: Central Bank of Brazil] is an argument for domestic money to rotate out of fixed income and back toward the equity market that produced the 45-IPO class of 2021.",
    },
    {
      type: 'paragraph',
      text: "The honest ledger records what could break each leg. Argentina's stabilization rests on borrowed [[kw:reserve-currency-status]]reserve-currency[[/kw]] credibility: the anchor is the dollar, the reserves defending the band are partly the IMF's, and a commodity shock or a lost midterm election could reprice the whole experiment in a quarter [VERIFY: IMF program risk assessment]. Brazil's listing recovery is hostage to rates. And the mega-caps carry mega-cap multiples: Mercado Libre has rarely traded below 40 times earnings [VERIFY: market data], a valuation that assumes the compounding continues uninterrupted.",
    },

    { type: 'heading', text: 'How to position, and what breaks it', level: 2 },
    {
      type: 'paragraph',
      text: 'For investors, the maturation thesis breaks into four screenable baskets: the platform compounders (MELI, NU), the commodity-yield legacy (PBR, VALE), the Argentina beta (ARGT, GGAL, YPF), and the broad Brazil discount (EWZ, ITUB). They are deliberately different trades. The compounders are growth at a premium; the commodity names are income with China risk; the Argentina names are a policy option that pays only if the band holds; the Brazil basket is a value trade waiting on a rate cycle. Sizing them identically because they share a continent repeats the proxy-era mistake this article opened with.',
    },
    {
      type: 'paragraph',
      text: "The base case: disinflation holds in Buenos Aires, the Selic cycle turns in Brasilia, B3's registry keeps widening, and the regional discount narrows from both ends. The bear case: a commodity downdraft re-couples the region to China, the currency band breaks, and Latin America goes back to trading as one cyclical ticker. Ezana's tooling covers both branches: the platform's SEC-filings datasets track what Mercado Libre, Nubank, and the ADR complex actually report each quarter, and the quant workbench can backtest the four baskets against the last three cycles before any capital moves. The cows were the proof of mechanism. The venue that registered them, the mega-cap the region built, and the experiment running in Buenos Aires are the trade.",
    },
  ],
  entities: {
    people: [
      {
        id: 'javier-milei',
        label: 'Javier Milei',
        role: 'President of Argentina; architect of the stabilization program',
      },
      {
        id: 'marcos-galperin',
        label: 'Marcos Galperin',
        role: 'Mercado Libre founder',
      },
      {
        id: 'david-velez',
        label: 'David Velez',
        role: 'Nubank founder and CEO',
      },
      {
        id: 'warren-buffett',
        label: 'Warren Buffett',
        role: 'Berkshire Hathaway chairman; pre-IPO Nubank backer',
      },
    ],
    terms: [
      { id: 'collateral-utility', label: 'Collateral utility' },
      { id: 'real-world-assets', label: 'Real-world assets' },
      { id: 'commodity-supercycle', label: 'Commodity supercycle' },
      { id: 'concentration-risk', label: 'Concentration risk' },
      { id: 'currency-controls', label: 'Currency controls (the cepo)' },
      { id: 'imf-program', label: 'IMF program' },
      { id: 'foreign-exchange-reserves', label: 'Foreign-exchange reserves' },
      { id: 'frontier-markets', label: 'Frontier markets' },
      { id: 'reserve-currency-status', label: 'Reserve-currency status' },
    ],
  },
  globeRail: {
    metric: {
      title: 'ARGENTINA MONTHLY INFLATION (%)',
      data: [
        { x: 2023.95, y: 25.5 },
        { x: 2024.5, y: 4.2 },
        { x: 2025.3, y: 2.8 },
        { x: 2026.5, y: 1.9 },
      ],
      startLabel: 'Dec 2023 · 25.5%',
      endLabel: 'mid-2026 · ~2%',
      note: 'Monthly CPI, Dec 2023 through mid-2026. DRAFT [VERIFY: INDEC monthly CPI series].',
    },
    cities: [
      {
        name: 'Sao Paulo',
        country: 'Brazil',
        lat: -23.55,
        lng: -46.63,
        impact:
          'Home of B3, the 1890-founded exchange that merged into its current form in 2017 and registered ten tokenized dairy cows as loan collateral in July 2026. Roughly 360 companies list on it today after a three-year IPO drought. [VERIFY: B3 corporate history and listing statistics; CoinDesk]',
      },
      {
        name: 'Buenos Aires',
        country: 'Argentina',
        lat: -34.6,
        lng: -58.38,
        impact:
          'Where Mercado Libre was founded in 1999 and where the stabilization experiment runs: a 54% devaluation in December 2023, the first annual financial surplus since 2010, a $20 billion IMF facility in April 2025, and monthly inflation near 2% by mid-2026. [VERIFY: company history; BCRA; Ministry of Economy; IMF; INDEC]',
      },
      {
        name: 'Montevideo',
        country: 'Uruguay',
        lat: -34.9,
        lng: -56.16,
        impact:
          "Mercado Libre's headquarters. The region's most valuable listed company trades near a $95 billion market cap on Nasdaq, with $20.8 billion of 2024 revenue growing 38% across 18 countries. [VERIFY: MELI 10-K; market data]",
      },
      {
        name: 'Rio de Janeiro',
        country: 'Brazil',
        lat: -22.91,
        lng: -43.17,
        impact:
          'Headquarters of Petrobras and Vale, the two state-adjacent giants that made Latin America trade as a commodity proxy through the 2003-2014 supercycle, and that still anchor the income leg of the regional trade with double-digit payout years. [VERIFY: company filings; iShares EWZ holdings history]',
      },
      {
        name: 'Mexico City',
        country: 'Mexico',
        lat: 19.43,
        lng: -99.13,
        impact:
          "Nubank's fastest-growing market, past 10 million accounts, and the test of whether the Brazilian fintech playbook exports across the region's second-largest economy. [VERIFY: Nubank filings]",
      },
    ],
  },
  meta: {
    sectors: ['Financials', 'Consumer Discretionary', 'Energy', 'Materials'],
    industries: [
      'Financial Exchanges & Data',
      'Broadline Retail',
      'Consumer Finance',
      'Oil, Gas & Consumable Fuels',
      'Metals & Mining',
    ],
    investors: ['Warren Buffett'],
    institutions: [
      'B3',
      'Mercado Libre',
      'Nubank',
      'Petrobras',
      'Vale',
      'Berkshire Hathaway',
      'MSCI',
    ],
    government: ['IMF', 'Central Bank of Argentina', 'INDEC', 'Central Bank of Brazil'],
    geos: ['Brazil', 'Argentina', 'Latin America', 'Mexico', 'Uruguay'],
    assetClasses: ['Equities', 'Currencies', 'Real-World Assets'],
    themes: ['Emerging Markets Maturation', 'Dollarization', 'Market Structure'],
    datasets: ['SEC filings'],
    // markets: empty because the article's text cites no prediction-market line.
    markets: [],
  },
  tickers: ['MELI', 'NU', 'PBR', 'VALE', 'ARGT', 'EWZ', 'GGAL', 'YPF', 'ITUB'],
  author: 'Ezana Finance Editorial',
  category: 'global-emerging',
  subcategory: 'LatAm',
  readTime: 9,
  publishedAt: '2026-08-11',
  listMeta: '11 Aug 2026',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  status: 'published',
};

export default latamCapitalMarketsAfterTheCows2026;
