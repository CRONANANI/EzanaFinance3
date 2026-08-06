/**
 * Long-form Ezana Echo article: Public Citizen's "Ballroom Billions" report and
 * the contract flows to White House ballroom donors.
 *
 * SOURCING NOTE: All findings attributed to Public Citizen's "Ballroom Billions"
 * report (June 4, 2026) and per-company figures as reported by Fortune
 * (June 9, 2026) and The Washington Post (June 4, 2026). Public Citizen is an
 * advocacy organization; the White House disputes the report's framing. The
 * report establishes timing and correlation, not a proven quid pro quo. Any
 * edit to the figures below must be re-verified against the primary report at
 * citizen.org/article/ballroom-billions/.
 */
export const ballroomDonorsContracts2026 = {
  id: 'ballroom-donors-federal-contracts-2026',
  title:
    'Ballroom Billions: The $50B in Federal Contracts That Followed the White House Donor List',
  excerpt:
    'Public Citizen found that 14 of 27 known corporate donors to the $400 million White House ballroom won more than $50 billion in new or expanded federal contracts in six months. Lockheed Martin took $43.8 billion of it. The concentration is the story — and the disclosure gap is the reason it matters.',
  heroImage: {
    src: '/echo/trumpkushner.jpg',
    alt: 'Jared Kushner in the foreground with President Trump speaking, slightly out of focus, at a White House meeting',
    caption:
      'The White House has disclosed 21 corporate ballroom donors; news outlets identified six more. The funding agreement permits donors to remain anonymous.',
  },
  contentBlocks: [
    {
      type: 'paragraph',
      text: 'Fourteen of the 27 publicly known corporate donors to President Trump’s $400 million White House ballroom project received new or expanded federal contracts worth more than $50 billion in the six months following the East Wing’s demolition, according to a June 4, 2026 report from the watchdog group Public Citizen. The report, titled Ballroom Billions, examined 21 donors disclosed by the White House plus six more identified independently by news organizations. A single company — Lockheed Martin — accounted for roughly $43.8 billion of that total, or about 87% of the six-month figure. The remaining thirteen donors split the balance, and the distribution among them is steeper than the headline suggests.',
    },
    {
      type: 'stat-grid',
      stats: [
        { label: 'New contracts, 6 months', value: '$50B+', change: '14 of 27 donors' },
        { label: 'Lockheed Martin share', value: '$43.8B', change: '~87% of the 6-month total' },
        { label: 'All contracts, 5.5 years', value: '$338B', change: '19 of 27 donors' },
        {
          label: 'Donors facing enforcement',
          value: '16 of 27',
          change: 'Actions active or suspended',
        },
        { label: 'Ballroom project cost', value: '$400M', change: 'Privately funded' },
      ],
    },
    {
      type: 'heading',
      text: 'What the report actually measures',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The distinction between the report’s two headline numbers matters more than either in isolation. The $50 billion figure covers new or increased contract obligations over a six-month window beginning with the October 2025 East Wing demolition. The separate $338 billion figure covers all federal contracts held by 19 of the 27 donors over five and a half years. Lockheed’s $43.8 billion is 87% of the first number and roughly 13% of the second. Coverage that cites the $43.8 billion against the wrong denominator overstates a concentration that is already striking on its own terms.',
    },
    {
      type: 'paragraph',
      text: 'Public Citizen obtained the ballroom funding agreement through a Freedom of Information Act lawsuit. The contract, signed between the White House, the National Park Service, and the Trust for the National Mall, permits donors to remain anonymous. The 27 companies in the analysis are therefore a floor, not a complete list — the White House disclosed 21, reporters identified six more, and an unknown number remain undisclosed. Fifteen individual and family foundation donors have also been named. No donation amounts have been made public for any donor, which means the report can measure contracts received but cannot compute a return on any individual contribution.',
    },
    {
      type: 'callout',
      label: 'The disclosure gap',
      value: '0 of 27',
      context:
        'Not one corporate donor’s contribution amount has been disclosed. Contract awards are public via USAspending; the donations are not. The asymmetry is the entire analytical problem.',
    },
    {
      type: 'heading',
      text: 'The concentration is extreme, and it is mostly one company',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Ranking the disclosed recipients makes the shape of the distribution clear. Lockheed Martin’s $43.8 billion is followed by Booz Allen Hamilton at roughly $4.2 billion and Palantir at just over $1 billion. Below that, the figures fall off a cliff: Microsoft at $318.7 million, Amazon at $255.7 million, HP at $197.3 million, Caterpillar at $142.6 million, Alphabet at $16.4 million, and Comcast at $13.4 million. Caterpillar’s total is approximately 0.3% of Lockheed’s. Treating these companies as a single bloc of comparable beneficiaries, as much of the social coverage has, obscures that this is one very large defense award and a long tail of ordinary federal IT and equipment business.',
    },
    {
      type: 'clearing-sankey',
      figureLabel: 'FIG. 1 · NEW CONTRACTS BY BALLROOM DONOR',
      kicker:
        'NEW OR EXPANDED FEDERAL CONTRACTS TO NINE DISCLOSED-RECIPIENT DONORS · SIX-MONTH WINDOW AFTER THE OCTOBER 2025 EAST WING DEMOLITION · RIBBON WIDTH = CONTRACT VALUE ($M) · LOCKHEED IS ROUGHLY 307× CATERPILLAR. CLICK A RIBBON FOR THE RECORD.',
      hint: 'Click a ribbon for its per-company figure.',
      source:
        'Public Citizen, "Ballroom Billions," June 4, 2026; per-company figures as reported by Fortune, June 9, 2026.',
      sourceGroups: [
        {
          label: 'Top three recipients',
          nodes: [
            { id: 'lmt', name: 'Lockheed Martin', display: '$43.8B' },
            { id: 'bah', name: 'Booz Allen Hamilton', display: '$4.2B' },
            { id: 'pltr', name: 'Palantir', display: '$1.0B' },
          ],
        },
        {
          label: 'The long tail — below the cliff',
          nodes: [
            { id: 'msft', name: 'Microsoft', display: '$318.7M' },
            { id: 'amzn', name: 'Amazon', display: '$255.7M' },
            { id: 'hpq', name: 'HP', display: '$197.3M' },
            { id: 'cat', name: 'Caterpillar', display: '$142.6M' },
            { id: 'googl', name: 'Alphabet', display: '$16.4M' },
            { id: 'cmcsa', name: 'Comcast', display: '$13.4M' },
          ],
        },
      ],
      destinations: [
        {
          id: 'contracts',
          name: 'New / expanded federal contracts',
          sub: '$50B+ total · 14 of 27 donors · 6-mo window',
        },
      ],
      flows: [
        {
          from: 'lmt',
          to: 'contracts',
          value: 43800,
          tone: 'primary',
          label: '$43.8B',
          record:
            'Lockheed Martin accounted for roughly $43.8 billion — about 87% of the six-month total, and roughly 13% of the $338 billion five-and-a-half-year figure. A $43.8B obligation recorded in a six-month window does not mean $43.8B was spent in six months, nor that the award decision was made in that window.',
        },
        {
          from: 'bah',
          to: 'contracts',
          value: 4200,
          tone: 'primary',
          label: '$4.2B',
          record:
            'Booz Allen Hamilton at roughly $4.2 billion — the second-largest disclosed recipient.',
        },
        {
          from: 'pltr',
          to: 'contracts',
          value: 1000,
          tone: 'neutral',
          record: 'Palantir at just over $1 billion. Below this, the figures fall off a cliff.',
        },
        {
          from: 'msft',
          to: 'contracts',
          value: 318.7,
          tone: 'neutral',
          record:
            'Microsoft at $318.7 million — the top of the long tail of ordinary federal IT business.',
        },
        {
          from: 'amzn',
          to: 'contracts',
          value: 255.7,
          tone: 'neutral',
          record: 'Amazon at $255.7 million.',
        },
        {
          from: 'hpq',
          to: 'contracts',
          value: 197.3,
          tone: 'neutral',
          record: 'HP at $197.3 million.',
        },
        {
          from: 'cat',
          to: 'contracts',
          value: 142.6,
          tone: 'neutral',
          record: 'Caterpillar at $142.6 million — approximately 0.3% of the Lockheed total.',
        },
        {
          from: 'googl',
          to: 'contracts',
          value: 16.4,
          tone: 'neutral',
          record: 'Alphabet at $16.4 million.',
        },
        {
          from: 'cmcsa',
          to: 'contracts',
          value: 13.4,
          tone: 'neutral',
          record: 'Comcast at $13.4 million.',
        },
      ],
    },
    {
      type: 'paragraph',
      text: 'The Lockheed figure also deserves scrutiny on its own terms. Large defense awards are typically indefinite-delivery vehicles with ceiling values spanning many years, and they move through multi-year source-selection processes that begin long before any given quarter. A $43.8 billion obligation recorded in a six-month window does not mean $43.8 billion was spent in six months, nor that the award decision was made in that window. Any serious reading of the number has to separate the obligation date from the procurement timeline that produced it.',
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 2 · THE DISCLOSED RECIPIENTS',
      kicker:
        'DONOR · WHAT THE REPORT SHOWS · CONTRACT ANCHOR (SIX-MONTH WINDOW) · READING CAVEAT · THE REPORT ESTABLISHES TIMING AND CORRELATION, NOT A PROVEN QUID PRO QUO. CLICK A ROW FOR THE RECORD.',
      hint: 'Six disclosed recipients — expand a row for the record.',
      source:
        'Public Citizen, "Ballroom Billions," June 4, 2026; per-company figures as reported by Fortune, June 9, 2026.',
      headers: ['Donor', 'What the report shows', 'Contract anchor', 'Reading caveat', ''],
      rows: [
        {
          name: 'Lockheed Martin',
          tag: 'DEFENSE',
          role: 'The single very large defense award — roughly 87% of the six-month total.',
          anchor: '$43.8B new / expanded',
          keyRisk:
            'Large defense awards are multi-year indefinite-delivery vehicles; the obligation date is not the award decision or the spend.',
          dossier: [
            {
              label: 'Share of totals',
              text: 'About 87% of the $50B six-month figure; roughly 13% of the $338B five-and-a-half-year figure.',
            },
            {
              label: 'Enforcement finding',
              text: 'The report cites a labor-rights case involving Lockheed Martin among the enforcement matters.',
            },
          ],
        },
        {
          name: 'Booz Allen Hamilton',
          tag: 'SECOND',
          role: 'The second-largest disclosed recipient, one order of magnitude below Lockheed.',
          anchor: '$4.2B new / expanded',
          keyRisk:
            'Award timelines run on multi-year cycles that begin long before any donation window.',
          dossier: [
            {
              label: 'Position',
              text: 'Second on the disclosed list, at roughly a tenth of the Lockheed figure.',
            },
          ],
        },
        {
          name: 'Palantir',
          tag: 'THIRD',
          role: 'Just over $1 billion — the last recipient before the figures fall off a cliff.',
          anchor: '$1.0B new / expanded',
          keyRisk:
            'Below this point the list becomes a long tail of ordinary federal IT and equipment business.',
          dossier: [
            {
              label: 'Position',
              text: 'Marks the edge of the cliff in the distribution of contract values.',
            },
          ],
        },
        {
          name: 'Microsoft',
          tag: 'LONG TAIL',
          role: 'Top of the long tail of ordinary federal IT business.',
          anchor: '$318.7M new / expanded',
          keyRisk:
            'With no contribution amounts, award probability cannot be distinguished from that of non-donors.',
          dossier: [
            {
              label: 'Context',
              text: 'Part of the long tail of ordinary federal IT and equipment awards below the top three.',
            },
          ],
        },
        {
          name: 'Amazon',
          tag: 'LONG TAIL',
          role: 'Long-tail federal IT recipient also named in the enforcement finding.',
          anchor: '$255.7M new / expanded',
          keyRisk:
            'The report cites an antitrust matter involving Amazon where actions have been dropped or narrowed.',
          dossier: [
            {
              label: 'Enforcement finding',
              text: 'Named among antitrust matters alongside Apple, Meta, and Nvidia.',
            },
          ],
        },
        {
          name: 'Alphabet',
          tag: 'LONG TAIL',
          role: 'Near the bottom of the disclosed list, and named in the enforcement finding.',
          anchor: '$16.4M new / expanded',
          keyRisk: 'The report cites a labor-rights case involving Alphabet.',
          dossier: [
            {
              label: 'Enforcement finding',
              text: 'Named among labor-rights cases alongside Lockheed Martin and Meta.',
            },
          ],
        },
      ],
    },
    {
      type: 'heading',
      text: 'The enforcement finding is the less-reported half',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Public Citizen’s second finding drew less attention than the contract totals but is arguably harder to explain through procurement mechanics. Sixteen of the 27 donors are facing federal enforcement actions or have seen such actions suspended under the current administration. The report cites antitrust matters involving Amazon, Apple, Meta, and Nvidia; labor rights cases involving Alphabet, Lockheed Martin, and Meta; and securities matters involving Coinbase and Ripple, where cases have been dropped or narrowed. Unlike contract awards, enforcement decisions do not run on published multi-year cycles, which makes their timing more difficult to attribute to process.',
    },
    {
      type: 'paragraph',
      text: 'This finding builds on Public Citizen’s November 2025 report, Banquet of Greed, which documented $279 billion in federal contracts held by known donors at that time. The June 2026 update raises the five-and-a-half-year cumulative figure to $338 billion. The trajectory between the two reports is itself a data point: the donor group’s aggregate federal business has grown across both the contract and enforcement dimensions over the intervening seven months.',
    },
    {
      type: 'wall-timeline',
      figureLabel: 'FIG. 3 · THE REPORTING CHRONOLOGY',
      kicker:
        '2025.75–2026.42 (OCT 2025 – JUN 2026) · TWO PUBLIC CITIZEN REPORTS BOOKEND THE SIX-MONTH CONTRACT WINDOW — CLICK ANY PLAQUE FOR THE RECORD.',
      hint: 'Click a plaque for its record.',
      source:
        'Public Citizen, "Banquet of Greed" (November 2025) and "Ballroom Billions" (June 4, 2026).',
      startYear: 2025,
      endYear: 2026,
      windows: [
        {
          id: 'w1',
          label: 'Six-month contract window',
          from: 2025.75,
          to: 2026.29,
          color: 'var(--echo-chart-blue)',
        },
      ],
      plaques: [
        {
          year: 2025.75,
          lane: 0,
          label: 'Oct 2025 · East Wing demolition',
          detail:
            'The six-month contract window opens with the demolition of the East Wing for the $400 million privately funded ballroom project.',
        },
        {
          year: 2025.87,
          lane: 1,
          label: 'Nov 2025 · "Banquet of Greed"',
          detail:
            'Public Citizen documents $279 billion in federal contracts held by known ballroom donors at that time.',
        },
        {
          year: 2026.42,
          lane: 2,
          label: 'Jun 4, 2026 · "Ballroom Billions"',
          detail:
            'The update finds 14 of 27 donors won more than $50 billion in new or expanded contracts over six months, raises the five-and-a-half-year cumulative figure to $338 billion, and reports that 16 of 27 donors face active or suspended federal enforcement.',
        },
      ],
    },
    {
      type: 'heading',
      text: 'What the report does not establish',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'Public Citizen is an advocacy organization, and Ballroom Billions is framed as a conflict-of-interest finding rather than a neutral audit. The report documents timing and correlation. It does not present evidence of a quid pro quo, and no public evidence currently establishes that any contract was awarded in exchange for a ballroom donation. Because no donation amounts have been disclosed, the report also cannot compute the rate of return its authors reference. Report co-author Jon Golinger acknowledged this limitation directly in comments to Fortune, noting that the actual contribution figures are unknown.',
    },
    {
      type: 'quote',
      text: 'This smells rotten; it looks bad. The American people, from all polling and all other metrics, think that a huge amount of corporate money going to the ballroom, and then those companies seeking or receiving benefits, is a problem.',
      source: 'Jon Golinger, Public Citizen, quoted in Fortune, June 9, 2026',
    },
    {
      type: 'paragraph',
      text: 'The White House rejected the report’s framing. Spokesman Davis Ingle said the donors represent a range of American companies and individuals contributing to improve the building, and pushed back on the suggestion that donations and contract awards are linked, noting that critics would also object if taxpayers were funding the project. That response does not address the enforcement finding, and the administration has not released donation amounts that would allow the pay-to-play question to be tested empirically either way.',
    },
    {
      type: 'heading',
      text: 'Reading this as a disclosure problem, not a scandal',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The structural issue underneath the report is an asymmetry in what is public. Federal contract obligations are disclosed in granular detail through USAspending.gov — award identifiers, agency, recipient, obligation dates, and modification history are all queryable. Political and quasi-political contributions of this kind are not subject to comparable disclosure, and in this case a negotiated agreement affirmatively permits anonymity. That mismatch is what forces analysts into correlation arguments: one side of the ledger is fully instrumented and the other is dark.',
    },
    {
      type: 'paragraph',
      text: 'For investors, the practical consequence is that the donor list is not a usable signal. Fourteen companies received new contracts; thirteen did not, from the same disclosed group. With no contribution amounts, no way to distinguish donors from non-donors on award probability, and award decisions that predate the donation window, there is no tradeable edge in the list itself. The analytically honest position is that this is a governance and transparency story first, and a markets story only insofar as it affects the regulatory posture of the named companies.',
    },
    {
      type: 'heading',
      text: 'Where the durable signal actually lives',
      level: 2,
    },
    {
      type: 'paragraph',
      text: 'The contract data underlying the report is public and continuously updated, which means the pattern can be monitored rather than relitigated each time a watchdog publishes. Award-level federal contract data covering fiscal years 2008 through 2026 spans roughly 68 million records, and the meaningful patterns tend to sit below the headline awards — in agency-vendor concentration, in the frequency of sub-$1 million awards to a repeat recipient, and in modification activity that expands a vehicle’s ceiling without a new competition. Those are the dimensions where an anomaly is genuinely anomalous rather than a function of a large program hitting a milestone.',
    },
    {
      type: 'paragraph',
      text: 'The base case is that most of the $50 billion resolves into ordinary procurement on examination, with the Lockheed award tracing to a program of record with a multi-year selection history. The bear case for the companies involved is not contract clawback but regulatory whiplash: sixteen of the 27 have active or suspended enforcement matters, and suspended matters can resume. That is a real risk to model for the named tickers, and it is independent of whether any donation influenced any award. Ezana’s government contracts dataset and Inside the Capitol coverage track both sides — award flows and the disclosure record — so the correlation can be checked against the underlying obligations rather than taken from a summary.',
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 4 · HOW TO READ THE FLOWS',
      kicker:
        'POSITIONING CASE · GATE × DRIVER → OUTCOME · TWO SCENARIOS FROM THE ARTICLE · THE REPORT DOCUMENTS TIMING AND CORRELATION, NOT A PROVEN QUID PRO QUO.',
      hint: "Scenarios drawn from the article's closing section.",
      source: 'this article\'s reporting; Public Citizen, "Ballroom Billions," June 4, 2026.',
      scenarios: [
        {
          id: 'base',
          label: 'BASE CASE',
          tone: 'base',
          range: 'Ordinary procurement',
          steps: [
            {
              label: 'Examine the obligations',
              sub: 'award-level USAspending data, FY2008–2026',
            },
            {
              label: 'Lockheed = program of record',
              sub: 'multi-year source-selection history predating the window',
            },
          ],
          result: {
            value: 'Most of the $50B resolves',
            sub: 'into ordinary procurement on examination',
          },
        },
        {
          id: 'bear',
          label: 'BEAR CASE',
          tone: 'bear',
          range: 'Regulatory whiplash',
          steps: [
            {
              label: '16 of 27 donors',
              sub: 'active or suspended federal enforcement matters',
            },
            {
              label: 'Suspended matters resume',
              sub: 'antitrust, labor, and securities cases reopen',
            },
          ],
          result: {
            value: 'Regulatory re-rating',
            sub: 'a real risk to the named tickers, independent of any donation',
          },
        },
      ],
      killSwitch:
        'IF DONATION AMOUNTS ARE DISCLOSED, THE PAY-TO-PLAY QUESTION BECOMES TESTABLE — UNTIL THEN, 0 OF 27 CONTRIBUTIONS ARE PUBLIC AND THE DONOR LIST IS NOT A TRADEABLE SIGNAL.',
    },
  ],
  author: 'Ezana Finance Editorial',
  category: 'politics-policy',
  subcategory: 'Congress',
  tags: ['policy', 'regulation', 'markets', 'companies', 'macro'],
  meta: {
    sectors: ['Industrials'],
    industries: ['Aerospace & Defense'],
    institutions: ['Lockheed Martin'],
    government: ['White House', 'GSA'],
    geos: ['United States'],
    assetClasses: ['Equities'],
    themes: ['Political Money', 'Government Contracting'],
    datasets: ['USAspending', 'Campaign finance'],
    markets: [],
  },
  tickers: ['LMT', 'BAH', 'PLTR', 'MSFT', 'AMZN', 'HPQ', 'CAT', 'GOOGL', 'CMCSA'],
  entities: {
    people: [],
    terms: [],
  },
  readTime: 9,
  publishedAt: '2026-07-23',
  // Featured hero + Article of the Month relinquished to the Johnny Mnemonic
  // consolidation story (only one home-page featured hero at a time); Ballroom
  // remains in its column and in AOTM_HISTORY (July 2026).
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  listMeta: '23 Jul 2026',
};
