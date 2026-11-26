/**
 * Long-form Ezana Echo article: checks the "Meta's Money Machine" infographic
 * circulating on Instagram in November 2026 against Meta's own filings. The
 * graphic's headline figures are Meta's full-year 2024 results, and its revenue
 * split does not match the 2024 Form 10-K. The piece then rebuilds the picture
 * from the latest four quarters (Q4 2025 to Q3 2026): revenue up about 47%,
 * operating margin down from 42% to 33%, one-off tax and legal items moving the
 * profit line, and capital spending absorbing most of the cash. Sources are
 * numbered inline ([[src:N]]) and current to November 26th, 2026. Trailing
 * twelve-month (TTM) totals, margins and splits are Ezana arithmetic from the
 * quarterly figures cited here. Not investment advice.
 */
export const metaMoneyMachineChecked2026 = {
  id: 'meta-money-machine-checked-2026',
  title:
    'Meta’s Money Machine, Checked: The Viral Chart Is Two Years Old and Misplaces $45 Billion of Ad Revenue',
  excerpt:
    'An infographic of Meta’s $164.5 billion "money machine" is circulating as if it were current. Its totals are Meta’s 2024 results, and its revenue split is wrong. Over the latest four quarters Meta earned $241.6 billion, but its operating margin fell from 42% to 33% as legal charges and AI spending piled up.',
  category: 'markets-companies',
  author: 'Ezana Finance Editorial',
  meta: {
    sectors: ['Communication Services'],
    industries: ['Interactive Media & Services', 'Advertising'],
    institutions: ['Meta Platforms', 'Premieur Business'],
    government: [
      'US Securities and Exchange Commission',
      'US Department of the Treasury',
      'US state attorneys general',
    ],
    geos: ['United States'],
    assetClasses: ['Equities'],
    themes: [
      'Earnings Quality',
      'Digital Advertising',
      'AI Infrastructure',
      'Capital Expenditure',
      'Legal Risk',
      'Misinformation Check',
    ],
    datasets: ['Meta Form 10-K (FY2024)', 'Meta quarterly earnings releases'],
    markets: ['Nasdaq'],
    investors: [],
  },
  tickers: ['META'],
  entities: {
    people: [
      { id: 'mark-zuckerberg', label: 'Mark Zuckerberg', role: 'Founder and CEO, Meta Platforms' },
      { id: 'susan-li', label: 'Susan Li', role: 'CFO, Meta Platforms' },
    ],
    terms: [
      { id: 'operating-margin', label: 'Operating margin' },
      { id: 'trailing-twelve-months', label: 'Trailing twelve months' },
      { id: 'capex-cycle', label: 'Capex cycle' },
    ],
  },
  readTime: 8,
  publishedAt: '2026-11-26',
  listMeta: 'Nov 26th, 2026',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  status: 'published',
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'A polished Sankey chart titled “Meta’s Money Machine,” posted on Instagram by Premieur Business this week, shows $164.501 billion of revenue flowing into $69.385 billion of operating income, a 42.2% [[kw:operating-margin]]operating margin[[/kw]] and $62.360 billion of net income. The totals are real, but they are not current: they are Meta’s results for the full year 2024, reported in January 2025.[[src:1]]Meta Platforms, "Meta Reports Fourth Quarter and Full Year 2024 Results," January 29th, 2025 · https://investor.atmeta.com/investor-news/press-release-details/2025/Meta-Reports-Fourth-Quarter-and-Full-Year-2024-Results/default.aspx[[/src]] The revenue split on the left of the chart does not match that year’s annual report either. Checked against the filings, the chart is right about the size of Meta’s 2024 profit and wrong about where the money came from, and Meta’s latest four quarters tell a different story: much more revenue, a thinner margin and a cash machine now spending most of what it makes.',
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'Revenue on the viral chart',
          value: '$164.5B',
          change: 'Meta’s full-year 2024 result',
        },
        {
          label: 'Revenue, latest four quarters',
          value: '$241.6B',
          change: 'Q4 2025 to Q3 2026, +47% vs 2024',
        },
        {
          label: 'Operating margin, latest four quarters',
          value: '32.9%',
          change: 'vs 42.2% on the chart',
        },
        {
          label: '2026 capital spending guidance',
          value: '$135–145B',
          change: 'vs $39.2B in 2024',
        },
      ],
    },
    { type: 'heading', text: 'What the chart gets wrong', level: 2 },
    {
      type: 'paragraph',
      text: 'Meta reports revenue in two segments. Family of Apps, which holds Facebook, Instagram, Messenger and WhatsApp, earned $162.355 billion in 2024: $160.633 billion of advertising and $1.722 billion of other revenue. Reality Labs, the headset and glasses business, earned $2.146 billion.[[src:2]]Meta Platforms, Form 10-K for the fiscal year ended December 31st, 2024 · https://www.sec.gov/Archives/edgar/data/1326801/000132680125000017/meta-20241231.htm[[/src]] The chart instead shows advertising at $114.985 billion, or 70%, and adds a $39.274 billion “Family & Applications” stream that does not exist as a separate line; advertising is most of Family of Apps, not a sibling of it. Its four inputs still sum to the right total, which is what makes the error hard to spot. The effect is to understate Meta’s dependence on ads: they were about 98% of 2024 revenue, not 70%.',
    },
    {
      type: 'revision-ledger',
      figureLabel: 'FIG. 1 · THE CHART VS THE 10-K',
      kicker:
        'EACH LINE OF THE VIRAL CHART, $ BILLION · HOLLOW = VALUE ON THE CHART · FILLED = VALUE IN META’S 2024 FORM 10-K AND EARNINGS RELEASE · CLICK A ROW FOR WHAT WAS COUNTED',
      hint: 'The bottom line matches; the revenue split does not.',
      source:
        'Chart: "Meta’s Money Machine," Premieur Business, Instagram, November 2026. Record: Meta Form 10-K for 2024 and Q4 2024 earnings release. Ezana arithmetic.',
      scale: 'linear',
      unit: '$B',
      rows: [
        {
          label: 'Advertising',
          sub: 'shown as 70% of revenue',
          before: 114.985,
          after: 160.633,
          beforeDisplay: '$115.0B',
          afterDisplay: '$160.6B',
          delta: 45.648,
          deltaDisplay: '+$45.6B',
          favorable: 'up',
          record:
            'The 10-K reports $160.633 billion of advertising revenue in 2024, about 97.6% of total revenue.',
        },
        {
          label: '“Family & Applications”',
          sub: 'not a reporting line',
          before: 39.274,
          after: 0,
          beforeDisplay: '$39.3B',
          afterDisplay: 'none',
          delta: -39.274,
          deltaDisplay: '−$39.3B',
          favorable: 'up',
          record:
            'Meta has no revenue line by this name. Its Family of Apps segment ($162.355 billion) is advertising plus other revenue, so this slice double-labels money that belongs to advertising.',
        },
        {
          label: 'Other revenue',
          sub: 'Family of Apps',
          before: 8.397,
          after: 1.722,
          beforeDisplay: '$8.4B',
          afterDisplay: '$1.7B',
          delta: -6.675,
          deltaDisplay: '−$6.7B',
          favorable: 'up',
          record:
            'Other revenue, mainly WhatsApp business messaging and Meta Verified, was $1.722 billion in 2024.',
        },
        {
          label: 'Reality Labs',
          sub: 'segment revenue',
          before: 1.845,
          after: 2.146,
          beforeDisplay: '$1.8B',
          afterDisplay: '$2.1B',
          delta: 0.301,
          deltaDisplay: '+$0.3B',
          favorable: 'up',
          record: 'Reality Labs revenue was $2.146 billion in 2024, up 13%.',
        },
        {
          label: 'Operating costs',
          sub: 'costs and expenses',
          before: 95.116,
          after: 95.121,
          beforeDisplay: '$95.116B',
          afterDisplay: '$95.121B',
          delta: 0.005,
          deltaDisplay: '+$0.005B',
          favorable: 'up',
          record: 'Total costs and expenses were $95.121 billion. The chart is off by $5 million.',
        },
        {
          label: 'Operating income',
          sub: 'income from operations',
          before: 69.385,
          after: 69.38,
          beforeDisplay: '$69.385B',
          afterDisplay: '$69.380B',
          delta: -0.005,
          deltaDisplay: '−$0.005B',
          favorable: 'up',
          record:
            'Income from operations was $69.380 billion, a 42% operating margin. Again off by $5 million.',
        },
        {
          label: 'Interest, taxes & other',
          sub: 'operating income to net',
          before: 7.025,
          after: 7.02,
          beforeDisplay: '$7.025B',
          afterDisplay: '$7.020B',
          delta: -0.005,
          deltaDisplay: '−$0.005B',
          favorable: 'up',
          record:
            'The gap is $8.303 billion of income tax offset by about $1.28 billion of net other income. Interest was a gain for Meta in 2024, not a cost.',
        },
        {
          label: 'Net income',
          sub: 'full year 2024',
          before: 62.36,
          after: 62.36,
          beforeDisplay: '$62.360B',
          afterDisplay: '$62.360B',
          delta: 0,
          deltaDisplay: '0',
          favorable: 'up',
          record: 'Matches: net income was $62.360 billion, or $23.86 per diluted share.',
        },
      ],
      verdict:
        'Three of eight lines are materially wrong, all on the revenue side; the profit lines match 2024 to within $5 million.',
    },
    {
      type: 'paragraph',
      text: 'The smaller misses matter less but point the same way. The chart’s $95.116 billion of operating costs and $69.385 billion of operating income are each $5 million off the filed figures, and its “Interest, Taxes & Other” label describes the right total, $7.02 billion, for the wrong reason: Meta paid $8.303 billion of income tax in 2024 but earned about $1.28 billion of net interest and other income, so the non-operating line helped profit rather than hurting it.[[src:3]]Yahoo Finance, Meta Platforms income statement (annual), accessed November 26th, 2026 · https://ca.finance.yahoo.com/quote/META/financials/[[/src]]',
    },
    {
      type: 'donut',
      figureLabel: 'FIG. 2 · WHERE 2024 REVENUE ACTUALLY CAME FROM',
      kicker:
        'META REVENUE BY SOURCE, FULL YEAR 2024, $ BILLION · AS REPORTED IN THE FORM 10-K · HOVER A SLICE FOR ITS SHARE',
      hint: 'Ads were 98 cents of every revenue dollar, not 70.',
      source:
        'Meta Platforms Form 10-K for 2024, revenue by source and segment. Shares are Ezana arithmetic.',
      unit: 'B',
      totalLabel: 'Total revenue',
      slices: [
        {
          label: 'Advertising',
          value: 160.633,
          color: 'var(--echo-chart-blue)',
          detail: '97.6% of revenue, Family of Apps',
        },
        {
          label: 'Reality Labs',
          value: 2.146,
          color: 'var(--echo-chart-purple)',
          detail: '1.3% of revenue',
        },
        {
          label: 'Other revenue',
          value: 1.722,
          color: 'var(--echo-chart-green)',
          detail: '1.0% of revenue, Family of Apps',
        },
      ],
    },
    { type: 'heading', text: 'The machine two years later', level: 2 },
    {
      type: 'paragraph',
      text: 'Meta has grown a lot since the chart’s data was filed. Revenue reached $200.966 billion in 2025, up 22%, with operating income of $83.276 billion.[[src:4]]Meta Platforms, "Meta Reports Fourth Quarter and Full Year 2025 Results," January 28th, 2026 · https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-Fourth-Quarter-and-Full-Year-2025-Results/default.aspx[[/src]] Over the [[kw:trailing-twelve-months]]trailing twelve months[[/kw]] to September 30th, 2026, the four quarters add up to $241.6 billion of revenue, about 47% more than the chart shows. Operating income over the same period was $79.4 billion, below 2025’s full-year figure. That is the first time in the five periods below that profit fell while revenue rose, and it is the change the old chart cannot show.',
    },
    {
      type: 'glow-line',
      figureLabel: 'FIG. 3 · REVENUE KEPT CLIMBING; PROFIT DID NOT',
      kicker:
        'META REVENUE AND INCOME FROM OPERATIONS, $ BILLION · FULL YEARS 2022 TO 2025 AND THE TWELVE MONTHS TO SEPTEMBER 30TH, 2026 · HOVER A PERIOD FOR BOTH VALUES',
      hint: 'The chart froze the picture at 2024, the year margins peaked.',
      source:
        'Meta earnings releases for FY2024, FY2025 and Q1 to Q3 2026; Yahoo Finance annual income statement for 2022 and 2023. TTM totals are Ezana arithmetic.',
      yLabel: 'USD billion',
      categories: ['2022', '2023', '2024', '2025', 'TTM Q3 2026'],
      series: [
        {
          key: 'revenue',
          label: 'Revenue',
          color: 'var(--echo-chart-blue)',
          values: [116.609, 134.902, 164.501, 200.966, 241.606],
        },
        {
          key: 'opinc',
          label: 'Operating income',
          color: 'var(--echo-chart-green)',
          values: [28.944, 46.751, 69.38, 83.276, 79.38],
        },
      ],
      annotations: [
        { x: '2024', y: 164.501, label: 'The viral chart', sub: '$164.5B' },
        { x: 'TTM Q3 2026', y: 79.38, label: 'Profit dips', sub: '$79.4B' },
      ],
    },
    {
      type: 'paragraph',
      text: 'The quarters show where the margin went. Through the first quarter of 2026 Meta held its operating margin near 41% while revenue grew 33%, driven by a 19% rise in ad impressions and a 12% rise in the average price per ad.[[src:5]]Meta Platforms, "Meta Reports First Quarter 2026 Results," April 29th, 2026 · https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-First-Quarter-2026-Results/default.aspx[[/src]] In the second quarter costs rose 55% and the margin fell to 31%, including $2.40 billion of legal charges and $1.18 billion of severance tied to a May headcount reduction of about 8,000 people.[[src:6]]Meta Platforms, "Meta Reports Second Quarter 2026 Results," July 29th, 2026 · https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-Second-Quarter-2026-Results/default.aspx[[/src]] In the third quarter revenue rose 26% to $64.60 billion but the margin fell to 20%, after a $9.89 billion charge for Meta’s agreement with 52 state attorneys general to resolve litigation over teen mental health, which provides for payments of up to about $18.59 billion. Without that charge, operating income would have been $22.88 billion.[[src:7]]Meta Platforms, "Meta Reports Third Quarter 2026 Results," October 21st, 2026 · https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-Third-Quarter-2026-Results/default.aspx[[/src]]',
    },
    {
      type: 'multi-axis',
      figureLabel: 'FIG. 4 · SEVEN QUARTERS OF THE MACHINE',
      kicker:
        'META QUARTERLY REVENUE, $ BILLION (BARS, LEFT AXIS) · OPERATING MARGIN, % (LINE, RIGHT AXIS) · Q1 2025 TO Q3 2026 · HOVER A QUARTER FOR BOTH',
      hint: 'Revenue set a record in Q3 2026 as the margin hit its low.',
      source:
        'Meta quarterly earnings releases, Q1 2025 to Q3 2026 (Q1 to Q3 2025 figures from the prior-year columns of the 2026 releases). Margins are Ezana arithmetic from reported revenue and income from operations.',
      categories: ['Q1 25', 'Q2 25', 'Q3 25', 'Q4 25', 'Q1 26', 'Q2 26', 'Q3 26'],
      series: [
        {
          label: 'Revenue',
          kind: 'bar',
          unit: '$B',
          values: [42.314, 47.516, 51.242, 59.893, 56.311, 60.801, 64.601],
        },
        {
          label: 'Operating margin',
          kind: 'line',
          unit: '%',
          values: [41.5, 43.0, 40.1, 41.3, 40.6, 30.9, 20.1],
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'Net income is noisier still, because large one-off tax items have landed in both directions. A $15.93 billion non-cash tax charge tied to the One Big Beautiful Bill Act cut third-quarter 2025 net income to $2.7 billion and lifted Meta’s full-year 2025 tax rate to 30%; without it the rate would have been 13%.[[src:4]]Meta Platforms, full year 2025 results, January 28th, 2026 · https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-Fourth-Quarter-and-Full-Year-2025-Results/default.aspx[[/src]] Then an $8.03 billion tax benefit in the first quarter of 2026, after US Treasury guidance on previously capitalized research costs, pushed that quarter’s net income to a record $26.8 billion; without it the figure was about $18.7 billion.[[src:8]]The Next Web, "Meta Q1 2026: record revenue, user decline, AI capex," April 2026 · https://thenextweb.com/news/meta-q1-2026-user-decline-ai-capex[[/src]] Anyone comparing a single quarter’s profit to the chart’s $62.4 billion is comparing against moving targets.',
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 5 · THE ONE-OFFS INSIDE THE PROFIT LINE',
      kicker:
        'LARGE NON-RECURRING ITEMS META HAS REPORTED SINCE THE CHART’S DATA, $ BILLION · QUARTER · DIRECTION · CLICK DOSSIER FOR THE RECORD',
      hint: 'Three of four items lowered profit; the largest single one was a tax charge.',
      source:
        'Meta earnings releases for FY2025, Q1, Q2 and Q3 2026; The Next Web; Verdict. Net figures for one item are as Meta and the cited reports describe them.',
      headers: ['Item', 'What it was', 'Effect', 'Why it matters', ''],
      rows: [
        {
          name: 'Tax charge',
          tag: 'Q3 2025',
          role: 'Non-cash valuation allowance after the One Big Beautiful Bill Act.',
          anchor: '−$15.93B',
          keyRisk: 'Cut Q3 2025 net income to $2.7B and pushed 2025 net income below 2024’s.',
          dossier: [
            {
              label: 'Effect on the year',
              text: 'Full-year 2025 net income was $60.458 billion, down 3%, and the effective tax rate was 30%; absent the charge it would have been 13%.',
            },
          ],
        },
        {
          name: 'Tax benefit',
          tag: 'Q1 2026',
          role: 'Benefit from US Treasury guidance on capitalized research costs.',
          anchor: '+$8.03B',
          keyRisk: 'Made Q1 2026 a record profit quarter on paper.',
          dossier: [
            {
              label: 'Effect',
              text: 'Net income was $26.8 billion as reported and about $18.7 billion without the benefit. The benefit partly offsets the Q3 2025 charge.',
            },
          ],
        },
        {
          name: 'Legal and severance',
          tag: 'Q2 2026',
          role: 'Legal-proceeding charges plus severance for about 8,000 roles cut in May.',
          anchor: '−$3.58B',
          keyRisk: 'Pulled the Q2 operating margin down to 31%.',
          dossier: [
            {
              label: 'Split',
              text: '$2.40 billion of charges related to legal proceedings and $1.18 billion of severance expenses.',
            },
          ],
        },
        {
          name: 'Attorneys general settlement',
          tag: 'Q3 2026',
          role: 'Agreement with 52 attorneys general over teen mental health litigation.',
          anchor: '−$9.89B',
          keyRisk: 'Payments of up to about $18.59B are provided for under the agreement.',
          dossier: [
            {
              label: 'Without it',
              text: 'Q3 2026 operating income would have been $22.88 billion instead of $12.99 billion, and diluted EPS $7.40 instead of $3.83.',
            },
          ],
        },
      ],
    },
    {
      type: 'cta-callout',
      headline: 'Read Meta from the filings, not the feed',
      body: 'Meta’s page in Ezana’s US Equities research has quarterly revenue, operating income and capital spending straight from the filings, plus institutional ownership and every 8-K. Line the latest quarter up against 2024 and see how much of the change is one-offs.',
      ctaLabel: 'Open META in US Equities',
      ctaHref: '/company-research',
      ctaAuthGate: false,
    },
    { type: 'heading', text: 'Where the money goes now', level: 2 },
    {
      type: 'paragraph',
      text: 'Strip the profit line back to the four quarters and the shape of the machine is clear. Of $241.6 billion of revenue, about $148.8 billion went to ordinary costs and expenses, $13.5 billion to the legal and severance charges, and $79.4 billion was left as operating income. Without those charges the operating margin would have been about 38%, still below the chart’s 42% because ordinary costs are rising faster than revenue. Meta’s own guidance points the same way: it expects 2026 total expenses of $165 billion to $169 billion.[[src:6]]Meta Platforms, second quarter 2026 results, July 29th, 2026 · https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-Second-Quarter-2026-Results/default.aspx[[/src]]',
    },
    {
      type: 'sentiment-bar',
      figureLabel: 'FIG. 6 · WHERE THE LATEST $241.6 BILLION WENT',
      kicker:
        'META REVENUE, TWELVE MONTHS TO SEPTEMBER 30TH, 2026, $ BILLION · SPLIT INTO ORDINARY COSTS, ONE-OFF CHARGES AND OPERATING INCOME',
      hint: 'About a third of revenue reached operating income, against 42% in the chart.',
      source:
        'Meta quarterly earnings releases, Q4 2025 to Q3 2026. One-off charges are the Q2 2026 legal and severance charges and the Q3 2026 attorneys general charge. Ezana arithmetic.',
      title: 'Revenue, Q4 2025 to Q3 2026',
      overall: { label: '32.9% operating margin', tone: 'neu' },
      unit: 'B',
      parts: [
        { label: 'Ordinary costs and expenses', value: 148.76, tone: 'neg' },
        { label: 'Legal and severance charges', value: 13.47, tone: 'neg' },
        { label: 'Operating income', value: 79.38, tone: 'pos' },
      ],
    },
    {
      type: 'paragraph',
      text: 'The bigger change sits below the income statement. Meta spent $39.2 billion on capital projects in 2024. In the third quarter of 2026 alone it spent $34.91 billion, against $19.37 billion a year earlier, and it expects $135 billion to $145 billion for the full year, the latest turn of the AI [[kw:capex-cycle]]capex cycle[[/kw]].[[src:9]]MediaPost, "Meta Q3: Boosts AI Spend, Ad Biz, Users," October 2026 · https://www.mediapost.com/publications/article/418930/meta-q3-boosts-ai-spend-ad-biz-users.html[[/src]][[src:10]]ClickOnDetroit, "Meta Q3 revenue tops estimates and Zuckerberg says Muse accounts have topped 10 million," October 21st, 2026 · https://www.clickondetroit.com/business/2026/10/21/meta-q3-revenue-tops-estimates-and-zuckerberg-says-muse-accounts-have-topped-10-million/[[/src]] Free cash flow, which was $43.6 billion in 2025, fell to $784 million in the second quarter and to negative $2.12 billion in the third. [[person:mark-zuckerberg]]Mark Zuckerberg[[/person]] has said the company’s first frontier model, Muse, needs significant computing power to run and should become profitable once its revenue lines reach scale, and CFO [[person:susan-li]]Susan Li[[/person]] has said the AI investments are beginning to pay off.',
    },
    { type: 'heading', text: 'Verdict: right number, wrong year, wrong split', level: 2 },
    {
      type: 'paragraph',
      text: 'The chart is a faithful picture of Meta’s 2024 profit and a misleading picture of its revenue, and it is presented as if it were current. A reader who trusts it would think a third of Meta’s revenue comes from something other than ads, when the real figure was about 2%, and would miss the two developments that define Meta in late 2026: revenue growing 26% to 33% a quarter and a margin compressed by legal costs and an AI build-out that is now consuming its free cash flow. Meta guided to fourth-quarter revenue of $73 billion to $76 billion, which would take full-year 2026 revenue to roughly $255 billion to $258 billion by Ezana’s arithmetic.[[src:11]]Earnings Whispers, Meta Q3 2026 results and guidance, October 2026 · https://www.earningswhispers.com/epsdetails/META/202609[[/src]]',
    },
    {
      type: 'paragraph',
      text: 'For investors in Meta (META), the useful test is the one the chart skips. If operating margin excluding one-off charges climbs back toward 40% while capital spending stays near the guided range, the AI build-out is paying for itself through the ad business; if margins keep sliding and free cash flow stays near zero, the market is being asked to fund the bet. The dates to watch are Meta’s fourth-quarter results, expected in late January 2027, its first 2027 capital spending outlook, and the payments schedule under the attorneys general agreement. And before sharing a financial chart, check one thing: which period it covers.',
    },
    {
      type: 'cta-callout',
      headline: 'Ask Sonar what is really in Meta’s numbers',
      body: 'Ezana Sonar answers with sources: Meta’s segment revenue, one-off charges by quarter, capital spending against guidance and how institutional holders have traded the stock. Ask about META and get the filings, not the infographic.',
      ctaLabel: 'Open Ezana Sonar',
      ctaHref: '/sonar',
      ctaAuthGate: false,
    },
  ],
};

export default metaMoneyMachineChecked2026;
