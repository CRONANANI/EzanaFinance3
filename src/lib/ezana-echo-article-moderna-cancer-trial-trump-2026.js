// src/lib/ezana-echo-article-moderna-cancer-trial-trump-2026.js
// Ezana Echo article: Moderna's melanoma readout, the rally that followed, and
// the president's and members' disclosed positions in the stock.
// No chart colors are hardcoded; every figure reads --echo-chart-* tokens.
//
// ============================================================
// FACT CHECK MANIFEST (researched 10 Oct 2026)
//  1. INTerpath-001: Phase 3, intismeran autogene (V940 / mRNA-4157) + Keytruda vs Keytruda,
//     1,137 patients, 2:1, resected high-risk stage IIB-IV melanoma; met primary endpoint (RFS)
//     and secondary DMFS; no new safety signals; OS still being evaluated; announced 19 Aug 2026;
//     stopped at first interim check -> BioSpace 19 Aug 2026; Yahoo Finance 19 Aug 2026;
//     BioPharma Dive 20 Aug 2026
//  2. Phase 2b KEYNOTE-942 five-year: 49% lower risk of recurrence or death, 59% lower risk of
//     distant metastasis or death; 157 patients -> BioSpace; ts2.tech
//  3. MRNA closes: 18 Aug 2026 $62.96; 19 Aug 2026 $174.38 (+177.0%), ~192M shares (~29x 3-month
//     average); prior best day +27.8% (Feb 2020); 2021 closing peak $484.47 (Aug 2021)
//     -> thetrading.tools chart of the day 19 Aug 2026; Quiver Quantitative 20 Aug 2026
//  4. 20 Aug 2026: MRNA -18% -> 24/7 Wall St. 6 Oct 2026
//  5. Month-end closes Jan 2021 to Sep 2026 (FIG. 1, FIG. 2 line, globe rail) -> Digrin MRNA
//     price history (monthly), retrieved 10 Oct 2026. Dec 2025 month-end $29.49.
//  6. 8 Oct 2026 close $197.00; 9 Oct 2026 close $225.00 (+14.21%), highest since Jan 2022;
//     Nasdaq-100 re-entry 9 Oct replacing Warner Bros. Discovery (removed Dec 2024);
//     NYT-reported NIH-led cancer vaccine public-private effort expected to launch in December
//     -> Yahoo Finance 9 Oct 2026; Stocktwits 9 Oct 2026; Nasdaq notice 1 Oct 2026
//  7. 52-week low $22.28 -> Yahoo Finance 7 Oct 2026; heygotrade
//  8. Market cap $78.65B at $197 (9 Oct snapshot) -> heygotrade. ~$90B at $225 is Ezana arithmetic
//     on the same share count (estimate).
//  9. Merck 18 Aug close $135.17; 19 Aug close $152.20 (record), up nearly 13% -> Yahoo Finance,
//     Moneywise 20 Aug 2026; ts2.tech (intraday +13.28%)
// 10. ESMO Congress 2026, Madrid, 23-27 Oct; INTerpath-001 LBA1, Presidential Symposium,
//     24 Oct 2026, presenter Georgina V. Long -> Moderna release 21 Sep 2026 (Nasdaq)
// 11. Analyst views: TD Cowen "landmark moment"; RBC "surprisingly positive development as we
//     were expecting a year-end readout"; William Blair upgrade, $5.4B peak melanoma sales on a
//     50-50 split; Evercore ISI: 35-40% risk reduction "clearly differentiated", valuation
//     "already prices in substantially more conviction"; Leerink "overly optimistic"; Moderna's
//     own clinical benchmark 20% -> BioPharma Dive 20 Aug 2026; BioSpace 19 Aug 2026
// 12. BofA target $200 (from $170), Neutral, 9 Oct; 5 of 23 Buy, 15 Hold, 3 Sell; average
//     target $121 (Koyfin) -> Stocktwits 9 Oct 2026. Morgan Stanley $95 Equal-Weight
//     -> Investing.com 9 Oct 2026. Forward P/S 30.84x -> Zacks via Yahoo 8 Oct 2026
// 13. Revenue: 2021 $18.47B, 2022 $19.26B, 2023 $6.85B, 2024 $3.236B, 2025 $1.944B (-40%);
//     2025 net loss $2.822B; YE2025 cash $8.1B; latest-quarter cash $5.14B
//     -> Moderna FY2025 results release; 10-Ks; Yahoo Finance 7 Oct 2026
// 14. HHS cancelled the $766M H5N1/pandemic flu mRNA contract on 28 May 2025 ("not scientifically
//     or ethically justifiable") -> AP via KOAA 28 May 2025. BARDA terminated 22 mRNA vaccine
//     projects (~$500M) on 5 Aug 2025 -> Nordic Life Science 6 Aug 2025
// 15. FDA approved mFLUSIVA (mRNA-1010) for adults 50+, Moderna release 5 Aug 2026; 26.6%
//     relative efficacy vs standard dose in 40,805 adults -> Epocrates 7 Aug 2026.
//     VRBPAC voted 9-0 -> Quiver Quantitative 2 Jul 2026
// 16. Trump account MRNA trades: buy 2 Mar 2026 $15,001-$50,000; buy mid-March $1,001-$15,000
//     (17 Mar per Quiver and Money.ca, 16 Mar per Benzinga); partial sale $1,001-$15,000
//     (18 May per Quiver, 1 Jul per Benzinga). 2 Mar intraday high $54.94; 273-910 shares.
//     ~49% gain from 2 Mar by early July (Quiver 2 Jul 2026). 2025: four buys $1K-$15K, one
//     $50K-$100K, three sales -> Benzinga 19 Aug 2026 citing OGE filings
// 17. Statements: White House says holdings are in a blind trust (Benzinga); Trump Organization:
//     "fully discretionary accounts managed by independent third-party financial institutions",
//     no advance notice, "no input"; White House to CNN: "no conflicts of interest"; CNN July
//     investigation: more than 20 companies promoted days after stock purchases -> Moneywise 20 Aug 2026
// 18. Legal frame: 18 U.S.C. 208 exempts the president and vice president; no divestment or blind
//     trust requirement; STOCK Act transactions over $1,000 reported within 45 days, in ranges;
//     Canada: ministers divest or blind-trust controlled assets within 120 days -> Money.ca Aug 2026
// 19. Ro Khanna MRNA trades (all $1,001-$15,000): buys 30 Jan, 24 Feb, 15 Apr, 30 Jun, 24 Aug 2026;
//     sales 26 Feb, 3 Aug 2026; 72 MRNA transactions listed in total -> Disclosed Capitol MRNA page.
//     Family trusts made 5,402 trades in 2025, >$165M volume; Khanna says he and his wife do not
//     trade -> Washington Examiner 20 Aug 2026.
//     [VERIFY: Khanna's 2026 MRNA rows against House Clerk PTRs; Ezana's Politician Tracker does
//     not carry them yet]
// 20. Maria Elvira Salazar (R-FL): buy and partial sale of MRNA, each $1,001-$15,000, on 19 Aug
//     2026 -> House Clerk PTR (Ezana Politician Tracker; disclosure date 1 Sep in Ezana's data,
//     9 Sep per The Stock Observer) [VERIFY: filing date before quoting it]. Sale 24 Sep 2026
//     $1,001-$15,000 -> Disclosed Capitol
// Computed in this article: $225.00 / $29.49 = +663% YTD; $225.00 / $62.96 = +257% since the
// readout eve; $62.96 / $484.47 = -87.0%; $22.28 / $484.47 = -95.4%; $225.00 / $484.47 = -53.6%;
// $225.00 / $54.94 = +309.5%; 273 x $225 = $61,425; 910 x $225 = $204,750 (estimates, assume the
// 2 Mar lot is fully held); Khanna 2026 buys 5 x $1,001-$15,000 = $5,005-$75,000.
// ============================================================

export const modernaCancerTrialTrump2026 = {
  id: 'moderna-cancer-trial-trump-2026',
  title:
    "Moderna's Cancer Vaccine Win Sends the Stock Up 663% This Year, and the President's Account Rides Along",
  excerpt:
    "Moderna closed at $225 on 9 October, up 663% this year, after a 177% one-day jump on the first positive Phase 3 readout for a personalized mRNA cancer therapy. Donald Trump's account bought $15,001 to $50,000 of the stock on 2 March, a lot now worth an estimated $61,000 to $205,000.",
  heroImage: {
    // Ezana-made editorial graphic (owned): rendered from the article's own price data.
    src: '/images/ezana-echo/moderna-cancer-trial-trump-2026-hero.webp',
    alt: 'Editorial chart graphic: Moderna month-end share prices from 2021 to October 2026, falling from above $380 to under $30 before a vertical jump in August 2026.',
    caption:
      'Ezana graphic. Moderna month-end closes, 2021 to 9 October 2026 (Digrin price history; 9 October close per Yahoo Finance). The August 2026 gap is the 19 August melanoma readout.',
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'Moderna closed at $225.00 on 9 October, up 663% in 2026 and 257% above where it stood on the eve of its melanoma readout. The catalyst was 19 August, when Moderna and Merck said their personalized mRNA therapy, intismeran autogene, met its primary endpoint in a Phase 3 melanoma trial, the first such success for an individualized mRNA cancer treatment. Moderna rose 177% that day, its best session ever, after a slide that had taken the stock 87% below its 2021 peak. Among the holders: President Donald Trump, whose investment account bought between $15,001 and $50,000 of Moderna on 2 March, according to his disclosures.',
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'Moderna close, 9 Oct 2026',
          value: '$225.00',
          change: '+663% year to date',
        },
        {
          label: 'Readout day, 19 Aug 2026',
          value: '+177%',
          change: '$62.96 to $174.38, a record day',
        },
        {
          label: 'Trump account buy, 2 Mar',
          value: '$15K to $50K',
          change: 'est. 273 to 910 shares',
        },
        {
          label: 'That lot at the 9 Oct close',
          value: '$61K to $205K',
          change: 'Ezana estimate, if fully held',
        },
      ],
    },

    { type: 'heading', text: 'From $484 to $22 and back above $200', level: 2 },
    {
      type: 'paragraph',
      text: "Moderna's chart is two bubbles and a long collapse between them. The stock closed at a record $484.47 in August 2021 on COVID-19 vaccine demand, then lost as much as 95% of that value as the pandemic franchise shrank, trading as low as $22.28 within the past year and ending 2025 at $29.49. The first half of 2026 brought a partial recovery to the $45 to $70 range, but on 18 August the stock still closed at $62.96, 87% below its peak. Then the melanoma readout landed. Moderna added roughly $43 billion of market value in one session, and by 9 October it traded at its highest level since January 2022.",
    },
    {
      type: 'trajectory',
      figureLabel: 'FIG. 1 · THE ROUND TRIP',
      kicker:
        'MODERNA (MRNA) MONTH-END CLOSE, $ · JANUARY 2021 TO 9 OCTOBER 2026 · DIAMONDS MARK THE 2021 PEAK, THE 2025 TROUGH AND THE READOUT',
      hint: 'The final point is the 9 October close, not a month-end.',
      source:
        'Digrin MRNA monthly price history (month-end closes); 2021 closing peak and 18 to 19 August closes per thetrading.tools; 9 October close per Yahoo Finance.',
      yLabel: 'Share price, $',
      yMax: 500,
      xMin: 2021,
      xMax: 2027,
      series: [
        {
          key: 'mrna',
          label: 'MRNA month-end close',
          color: 'var(--echo-chart-blue)',
          data: [
            { x: 2021.08, y: 173.16 },
            { x: 2021.17, y: 154.81 },
            { x: 2021.25, y: 130.95 },
            { x: 2021.33, y: 178.82 },
            { x: 2021.42, y: 185.01 },
            { x: 2021.5, y: 234.98 },
            { x: 2021.58, y: 353.6 },
            { x: 2021.67, y: 376.69 },
            { x: 2021.75, y: 384.86 },
            { x: 2021.83, y: 345.21 },
            { x: 2021.92, y: 352.43 },
            { x: 2022.0, y: 253.98 },
            { x: 2022.08, y: 169.33 },
            { x: 2022.17, y: 153.6 },
            { x: 2022.25, y: 172.26 },
            { x: 2022.33, y: 134.41 },
            { x: 2022.42, y: 145.33 },
            { x: 2022.5, y: 142.85 },
            { x: 2022.58, y: 164.09 },
            { x: 2022.67, y: 132.27 },
            { x: 2022.75, y: 118.25 },
            { x: 2022.83, y: 150.33 },
            { x: 2022.92, y: 175.91 },
            { x: 2023.0, y: 179.62 },
            { x: 2023.08, y: 176.06 },
            { x: 2023.17, y: 138.81 },
            { x: 2023.25, y: 153.58 },
            { x: 2023.33, y: 132.89 },
            { x: 2023.42, y: 127.71 },
            { x: 2023.5, y: 121.5 },
            { x: 2023.58, y: 117.66 },
            { x: 2023.67, y: 113.07 },
            { x: 2023.75, y: 103.29 },
            { x: 2023.83, y: 75.96 },
            { x: 2023.92, y: 77.7 },
            { x: 2024.0, y: 99.45 },
            { x: 2024.08, y: 101.05 },
            { x: 2024.17, y: 92.24 },
            { x: 2024.25, y: 106.56 },
            { x: 2024.33, y: 110.31 },
            { x: 2024.42, y: 142.55 },
            { x: 2024.5, y: 118.75 },
            { x: 2024.58, y: 119.22 },
            { x: 2024.67, y: 77.4 },
            { x: 2024.75, y: 66.83 },
            { x: 2024.83, y: 54.36 },
            { x: 2024.92, y: 43.06 },
            { x: 2025.0, y: 41.58 },
            { x: 2025.08, y: 39.42 },
            { x: 2025.17, y: 30.96 },
            { x: 2025.25, y: 28.35 },
            { x: 2025.33, y: 28.54 },
            { x: 2025.42, y: 26.56 },
            { x: 2025.5, y: 27.59 },
            { x: 2025.58, y: 29.56 },
            { x: 2025.67, y: 24.09 },
            { x: 2025.75, y: 25.83 },
            { x: 2025.83, y: 27.16 },
            { x: 2025.92, y: 25.98 },
            { x: 2026.0, y: 29.49 },
            { x: 2026.08, y: 44.07 },
            { x: 2026.17, y: 53.57 },
            { x: 2026.25, y: 50.8 },
            { x: 2026.33, y: 45.94 },
            { x: 2026.42, y: 47.19 },
            { x: 2026.5, y: 70.03 },
            { x: 2026.58, y: 54.82 },
            { x: 2026.67, y: 140.34 },
            { x: 2026.75, y: 192.57 },
            { x: 2026.78, y: 225.0 },
          ],
        },
      ],
      annotations: [
        { x: 2021.6, y: 484.47, label: 'Aug 2021 · $484.47', sub: 'record close' },
        {
          x: 2025.88,
          y: 22.28,
          label: 'Late 2025 · $22.28',
          sub: '52-week low, 95% below the peak',
        },
        { x: 2026.63, y: 174.38, label: '19 Aug 2026 · +177%', sub: '$62.96 to $174.38' },
        { x: 2026.78, y: 225.0, label: '9 Oct · $225.00', sub: '+663% in 2026' },
      ],
    },
    {
      type: 'paragraph',
      text: "The size of the move reflects how little the market had priced in. Moderna's previous best day was a 27.8% gain in February 2020, at the start of the pandemic trade; 19 August beat it more than sixfold on volume of about 192 million shares, roughly 29 times the three-month average. RBC Capital Markets called the result a surprisingly positive development because it had expected the readout at year-end, and the trial had been stopped at its first interim check. The rally has since kept going: Moderna rejoined the Nasdaq-100 on 9 October, replacing Warner Bros. Discovery, having been dropped from the index in December 2024.",
    },
    {
      type: 'callout',
      label: "Moderna's biggest single-day gain",
      value: '+177%',
      context:
        'From $62.96 on 18 August to $174.38 on 19 August 2026, about $43 billion of added market value. Merck, the development partner, closed up nearly 13% at a record $152.20.',
    },

    { type: 'heading', text: 'The business underneath the rally', level: 2 },
    {
      type: 'paragraph',
      text: "The rally is a bet on the pipeline, because the current business is still shrinking. Moderna's revenue peaked at $19.26 billion in 2022 and fell to $1.944 billion in 2025, down 40% in the year alone, with a net loss of $2.822 billion. Management has guided to growth of up to 10% in 2026. Cash fell from $8.1 billion at the end of 2025 to about $5.14 billion in the latest quarter. At $225 a share the company is worth roughly $90 billion on Ezana's arithmetic, about 46 times 2025 revenue; Zacks puts the forward price-to-sales ratio at 30.84 times against an industry average of 2.06 times.",
    },
    {
      type: 'multi-axis',
      figureLabel: 'FIG. 2 · FIVE YEARS OF A SHRINKING FRANCHISE',
      kicker:
        'MODERNA ANNUAL REVENUE, $B (BARS, LEFT AXIS) AND YEAR-END SHARE PRICE, $ (LINE, RIGHT AXIS) · 2021 TO 2025 · HOVER A YEAR FOR BOTH VALUES',
      hint: 'Each axis has its own scale; both fell about 90% over the period.',
      source:
        'Moderna annual reports and FY2025 results release (revenue); Digrin month-end closes (December of each year).',
      categories: ['2021', '2022', '2023', '2024', '2025'],
      series: [
        {
          label: 'Revenue',
          kind: 'bar',
          unit: '$B',
          values: [18.47, 19.26, 6.85, 3.24, 1.94],
        },
        {
          label: 'Share price',
          kind: 'line',
          unit: '$',
          values: [253.98, 179.62, 99.45, 41.58, 29.49],
        },
      ],
    },
    {
      type: 'paragraph',
      text: "From 2021 to 2025 revenue and price moved together, each down by about 90%. In 2026 they split: the price has risen more than sevenfold while revenue guidance implies at most about $2.1 billion for the year. That gap is the market's estimate of what intismeran and the rest of the oncology pipeline will earn. William Blair projects peak annual melanoma sales of $5.4 billion, an estimate built on the 50-50 revenue split with Merck. Analysts are not unanimous: Morgan Stanley holds a $95 target, Bank of America raised its target to $200 on 9 October with a Neutral rating, and the 12-month average of $121 implies more than 45% downside.",
    },

    { type: 'heading', text: 'The readout that changed the story', level: 2 },
    {
      type: 'paragraph',
      text: "INTerpath-001 enrolled 1,137 patients whose high-risk stage IIB to IV melanoma had been removed surgically, randomized two to one to intismeran plus Merck's Keytruda or to Keytruda alone. The combination met the primary endpoint of [[kw:recurrence-free-survival]]recurrence-free survival[[/kw]] and the secondary endpoint of distant metastasis-free survival, with no new safety signals; overall survival is still being assessed. Intismeran is built for each patient from the patient's own tumor, targeting up to 34 [[kw:neoantigen]]neoantigens[[/kw]]. The companies have not released the effect size. The Phase 2b trial that preceded it showed a 49% lower risk of recurrence or death over five years.",
    },
    {
      type: 'quote',
      text: 'This is a surprisingly positive development as we were expecting a year-end readout.',
      source: 'RBC Capital Markets, via BioSpace, 19 August 2026',
    },
    {
      type: 'paragraph',
      text: "The chronology matters as much as the result. Moderna came into 2026 with a federal government that had spent 2025 pulling money out of mRNA, a COVID-19 franchise in decline and a stock under $30. Over eight months it won an FDA approval for its mRNA flu vaccine, mFLUSIVA, on 5 August, delivered the melanoma readout on 19 August, rejoined the Nasdaq-100 on 9 October and drew a New York Times report the same day of a public-private cancer vaccine effort led by the National Institutes of Health. The president's account bought in March, before every one of those events.",
    },
    {
      type: 'wall-timeline',
      figureLabel: 'FIG. 3 · EIGHTEEN MONTHS, FROM CANCELLED CONTRACTS TO A CANCER WIN',
      kicker:
        "POLICY, PRODUCT AND TRADING EVENTS, MAY 2025 TO OCTOBER 2026 · SHADED WINDOWS MARK THE FEDERAL PULLBACK, THE PRESIDENT'S ACCOUNT BUYS AND THE RE-RATING · CLICK A PLAQUE FOR THE RECORD",
      hint: 'Click any plaque for the record.',
      source:
        'AP (28 May 2025); HHS via Nordic Life Science (5 Aug 2025); Quiver Quantitative and Money.ca (2026 trades); Moderna and Merck releases; Yahoo Finance; Moderna ESMO release (21 Sep 2026).',
      startYear: 2025.3,
      endYear: 2026.9,
      windows: [
        {
          id: 'pullback',
          label: 'Federal pullback from mRNA',
          from: 2025.4,
          to: 2025.62,
          color: 'var(--echo-chart-red)',
        },
        {
          id: 'buys',
          label: 'Trump account buys',
          from: 2026.16,
          to: 2026.22,
          color: 'var(--echo-chart-orange)',
        },
        {
          id: 'rerating',
          label: 'Approval, readout, re-rating',
          from: 2026.59,
          to: 2026.82,
          color: 'var(--echo-chart-green)',
        },
      ],
      plaques: [
        {
          year: 2025.41,
          lane: 0,
          label: 'May 2025',
          detail:
            'HHS cancels the $766 million contract for Moderna\'s mRNA pandemic flu vaccine, calling further investment "not scientifically or ethically justifiable".',
        },
        {
          year: 2025.59,
          lane: 1,
          label: 'Aug 2025',
          detail:
            'BARDA terminates 22 mRNA vaccine development projects, about $500 million, shifting money to other vaccine platforms.',
        },
        {
          year: 2025.99,
          lane: 2,
          label: 'Dec 2025',
          detail: 'Moderna ends 2025 at $29.49. Full-year revenue: $1.944 billion, down 40%.',
        },
        {
          year: 2026.17,
          lane: 0,
          label: 'Mar 2026',
          detail:
            "Trump's account buys $15,001 to $50,000 of MRNA on 2 March and $1,001 to $15,000 in mid-March. The 2 March intraday high was $54.94.",
        },
        {
          year: 2026.59,
          lane: 1,
          label: 'Aug 2026',
          detail:
            'FDA approves mFLUSIVA, the first mRNA seasonal flu vaccine, for adults 50 and older (Moderna release, 5 August).',
        },
        {
          year: 2026.63,
          lane: 3,
          label: 'Aug 2026',
          detail:
            'INTerpath-001 meets its primary endpoint (19 August). MRNA closes up 177% at $174.38.',
        },
        {
          year: 2026.77,
          lane: 2,
          label: 'Oct 2026',
          detail:
            'Moderna rejoins the Nasdaq-100 on 9 October and closes at $225.00 after a New York Times report on an NIH-led cancer vaccine effort.',
        },
        {
          year: 2026.81,
          lane: 4,
          label: 'Oct 2026',
          detail:
            'Full INTerpath-001 data due at the ESMO Presidential Symposium in Madrid on 24 October.',
        },
      ],
    },
    {
      type: 'paragraph',
      text: "The policy turn is the part with the clearest bearing on the trades. In May 2025 the Department of Health and Human Services cancelled a $766 million Moderna contract for a pandemic flu vaccine, with a spokesman calling mRNA technology under-tested, and in August 2025 BARDA ended 22 mRNA projects worth about $500 million. By August 2026 the FDA had approved Moderna's mRNA flu shot after a 9-0 advisory vote, and the Times reported on 9 October that an NIH-anchored cancer vaccine program modeled on the COVID-19 effort could launch in December, according to an official at the NIH's foundation. Moderna rose 14% that day.",
    },

    { type: 'heading', text: "What the president's account bought", level: 2 },
    {
      type: 'paragraph',
      text: "Trump's disclosures list a Moderna purchase of $15,001 to $50,000 on 2 March 2026, a second purchase of $1,001 to $15,000 in mid-March and a partial sale of $1,001 to $15,000 later in the year, according to Quiver Quantitative and Benzinga; the trackers differ on the exact dates of the second and third trades. Because the forms report ranges, the size of the position can only be bracketed. Benzinga's method divides the range by the 2 March intraday high of $54.94, giving 273 to 910 shares. By early July, before any of the summer catalysts, Quiver measured the gain from that purchase at about 49%.",
    },
    {
      type: 'revision-ledger',
      figureLabel: 'FIG. 4 · WHAT A $15,001 TO $50,000 LINE IS WORTH NOW',
      kicker:
        'THE 2 MARCH 2026 MODERNA PURCHASE, BRACKETED · COST AT THE DISCLOSED RANGE VS VALUE AT THE 9 OCTOBER CLOSE · ESTIMATES · CLICK A ROW FOR THE METHOD',
      hint: 'All values are estimates built from a disclosed range, not reported holdings.',
      source:
        'Trump OGE transaction disclosures via Quiver Quantitative and Benzinga; share math per Benzinga at the $54.94 intraday high; 9 October close per Yahoo Finance. Ezana arithmetic.',
      scale: 'linear',
      unit: '$',
      rows: [
        {
          label: 'Low end of the range',
          sub: '273 shares',
          before: 15001,
          after: 61425,
          beforeDisplay: '$15,001',
          afterDisplay: '~$61,425',
          delta: 46424,
          deltaDisplay: '+$46,424',
          favorable: 'up',
          record:
            '$15,001 at $54.94 buys about 273 shares. At the $225.00 close on 9 October those shares are worth about $61,425. Assumes the full lot is still held.',
        },
        {
          label: 'High end of the range',
          sub: '910 shares',
          before: 50000,
          after: 204750,
          beforeDisplay: '$50,000',
          afterDisplay: '~$204,750',
          delta: 154750,
          deltaDisplay: '+$154,750',
          favorable: 'up',
          record:
            '$50,000 at $54.94 buys about 910 shares, worth about $204,750 at $225.00. The partial sale later in the year, at most $15,000, would trim either figure.',
        },
      ],
      verdict:
        'The share price rose 309.5% from the $54.94 high to $225.00. Every dollar figure rests on a range: the gain is real, the amount is an estimate, and the true size is known only to the account manager.',
    },
    {
      type: 'paragraph',
      text: "On any reading the stake is small for an account that logged thousands of transactions; Ezana Echo's review of Trump's first-quarter 2026 filing counted 3,642 of them. Benzinga's review of 2025 filings also found four Moderna purchases of $1,001 to $15,000, one of $50,001 to $100,000 and three sales, so the exposure predates 2026. The White House has said the holdings sit in a blind trust and that Trump may not know which stocks are traded, according to Benzinga. The Trump Organization's own description is narrower: fully discretionary accounts run by independent third-party financial institutions, with no advance notice of trades and no input into decisions.",
    },
    {
      type: 'paragraph',
      text: 'That distinction is where the criticism lands. Critics have alleged insider trading and conflicts of interest since Trump returned to office, and a July CNN investigation reported that he had promoted more than 20 companies on social media days after buying their stock; the administration denies any wrongdoing, and the White House told CNN there are no conflicts of interest. Nothing in the public record shows that Trump directed the Moderna purchases or knew of them. What the record does show is a president whose account owned a company his own health department had cut contracts with in 2025, and whose agencies by 2026 had approved its flu vaccine and, according to the Times, were preparing a cancer vaccine program.',
    },

    { type: 'heading', text: 'The disclosure gap', level: 2 },
    {
      type: 'paragraph',
      text: 'The rules that govern these trades are disclosure rules, not prohibitions. Under the STOCK Act, the president and members of Congress report securities transactions above $1,000 within 45 days, and only in [[kw:periodic-transaction-report]]dollar ranges[[/kw]], so the public learns of a purchase weeks after it settles and never learns its exact size. The main federal conflict-of-interest statute, 18 U.S.C. 208, exempts the president and vice president, and no law requires a president to divest or use a blind trust. Canada takes the opposite approach: cabinet ministers must sell controlled assets or place them in a blind trust within 120 days of taking office.',
    },
    {
      type: 'adjudication-matrix',
      figureLabel: 'FIG. 5 · THREE OFFICES, FOUR RULES',
      kicker:
        'WHICH RULES BIND WHICH OFFICE-HOLDER · SAME = THE RULE APPLIES · PART = APPLIES WITH LIMITS · NONE = DOES NOT APPLY · CLICK A CELL FOR THE BASIS',
      hint: 'Click any cell for the legal basis.',
      source:
        'STOCK Act (2012); 18 U.S.C. 208; Conflict of Interest Act (Canada), as summarized by Money.ca, August 2026. Grades are Ezana editorial assessments, not legal advice.',
      cornerLabel: 'Office \\ Rule',
      legend: {
        same: 'same: the rule applies',
        part: 'partial: applies with limits',
        none: 'none: does not apply',
      },
      cols: [
        'Trades reported publicly',
        'Exact amounts disclosed',
        'Must divest or blind-trust',
        'Federal conflict statute applies',
      ],
      rows: [
        {
          label: 'US president',
          cells: [
            {
              value: 'part',
              note: 'Transactions above $1,000 are reported within 45 days on OGE forms, after the trade.',
            },
            {
              value: 'none',
              note: 'Amounts are reported only in ranges such as $15,001 to $50,000.',
            },
            { value: 'none', note: 'No law requires divestment or a blind trust.' },
            {
              value: 'none',
              note: '18 U.S.C. 208 expressly exempts the president and vice president.',
            },
          ],
        },
        {
          label: 'US member of Congress',
          cells: [
            {
              value: 'part',
              note: 'STOCK Act periodic transaction reports are due within 45 days, after the trade.',
            },
            { value: 'none', note: 'Amounts are reported only in ranges.' },
            {
              value: 'none',
              note: 'Members are not required to divest; holdings may sit in family trusts and managed accounts.',
            },
            {
              value: 'none',
              note: 'Section 208 covers executive-branch employees; members answer to House and Senate ethics rules instead.',
            },
          ],
        },
        {
          label: 'Canadian cabinet minister',
          cells: [
            {
              value: 'none',
              note: 'Controlled assets are sold or placed in a blind trust, so there is no trading to report.',
            },
            { value: 'none', note: 'Not applicable once controlled assets are divested.' },
            {
              value: 'same',
              note: 'Required within 120 days of appointment under the Conflict of Interest Act.',
            },
            {
              value: 'same',
              note: 'The Conflict of Interest Act applies to ministers and the prime minister.',
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'The practical effect is a lag that favors whoever trades first. A 2 March purchase could legally surface as late as mid-April, and a range of $15,001 to $50,000 spans a 3.3-times difference in exposure. Insider-trading law still applies to every official, but proving that a trade used material nonpublic information requires showing who knew what and when, which range-based filings were never designed to reveal. For investors, the filings are most useful in aggregate: they show which names official portfolios are leaning into, weeks after the fact.',
    },

    { type: 'heading', text: 'Congress was in the stock too', level: 2 },
    {
      type: 'paragraph',
      text: "The president is not the only office-holder with Moderna exposure. Rep. Ro Khanna, a California Democrat, holds MRNA through family trusts: Disclosed Capitol lists 72 Moderna transactions in his filings, including purchases of $1,001 to $15,000 on 30 January, 24 February, 15 April and 30 June 2026, the last of them seven weeks before the readout. The trusts also sold on 26 February and 3 August, and bought again on 24 August, after the rally. Khanna says that he and his wife do not trade stocks themselves and that the trusts make the transactions; the family's trusts executed 5,402 trades in 2025, according to the Washington Examiner.",
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 6 · THREE OFFICE-HOLDERS, ONE TICKER',
      kicker:
        'DISCLOSED 2026 MODERNA TRADES BY OFFICE-HOLDERS NAMED IN THIS ARTICLE · RANGES AS FILED · CLICK DOSSIER + FOR THE TRADE RECORD',
      hint: 'Open a dossier for every disclosed 2026 trade.',
      source:
        'OGE disclosures via Quiver Quantitative and Benzinga (Trump); Disclosed Capitol (Khanna; Salazar 24 Sep); House Clerk periodic transaction report, September 2026 (Salazar, 19 Aug).',
      headers: ['Office-holder', 'How the stake is held', '2026 buys', 'Open question', ''],
      rows: [
        {
          name: 'Donald Trump',
          tag: 'President',
          role: 'Discretionary accounts at third-party institutions; the White House calls it a blind trust',
          anchor: '2 buys, $16,002 to $65,000',
          keyRisk: "Whether a discretionary account is independent of the president's own agencies",
          dossier: [
            { label: '2 Mar 2026', text: 'Purchase, $15,001 to $50,000. Intraday high $54.94.' },
            {
              label: 'Mid-Mar 2026',
              text: 'Purchase, $1,001 to $15,000 (17 March per Quiver, 16 March per Benzinga).',
            },
            {
              label: 'Later in 2026',
              text: 'Partial sale, $1,001 to $15,000 (18 May per Quiver, 1 July per Benzinga).',
            },
            {
              label: 'Estimated value',
              text: '$61,425 to $204,750 for the 2 March lot at $225.00, if fully held.',
            },
          ],
        },
        {
          name: 'Ro Khanna',
          tag: 'D-CA',
          role: 'Family trusts; Khanna says he and his wife do not trade',
          anchor: '5 buys, $5,005 to $75,000',
          keyRisk: 'Trust activity at 5,402 trades a year makes any single trade hard to attribute',
          dossier: [
            {
              label: 'Buys',
              text: '30 Jan, 24 Feb, 15 Apr, 30 Jun and 24 Aug 2026, each $1,001 to $15,000.',
            },
            { label: 'Sales', text: '26 Feb and 3 Aug 2026, each $1,001 to $15,000.' },
            {
              label: 'History',
              text: '72 MRNA transactions listed in total by Disclosed Capitol.',
            },
          ],
        },
        {
          name: 'Maria Elvira Salazar',
          tag: 'R-FL',
          role: 'Reported in her own periodic transaction reports',
          anchor: '1 buy, $1,001 to $15,000',
          keyRisk: 'A buy and a partial sale on readout day',
          dossier: [
            {
              label: '19 Aug 2026',
              text: 'Purchase and partial sale of MRNA, each $1,001 to $15,000, disclosed in September.',
            },
            { label: '24 Sep 2026', text: 'Sale, $1,001 to $15,000.' },
          ],
        },
      ],
    },
    {
      type: 'cta-callout',
      headline: 'Every member trade in Moderna, as filed',
      body: "Ezana's Politician Tracker reads House Clerk and Senate disclosures directly: filter by ticker to see each member's MRNA trades, the disclosed range, the filing lag in days and the member's other open positions.",
      ctaLabel: 'Open the Politician Tracker',
      ctaHref: '/datasets/politician-tracker',
      ctaAuthGate: false,
    },
    {
      type: 'paragraph',
      text: 'The Salazar trades show how blunt the filings are. Rep. Maria Elvira Salazar, a Florida Republican, reported both a purchase and a partial sale of Moderna, each $1,001 to $15,000, on 19 August, the day the readout moved the stock 177%; the report surfaced in September. A same-day buy and partial sale can reflect a managed account rebalancing as easily as a decision, and the form cannot say which. Across the three office-holders, the disclosed 2026 Moderna purchases total between $22,008 and $155,000 at cost. In share-price terms, the purchases made before 19 August are now worth roughly three to five times what they cost; the August buys by the Khanna family trusts and Salazar came after most of the move.',
    },

    { type: 'heading', text: 'Madrid, 24 October: what the price now has to prove', level: 2 },
    {
      type: 'paragraph',
      text: "The next fixed test is the full INTerpath-001 dataset at the ESMO Presidential Symposium in Madrid on 24 October, presented by Georgina Long. The number that matters is the [[kw:hazard-ratio]]hazard ratio[[/kw]] for recurrence-free survival. Moderna's own management called a 20% reduction in the risk of recurrence or death the clinical benchmark; Evercore ISI says 35% to 40% would be clearly differentiated, but argues the valuation already prices in more conviction than that; Leerink called the initial reaction overly optimistic and flagged per-patient manufacturing costs. The Phase 2b result was 49%.",
    },
    {
      type: 'paragraph',
      text: 'The data will also shape the policy story. A strong result strengthens the case for the NIH-anchored program and for regulators to accept a filing, which Merck and Moderna plan to discuss with authorities; a weak one would leave a $90 billion company resting on a $2 billion revenue base. With 15 of 23 analysts at Hold and an average target of $121, the stock is priced well above the consensus already. The scenarios below frame the outcomes using the benchmarks the company and its analysts have published.',
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 7 · THREE READINGS OF 24 OCTOBER',
      kicker:
        "EACH CHAIN RUNS FROM THE ESMO EFFECT SIZE TO A PRICE OUTCOME · BENCHMARKS ARE MODERNA'S AND ANALYSTS' PUBLISHED BARS, NOT EZANA FORECASTS",
      hint: 'Read each chain left to right; the kill switch falsifies the re-rating.',
      source:
        'Moderna clinical benchmark and analyst bars via BioPharma Dive (20 Aug 2026); Phase 2b via BioSpace; analyst targets via Stocktwits and Investing.com (9 Oct 2026).',
      scenarios: [
        {
          id: 'base',
          label: 'BASE CASE · PHASE 2B REPEATS',
          tone: 'base',
          range: '35% to 49% lower risk',
          steps: [
            {
              label: 'Effect in the Phase 2b range',
              sub: 'Evercore\'s "clearly differentiated" bar',
            },
            { label: 'Clean safety, OS trending', sub: 'filing talks proceed' },
          ],
          result: { value: 'Re-rating holds', sub: 'pipeline value carries the stock' },
        },
        {
          id: 'alt',
          label: 'ALTERNATIVE · CLEARS THE BAR, MISSES THE HYPE',
          tone: 'alt',
          range: '20% to 35% lower risk',
          steps: [
            { label: "Meets Moderna's 20% benchmark", sub: 'but below the 35% to 40% band' },
            { label: 'Cost per patient debated', sub: "Leerink's concern" },
          ],
          result: { value: 'Partial give-back', sub: 'toward the $121 average target' },
        },
        {
          id: 'bear',
          label: 'BEAR CASE · BENCHMARK MISSED',
          tone: 'bear',
          range: 'under 20% lower risk',
          steps: [
            { label: 'Hazard ratio above 0.80', sub: 'or a new safety signal' },
            { label: 'Revenue base exposed', sub: '$1.94B in 2025' },
          ],
          result: { value: 'Re-rating unwinds', sub: 'valuation reverts to the business' },
        },
      ],
      killSwitch:
        "If the recurrence-free survival hazard ratio presented on 24 October is above 0.80, a smaller benefit than Moderna's own 20% benchmark, the case for the 2026 re-rating is falsified.",
    },
    {
      type: 'paragraph',
      text: "The base case is that the full data land near the Phase 2b result and the re-rating holds on pipeline value, with Merck (MRK) as the steadier way to own the same readout and BioNTech (BNTX) and Pfizer (PFE) trading in sympathy, as they did on 19 August and 9 October. The bear case is a hazard ratio above 0.80, which would leave Moderna's roughly $90 billion valuation resting on $1.94 billion of revenue. Either way, the disclosure question outlasts the trial. The president's account and Khanna's family trusts held Moderna into the readout and a third office-holder traded it on the day, and the public could see each position only in ranges, weeks after each trade.",
    },
    {
      type: 'cta-callout',
      headline: 'Watch the readout against the filings',
      body: "Ezana's Capitol Watch hub joins congressional trades with federal contracts, lobbying and committee seats in one EzanaQL query bar: ask which members hold Moderna, Merck or BioNTech, and see each position's disclosed range and filing date.",
      ctaLabel: 'Open Capitol Watch',
      ctaHref: '/datasets/capitol-watch',
      ctaAuthGate: false,
    },
  ],
  globeRail: {
    metric: {
      title: 'MODERNA MONTH-END CLOSE, 2026 ($)',
      data: [
        { x: 0, y: 29.49 },
        { x: 1, y: 44.07 },
        { x: 2, y: 53.57 },
        { x: 3, y: 50.8 },
        { x: 4, y: 45.94 },
        { x: 5, y: 47.19 },
        { x: 6, y: 70.03 },
        { x: 7, y: 54.82 },
        { x: 8, y: 140.34 },
        { x: 9, y: 192.57 },
        { x: 10, y: 225.0 },
      ],
      startLabel: 'Dec 2025 · $29.49',
      endLabel: '9 Oct 2026 · $225.00',
      note: 'Month-end closes (Digrin); the last point is the 9 October close (Yahoo Finance).',
    },
    cities: [
      {
        name: 'Cambridge',
        country: 'United States',
        lat: 42.37,
        lng: -71.11,
        sectionAnchor: 'from-484-to-22-and-back-above-200',
        impact:
          "Moderna's home base. The stock fell 95% from its 2021 record of $484.47 to a low of $22.28, then closed at $225.00 on 9 October, up 663% in 2026, on revenue of just $1.94 billion in 2025.",
      },
      {
        name: 'Rahway',
        country: 'United States',
        lat: 40.61,
        lng: -74.28,
        sectionAnchor: 'the-readout-that-changed-the-story',
        impact:
          'Merck, the development partner, closed up nearly 13% at a record $152.20 on 19 August. Intismeran is being tested with Merck in nine trials across six cancer types.',
      },
      {
        name: 'Washington',
        country: 'United States',
        lat: 38.9,
        lng: -77.04,
        sectionAnchor: 'the-disclosure-gap',
        impact:
          'HHS cancelled a $766 million Moderna contract in 2025; by 2026 the FDA had approved its mRNA flu shot and an NIH-led cancer vaccine effort was reported for December. Trades by the president and Congress surface only in ranges within 45 days.',
      },
      {
        name: 'Fremont',
        country: 'United States',
        lat: 37.55,
        lng: -121.99,
        sectionAnchor: 'congress-was-in-the-stock-too',
        impact:
          "Ro Khanna's family trusts bought MRNA five times in 2026, most recently before the readout on 30 June and again on 24 August, each $1,001 to $15,000.",
      },
      {
        name: 'Madrid',
        country: 'Spain',
        lat: 40.42,
        lng: -3.7,
        sectionAnchor: 'madrid-24-october-what-the-price-now-has-to-prove',
        impact:
          "Full INTerpath-001 data are due at ESMO's Presidential Symposium on 24 October. A hazard ratio above 0.80 would miss Moderna's own 20% benchmark.",
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  category: 'politics-policy',
  subcategory: 'Congress',
  meta: {
    sectors: ['Health Care'],
    industries: ['Biotechnology', 'Pharmaceuticals'],
    investors: ['Donald Trump'],
    institutions: [
      'Moderna',
      'Merck',
      'BioNTech',
      'Pfizer',
      'Trump Organization',
      'Quiver Quantitative',
      'Disclosed Capitol',
      'RBC Capital Markets',
      'TD Cowen',
      'William Blair',
      'Evercore ISI',
      'Leerink Partners',
      'Bank of America',
      'Morgan Stanley',
      'Nasdaq',
      'European Society for Medical Oncology',
    ],
    government: [
      'White House',
      'Department of Health and Human Services',
      'Food and Drug Administration',
      'Biomedical Advanced Research and Development Authority',
      'National Institutes of Health',
      'Office of Government Ethics',
      'US House of Representatives',
    ],
    geos: ['United States', 'Spain', 'Canada'],
    assetClasses: ['Equities'],
    themes: [
      'Political Trading',
      'Disclosure & Transparency',
      'Biotech Catalysts',
      'mRNA Technology',
    ],
    datasets: ['Congressional trading', 'Executive branch disclosures'],
    markets: ['Nasdaq-100'],
  },
  tickers: ['MRNA', 'MRK', 'BNTX', 'PFE', 'WBD'],
  entities: {
    people: [
      {
        id: 'donald-trump',
        label: 'Donald Trump',
        role: 'US President; account bought MRNA in March 2026',
      },
      {
        id: 'ro-khanna',
        label: 'Ro Khanna',
        role: 'US Representative (D-CA); family trusts trade MRNA',
      },
      {
        id: 'maria-elvira-salazar',
        label: 'Maria Elvira Salazar',
        role: 'US Representative (R-FL); reported MRNA trades on 19 August 2026',
      },
      { id: 'georgina-long', label: 'Georgina Long', role: 'Presents INTerpath-001 at ESMO 2026' },
    ],
    terms: [
      { id: 'recurrence-free-survival', label: 'Recurrence-Free Survival' },
      { id: 'neoantigen', label: 'Neoantigen' },
      { id: 'periodic-transaction-report', label: 'Periodic Transaction Report' },
      { id: 'hazard-ratio', label: 'Hazard Ratio' },
    ],
  },
  readTime: 10,
  publishedAt: '2026-10-10',
  listMeta: '10 Oct 2026',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  status: 'published',
};
