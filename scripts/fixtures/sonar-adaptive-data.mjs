/**
 * FIXTURE DATA for the adaptive research tests and screenshots. Nothing here
 * is real market data, a real model reply or a real prediction market, and
 * none of it ships to a reader: it exists so the orchestrator can be run with
 * every source faked.
 */

/* 420 deterministic daily bars ending 2026-11-16 (weekdays only). */
export function fixtureBars({ end = '2026-11-16', n = 420, base = 180, drop = true } = {}) {
  const out = [];
  let d = new Date(`${end}T00:00:00Z`);
  const days = [];
  while (days.length < n) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) days.push(d.toISOString().slice(0, 10));
    d = new Date(d.getTime() - 86400000);
  }
  days.reverse();
  let prev = base;
  days.forEach((date, i) => {
    const drift = 1 + 0.0009 * i + 0.05 * Math.sin(i / 11) + 0.03 * Math.sin(i / 3.7);
    /* A late slide, so the fixture has an oversold reading to assert on. */
    const slide = drop && i > n - 12 ? 1 - 0.022 * (i - (n - 12)) : 1;
    const close = Number((base * drift * slide).toFixed(2));
    const open = Number(((prev + close) / 2).toFixed(2));
    const high = Number((Math.max(open, close) * 1.012).toFixed(2));
    const low = Number((Math.min(open, close) * 0.988).toFixed(2));
    out.push({
      date,
      open,
      high,
      low,
      close,
      volume: Math.round(40e6 + 15e6 * Math.sin(i / 5) + (slide < 1 ? 30e6 : 0)),
    });
    prev = close;
  });
  return out;
}

export const FIXTURE_WEB_RESULTS = [
  {
    url: 'https://www.sec.gov/Archives/edgar/data/0000000/example-8k.htm',
    title: 'Form 8-K (fixture)',
  },
  {
    url: 'https://investor.example.com/news/ceo-transition',
    title: 'Company announces CEO transition (fixture)',
  },
  {
    url: 'https://www.reuters.com/business/example-board-weighs-candidates',
    title: 'Board weighs candidates (fixture)',
  },
  { url: 'https://randomblog.example.net/my-hot-take', title: 'My hot take (fixture)' },
];

/* A model reply as the validator receives it: includes things that must be removed. */
export const FIXTURE_SUCCESSION_REPLY = JSON.stringify({
  company: 'Example Corp',
  ticker: 'EXMP',
  industry: 'Semiconductors',
  headline: 'No permanent successor has been named; an interim CEO is in place (fixture)',
  answer:
    'The company says its finance chief is serving as interim CEO while the board runs a search. One outside executive has been named in reporting as under consideration. No appointment has been announced.',
  event: {
    status: 'event_verified',
    summary: 'The board accepted the resignation and appointed an interim CEO (fixture).',
    effectiveDate: '2026-11-11',
    announcedDate: '2026-11-12',
    interim: { name: 'Pat Fixture', role: 'Interim CEO and CFO' },
    permanentSuccessor: null,
    searchStatus: 'Board search under way, internal and external candidates',
    sourceUrls: [
      'https://www.sec.gov/Archives/edgar/data/0000000/example-8k.htm',
      'https://investor.example.com/news/ceo-transition',
    ],
  },
  candidates: [
    {
      name: 'Morgan Sample',
      currentRole: 'Chief executive of another chip company',
      basis: 'reported',
      reason: 'Named in reporting as under consideration by the board.',
      caveat: 'The company has not commented.',
      sourceUrls: ['https://www.reuters.com/business/example-board-weighs-candidates'],
    },
    {
      /* No retrieved link: must be dropped. */
      name: 'Riley Invented',
      currentRole: 'Senior vice president',
      basis: 'reported',
      reason: 'Works at the company.',
      sourceUrls: ['https://made-up.example.org/never-retrieved'],
    },
    {
      /* Speculation is not a basis: must be dropped. */
      name: 'Casey Guess',
      currentRole: 'Board member',
      basis: 'speculative',
      reason: 'Seems plausible.',
      sourceUrls: ['https://www.reuters.com/business/example-board-weighs-candidates'],
    },
  ],
  timeline: [
    {
      date: '2026-11-11',
      title: 'Resignation effective',
      text: 'Board accepts resignation.',
      sourceUrls: ['https://www.sec.gov/Archives/edgar/data/0000000/example-8k.htm'],
    },
    {
      date: 'last Tuesday',
      title: 'Undated item',
      text: 'Must be dropped.',
      sourceUrls: ['https://investor.example.com/news/ceo-transition'],
    },
  ],
  scenarios: [
    { title: 'Internal appointment', text: 'The board confirms the interim leader.' },
    { title: 'External hire', text: 'The search ends with an outside executive.' },
  ],
  watch: ['The board’s stated timetable.'],
  followups: [
    'Who will replace the CEO at Example Corp?',
    'What is the board’s stated timetable for the search?',
  ],
});

const row = (o) => ({
  market_id: 'm1',
  platform: 'polymarket',
  question: 'Who will be the next CEO of Example Corp?',
  description: 'Resolves to the person named permanent CEO by the company.',
  probability: 0.41,
  volume: 250000,
  liquidity: 40000,
  end_date: '2027-06-30T00:00:00Z',
  status: 'active',
  link: 'https://polymarket.com/event/example-next-ceo',
  category: 'business',
  indexed_at: '2026-11-16T10:00:00Z',
  ...o,
});

export const FIXTURE_MARKETS = [
  row({}),
  row({
    market_id: 'm2',
    question: 'Will the founder return as CEO of Example Corp?',
    probability: 0.07,
  }),
  row({
    market_id: 'm3',
    question: 'Will Example Corp beat earnings this quarter?',
    probability: 0.6,
  }),
  row({
    market_id: 'm4',
    question: 'Who will be the next CEO of Example Corp by March?',
    status: 'closed',
  }),
  row({ market_id: 'm5', question: 'Who will be the next CEO of Other Inc?', probability: 0.3 }),
  row({
    market_id: 'm6',
    platform: 'kalshi',
    question: 'Example Corp names new CEO before July?',
    probability: 0.55,
    volume: 4000,
    link: 'https://kalshi.com/markets/example-ceo',
  }),
];

export const FIXTURE_NEWS = [
  {
    title: 'Example Corp CEO resigns, finance chief named interim (fixture)',
    url: 'https://www.reuters.com/business/example-ceo-resigns?utm_source=x',
    publisher: 'Reuters',
    publishedAt: '2026-11-12T14:00:00Z',
  },
  {
    title: 'Example Corp CEO resigns; finance chief named interim (fixture)',
    url: 'https://www.cnbc.com/2026/11/12/example-ceo-resigns.html',
    publisher: 'CNBC',
    publishedAt: '2026-11-12T15:00:00Z',
  },
  {
    title: 'Example Corp CEO resigns, finance chief named interim (fixture)',
    url: 'https://www.reuters.com/business/example-ceo-resigns',
    publisher: 'Reuters',
    publishedAt: '2026-11-12T14:00:00Z',
  },
  {
    title: 'Ten recipes for a rainy weekend (fixture)',
    url: 'https://lifestyle.example.net/recipes',
    publisher: 'Lifestyle',
    publishedAt: '2026-11-15T09:00:00Z',
  },
];

/* A leadership-impact reply with things the validator must remove or relabel. */
export const FIXTURE_IMPACT_REPLY = JSON.stringify({
  company: 'NVIDIA',
  ticker: 'NVDA',
  industry: 'Semiconductors',
  person: 'Sam Founder',
  headline: 'The departure is confirmed; the effect depends on execution (fixture)',
  answer: 'The company confirmed the change. The effect on the business is not yet reported.',
  event: {
    status: 'event_verified',
    summary: 'The chief executive resigned and an interim was named (fixture).',
    effectiveDate: '2026-11-11',
    announcedDate: '2026-11-12',
    interim: { name: 'Alex Interim', role: 'Chief Financial Officer' },
    permanentSuccessor: null,
    sourceUrls: ['https://www.sec.gov/Archives/edgar/data/0000000/example-8k.htm'],
  },
  findings: [
    {
      label: 'Succession',
      title: 'The change is confirmed',
      text: 'A filing records the departure.',
      sourceUrls: ['https://www.sec.gov/Archives/edgar/data/0000000/example-8k.htm'],
    },
    {
      label: 'Industry',
      title: 'Spillovers are not established',
      text: 'No source reports a change in orders.',
      sourceUrls: ['https://made-up.example.org/not-retrieved'],
    },
  ],
  channels: [
    { horizon: 'near', title: 'Confidence', text: 'A risk channel, not a forecast.' },
    { horizon: 'sector', title: 'Uneven', text: 'Depends on orders.' },
    { horizon: 'someday', title: 'Dropped', text: 'Unknown horizon.' },
  ],
  exposures: [
    {
      name: 'NVIDIA',
      ticker: 'NVDA',
      relation: 'direct',
      channel: 'Succession and roadmap continuity',
      evidence: 'A named successor and guidance',
      assessment: 'confirmed',
      sourceUrls: ['https://www.sec.gov/Archives/edgar/data/0000000/example-8k.htm'],
    },
    {
      name: 'Rival Chips',
      ticker: 'RVL',
      relation: 'peer',
      channel: 'Share shifts if customers move',
      evidence: 'Customer wins',
      assessment: 'confirmed',
      sourceUrls: [],
    },
    {
      name: 'Guess Co',
      ticker: 'not a ticker',
      relation: 'friend',
      channel: 'x',
      evidence: 'y',
      assessment: 'certain',
    },
  ],
  baseline: [
    {
      label: 'Revenue',
      value: '$10.0B',
      detail: 'Latest quarter',
      sourceUrls: ['https://investor.example.com/news/ceo-transition'],
    },
    { label: 'Margin', value: '70%', detail: null, sourceUrls: [] },
    {
      label: 'Outlook',
      value: 'strong',
      sourceUrls: ['https://investor.example.com/news/ceo-transition'],
    },
  ],
  timeline: [
    {
      date: '2026-11-12',
      title: 'Announcement (fixture)',
      text: 'The company announced the change.',
      sourceUrls: ['https://investor.example.com/news/ceo-transition'],
    },
  ],
  watch: ['The search timetable'],
  followups: ['What does the interim chief executive control?'],
});

/* A catalyst reply: one in the window with a source, one unsourced, one out of the window. */
export const FIXTURE_CATALYST_REPLY = JSON.stringify({
  summary: 'Reporting in the window covers a leadership announcement (fixture).',
  catalysts: [
    {
      date: '2026-11-12',
      title: 'CEO resigns (fixture)',
      text: 'The company announced its chief executive resigned.',
      scope: 'company',
      sourceUrls: ['https://www.reuters.com/business/example-board-weighs-candidates'],
    },
    { date: '2026-11-13', title: 'Rumour', text: 'No source.', scope: 'company', sourceUrls: [] },
    {
      date: '2026-06-01',
      title: 'Old news',
      text: 'Months before the window.',
      scope: 'sector',
      sourceUrls: ['https://www.reuters.com/business/example-board-weighs-candidates'],
    },
  ],
  watch: ['The next results date'],
  followups: [],
});
