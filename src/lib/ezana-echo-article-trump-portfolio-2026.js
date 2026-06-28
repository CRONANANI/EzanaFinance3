// src/lib/ezana-echo-article-trump-portfolio-2026.js
// Ezana Echo article — Trump Q1 2026 OGE disclosure analysis.
// Follows Ezana_Echo_Skills.md protocol. All chart colors use --echo-chart-* vars.
// Sourcing note (for editorial reference, not rendered): figures are drawn from the
// May 2026 OGE Form 278-T filings as reported by CBS News, NBC News, Euronews,
// Benzinga, and the Cato Institute. Executive-branch disclosures report value RANGES
// and dates, not share counts or portfolio weights — the article is written to that
// constraint and never presents bracketed values as precise holdings.

export const trumpPortfolio2026 = {
  id: 'trump-portfolio-q1-2026',
  title:
    "Inside Trump's Q1 2026 Trading Blitz: 3,642 Transactions, an AI-Chip Tilt, and the Disclosure Data Retail Can Actually See",
  excerpt:
    "Donald Trump's Q1 2026 ethics filing logged 3,642 securities transactions worth $220M-$750M across 1,026 firms — roughly 58 trades per market day. The data reveals a sharp rotation out of mega-cap software and into AI-chip and policy-linked names, and a case study in how disclosure asymmetry shapes retail edge.",
  heroImage: {
    src: '/images/echo/trump-portfolio-2026.png',
    alt: 'Photo-illustration of Donald Trump against a red background with a rising green stock-market arrow, evoking his high-frequency Q1 2026 trading activity.',
    caption:
      'Editorial illustration. The transaction figures in this article are drawn from Trump’s Q1 2026 OGE Form 278-T disclosures, which report value ranges and dates — not share counts or exact portfolio weights.',
  },
  category: 'inside-the-capitol',
  author: 'Ezana Finance Editorial',
  tickers: ['NVDA', 'AMD', 'INTC', 'AVGO', 'DELL', 'ORCL', 'PLTR', 'BA', 'MSFT', 'AMZN'],
  entities: {
    people: [
      {
        id: 'donald-trump',
        label: 'Donald Trump',
        role: 'US President; subject of the Q1 2026 OGE disclosure',
      },
    ],
    terms: [
      { id: 'ai-capex-cycle', label: 'AI Capex Cycle' },
      { id: 'buying-the-dip', label: 'Buying the Dip' },
      { id: 'conflict-of-interest', label: 'Conflict of Interest' },
      { id: 'information-latency', label: 'Information Latency' },
    ],
  },
  readTime: 11,
  publishedAt: '2026-06-20',
  listMeta: '20 Jun 2026',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  contentBlocks: [
    {
      type: 'paragraph',
      text: "President [[person:donald-trump]]Donald Trump[[/person]]'s first-quarter 2026 ethics filing logged 3,642 securities transactions across 1,026 individual companies and funds — roughly 58 trades for every U.S. market day in the quarter. The two OGE Form 278-T reports, released by the Office of Government Ethics on May 14, disclosed a cumulative transaction value of between $220 million and $750 million, with 2,346 purchases outnumbering 1,296 sales by close to two to one. It marked a near-total reversal from the prior pattern: the previous disclosure listed just 191 transactions over the final two months of 2025, dominated by municipal and corporate bonds. The Q1 activity instead reads as a deliberate, high-frequency rotation into equities — concentrated heavily in AI infrastructure and policy-adjacent names.",
    },
    {
      type: 'stat-grid',
      stats: [
        {
          label: 'Total transactions (Q1 2026)',
          value: '3,642',
          change: 'Across 1,026 firms & funds',
        },
        {
          label: 'Cumulative trade value',
          value: '$220M-$750M',
          change: 'Disclosed in broad bands only',
        },
        { label: 'Buys vs. sells', value: '2,346 / 1,296', change: '~2:1 purchases to sales' },
        {
          label: 'Avg. trades per market day',
          value: '~58',
          change: 'vs. 191 total in prior filing',
        },
      ],
    },
    {
      type: 'heading',
      text: 'The disclosure data, and what it cannot tell you',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "Before any allocation wheel or pie chart, the structure of the data deserves scrutiny. Federal ethics rules require officials to report securities transactions above $1,000 within 45 days, but only in broad value bands — a single trade is logged as, say, '$1 million to $5 million,' never an exact figure. The forms do not disclose share counts, execution prices, realized gains, or even reliably whether a given security is common stock, a convertible, or a corporate bond. Any infographic showing Trump holding a precise 10.0% in one name and 8.5% in another is therefore an editorial reconstruction, not a figure pulled from the filing. The honest read of this dataset is frequency and direction of trading, not portfolio weight — and on that basis the signal is still substantial.",
    },
    {
      type: 'callout',
      label: 'The precision trap',
      value: 'Ranges, not weights',
      context:
        "Executive-branch disclosures report value brackets and dates, not share counts. Any allocation percentage attributed to Trump's portfolio is a reconstruction — treat clean round-number weights with skepticism.",
    },
    {
      type: 'heading',
      text: 'The AI-chip rotation',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "The clearest theme in the filing is a concentrated push into semiconductor and AI-infrastructure names. Among roughly three dozen transactions valued between $1 million and $5 million each, the accounts bought securities tied to Nvidia, Broadcom, Microsoft, Adobe, Oracle, ServiceNow, Texas Instruments, and Dell. Smaller buy orders in the $500,000-to-$1 million band captured AMD, Intel, Micron, Goldman Sachs, and Alphabet. By Benzinga's reconstruction, Nvidia-linked purchases alone sat in an estimated $1.8 million to $6.6 million range across 15 separate transactions, while Oracle accounted for an estimated $2.2 million to $10.6 million. The thread connecting these names is custodial: GPUs, accelerators, and networking silicon are the physical substrate of the [[kw:ai-capex-cycle]]AI capex cycle[[/kw]], and the buying clustered precisely when the market was discounting it.",
    },
    {
      type: 'chart',
      variant: 'horizontal-bar',
      title: 'Most-traded names: share of disclosed transactions (Q1 2026)',
      caption:
        "Each name's share of the disclosed transactions among the seven most-traded equities in the filing (Jan 6-Mar 30, 2026). Source: OGE Form 278-T as compiled by CBS News and Benzinga; combines buys and sells. Shares of the shown set, not portfolio weights.",
      data: [
        { label: 'Microsoft', value: 17.9 },
        { label: 'Amazon', value: 17.1 },
        { label: 'Meta', value: 16.3 },
        { label: 'Netflix', value: 14.6 },
        { label: 'Oracle', value: 13.8 },
        { label: 'Nvidia', value: 12.2 },
        { label: 'AMD', value: 8.1 },
      ],
      yLabel: 'Share of shown transactions',
    },
    {
      type: 'paragraph',
      text: "Timing is what elevated the filing from routine to scrutinized. Multiple outlets noted that the heaviest buying coincided with the March market drawdown — the S&P 500 fell more than 8% into a late-March bottom before rallying roughly 19% to fresh highs. More than half of the quarter's transactions landed in March alone. Analysts who reviewed the documents characterized the approach as textbook '[[kw:buying-the-dip]]buying the dip[[/kw]],' with accumulation in Oracle, Workday, and ServiceNow after those names sold off in February. Whether read as disciplined money-management or as something more, the pattern produced large paper gains: by mid-June reconstructions, several disclosed names — AMD, Intel, Marvell, Seagate among them — were up triple digits from the disclosed buy windows.",
    },
    {
      type: 'heading',
      text: 'Policy-adjacent names and the conflict question',
      level: 2,
    },
    {
      type: 'paragraph',
      text: "A second cluster is harder to separate from the office itself. The filing shows a new Dell position established on February 10 — weeks before Trump publicly praised Dell hardware at a White House event in early May. Intel purchases ramped from early March, following the federal government's late-2025 move to take a roughly 10% equity stake in the chipmaker. Boeing appeared across seven transactions, with timing that drew attention after the administration announced a Chinese order for 200 Boeing aircraft. Palantir, a direct beneficiary of federal defense and intelligence spending, also surfaced in the disclosures. None of this is illegal — sitting presidents are exempt from the [[kw:conflict-of-interest]]conflict-of-interest[[/kw]] statute that forces other federal officials to recuse — but ethics scholars and several members of Congress have argued the arrangement leaves the door open to the appearance, if not the substance, of self-dealing.",
    },
    {
      type: 'quote',
      text: 'He is in a position to make all kinds of decisions that can affect stock prices. Not even decisions — a single social-media post can move a name before anyone else can react.',
      source: 'Paraphrasing Richard Briffault, Columbia Law School, to CBS News, June 2026',
    },
    {
      type: 'paragraph',
      text: "The White House has maintained that Trump's assets sit in a trust managed by his children and that 'there are no conflicts of interest.' The filings themselves do not specify whether Trump personally directed any trade; his sons run the broader business, and some entries indicate broker involvement. Still, the cover page of the 113-page primary form carries a handwritten 'Filer paid late fees' notation, and the OGE declined to clarify whether the activity reflected direct or discretionary trading. The ambiguity is the point: the disclosure regime was built for a slower era of official finance, and a 3,600-trade quarter stresses it past its design.",
    },
    {
      type: 'heading',
      text: 'Why this is a retail-edge story, not just an ethics story',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The structural lesson for retail investors is about [[kw:information-latency]]information latency[[/kw]]. Congressional and executive disclosures are public, but they arrive on a 30-to-45-day lag and in deliberately coarse value bands — meaning by the time a filing is searchable, the catalyst that motivated the trade has usually played out. The edge, if one exists, is not in copying a six-week-old trade at post-rally prices; it is in pattern recognition across many filers over time. When AI-infrastructure names show up repeatedly across multiple political disclosures in the same window, that recurrence is a more durable signal than any single transaction.',
    },
    {
      type: 'callout',
      label: 'Disclosure lag vs. catalyst window',
      value: '~5 days vs. up to 45',
      context:
        'A market catalyst is typically priced in within a few trading days, but the federal filing can surface up to 45 days later (median roughly 32) — the structural reason a copied trade tends to arrive after the move. Illustrative framing, not a measured dataset.',
    },
    {
      type: 'paragraph',
      text: "This is precisely the gap Ezana's congressional and political-trading intelligence is built to close. Rather than surfacing a lone headline-grabbing trade, the platform aggregates filings across officials, tags them by sector and timing, and lets users screen for recurrence and cluster behavior — turning a coarse, laggy disclosure stream into a structured signal feed. Paired with the quantitative tooling on the For The Quants page, a user can take a candidate theme like the Q1 AI-chip tilt and actually test it: build the basket, backtest the entry window, and measure whether the pattern would have survived transaction costs and the disclosure lag.",
    },
    {
      type: 'heading',
      text: 'How to frame the trade',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'For investors evaluating the themes rather than the man, the disclosed clusters map to three screenable baskets: AI-chip infrastructure (NVDA, AMD, AVGO, INTC, MU, TXN), enterprise software and cloud (ORCL, MSFT, ADBE, plus ServiceNow and Workday), and policy-linked defense and hardware (PLTR, BA, DELL). The cautionary note is valuation: many of these names have already run hard since the March lows, so the disclosure is a description of where capital went, not an invitation to chase it at current prices. The more defensible application is to watch for the next coordinated rotation — and to use disclosure data as one input in a multi-factor screen, never as a standalone buy signal.',
    },
    {
      type: 'paragraph',
      text: "The base case is that political-disclosure data continues to grow as a retail research input, especially with bipartisan stock-trading-ban proposals like the Restore Trust in Congress Act and the ETHICS Act advancing through committee — legislation that, if passed, would reshape this entire dataset. The bear case for treating these filings as alpha is sobering: the lag, the coarse bands, and the survivorship bias of only seeing the trades after they worked all erode any naive copy strategy. The durable value is analytical, not imitative — and that is the lens Ezana's tooling is designed to enforce. Track the patterns on the platform's political-intelligence feed, stress-test them in the quant workbench, and let the data, rather than the name attached to it, drive the decision.",
    },
  ],
};

export default trumpPortfolio2026;
