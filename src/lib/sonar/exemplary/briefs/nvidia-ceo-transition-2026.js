/**
 * Exemplary brief: "How will Jensen Huang's resignation affect NVIDIA and the
 * chip industry?" (Nov 16, 2026).
 *
 * A hand-reviewed answer in the evidence-led Sonar response format. Every
 * factual line is tied to a primary source below, each read on Nov 16, 2026:
 *   S1  NVIDIA Form 8-K, event date Nov 11, 2026, signed Nov 12, 2026
 *   S2  NVIDIA press release "NVIDIA Announces CEO Transition", Nov 12, 2026
 *   S3  NVIDIA Q2 fiscal 2027 results release, Aug 26, 2026
 * Lines that are interpretation say so. There is no price data in this file:
 * the chart is drawn from the shared daily price helper at view time.
 *
 * This answer is dated. It describes the position as of `verifiedAsOf`; it
 * should be re-reviewed after NVIDIA's Nov 17, 2026 results (see `reviewAfter`).
 */
export const NVIDIA_CEO_TRANSITION_2026 = {
  slug: 'nvidia-ceo-transition-2026',
  version: 2,
  template: 'event_impact',
  verifiedAsOf: '2026-11-16',
  reviewAfter: '2026-11-17',
  question: 'How will Jensen Huang’s resignation affect NVIDIA and the chip industry?',
  /* Other ways the same question is asked. Used by the matcher and embedded
     with the question for retrieval; never shown. */
  variants: [
    'how will jensen huangs resignation effect nvidia and the chip industry',
    'what does jensen huang resigning mean for nvidia and semiconductor stocks',
    'impact of jensen huang resignation on nvidia and the semiconductor industry',
    'how does jensen huang stepping down affect nvidia and chip stocks',
    'what happens to nvidia and the chip sector after jensen huang resigns',
    'jensen huang resignation impact on nvidia and chip industry',
    'effect of nvidia ceo jensen huang leaving on nvidia and chipmakers',
  ],
  /* What a ping must be about before this brief can be served at all. */
  concepts: {
    person: ['huang', 'jensen'],
    event: ['resign', 'resignation', 'depart', 'departure', 'exit', 'leave', 'quit', 'out'],
  },
  entities: { subject: 'NVIDIA', tickers: ['NVDA'], people: ['Jensen Huang', 'Colette Kress'] },

  headline: 'NVIDIA faces leadership uncertainty, but the investment impact depends on execution',
  deck: 'Jensen Huang resigned as NVIDIA’s chief executive effective November 11, 2026. The company named CFO Colette Kress interim CEO and began a permanent successor search. The immediate market question is whether investor confidence and strategic execution change, rather than whether AI-chip demand has already disappeared.',
  provenance: [
    'Official event confirmed',
    'Company filing + press release',
    'Research as of Nov 16, 2026',
  ],
  sourcesLabel: '3 primary sources cited',

  takeaways: [
    {
      kicker: 'Succession',
      title: 'Leadership transition is confirmed',
      text: 'NVIDIA’s Form 8-K records Huang’s departure and Kress’s interim appointment. The board is seeking a permanent successor.',
      cites: ['S1', 'S2'],
    },
    {
      kicker: 'Operations',
      title: 'Continuity is the board’s stated plan',
      text: 'The board expects customer commitments and its product roadmap to continue. This is a company statement, not proof that execution risks are resolved.',
      cites: ['S2'],
    },
    {
      kicker: 'Industry',
      title: 'Spillovers depend on orders, not headlines alone',
      text: 'Suppliers and rival chipmakers may experience changing sentiment. Actual revenue effects need evidence of demand, orders, or share shifts.',
      note: 'Analyst interpretation',
      cites: [],
    },
  ],

  /* Sonar's own reading of the takeaways. Each paragraph says what it rests on; the last
     sentence of the third is interpretation and is worded as such. */
  analysis: [
    {
      text: 'The company\u2019s own disclosures confirm three things: the departure, the interim appointment and a search for a permanent chief executive. The filing and the announcement reviewed here do not name a permanent successor.',
      cites: ['S1', 'S2'],
    },
    {
      text: 'The business going into the change was growing quickly: revenue of $96.2B in the most recently reported quarter, $89.0B of it from Data Center, with a third-quarter revenue outlook of $108B. Those figures predate the resignation, so they describe the starting point and not the effect.',
      cites: ['S3'],
    },
    {
      text: 'The first dated test is the fiscal third-quarter report scheduled for November 17, where results, guidance and management commentary can show whether the outlook has moved. Until then a view on the shares rests on interpretation, not on evidence that demand has changed.',
      cites: ['S2'],
    },
  ],

  chart: {
    kicker: 'Market context',
    title: 'NVIDIA vs. semiconductor sector',
    subject: { symbol: 'NVDA', label: 'NVIDIA (NVDA)' },
    benchmark: { symbol: 'SOXX', label: 'Semiconductor ETF (SOXX)' },
    event: { date: '2026-11-11', label: 'CEO change' },
    defaultRange: '3M',
  },

  timeline: [
    {
      date: '2026-11-11',
      icon: 'bi-box-arrow-right',
      title: 'Resignation effective',
      text: 'NVIDIA’s board accepted Huang’s resignation as president, CEO and director. It appointed Colette Kress interim CEO.',
      cites: ['S1'],
    },
    {
      date: '2026-11-12',
      icon: 'bi-megaphone',
      title: 'Company announcement',
      text: 'NVIDIA publicly announced the leadership transition and said its board had begun a search for a permanent CEO.',
      cites: ['S2'],
    },
    {
      date: '2026-11-17',
      icon: 'bi-calendar-event',
      title: 'Next scheduled financial results',
      text: 'The company is scheduled to report fiscal Q3 results. Guidance and customer commentary may clarify whether the transition affects operations.',
      cites: ['S2'],
    },
  ],

  interpretation: [
    {
      icon: 'bi-arrow-up-right',
      title: 'Near term: valuation and confidence',
      text: 'A founder-led company can face higher uncertainty while investors evaluate its next leadership structure. This is a risk channel, not a measured price forecast.',
      detail:
        'Huang led NVIDIA for 33 years, so there is no record of the company under another chief executive to reason from. In that position investors can widen the range of outcomes they consider until the board names a permanent leader, which may show up as larger price swings without any change in the underlying business. This describes how risk could travel. It says nothing about direction or size.',
      cites: ['S2'],
    },
    {
      icon: 'bi-diamond-half',
      title: 'Medium term: product roadmap execution',
      text: 'The key test is whether product schedules, customer relationships, and growth targets remain intact under interim leadership.',
      detail:
        'The interim CEO is also the finance chief and has held that post since 2013, which gives continuity on reporting and on the numbers the company guides to. Product and technology direction is the open part: it now sits with a leadership team working without its founder. The evidence that would settle it is concrete: whether announced product schedules hold, whether large customers restate their commitments, and whether guidance is maintained.',
      cites: ['S2'],
    },
    {
      icon: 'bi-diamond',
      title: 'Sector effects: uneven',
      text: 'Suppliers depend on actual customer orders. Competitors may see investor interest, but no competitive share shift has been established by this event alone.',
      detail:
        'A leadership change at a company of NVIDIA\u2019s weight can move sentiment across semiconductor shares in the same sessions, because the group often trades together. Revenue is a slower and separate matter. Foundries and component suppliers are affected only if NVIDIA\u2019s orders change, and rivals gain only if customers move purchases. Neither is reported in the sources reviewed here.',
      cites: [],
    },
  ],

  impact: {
    title: 'Where the impact could travel',
    note: 'Analyst framework · Not predicted returns',
    rows: [
      {
        exposure: 'NVDA',
        role: 'direct',
        channel: 'CEO succession, customer confidence, roadmap continuity, valuation sensitivity',
        evidence: 'New CEO, guidance, product launch schedule, customer disclosures',
        assessment: 'Event confirmed',
        confirmed: true,
      },
      {
        exposure: 'SOXX',
        role: 'sector',
        channel: 'Broad semiconductor risk appetite and AI infrastructure positioning',
        evidence: 'Sector-relative prices, dispersion, ETF flows',
        assessment: 'Requires market series',
      },
      {
        exposure: 'TSMC',
        role: 'supplier',
        channel: 'NVIDIA production and manufacturing demand',
        evidence: 'Verified order changes, foundry guidance, capacity plans',
        assessment: 'No change established',
      },
      {
        exposure: 'AMD / AVGO',
        role: 'peers',
        channel: 'Potential opportunity if competitors win business or sentiment shifts',
        evidence: 'Customer wins, AI revenue revisions, credible channel checks',
        assessment: 'Scenario only',
      },
    ],
  },

  baseline: {
    title: 'Operating baseline before the transition',
    note: 'Most recently reported quarter · Q2 FY2027',
    cite: 'S3',
    cells: [
      { label: 'Revenue', value: '$96.2B', sub: '+106% year over year' },
      { label: 'Data Center revenue', value: '$89.0B', sub: '+117% year over year' },
      { label: 'Prior Q3 revenue outlook', value: '$108B', sub: '±2% · issued Aug 26' },
      { label: 'Next scheduled report', value: 'NOV 17', sub: 'Fiscal Q3 2027 results' },
    ],
    footnote:
      'Earlier operating figures describe the company’s pre-transition business. They are not evidence of future growth or cancellation risk.',
  },

  watchpoints: [
    'CEO search timetable and the incoming leader’s authority over product strategy.',
    'Fiscal Q3 results, guidance, and any change to customer spending commentary.',
    'GPU roadmap milestones, supply commitments, and foundry capacity plans.',
    'Export-control changes, geographic restrictions, and customer order exposure.',
  ],

  sources: [
    {
      id: 'S1',
      title: 'SEC Form 8-K',
      detail: 'Leadership change, effective date and interim CEO',
      date: '2026-11-12',
      url: 'https://www.sec.gov/Archives/edgar/data/1045810/000104581026000082/nvda-20261111.htm',
    },
    {
      id: 'S2',
      title: 'NVIDIA · CEO transition',
      detail: 'Corporate announcement and outlook for continuity',
      date: '2026-11-12',
      url: 'https://nvidianews.nvidia.com/news/nvidia-announces-ceo-transition',
    },
    {
      id: 'S3',
      title: 'NVIDIA · Q2 fiscal 2027 results',
      detail: 'Revenue, data-center performance and prior guidance',
      date: '2026-08-26',
      url: 'https://investor.nvidia.com/news/press-release-details/2026/NVIDIA-Announces-Financial-Results-for-Second-Quarter-Fiscal-2027/',
    },
  ],

  followUp: {
    placeholder:
      'Ask a follow-up about the CEO transition, valuation, supply chain, or competitive effects…',
    related: [
      'How could this affect NVIDIA’s next earnings call?',
      'Which chip suppliers have the most exposure?',
      'What would change the thesis?',
    ],
  },
};
