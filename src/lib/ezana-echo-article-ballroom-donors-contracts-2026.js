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
        { label: 'Donors facing enforcement', value: '16 of 27', change: 'Actions active or suspended' },
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
      type: 'chart',
      variant: 'horizontal-bar',
      title: 'New or expanded federal contracts by ballroom donor',
      caption:
        'Six-month window following the October 2025 East Wing demolition, in millions of USD. The spread is severe: Lockheed Martin is roughly 307x Caterpillar. Source: Public Citizen, "Ballroom Billions," June 4, 2026; per-company figures as reported by Fortune, June 9, 2026.',
      data: [
        { x: 'Lockheed Martin', value: 43800 },
        { x: 'Booz Allen Hamilton', value: 4200 },
        { x: 'Palantir', value: 1000 },
        { x: 'Microsoft', value: 318.7 },
        { x: 'Amazon', value: 255.7 },
        { x: 'HP', value: 197.3 },
        { x: 'Caterpillar', value: 142.6 },
        { x: 'Alphabet', value: 16.4 },
        { x: 'Comcast', value: 13.4 },
      ],
      series: [
        { key: 'value', label: 'New/expanded contracts ($M)', color: 'var(--echo-chart-blue, #3b82f6)' },
      ],
      yLabel: 'USD, millions',
    },
    {
      type: 'paragraph',
      text: 'The Lockheed figure also deserves scrutiny on its own terms. Large defense awards are typically indefinite-delivery vehicles with ceiling values spanning many years, and they move through multi-year source-selection processes that begin long before any given quarter. A $43.8 billion obligation recorded in a six-month window does not mean $43.8 billion was spent in six months, nor that the award decision was made in that window. Any serious reading of the number has to separate the obligation date from the procurement timeline that produced it.',
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
  ],
  author: 'Ezana Finance Editorial',
  category: 'inside-the-capitol',
  tags: ['policy', 'regulation', 'markets', 'companies', 'macro'],
  tickers: ['LMT', 'BAH', 'PLTR', 'MSFT', 'AMZN', 'HPQ', 'CAT', 'GOOGL', 'CMCSA'],
  entities: {
    people: [],
    terms: [],
  },
  readTime: 9,
  publishedAt: '2026-07-23',
  // Featured hero relinquished to the newer FDA-peptides story (only one
  // home-page featured hero at a time).
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  listMeta: '23 Jul 2026',
};
