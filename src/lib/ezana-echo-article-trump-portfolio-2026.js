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
  category: 'politics-policy',
  subcategory: 'Congress',
  globeRail: {
    metric: {
      title: 'DISCLOSED TRANSACTIONS PER FILING',
      data: [
        { x: 0, y: 191 },
        { x: 1, y: 3642 },
      ],
      startLabel: 'Prior filing · 191',
      endLabel: 'Q1 2026 · 3,642',
      note: 'The prior two-month filing logged just 191 transactions, dominated by bonds; Q1 2026 logged 3,642 across 1,026 firms — roughly 58 trades per market day, with 2,346 purchases outnumbering 1,296 sales close to two to one.',
    },
    cities: [
      {
        name: 'Washington',
        country: 'US',
        lat: 38.9,
        lng: -77.04,
        impact:
          'Trump’s Q1 2026 OGE Form 278-T filings, released May 14, disclosed 3,642 transactions worth $220M–$750M. A second cluster is harder to separate from the office: a new Dell position weeks before public praise, Intel buying after the government’s ~10% stake, Boeing across seven transactions near a 200-aircraft order. Sitting presidents are exempt from the recusal statute, and no evidence establishes self-dealing.',
      },
      {
        name: 'New York',
        country: 'US',
        lat: 40.71,
        lng: -74.01,
        impact:
          'The heaviest buying coincided with the March market drawdown — the S&P 500 fell more than 8% into a late-March bottom before rallying roughly 19% — with more than half the quarter’s transactions landing in March, in a textbook "buying the dip" concentrated in AI-chip and enterprise-software names.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  meta: {
    sectors: ['Information Technology', 'Industrials'],
    industries: ['Semiconductors', 'Aerospace & Defense'],
    investors: ['Donald Trump'],
    institutions: ['Nvidia', 'Boeing'],
    government: ['White House'],
    geos: ['United States'],
    assetClasses: ['Equities'],
    themes: ['Political Money', 'Congressional Trading'],
    datasets: ['Congressional trading', 'SEC filings'],
    markets: [],
  },
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
      type: 'revision-ledger',
      figureLabel: 'FIG. 1 · FROM 191 TRADES TO 3,642',
      kicker:
        'PRIOR FILING → Q1 2026 · √-SCALE · GREEN MARKS AN INCREASE IN ACTIVITY, NOT A VALUE JUDGMENT. CLICK A ROW FOR THE RECORD.',
      hint: 'Bar length on a √-scale; magnitude of activity, not portfolio value.',
      source: 'OGE Form 278-T reports released May 14, 2026, as reported by CBS News and NBC News.',
      scale: 'sqrt',
      unit: '',
      rows: [
        {
          label: 'Transactions in the filing',
          sub: 'prior 2-month filing → Q1 2026',
          before: 191,
          after: 3642,
          beforeDisplay: '191',
          afterDisplay: '3,642',
          delta: 3451,
          deltaDisplay: '+3,451',
          favorable: 'up',
          record:
            'The prior disclosure logged just 191 transactions over the final two months of 2025, dominated by municipal and corporate bonds; Q1 2026 logged 3,642 — a near-total reversal into high-frequency equity trading.',
        },
        {
          label: 'Net buys over sells (Q1 2026)',
          sub: 'delta-only · 2,346 buys vs 1,296 sells',
          delta: 1050,
          deltaDisplay: '+1,050',
          favorable: 'up',
          record:
            '2,346 purchases outnumbered 1,296 sales by close to two to one — the tilt is toward accumulation, concentrated in AI infrastructure and policy-adjacent names.',
        },
      ],
      verdict:
        'The honest read of this filing is frequency and direction of trading — a surge from 191 to 3,642 transactions, buying nearly two-to-one — not portfolio weight.',
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
      type: 'dossier-table',
      figureLabel: 'FIG. 2 · THE SEVEN MOST-TRADED NAMES',
      kicker:
        'NAME · WHAT IT IS IN THE FILING · SHARE OF DISCLOSED TRANSACTIONS · KEY CAVEAT — CLICK A ROW FOR THE DOSSIER.',
      hint: 'Shares of the shown set, not portfolio weights — expand a row for the record.',
      source:
        "Each name's share of the disclosed transactions among the seven most-traded equities in the filing (Jan 6-Mar 30, 2026). Source: OGE Form 278-T as compiled by CBS News and Benzinga; combines buys and sells. Shares of the shown set, not portfolio weights.",
      headers: ['Name', 'What it is in the filing', 'Share of shown', 'Key caveat', ''],
      rows: [
        {
          name: 'Microsoft',
          tag: 'SOFTWARE & CLOUD',
          role: 'Bought among roughly three dozen transactions valued between $1 million and $5 million each.',
          anchor: '17.9% of the shown transactions.',
          keyRisk:
            'A share of the shown set, not a portfolio weight — the filing reports value bands, not holdings.',
          dossier: [
            {
              label: 'Cluster',
              text: 'Part of the enterprise-software and cloud group (ORCL, MSFT, ADBE) that the disclosed clusters map to.',
            },
          ],
        },
        {
          name: 'Amazon',
          tag: 'MEGA-CAP',
          role: 'Among the seven most-traded equities in the disclosed set.',
          anchor: '17.1% of the shown transactions.',
          keyRisk: 'Combines buys and sells; a share of the shown set, not a portfolio weight.',
          dossier: [
            {
              label: 'Read',
              text: 'The honest read of the dataset is frequency and direction of trading, not portfolio weight.',
            },
          ],
        },
        {
          name: 'Meta',
          tag: 'MEGA-CAP',
          role: 'Among the seven most-traded equities in the disclosed set.',
          anchor: '16.3% of the shown transactions.',
          keyRisk: 'Combines buys and sells; a share of the shown set, not a portfolio weight.',
          dossier: [
            {
              label: 'Read',
              text: 'Executive-branch disclosures report value brackets and dates, not share counts or exact weights.',
            },
          ],
        },
        {
          name: 'Netflix',
          tag: 'MEGA-CAP',
          role: 'Among the seven most-traded equities in the disclosed set.',
          anchor: '14.6% of the shown transactions.',
          keyRisk: 'Combines buys and sells; a share of the shown set, not a portfolio weight.',
          dossier: [
            {
              label: 'Read',
              text: 'Any allocation percentage attributed to the portfolio is a reconstruction, not a figure pulled from the filing.',
            },
          ],
        },
        {
          name: 'Oracle',
          tag: 'SOFTWARE & CLOUD',
          role: 'Bought in the $1M–$5M band; accumulation continued after the name sold off in February.',
          anchor: '13.8% of the shown transactions.',
          keyRisk:
            'Estimated $2.2M–$10.6M across the quarter — a reconstructed range, not a disclosed figure.',
          dossier: [
            {
              label: 'Timing',
              text: "Analysts characterized the approach as textbook 'buying the dip,' with accumulation in Oracle, Workday, and ServiceNow after February selloffs.",
            },
          ],
        },
        {
          name: 'Nvidia',
          tag: 'AI CHIPS',
          role: 'The clearest expression of the AI-chip rotation — GPUs and accelerators as the substrate of the AI capex cycle.',
          anchor: '12.2% of the shown transactions.',
          keyRisk: 'Estimated $1.8M–$6.6M across 15 separate transactions — a reconstructed range.',
          dossier: [
            {
              label: 'Substrate',
              text: 'The buying clustered precisely when the market was discounting the AI capex cycle.',
            },
          ],
        },
        {
          name: 'AMD',
          tag: 'AI CHIPS',
          role: 'Captured in smaller buy orders in the $500,000-to-$1 million band.',
          anchor: '8.1% of the shown transactions.',
          keyRisk: 'By mid-June reconstructions, up triple digits from the disclosed buy windows.',
          dossier: [
            {
              label: 'Cluster',
              text: 'Part of the AI-chip infrastructure basket (NVDA, AMD, AVGO, INTC, MU, TXN) the article screens.',
            },
          ],
        },
      ],
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
      type: 'adjudication-matrix',
      figureLabel: 'FIG. 3 · THE APPEARANCE, GRADED',
      kicker:
        'FOUR POLICY-ADJACENT NAMES × THE ELEMENTS THAT CREATE THE APPEARANCE · SAME = ELEMENT PRESENT · PART = PRESENT WITH AN ASTERISK · — = ABSENT. NONE OF THIS IS ILLEGAL. CLICK ANY CELL FOR THE NOTE.',
      hint: 'Click any cell for the note. Sitting presidents are exempt from the recusal statute.',
      source: 'OGE Form 278-T coverage: CBS News, NBC News, Euronews (2026).',
      cols: [
        'Federal policy action nearby',
        'Trade-timing overlap',
        'Direct federal beneficiary',
        'Public praise / announcement',
      ],
      rows: [
        {
          label: 'Dell',
          cells: [
            {
              value: 'part',
              note: 'A public endorsement rather than a formal policy action.',
            },
            {
              value: 'same',
              note: 'A new Dell position was established on February 10, weeks before the public praise.',
            },
            { value: 'none', note: 'No disclosed federal contract or stake tied to the position.' },
            {
              value: 'same',
              note: 'Trump publicly praised Dell hardware at a White House event in early May.',
            },
          ],
        },
        {
          label: 'Intel',
          cells: [
            {
              value: 'same',
              note: 'The federal government moved to take a roughly 10% equity stake in Intel in late 2025.',
            },
            {
              value: 'same',
              note: 'Intel purchases ramped from early March, following the federal stake.',
            },
            { value: 'same', note: 'The government itself became a roughly 10% shareholder.' },
            { value: 'none', note: 'No public endorsement disclosed.' },
          ],
        },
        {
          label: 'Boeing',
          cells: [
            {
              value: 'same',
              note: 'The administration announced a Chinese order for 200 Boeing aircraft.',
            },
            {
              value: 'same',
              note: 'Boeing appeared across seven transactions with timing that drew attention after the announcement.',
            },
            { value: 'same', note: 'A 200-aircraft order directly benefits Boeing.' },
            { value: 'none', note: 'No separate public endorsement disclosed.' },
          ],
        },
        {
          label: 'Palantir',
          cells: [
            {
              value: 'part',
              note: 'Ongoing federal defense and intelligence spending rather than a discrete action.',
            },
            { value: 'none', note: 'No specific transaction date highlighted in the coverage.' },
            {
              value: 'same',
              note: 'A direct beneficiary of federal defense and intelligence spending.',
            },
            { value: 'none', note: 'No public endorsement disclosed.' },
          ],
        },
      ],
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
