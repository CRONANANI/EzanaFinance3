/**
 * Long-form Ezana Echo article: the private credit / BDC maturity wall and why
 * the refinancing pressure clusters in 2028-2029 rather than 2026.
 *
 * Editorial / illustrative content for in-app mock + curated DB seed. Yearly
 * totals in PRIVATE_CREDIT_MATURITY_DATA are read directly from the published
 * Newmark / AllianceBernstein "Projected Debt Maturities by Lender Type" chart
 * and are exact; the per-lender-type segment splits are APPROXIMATED from the
 * source chart's visual proportions (the underlying sub-values are not public).
 */

/* ── Chart 1 data: Projected CRE debt maturities by lender type, 2024-2033 ──
   Stacked-bar source data for the 'private-credit-maturity-wall' renderer
   variant. `total` is the exact published yearly total (USD billions); the five
   lender-type segments are approximated from the source chart and sum to it. */
export const PRIVATE_CREDIT_MATURITY_DATA = [
  {
    year: 2024,
    Bank: 400,
    CMBS: 180,
    'Debt Funds': 140,
    'Gov. Agency': 114,
    Insurance: 95,
    total: 929,
  },
  {
    year: 2025,
    Bank: 250,
    CMBS: 110,
    'Debt Funds': 85,
    'Gov. Agency': 68,
    Insurance: 60,
    total: 573,
  },
  {
    year: 2026,
    Bank: 200,
    CMBS: 88,
    'Debt Funds': 68,
    'Gov. Agency': 54,
    Insurance: 48,
    total: 458,
  },
  {
    year: 2027,
    Bank: 150,
    CMBS: 66,
    'Debt Funds': 50,
    'Gov. Agency': 40,
    Insurance: 36,
    total: 342,
  },
  {
    year: 2028,
    Bank: 145,
    CMBS: 63,
    'Debt Funds': 48,
    'Gov. Agency': 39,
    Insurance: 35,
    total: 330,
  },
  {
    year: 2029,
    Bank: 128,
    CMBS: 55,
    'Debt Funds': 42,
    'Gov. Agency': 34,
    Insurance: 31,
    total: 290,
  },
  {
    year: 2030,
    Bank: 101,
    CMBS: 44,
    'Debt Funds': 33,
    'Gov. Agency': 27,
    Insurance: 24,
    total: 229,
  },
  {
    year: 2031,
    Bank: 95,
    CMBS: 41,
    'Debt Funds': 31,
    'Gov. Agency': 25,
    Insurance: 22,
    total: 214,
  },
  {
    year: 2032,
    Bank: 104,
    CMBS: 45,
    'Debt Funds': 34,
    'Gov. Agency': 28,
    Insurance: 24,
    total: 235,
  },
  {
    year: 2033,
    Bank: 57,
    CMBS: 25,
    'Debt Funds': 19,
    'Gov. Agency': 15,
    Insurance: 14,
    total: 130,
  },
];

/* Series order = stack order, bottom → top. Colors map to the source chart:
   Bank = maroon/red, CMBS = blue, Debt Funds = dark, Gov. Agency = purple,
   Insurance = orange/yellow. Echo chart tokens with hex fallbacks. */
export const PRIVATE_CREDIT_MATURITY_KEYS = [
  { key: 'Bank', label: 'Bank', color: 'var(--echo-chart-red, #b23b4e)' },
  { key: 'CMBS', label: 'CMBS*', color: 'var(--echo-chart-blue, #4a90d9)' },
  { key: 'Debt Funds', label: 'Debt Funds', color: '#1f2d3d' },
  { key: 'Gov. Agency', label: 'Gov. Agency', color: 'var(--echo-chart-purple, #8b5cf6)' },
  { key: 'Insurance', label: 'Insurance', color: 'var(--echo-chart-orange, #f59e0b)' },
];

export const privateCreditMaturityWallArticle2026 = {
  id: 'private-credit-maturity-wall-2026',
  title: 'The $84 Billion Question: Why Private Credit’s Maturity Wall Peaks in 2028, Not 2026',
  excerpt:
    'A Reuters analysis of 74 business development companies found only about $15 billion of roughly $84 billion in assets mature this year — under 20% — with the refinancing wall clustered in 2028 and 2029. Amend-and-extend deals pushed the pressure out, but software exposure, rising payment-in-kind income, and the first-ever net BDC outflow complicate the calm.',
  heroImage: {
    src: '/echo/private-credit-hero.png',
    alt: 'A pink "Private Credit" piggy bank balanced on a cracking plank labeled "Market," supported by classical columns — illustrating structural strain in the private credit market.',
    caption:
      'The private credit market has ballooned through the low-rate era; now a wall of maturities tests how much weight the structure can bear. (Illustration)',
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'The loudest fear in private credit — a wall of maturing loans crashing into a market with nowhere to refinance — is, for now, a problem of 2028 rather than 2026. According to a Reuters analysis of SEC filings from 74 [[kw:business-development-company]]business development companies[[/kw]], only about $15 billion of roughly $84 billion in assets held by those funds mature this year, with the bulk of loan maturities peaking in 2028 and 2029. That is under 20% of the portfolio coming due near-term, a profile that buys the $1.7 trillion asset class time but does not erase the risk — it relocates it two years down the calendar, into a cohort of weaker credits.',
    },
    {
      type: 'stat-grid',
      stats: [
        { label: 'BDC assets analyzed', value: '~$84B', change: 'Across 74 funds (Reuters/SEC)' },
        { label: 'Maturing in 2026', value: '~$15B', change: '~18% of the total' },
        { label: 'Maturity peak', value: '2028–2029', change: 'Where the wall actually sits' },
        {
          label: 'Private credit dry powder',
          value: '$500B+',
          change: 'Committed, undeployed (mid-2025)',
        },
        {
          label: 'BDC sector size',
          value: '~$400B',
          change: 'First-ever net outflow in early 2026',
        },
      ],
    },
    { type: 'heading', text: 'The maturity profile is back-loaded by design', level: 2 },
    {
      type: 'paragraph',
      text: 'The headline number that matters is the shape of the curve, not its height. The Reuters review of 74 BDCs found roughly $15 billion of about $84 billion in assets maturing in 2026, with the concentration building toward 2028 and 2029. For an asset class that grew up almost entirely during a decade of cheap money, a near-term maturity load under 20% is benign — borrowers are not being forced to refinance into today’s higher base rates en masse. The risk is that the relief is borrowed: the same maturities did not disappear, they were rescheduled into a two-year window that now carries a disproportionate share of the lowest-rated credits.',
    },
    {
      type: 'chart',
      variant: 'bar',
      title: 'BDC asset maturities cluster in 2028-2029, not this year',
      caption:
        'Illustrative distribution of business development company asset maturities by year, based on a Reuters analysis of SEC filings from 74 BDCs (May 2026). Near-term 2026 maturities of roughly $15 billion represent under 20% of the ~$84 billion total; the wall is concentrated in 2028-2029. Year buckets are approximated to the published total and peak-year shape.',
      data: [
        { label: '2026', value: 15 },
        { label: '2027', value: 14 },
        { label: '2028', value: 21 },
        { label: '2029', value: 20 },
        { label: '2030', value: 9 },
        { label: '2031+', value: 5 },
      ],
    },
    {
      type: 'paragraph',
      text: 'That back-loading is not unique to BDCs; it mirrors the broader leveraged finance market. Fitch Ratings’ January 2026 review of the global leveraged finance maturity profile found that weaker-credit concentrations are especially high in the 2028 and 2029 cohorts — issuers rated ‘B-’ or below account for roughly 68% of 2028 US leveraged-loan maturities and about 60% of 2029 maturities. S&P Global Ratings put a dollar figure on the same dynamic in February 2026: maturities of ‘B-’ and lower-rated debt surge to a peak near $215 billion in 2028, up from roughly $57 billion in 2026. The market has not avoided the wall; it has stacked its riskiest borrowers against it.',
    },
    { type: 'heading', text: 'How the wall got pushed out: the extension game', level: 2 },
    {
      type: 'paragraph',
      text: 'The mechanism that moved the wall is no mystery. Through 2024 and 2025, as financing conditions eased, lenders and sponsors leaned heavily on [[kw:amend-and-extend]]amend-and-extend[[/kw]] transactions — renegotiating existing loans to push out maturity dates rather than repaying or refinancing them outright. Fitch estimates that repricings and refinancings made up 75% to 85% of leveraged-loan issuance across 2024 and 2025, activity that extended tenors and thinned out the near-term maturity schedule. S&P Global Ratings flagged the same behavior specifically in the BDC channel as early as its August 2024 note on funds extending private credit maturities as financing eased.',
    },
    {
      type: 'paragraph',
      text: 'Amend-and-extend is a legitimate liability-management tool, but it is also a way to defer recognition of a problem. Each extension assumes the borrower will be healthier, or rates lower, when the new maturity arrives. For strong credits that holds; for marginal ones, repeated extensions quietly convert a refinancing question into a solvency question. The private credit market’s comfort with the 2028-2029 wall rests on an implicit bet that base rates will be materially lower and earnings materially higher by then — a bet that looks reasonable today and would look reckless if either leg fails.',
    },
    {
      type: 'callout',
      label: 'Private credit dry powder',
      value: '$500B+',
      context:
        'More than half a trillion dollars of committed but undeployed capital sat in private credit funds as of mid-2025 (Vanguard, Preqin) — a buffer that can refinance maturities, but only at the price the lender sets.',
    },
    {
      type: 'heading',
      text: 'The maturity wall in the context of the broader debt cycle',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Step back from the BDC filings and the maturity wall resolves into something older and more familiar: a phase in a [[kw:long-term-debt-cycle]]long-term debt cycle[[/kw]]. Debt accumulates over years precisely because, in benign conditions, borrowing feels both cheap and safe — and private credit is the purest recent example, scaling from a niche corner of finance to a roughly $1.7 trillion asset class over a decade in which base rates sat near zero. Cheap money does not just lower the cost of a loan; it raises the amount of debt a given stream of income can support, which is why leverage multiples on private-credit deals drifted higher year after year. The $84 billion of BDC assets now marching toward 2028 and 2029 is not an anomaly — it is the back end of an accumulation phase, the point at which the borrowing finally has to be serviced or settled.',
    },
    {
      type: 'paragraph',
      text: 'What makes that phase bite is the nature of debt itself: every loan is a promise to deliver money in the future, and the real weight of that promise is not fixed. Private credit is overwhelmingly floating-rate, so when policy rates climbed from near zero to north of 4%, the debt-service burden on those borrowers repriced almost in real time — a company that comfortably covered interest at a 6% all-in rate can find itself stretched at 11%. The promise did not change; the burden of keeping it roughly doubled. Payment-in-kind income rising to around 8% of BDC investment income is the visible symptom of borrowers conserving cash they no longer have to spare.',
    },
    {
      type: 'paragraph',
      text: 'When debt-service costs rise faster than income, a borrower has only four ways out, and they are the same four whether the borrower is a government, a blue-chip company, or a mid-market software firm sitting in a BDC portfolio: roll the debt into a new loan, cut spending to free up cash, sell assets to raise it, or hand creditors equity in place of repayment. Each option carries a cost — rolling locks in higher rates, cutting starves growth, selling crystallizes losses, and equity dilutes or wipes out the owner. The entire private-credit calm of the past two years has been an exercise in choosing the first option, rolling, as aggressively as the market will allow.',
    },
    {
      type: 'paragraph',
      text: 'That preference is why "extend and pretend" is not a clever new tactic but a recurring feature of every credit cycle. Both sides are incentivized to push maturities out rather than crystallize a loss today: the borrower keeps operating, and the lender avoids writing down a loan and reporting the damage to its own investors. Multiplied across thousands of deals in 2024 and 2025, that shared incentive is exactly what built the 2028-2029 wall — maturities were not retired, they were relocated to a future everyone assumed would be kinder. The cycle does not remove the reckoning; it merely schedules it.',
    },
    { type: 'heading', text: 'The lender landscape behind the wall', level: 2 },
    {
      type: 'paragraph',
      text: 'Private credit does not refinance in a vacuum; it competes with, and increasingly substitutes for, banks, insurers, agencies, and securitization markets. The clearest picture of that competition comes from the commercial real estate debt schedule, where the same lender categories that fund corporate credit also fund property. The maturity load there is enormous and, like the BDC profile, front-loaded: the Mortgage Bankers Association pegged 2024 commercial and multifamily maturities at roughly $929 billion, and the schedule tapers through the decade. The chart below — from Newmark and AllianceBernstein — breaks that wall down by who holds the paper.',
    },
    {
      type: 'chart',
      variant: 'private-credit-maturity-wall',
      title: 'Projected debt maturities by lender type, 2024-2033',
      caption:
        'Projected US commercial real estate debt maturities by lender type (USD billions). Yearly totals are as published — 929 in 2024 tapering to 130 by 2033 — and are read directly from the source chart. Per-lender-type segment splits (CMBS, Insurance, Gov. Agency, Bank, Debt Funds) are approximated from the source chart’s proportions; the sub-segment values are illustrative, not exact. *Commercial mortgage-backed securities. As of December 31, 2023. Source: Mortgage Bankers Association, Newmark and AllianceBernstein (AB). Click a legend swatch to toggle a lender type.',
      yLabel: 'USD Bn',
    },
    {
      type: 'paragraph',
      text: 'Banks remain the dominant holders of maturing debt across every year, which is precisely why private credit’s growth matters: as regulators press banks to lighten commercial real estate and leveraged-lending exposure, the "Debt Funds" slice — the private credit category — has expanded to absorb what banks step back from. That hand-off concentrates refinancing risk in vehicles that, unlike banks, mark their books to model and face their own redemption mechanics. The wall is shared, but the shock absorbers are not all equally sturdy.',
    },
    { type: 'heading', text: 'Software is the cohort that keeps analysts up at night', level: 2 },
    {
      type: 'paragraph',
      text: 'Within the 2028-2029 wall, one sector carries outsized weight: software and technology, the favorite collateral of the private credit boom. Morningstar data show more than $330 billion of high-yield bonds, leveraged loans, and BDC-linked debt tied to software and tech maturing through 2028, and the credit quality is thin — roughly 58% of software loan exposure is rated ‘B-’ or below, and about 21% of software loans mature in 2028 versus 14% for the index as a whole. Morgan Stanley has flagged a roughly $235 billion slice of debt where AI-driven disruption to the underlying business models compounds the refinancing risk.',
    },
    {
      type: 'paragraph',
      text: 'The scale of the broader leveraged-loan wall puts the software problem in context. Roughly $580 billion of loans in the Morningstar LSTA US Leveraged Loan Index mature between 2027 and 2029, and private credit has become the marginal refinancier for exactly this kind of paper — S&P Global counted about $146 billion of private credit lending in 2025 against roughly $85 billion of broadly syndicated issuance. When a sector this large meets its maturities in the same two-year window that carries the weakest ratings, the refinancing market’s capacity, not just its appetite, becomes the binding constraint.',
    },
    {
      type: 'paragraph',
      text: 'Moody’s Ratings made the concern explicit in April 2026, warning that BDCs with heavy software and technology exposure face rising refinancing and credit risk as those maturities concentrate in 2028 and 2029. The agency characterized near-term asset quality as largely benign while framing AI disruption as a monitoring risk rather than an immediate one — a measured way of saying the danger is real but not yet due. For a portfolio underwritten on the assumption that software revenue compounds indefinitely, a maturity wall arriving just as AI reorders the sector’s economics is an uncomfortable coincidence of timing.',
    },
    { type: 'heading', text: 'The tell to watch: payment-in-kind income', level: 2 },
    {
      type: 'paragraph',
      text: 'The most useful early-warning signal is not the maturity schedule but the income statement. [[kw:payment-in-kind]]Payment-in-kind[[/kw]] (PIK) income — interest a borrower defers by adding it to principal rather than paying cash — now accounts for roughly 8% of investment income at public BDCs, and the trend is up. In a May 2026 Ocorian survey of 300 private-capital executives, 96% expected PIK usage to rise over the following two years, and 90% acknowledged that rising PIK risks masking borrower stress. A widely used rule of thumb holds that PIK above 10% of a BDC’s interest income is a flashing indicator worth scrutinizing in quarterly filings.',
    },
    {
      type: 'paragraph',
      text: 'PIK matters because it lets a fund report income it has not actually collected, flattering both yield and the appearance of credit health. That gap is why some analysts estimate the industry’s true stress rate — including liability-management exercises and selective defaults — approaches 5%, roughly double the sub-2% non-accrual rates carried in reported net asset values. The maturity wall is the visible risk; PIK is the one that builds quietly underneath it, and it is the metric most likely to reprice a BDC’s NAV before a single 2028 loan comes due.',
    },
    { type: 'heading', text: 'Structural risk: when investors want out', level: 2 },
    {
      type: 'paragraph',
      text: 'For all the focus on borrowers, the more immediate pressure in early 2026 came from investors. Moody’s downgraded its outlook on the roughly $400 billion BDC sector amid redemption pressure, and the sector recorded its first-ever net outflow after years of strong inflows. Non-traded and perpetual BDC structures offer only limited quarterly liquidity, so a rush for the exits forces managers to either gate withdrawals or sell assets into a thin secondary market — exactly when marks are most fragile. A maturity wall is manageable when capital is flowing in; it is far more dangerous when the funds expected to refinance it are themselves fielding redemption requests.',
    },
    {
      type: 'callout',
      label: 'Reported vs. true stress',
      value: '~5% vs <2%',
      context:
        'Analysts estimate the industry’s true stress rate — including liability-management exercises and selective defaults — is roughly double the sub-2% non-accrual rate carried in reported BDC net asset values.',
    },
    { type: 'heading', text: 'How credit cycles resolve — orderly vs. disorderly', level: 2 },
    {
      type: 'paragraph',
      text: 'Credit booms do not all end the same way, and the difference matters more than the size of the wall. [[kw:deleveraging]]Deleveraging[[/kw]] runs along a spectrum. At the orderly end, maturities are extended on reasonable terms, sponsors inject fresh equity to cure covenant breaches, base rates drift lower, and the more than $500 billion of dry powder quietly refinances the strongest borrowers — the debt load works down gradually and few headlines are made. At the disorderly end, refinancing windows shut, forced sales hit a thin secondary market, defaults cluster, and net asset values are marked down in a hurry as the losses that PIK and amend-and-extend had postponed all surface at once.',
    },
    {
      type: 'paragraph',
      text: 'What tips a situation from one end to the other is flexibility — specifically, who has it and who does not. A borrower with a patient lender, a profitable business, and an equity sponsor willing to write a check can ride out a maturity; a borrower whose only lender is a redemption-pressured fund, whose end-market is being reordered by AI, and whose rating already sits at ‘B-’ or below has no slack when the loan comes due. This is the historical rhyme of credit: booms financed in calm conditions are tested when conditions tighten, and the outcome is decided not by the headline debt figure but by the distribution of flexibility across the borrowers behind it.',
    },
    {
      type: 'paragraph',
      text: 'For private credit specifically, the fork between orderly and disorderly will be visible long before the 2028 maturities arrive — and it will show up in the income statement rather than the maturity schedule. PIK climbing past 10% of interest income, non-accruals ticking up, and discounts to NAV widening are the early tells that the soft, extend-and-pretend resolution is slipping toward the hard one. The roughly $500 billion of dry powder and the equity cushions beneath the strongest deals are the system’s shock absorbers; the thinly-rated software cohort and the redemption-prone non-traded vehicles are where those absorbers are weakest. The wall’s date is fixed — which side of the spectrum the market lands on is still being decided, quarter by quarter.',
    },
    { type: 'heading', text: 'How to position around the wall', level: 2 },
    {
      type: 'paragraph',
      text: 'For investors who want exposure to private credit through liquid, listed vehicles, the BDC complex is the cleanest route. The largest and most diversified names — Ares Capital (ARCC), Blackstone Secured Lending (BXSL), and Blue Owl Capital (OBDC) — carry scale, granular portfolios, and conservative leverage that should weather a 2028 wall better than smaller peers. FS KKR Capital (FSK) and Barings BDC (BBDC) trade at wider discounts to NAV that compensate for higher portfolio risk, while Golub Capital BDC (GBDC) and Hercules Capital (HTGC) offer more specialized books — Golub in sponsor middle-market loans, Hercules in venture lending. For one-ticket exposure, the VanEck BDC Income ETF (BIZD) holds the basket. The screen that matters across all of them is the same: PIK as a share of income, non-accruals trending, and exposure to the 2028-2029 software cohort.',
    },
    {
      type: 'paragraph',
      text: 'The base case for the next two years is orderly: amend-and-extend keeps working, base rates drift lower, the $500 billion-plus of dry powder refinances the strongest borrowers, and the 2028-2029 wall is chipped down well before it arrives. The bear case is a sequence — rates stay higher for longer, PIK keeps climbing past 10% of income, software credits deteriorate as AI reshapes their end-markets, and redemptions force selling into the wall rather than ahead of it. The difference between the two scenarios is not the size of the wall, which is fixed, but whether the market reaches it with momentum or with its back already against it.',
    },
    {
      type: 'paragraph',
      text: 'For investors using Ezana, the relevant tools to track this are the Portfolio Analytics risk view, which surfaces credit and concentration exposure across any BDCs or credit ETFs you hold; the Market Intelligence chain view, which flags rating-agency actions like the Moody’s outlook cut and S&P maturity commentary as they land; and the alerts engine, which can watch quarterly filings for the PIK and non-accrual trends that move a BDC’s NAV before its loans come due. The maturity wall is a known date on the calendar — the edge is in monitoring the metrics that decide whether it arrives as a refinancing or a reckoning.',
    },
    { type: 'heading', text: 'Sources and further reading', level: 2 },
    {
      type: 'paragraph',
      text: '1. Reuters, "For private credit borrowers, big maturity walls are further out," May 2026 (analysis of SEC filings from 74 BDCs; ~$15B of ~$84B maturing in 2026, peak 2028-2029). 2. S&P Global Ratings, "Private Credit, Tech Issuance Fuelled by AI, and Increasing Leverage Among Key Driving Factors Impacting Credit Market Liquidity in 2026," February 17, 2026 (‘B-’ and below maturities peak ~$215B in 2028). 3. S&P Global Ratings, "BDCs Extend Private Credit Maturities As Financing Eases," August 15, 2024.',
    },
    {
      type: 'paragraph',
      text: '4. Moody’s Ratings via Bloomberg, "Private Credit BDCs’ 2028 Maturity Wall Poses Risk, Moody’s Says," April 22, 2026; and Alternative Credit Investor on the ~$400bn BDC sector outlook cut, April 2026. 5. Fitch Ratings, "Global Leveraged Finance Maturity Profile Supports Refinancing Flexibility," January 2026. 6. Morningstar/PitchBook, "Software loses its throne in the leveraged loan market," February 2026 (>$330B software/tech debt through 2028). 7. Vanguard and Preqin on $500B+ private credit dry powder (mid-2025). 8. Ocorian, survey on rising payment-in-kind conversions, May 2026. 9. Mortgage Bankers Association commercial/multifamily maturity volumes; Newmark, "State of the U.S. Capital Markets"; AllianceBernstein, "Projected Debt Maturities by Lender Type."',
    },
  ],
  author: 'Ezana Finance Editorial',
  category: 'markets',
  tags: ['markets', 'private-credit', 'fixed-income', 'analysis', 'macro'],
  tickers: ['ARCC', 'BXSL', 'OBDC', 'FSK', 'BBDC', 'GBDC', 'HTGC', 'BIZD'],
  entities: {
    people: [],
    terms: [
      { id: 'business-development-company', label: 'Business Development Company' },
      { id: 'amend-and-extend', label: 'Amend-and-Extend' },
      { id: 'payment-in-kind', label: 'Payment-in-Kind (PIK)' },
      { id: 'long-term-debt-cycle', label: 'Long-Term Debt Cycle' },
      { id: 'deleveraging', label: 'Deleveraging' },
    ],
  },
  readTime: 12,
  publishedAt: '2026-05-04',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  listMeta: '4 May 2026',
};
