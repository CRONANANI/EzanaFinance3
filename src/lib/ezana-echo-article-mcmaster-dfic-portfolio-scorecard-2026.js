// src/lib/ezana-echo-article-mcmaster-dfic-portfolio-scorecard-2026.js
// Ezana Echo article. Scores the DeGroote Finance & Investment Council
// (McMaster University) 2024/25 portfolio, as disclosed on May 14, 2025,
// against what each holding did through October 20, 2026. Follows
// Ezana_Echo_Skills.md and docs/ECHO_ARTICLE_AUTHORING.md; all colors are
// tokens. No students are named: the piece grades the portfolio, not people.
// STATUS: draft until the three owned images land and every [VERIFY] clears.
// ============================================================
// FACT CHECK MANIFEST
// 1. Source of every holding, unit count, cost, P&L and weight: DFIC
//    2024/2025 Annual Report, holdings table as of May 14, 2025
//    (degrootefinance.com/hubfs/Annual%20Report.pdf). Portfolio value
//    $145,525.30 CAD. Itemized weights sum to 86.17%; the remaining 13.83%
//    is not itemized in the table (the report does not label it cash).
// 2. Report-date prices are derived, not looked up: market value / units
//    (e.g. TLT 19,325.25 / 225 = US$85.89; CEG 7,288.00 / 25 = US$291.52).
//    Implied USD/CAD on the report date = 1.3965 (weight x 145,525.30 / USD
//    market value, median across US holdings).
// 3. Report figures: since-inception return 43.0%, annualized 12.7%, beta
//    1.21, benchmark 20% AGG / 20% XBB / 30% XIU / 30% SPY, fixed-income
//    underweight 11.41%, U.S. equity overweight 18.47%, YTD underperformance
//    vs benchmark 95 bps, YTD outperformance vs S&P 500 69 bps. Initial
//    capital $101,644.99 after a $100,000 Fidelity Canada donation (2022).
// 4. Report quirks, flagged in prose, not corrected: the report also prints
//    "$44,000" as total AUM (conflicts with $145K); it names "Hudbay
//    Materials" (the company is Hudbay Minerals, TSX/NYSE: HBM). DeGroote's
//    July 30, 2025 article cites a 55% since-inception return vs 43% in the
//    report. -> [VERIFY: the 55% figure's as-of date]
// 5. Closes used (stockanalysis.com), Oct 20, 2026 unless noted: TLT 80.13,
//    SPY 769.05 (May 14, 2025: 586.68), SCHP 25.38 (Oct 19), CEG 258.84,
//    MP 39.05, HBM C$33.75 (Oct 19), APO 112.06 [VERIFY: may be intraday],
//    ISRG 438.00, CG 36.56 (Oct 19), AER 144.42, MA 620.42, AMSF 25.26
//    (Oct 16), GSL 41.22, TEX 50.71 [VERIFY: intraday Oct 19; last full
//    close 52.21 on Oct 14], WSC 16.19 (Oct 14), DOLE 13.30 (Oct 16),
//    AAPL 339.50, VEEV 316.80 (Oct 19), TMUS 157.66, BLBD 57.39 (Oct 16),
//    L C$69.09 (x4 for the 4:1 split of Aug 19, 2025 = C$276.36),
//    CSH.UN C$19.82 [VERIFY: page stale at Oct 5], WFG C$92.78 (Oct 16),
//    ATCO.X C$74.34 [VERIFY: page stale at Aug 27, 2026],
//    XBB C$27.26 [VERIFY: page stale at Oct 2]. USD/CAD 1.4092.
// 6. EA: taken private by PIF, Silver Lake and Affinity Partners at $210.00
//    cash per share, delisted Aug 4, 2026. Scored at $210.00.
// 7. All returns are PRICE returns, report date to the close above. No
//    dividends, ETF distributions or trading after May 14, 2025 are
//    included. CAD figures convert US holdings at 1.3965 -> 1.4092.
// 8. Snapshot result (computed): itemized holdings contributed +9.81 points
//    on the C$145.5K base (= +11.4% on the 86.17% itemized). SPY +31.1% in
//    USD, +32.3% in CAD. Natural Resources: 9.90% weight, +7.44 pts (76% of
//    the itemized gain). Macro: 28.86%, -1.41 pts. Financials: 13.48%,
//    -1.37 pts. Industrials 17.77%, +2.44. Consumer & Healthcare 10.98%,
//    +1.16. TMT 5.18%, +1.54. 8 of 25 holdings beat SPY's USD price return.
// 9. Ratings in the report: Sell = BLBD, CG, MA; "looking to exit" = TLT;
//    "actively liquidating" = DOLE; positive = GSL, TEX, CEG, ATCO.
// 10. The baystreetoracle infographic renormalizes weights to the itemized
//    86.17% (TLT 22%, CEG 8%, SCHP 8%). This article uses the report's own
//    weights. The infographic and DFIC logo are third-party; do not use them
//    as images.
// ============================================================

export const mcmasterDficPortfolioScorecard2026 = {
  id: 'mcmaster-dfic-portfolio-scorecard-2026',
  title:
    "McMaster's Student Fund Put 18.5% in Long Treasuries and 10% in Miners. One of Those Bets Paid",
  excerpt:
    "DeGroote's C$145.5K balanced fund ran a beta of 1.21 and parked its largest position in a 20-year Treasury ETF. Held as disclosed, the book added 9.8% to the fund in seventeen months against 31% for the S&P 500, and three-quarters of that came from a 10% resources sleeve.",
  // TODO(images): hero and two inline images (owned or cleared) not yet supplied.
  heroImage: {
    src: '/images/ezana-echo/mcmaster-dfic-portfolio-scorecard-2026-hero.webp',
    alt: 'A university trading room with Bloomberg terminals, the setting for a student-managed investment fund',
    caption:
      'Student-managed funds pitch, defend and monitor live positions with real capital. This scorecard reads the DFIC portfolio exactly as its 2024/25 annual report disclosed it.',
  },
  category: 'markets-companies',
  subcategory: 'Equities',
  author: 'Ezana Finance Editorial',
  tickers: ['TLT', 'CEG', 'MP', 'HBM', 'APO', 'ISRG', 'CG', 'BLBD', 'EA', 'SPY'],
  readTime: 8,
  publishedAt: '2026-10-20',
  listMeta: '20 Oct 2026',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  status: 'draft',
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'The DeGroote Finance & Investment Council, the [[kw:student-managed-investment-fund]]student-managed investment fund[[/kw]] at McMaster University, closed its 2024/25 year with C$145,525 under management and a 43.0% return since its 2022 launch. Its annual report, dated May 14, 2025, lists 25 positions. The largest, at 18.54% of the fund, was the iShares 20+ Year Treasury Bond ETF. The second was Constellation Energy at 6.99%, a position already up 281% from cost. Held exactly as disclosed until October 20, 2026, the itemized book added 9.8 points to the fund in price terms while the S&P 500 rose 31.1%. The shortfall was not caused by too much risk. It was caused by where the risk sat.',
    },
    {
      type: 'stat-grid',
      stats: [
        { label: 'Fund value, May 14 2025', value: 'C$145.5K', change: '43.0% since 2022 launch' },
        { label: 'Reported fund beta', value: '1.21', change: 'In a balanced mandate' },
        { label: 'Largest position, TLT', value: '18.5%', change: 'Down 6.7% since, price' },
        { label: 'Resources share of gain', value: '76%', change: 'From 9.9% of the fund' },
      ],
    },
    {
      type: 'heading',
      text: 'A balanced fund with a beta of 1.21',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'DFIC runs the DSB-Fidelity Balanced Students Investment Fund, seeded in 2022 with a $100,000 donation from Fidelity Canada and an initial investment of $101,644.99. The mandate is judged against a [[kw:blended-benchmark]]blended benchmark[[/kw]] of 20% AGG, 20% XBB, 30% XIU and 30% SPY: 40% bonds and 60% stocks, split evenly between Canada and the United States. The report states the fund ran 11.41 percentage points underweight fixed income and 18.47 points overweight U.S. equity against that mix, and says the council wants to move beyond the traditional 60/40 model.',
    },
    {
      type: 'paragraph',
      text: 'The risk numbers say the same thing in a different unit. The report gives a [[kw:portfolio-beta]]portfolio beta[[/kw]] of 1.21, meaning the fund has historically moved about 21% more than the market in either direction. A 60/40 benchmark typically runs a beta well below 1.0, because the bond sleeve dampens equity swings. A balanced fund running above 1.0 is taking equity-like risk with a balanced label. The report sets no formal risk tolerance, drawdown limit or position-size policy, so the beta is the only stated measure of how much risk the council chose to carry.',
    },
    {
      type: 'paragraph',
      text: 'The holdings table also leaves 13.83% of the fund unaccounted for. The 25 itemized positions sum to 86.17% of the C$145,525.30 portfolio value, and the report does not label the remainder as cash. A widely shared infographic of the portfolio rescales the itemized weights to 100%, which is why it shows TLT at 22% and Constellation at 8%. This article uses the report weights as printed.',
    },
    {
      type: 'radial-stack',
      figureLabel: 'FIG. 1 · THE MANDATE AGAINST THE BOOK',
      kicker:
        'ASSET MIX, % OF FUND · DFIC HOLDINGS AS OF MAY 14, 2025 AGAINST ITS 40/60 BLENDED BENCHMARK · THE THIRD BAR RESCALES THE ITEMIZED HOLDINGS TO 100%, AS THE PUBLIC INFOGRAPHIC DOES.',
      hint: 'Each arc is one portfolio view; segments stack in the same order on every arc.',
      source:
        'DFIC 2024/2025 Annual Report, holdings table and benchmark definition (20% AGG, 20% XBB, 30% XIU, 30% SPY). Ezana Finance Editorial calculation.',
      maxAngle: 270,
      categories: [
        {
          label: 'Blended benchmark',
          segments: [
            { label: 'Fixed income', value: 40 },
            { label: 'Equities', value: 60 },
          ],
        },
        {
          label: 'DFIC as reported',
          segments: [
            { label: 'Fixed income', value: 28.86 },
            { label: 'Equities', value: 57.31 },
            { label: 'Not itemized', value: 13.83 },
          ],
        },
        {
          label: 'Itemized, rescaled',
          segments: [
            { label: 'Fixed income', value: 33.49 },
            { label: 'Equities', value: 66.51 },
          ],
        },
      ],
    },
    {
      type: 'heading',
      text: 'What the report carried into May 2025',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The book that went into the annual report was built on a few large winners. Constellation Energy was up 281.47% from a cost of US$76.42, Intuitive Surgical up 136.91% and Apollo Global up 132.63%. Hudbay, listed in the report as "Hudbay Materials" (the company is Hudbay Minerals), was up 80.84% and Loblaws 70.29%. Those five names made up 20.3% of the fund, an [[kw:unrealized-gain]]unrealized gain[[/kw]] the council had not yet locked in. On the other side, seven positions sat at a loss, led by WillScot at minus 9.80% and Carlyle at minus 8.74%.',
    },
    {
      type: 'paragraph',
      text: "The biggest loser by dollars was the biggest position. The report describes TLT as a tactical trade opened around the April 2, 2025 tariff announcement, a bet that a growth scare would pull long-term yields down. By May 14 it was down 4.40% from a cost of US$89.84, and the council wrote that it was looking to exit after tariff pauses erased the gain. The two other bond funds, Schwab's TIPS ETF and the iShares Canadian universe bond ETF, were down 1.09% and 0.66%.",
    },
    {
      type: 'market-treemap',
      figureLabel: 'FIG. 2 · THE BOOK ON REPORT DAY',
      kicker:
        'DFIC HOLDINGS, MAY 14, 2025 · TILE AREA = % OF FUND · FILL = RETURN SINCE PURCHASE AS REPORTED, SATURATING BEYOND ±6% · ONE IN FIVE DOLLARS SAT IN A SINGLE TREASURY ETF.',
      hint: 'Area is position size; colour is the gain or loss the council reported.',
      source: 'DFIC 2024/2025 Annual Report, holdings table as of May 14, 2025.',
      groups: [
        {
          label: 'Macro',
          leaves: [
            { label: 'TLT', size: 18.54, perf: -4.4 },
            { label: 'SCHP', size: 6.74, perf: -1.09 },
            { label: 'XBB', size: 3.58, perf: -0.66 },
          ],
        },
        {
          label: 'Industrials',
          leaves: [
            { label: 'CEG', size: 6.99, perf: 281.47 },
            { label: 'ATCO.X', size: 4.16, perf: 5.06 },
            { label: 'TEX', size: 2.52, perf: 35.17 },
            { label: 'GSL', size: 2.36, perf: 20.26 },
            { label: 'WSC', size: 1.74, perf: -9.8 },
          ],
        },
        {
          label: 'Financials',
          leaves: [
            { label: 'APO', size: 4.18, perf: 132.63 },
            { label: 'MA', size: 2.77, perf: 60.87 },
            { label: 'AER', size: 2.26, perf: 17.93 },
            { label: 'CG', size: 2.25, perf: -8.74 },
            { label: 'AMSF', size: 2.02, perf: -0.97 },
          ],
        },
        {
          label: 'Consumer & Healthcare',
          leaves: [
            { label: 'ISRG', size: 4.33, perf: 136.91 },
            { label: 'L.TO', size: 2.95, perf: 70.29 },
            { label: 'BLBD', size: 2.38, perf: 2.54 },
            { label: 'CSH.UN', size: 1.32, perf: 54.31 },
          ],
        },
        {
          label: 'Natural Resources',
          leaves: [
            { label: 'MP', size: 4.88, perf: 30.84 },
            { label: 'HBM', size: 1.87, perf: 80.84 },
            { label: 'WFG', size: 1.69, perf: -5.09 },
            { label: 'DOLE', size: 1.46, perf: 2.18 },
          ],
        },
        {
          label: 'TMT',
          leaves: [
            { label: 'EA', size: 2.29, perf: 22.61 },
            { label: 'VEEV', size: 1.16, perf: 27.59 },
            { label: 'TMUS', size: 0.91, perf: 7.63 },
            { label: 'AAPL', size: 0.82, perf: 28.74 },
          ],
        },
      ],
    },
    {
      type: 'callout',
      label: 'Treasury ETF as a share of the whole fund',
      value: '18.5%',
      context:
        'TLT alone was larger than the TMT and Natural Resources sleeves combined (15.1%). It was also the single largest unrealized loss in dollars on report day.',
    },
    {
      type: 'heading',
      text: 'Seventeen months later',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "To test the book, this article holds every position at its reported size from May 14, 2025 to the close on October 20, 2026, and measures the price return. The test is a frozen snapshot: it ignores dividends, ETF distributions and any trades the council made afterward, which the report says were coming. Converted to Canadian dollars, the 25 itemized positions added 9.81 points to the fund, a gain of 11.4% on the capital they held. SPY rose 31.1% over the same window, or 32.3% for a Canadian holder once the US dollar's move is included.",
    },
    {
      type: 'paragraph',
      text: 'Only eight of the 25 holdings beat SPY. Hudbay rose 179.4%, MP Materials 88.0%, Global Ship Lease 68.9%, Apple 59.4%, ATCO 49.8%, Blue Bird 45.0%, Electronic Arts 40.9% and Veeva 31.3%. The losers were concentrated where the fund had placed its conviction. Intuitive Surgical fell 22.3%, Apollo 22.8%, Carlyle 20.5% and Constellation 11.2%. WillScot and Amerisafe each lost roughly 46%. T-Mobile fell 33.6%.',
    },
    {
      type: 'paragraph',
      text: '[[kw:position-sizing]]Position sizing[[/kw]] explains most of the gap. The four largest positions, TLT, Constellation, the TIPS ETF and MP Materials, held 37.15% of the fund and added 2.38 points between them, almost all of it from MP. The best performer in the book, Hudbay, held 1.87%. A portfolio can pick winners and still lag if its winners are small and its large positions stall.',
    },
    {
      type: 'bubble-field',
      figureLabel: 'FIG. 3 · SIZE AGAINST OUTCOME',
      kicker:
        'DFIC HOLDINGS · X = % OF FUND ON MAY 14, 2025 · Y = PRICE RETURN TO OCT 20, 2026 (%, LOCAL CURRENCY) · BUBBLE = POSITION VALUE (C$ THOUSANDS) · DASHED LINES = 4% CORE SIZE AND SPY AT +31.1%.',
      hint: 'Up and to the right is a large position that beat the market. Two names live there.',
      source:
        'DFIC 2024/2025 Annual Report (weights, report-date prices derived from market value / units); stockanalysis.com closes to Oct 20, 2026, or latest available. Price return only. EA scored at its $210 take-private price.',
      points: [
        { label: 'TLT', x: 18.54, y: -6.7, z: 26.98 },
        { label: 'CEG', x: 6.99, y: -11.2, z: 10.17 },
        { label: 'SCHP', x: 6.74, y: -3.6, z: 9.81 },
        { label: 'MP', x: 4.88, y: 88.0, z: 7.1 },
        { label: 'ISRG', x: 4.33, y: -22.3, z: 6.3 },
        { label: 'APO', x: 4.18, y: -22.8, z: 6.08 },
        { label: 'ATCO.X', x: 4.16, y: 49.8, z: 6.05 },
        { label: 'XBB', x: 3.58, y: -3.8, z: 5.21 },
        { label: 'L.TO', x: 2.95, y: 28.8, z: 4.29 },
        { label: 'MA', x: 2.77, y: 7.6, z: 4.03 },
        { label: 'TEX', x: 2.52, y: 8.2, z: 3.67 },
        { label: 'BLBD', x: 2.38, y: 45.0, z: 3.46 },
        { label: 'GSL', x: 2.36, y: 68.9, z: 3.43 },
        { label: 'EA', x: 2.29, y: 40.9, z: 3.33 },
        { label: 'CG', x: 2.25, y: -20.5, z: 3.27 },
        { label: 'AMSF', x: 2.02, y: -46.0, z: 2.94 },
        { label: 'HBM', x: 1.87, y: 179.4, z: 2.72 },
        { label: 'WSC', x: 1.74, y: -46.6, z: 2.53 },
        { label: 'WFG', x: 1.69, y: -13.0, z: 2.45 },
        { label: 'TMUS', x: 0.91, y: -33.6, z: 1.32 },
      ],
      xLabel: '% of fund, May 14 2025',
      yLabel: 'Price return to Oct 20 2026 (%)',
      zLabel: 'Position value (C$K)',
      xThreshold: 4,
      yThreshold: 31.1,
      zoneLabel: 'CORE SIZE, BEAT SPY',
    },
    {
      type: 'image',
      src: '/images/ezana-echo/mcmaster-dfic-portfolio-scorecard-2026-inline-1.webp',
      alt: 'An open-pit copper and rare earth mine seen from above, terraced benches cut into rock',
      caption:
        "The resources sleeve, MP Materials and Hudbay above all, produced three-quarters of the snapshot's gain.",
      plate: true,
    },
    {
      type: 'heading',
      text: 'Resources carried the year, financials gave it back',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "Broken down by sleeve, the result is lopsided. Natural Resources held 9.90% of the fund and added 7.44 points, 76% of the snapshot's entire gain. MP Materials, held on a thesis of [[kw:rare-earth-elements]]rare earth[[/kw]] demand from electronics and defense, turned a 4.88% position into 4.38 points. Hudbay added 3.35 points from 1.87%. West Fraser and Dole, the other two names in the sleeve, lost a combined 0.29 points. Two picks did the work of a portfolio.",
    },
    {
      type: 'paragraph',
      text: "Financials did the opposite. The sleeve held 13.48% and lost 1.37 points, a 10.2% decline on its capital. Apollo and Carlyle, two alternative asset managers that together held 6.43% of the fund, fell 22.8% and 20.5%. Amerisafe, a workers' compensation insurer, nearly halved. AerCap, the aircraft lessor, was the sleeve's biggest winner at 28.8%. Industrials added 2.44 points despite Constellation's 11.2% fall, because ATCO and Global Ship Lease more than covered it.",
    },
    {
      type: 'multi-axis',
      figureLabel: 'FIG. 4 · WHERE THE POINTS CAME FROM',
      kicker:
        'DFIC SLEEVES · BAR = % OF FUND, MAY 14 2025 · LINES = CONTRIBUTION TO THE FUND (POINTS) AND SLEEVE PRICE RETURN (%), IN CAD, TO OCT 20 2026 · THE SMALLEST EQUITY SLEEVES DID THE MOST WORK.',
      hint: 'Hover a sleeve to compare its size with what it added.',
      source:
        'DFIC 2024/2025 Annual Report (sleeve weights); stockanalysis.com closes to Oct 20, 2026; USD/CAD 1.3965 to 1.4092. Ezana Finance Editorial calculation, price return only.',
      categories: ['Macro', 'Industrials', 'Financials', 'Cons. & Health', 'Resources', 'TMT'],
      series: [
        {
          label: 'Weight',
          kind: 'bar',
          unit: '%',
          values: [28.86, 17.77, 13.48, 10.98, 9.9, 5.18],
        },
        {
          label: 'Contribution',
          kind: 'line',
          unit: 'pts',
          values: [-1.41, 2.44, -1.37, 1.16, 7.44, 1.54],
        },
        {
          label: 'Sleeve return',
          kind: 'line',
          unit: '%',
          values: [-4.9, 13.7, -10.2, 10.5, 75.2, 29.8],
          dash: true,
        },
      ],
    },
    {
      type: 'heading',
      text: 'The 18.5% duration bet',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "The fund's bond allocation was meant to be its ballast. In practice, 18.54 of its 28.86 points of fixed income sat in TLT, which holds Treasuries with 20 or more years to maturity. That choice carries heavy [[kw:duration-risk]]duration risk[[/kw]]: an ETF of this kind loses roughly 16 to 17% of its price for each one-point rise in long yields. A universe bond ETF like XBB or AGG carries less than half of that sensitivity. The council chose the long end to express a tariff view, which turned the safest-looking sleeve into one of its most volatile positions.",
    },
    {
      type: 'paragraph',
      text: 'Held to October 20, 2026, TLT fell from US$85.89 to US$80.13, a 6.7% price decline and the largest single drag in the snapshot at 1.09 points. That figure overstates the loss somewhat. TLT pays a monthly distribution, so its [[kw:total-return-vs-price-return]]total return[[/kw]] over seventeen months was several points better than its price return. Even so, the position did not deliver what a balanced fund needs from bonds: it neither rose when equities were strong nor offered income large enough to matter at 18.5% of the fund.',
    },
    {
      type: 'image',
      src: '/images/ezana-echo/mcmaster-dfic-portfolio-scorecard-2026-inline-2.webp',
      alt: 'A printed US Treasury yield curve chart on a desk beside a calculator and annotated notes',
      caption:
        'Long-dated Treasuries swing hardest when yields move. TLT finished the window 6.7% below its report-day price.',
      plate: true,
    },
    {
      type: 'heading',
      text: "Grading the council's own calls",
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The fairest test of a student fund is not the frozen book but the decisions it announced. The report flags three holdings as Sell (Blue Bird, Carlyle and Mastercard), says it is looking to exit TLT and actively liquidating Dole, and marks Global Ship Lease, Terex, Constellation and ATCO as positive. Scored against what each did next, the exits were mostly right. Carlyle fell 20.5%, Dole 5.7% and TLT 6.7%. Mastercard rose 7.6%, but trailed SPY by 23.5 points, so selling it was the better use of capital.',
    },
    {
      type: 'dossier-table',
      figureLabel: "FIG. 5 · THE COUNCIL'S CALLS, SCORED",
      kicker:
        'EVERY HOLDING THE 2024/25 REPORT RATED SELL, EXIT OR POSITIVE · ANCHOR = PRICE RETURN FROM MAY 14, 2025 TO OCT 20, 2026 · SPY RETURNED +31.1% OVER THE SAME WINDOW. EXPAND A ROW FOR THE DETAIL.',
      hint: 'Press DOSSIER + on any row for the call and what followed.',
      source:
        'DFIC 2024/2025 Annual Report (ratings and theses); stockanalysis.com closes to Oct 20, 2026, or latest available. Price return only.',
      rows: [
        {
          name: 'iShares 20+ Year Treasury',
          tag: 'TLT',
          role: 'Macro, 18.54% of fund',
          anchor: 'Exit flagged · -6.7%',
          keyRisk: 'Right: the exit avoided a further loss',
          dossier: [
            { label: 'Thesis', text: 'Tactical trade on the April 2, 2025 tariff announcement.' },
            {
              label: 'On report day',
              text: 'Down 4.40% from a US$89.84 cost; council looking to exit.',
            },
            { label: 'After', text: 'US$85.89 to US$80.13 by Oct 20, 2026, before distributions.' },
          ],
        },
        {
          name: 'Carlyle Group',
          tag: 'CG',
          role: 'Financials, 2.25% of fund',
          anchor: 'Sell · -20.5%',
          keyRisk: 'Right',
          dossier: [
            { label: 'On report day', text: 'Down 8.74% from a US$50.37 cost.' },
            { label: 'After', text: 'US$45.97 to US$36.56.' },
          ],
        },
        {
          name: 'Dole',
          tag: 'DOLE',
          role: 'Natural Resources, 1.46% of fund',
          anchor: 'Liquidating · -5.7%',
          keyRisk: 'Right',
          dossier: [
            {
              label: 'Reason given',
              text: 'Failed new quality criteria: weak unit economics, high debt, tariff exposure.',
            },
            { label: 'After', text: 'US$14.11 to US$13.30.' },
          ],
        },
        {
          name: 'Mastercard',
          tag: 'MA',
          role: 'Financials, 2.77% of fund',
          anchor: 'Sell · +7.6%',
          keyRisk: 'Right on relative terms: trailed SPY by 23.5 pts',
          dossier: [
            { label: 'On report day', text: 'Up 60.87% from a US$358.41 cost.' },
            { label: 'After', text: 'US$576.59 to US$620.42.' },
          ],
        },
        {
          name: 'Blue Bird',
          tag: 'BLBD',
          role: 'Consumer & Healthcare, 2.38% of fund',
          anchor: 'Sell · +45.0%',
          keyRisk: 'Wrong: the stock beat SPY after the rating',
          dossier: [
            { label: 'On report day', text: 'Up 2.54%; school bus maker pitched in fall 2024.' },
            { label: 'After', text: 'US$39.58 to US$57.39 [VERIFY: latest close Oct 16].' },
          ],
        },
        {
          name: 'Global Ship Lease',
          tag: 'GSL',
          role: 'Industrials, 2.36% of fund',
          anchor: 'Positive · +68.9%',
          keyRisk: 'Right',
          dossier: [{ label: 'After', text: 'US$24.40 to US$41.22.' }],
        },
        {
          name: 'ATCO',
          tag: 'ATCO.X',
          role: 'Industrials, 4.16% of fund',
          anchor: 'Positive · +49.8%',
          keyRisk: 'Right',
          dossier: [
            { label: 'After', text: 'C$49.61 to C$74.34 [VERIFY: close is from Aug 27, 2026].' },
          ],
        },
        {
          name: 'Constellation Energy',
          tag: 'CEG',
          role: 'Industrials, 6.99% of fund',
          anchor: 'Positive · -11.2%',
          keyRisk: 'Wrong on the window, after a 281% run to report day',
          dossier: [
            { label: 'On report day', text: 'Up 281.47% from a US$76.42 cost.' },
            { label: 'After', text: 'US$291.52 to US$258.84.' },
          ],
        },
        {
          name: 'Terex',
          tag: 'TEX',
          role: 'Industrials, 2.52% of fund',
          anchor: 'Positive · +8.2%',
          keyRisk: 'Positive, but lagged SPY',
          dossier: [{ label: 'After', text: 'US$46.85 to US$50.71 [VERIFY: intraday print].' }],
        },
      ],
    },
    {
      type: 'paragraph',
      text: "The one exit that cost money was Blue Bird, which rose 45.0% after the Sell rating. On the positive side, Global Ship Lease (up 68.9%) and ATCO (up 49.8%) beat the market, Terex rose 8.2% and Constellation fell 11.2%. Electronic Arts, which the report placed under review, ended the question for the council: a [[kw:take-private]]take-private[[/kw]] by Saudi Arabia's Public Investment Fund, Silver Lake and Affinity Partners paid $210 a share in cash, 40.9% above the report-day price.",
    },
    {
      type: 'heading',
      text: 'Smart risk, wrong ballast',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "The verdict splits cleanly. The council's equity risk-taking was largely rewarded: its resources and shipping picks were early, four of its five announced exits avoided losses or lagging returns, and two of its largest equity misses, Apollo and Intuitive Surgical, came after both had more than doubled from cost. Where the fund went wrong was its defense. A balanced fund that runs a beta of 1.21 needs its bond sleeve to absorb shocks, and the council spent most of that sleeve on a single long-duration view. The bond sleeve cost the snapshot 1.41 points, slightly more than the entire Financials sleeve.",
    },
    {
      type: 'paragraph',
      text: "The lesson for any student fund is about [[kw:risk-budget]]risk budget[[/kw]] rather than stock picking. DFIC's 2025/26 restructuring, which replaces pitch decks with written reports and adds weekly investment committee meetings, addresses process. It does not yet set a position-size cap or a duration limit. A 10% ceiling on any single holding, or a rule that the bond sleeve tracks the benchmark's duration unless the committee votes otherwise, would have kept the tariff trade at a size where being wrong was cheap.",
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 6 · THREE WAYS TO RUN THE BALLAST',
      kicker:
        'HOW A BALANCED STUDENT FUND CAN HOLD ITS BOND SLEEVE · TWO STEPS LEAD TO EACH OUTCOME · DASHED BAR = THE NUMBER THAT FALSIFIES THE DURATION CRITIQUE.',
      hint: 'Each row is a policy choice, not a forecast probability.',
      source:
        'Ezana Finance Editorial scenarios built on the DFIC 2024/2025 Annual Report and the price data cited in this article. Scenarios are judgments, not estimates.',
      scenarios: [
        {
          id: 'base',
          label: 'Match benchmark duration',
          tone: 'base',
          range: 'policy default',
          steps: [
            { label: 'Bonds track AGG and XBB', sub: 'roughly 6 to 7 years of duration' },
            { label: 'Views sized as overlays', sub: 'tactical trades capped at a few points' },
          ],
          result: { value: 'Ballast holds', sub: 'bond sleeve dampens a 1.21 beta' },
        },
        {
          id: 'alt',
          label: 'Committee-approved tilt',
          tone: 'alt',
          range: 'by vote',
          steps: [
            { label: 'Long-duration view pitched', sub: 'written report, weekly committee' },
            { label: 'Size capped and reviewed', sub: 'exit rule set before entry' },
          ],
          result: { value: 'Cheap to be wrong', sub: 'loss bounded by the cap' },
        },
        {
          id: 'bear',
          label: 'Uncapped macro bet',
          tone: 'bear',
          range: 'as in 2025',
          steps: [
            { label: 'One ETF takes the sleeve', sub: '18.5% of the fund in TLT' },
            { label: 'Yields move the wrong way', sub: 'price falls 6.7% in the window' },
          ],
          result: { value: 'Ballast becomes drag', sub: 'largest single loss in the book' },
        },
      ],
      killSwitch:
        "The duration critique is wrong if TLT's price recovers to its report-day level of US$85.89 while the S&P 500 is still above its May 2025 level.",
    },
    {
      type: 'paragraph',
      text: 'The base case for the 2025/26 book, which DFIC has not yet published, is that the council exited TLT as it signaled and kept the resources winners, in which case its real return would sit above the 11.4% frozen snapshot. The bear case is that the long-duration position stayed on and the Financials sleeve kept its alternative managers through the private credit selloff. Its next annual report will show which. Ezana tracks university funds on the same basis this article used: reported positions, reported weights and public prices.',
    },
    {
      type: 'cta-callout',
      headline: 'See how university councils compare',
      body: 'Council Rankings scores student-managed funds on competition results and fund performance. Follow a council to see its rating move as new results post.',
      ctaLabel: 'Open Council Rankings',
      ctaHref: '/council-rankings',
      ctaAuthGate: false,
    },
    {
      type: 'callout',
      variant: 'disclaimer',
      text: 'Holdings, weights and costs from the DFIC 2024/2025 Annual Report as of May 14, 2025. Prices from stockanalysis.com to October 20, 2026, or the latest available close. All returns are price returns on a frozen snapshot and exclude dividends, distributions and any trades after the report date. Ezana Finance publishes findings, not investment advice. Nothing here is a recommendation to buy or sell any security.',
    },
  ],
  meta: {
    sectors: [
      'Financials',
      'Industrials',
      'Utilities',
      'Materials',
      'Health Care',
      'Communication Services',
      'Information Technology',
      'Consumer Staples',
    ],
    industries: [
      'Asset Management & Custody Banks',
      'Diversified Metals & Mining',
      'Electric Utilities',
      'Health Care Equipment',
      'Interactive Home Entertainment',
      'Construction Machinery & Heavy Transportation Equipment',
      'Marine Transportation',
      'Property & Casualty Insurance',
    ],
    investors: ['Public Investment Fund', 'Silver Lake', 'Affinity Partners'],
    institutions: [
      'McMaster University',
      'DeGroote Finance & Investment Council',
      'Fidelity Canada',
      'iShares',
      'Charles Schwab',
      'Constellation Energy',
      'MP Materials',
      'Hudbay Minerals',
      'Apollo Global Management',
      'Carlyle Group',
      'Intuitive Surgical',
      'Electronic Arts',
      'Blue Bird',
      'Dole',
    ],
    government: ['US Treasury'],
    geos: ['Canada', 'United States'],
    assetClasses: ['Equities', 'Fixed Income'],
    themes: [
      'Student-Managed Funds',
      'Risk Tolerance',
      'Duration',
      'Portfolio Construction',
      'Critical Minerals',
    ],
    datasets: [],
    markets: [],
  },
  entities: {
    // people: the report names its student portfolio managers; this piece
    // grades the portfolio, not individuals, so none are marked.
    people: [],
    terms: [
      { id: 'student-managed-investment-fund', label: 'Student-Managed Investment Fund' },
      { id: 'blended-benchmark', label: 'Blended Benchmark' },
      { id: 'portfolio-beta', label: 'Portfolio Beta' },
      { id: 'position-sizing', label: 'Position Sizing' },
      { id: 'duration-risk', label: 'Duration Risk' },
      { id: 'total-return-vs-price-return', label: 'Total Return vs Price Return' },
      { id: 'take-private', label: 'Take-Private' },
      { id: 'risk-budget', label: 'Risk Budget' },
      { id: 'unrealized-gain', label: 'Unrealized Gain' },
      { id: 'rare-earth-elements', label: 'Rare-Earth Elements' },
    ],
  },
};

export default mcmasterDficPortfolioScorecard2026;
