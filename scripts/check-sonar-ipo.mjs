/**
 * Sonar IPO fix (Oct 30): "what was the ipo value of spacex" answered that
 * SpaceX had not held an IPO. Checks the four pieces of the fix offline:
 * the resolver (intent, subject, ticker), the IPO filings adapter against a
 * market-data fixture, and the grounding guard on a false negative.
 *
 * Network is stubbed: global fetch answers from the fixtures below and
 * nothing leaves the process. Figures are fixture values only.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.FMP_API_KEY = process.env.FMP_API_KEY || 'test-key';

const { extractIntents, ipoSubject, resolveQuery } = await import('@/lib/sonar/resolveQuery');
const ipoMod = await import('@/lib/sonar/sources/ipo-events');
const ipoEvents = ipoMod.default;
const { findUnsupportedNegatives, enforceGrounding, stripCoverageNotes, GROUNDING_RULES } =
  await import('@/lib/sonar/groundingGuard');
const { resolveIpoCompany, aliasedCompany, evidenceBrief, marketSnapshot, pingProfile } =
  await import('@/lib/sonar/landing-pipeline');
const { rankSourcedMatches } = await import('@/lib/sonar/rankSourcedMatches');
const { getLiveSources, coverageReport } = await import('@/lib/sonar/sources/registry');

/* Fixture: the SpaceX listing as the market-data feeds return it. */
const FIXTURE = {
  profile: [
    {
      symbol: 'SPCX',
      companyName: 'Space Exploration Technologies Corp.',
      exchange: 'NASDAQ',
      ipoDate: '2026-06-12',
    },
  ],
  'ipos-prospectus': [
    {
      symbol: 'SPCX',
      ipoDate: '2026-06-12',
      filingDate: '2026-06-11',
      form: '424B4',
      pricePublicPerShare: 135,
      pricePublicTotal: 75_006_000_000,
      url: 'https://www.sec.gov/Archives/edgar/data/1181412/000000000026000001/spcx-424b4.htm',
    },
    { symbol: 'OTHR', pricePublicPerShare: 20, pricePublicTotal: 1e8 },
  ],
  'ipos-disclosure': [],
  'ipos-calendar': [
    {
      symbol: 'SPCX',
      date: '2026-06-12',
      company: 'Space Exploration Technologies Corp.',
      exchange: 'NASDAQ Global Select',
      shares: 555_600_000,
      priceRange: '135',
      marketCap: 1_750_000_000_000,
    },
  ],
  'search-name': [
    { symbol: 'SPCX', name: 'Space Exploration Technologies Corp.', exchange: 'NASDAQ' },
  ],
  quote: [
    {
      symbol: 'SPCX',
      name: 'Space Exploration Technologies Corp.',
      price: 171.5,
      changePercentage: 1.25,
      marketCap: 2_100_000_000_000,
      yearLow: 140,
      yearHigh: 190,
      exchange: 'NASDAQ',
    },
  ],
};

let calls = [];
globalThis.fetch = async (url) => {
  const u = new URL(String(url));
  calls.push(u.pathname);
  const key = u.pathname.split('/').pop();
  const sym = u.searchParams.get('symbol');
  let body = FIXTURE[key] ?? [];
  if ((key === 'profile' || key === 'quote') && sym && sym !== 'SPCX') body = [];
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

beforeEach(() => {
  calls = [];
  ipoMod.clearIpoCache();
});

test('resolver: the SpaceX ping is an IPO question about SpaceX, resolving to SPCX', async () => {
  const raw = 'what was the ipo value of spacex';
  assert.ok(extractIntents(raw).includes('ipo'));
  assert.ok(resolveQuery(raw).intents.includes('ipo'));
  assert.equal(resolveQuery(raw).forceLiveWeb, true, 'an IPO is a recent-event question');
  assert.equal(ipoSubject(raw), 'spacex');
  const hit = await resolveIpoCompany(ipoSubject(raw));
  assert.equal(hit?.ticker, 'SPCX');
});

test('resolver: noisy SpaceX pings still resolve to SPCX, alias first', async () => {
  for (const raw of [
    'can you give me details on the spacex ipo',
    'SpaceX IPO filing SEC 2026',
    'how did space x do after it went public this summer',
  ]) {
    assert.ok(aliasedCompany(raw), `alias found in "${raw}"`);
    calls = [];
    const hit = await resolveIpoCompany(ipoSubject(raw), raw);
    assert.equal(hit?.ticker, 'SPCX', raw);
    assert.equal(hit?.alias, 'SpaceX');
    assert.ok(!calls.some((c) => c.endsWith('search-name')), 'no name search when aliased');
  }
  assert.equal(ipoSubject('can you give me details on the spacex ipo'), 'spacex');
  assert.equal(ipoSubject('SpaceX IPO filing SEC 2026'), 'SpaceX');
  assert.equal(aliasedCompany('spacexai lab ecosystem etf'), null, 'whole words only');
});

test('resolver: a fund never wins a company name search', async () => {
  const saved = FIXTURE['search-name'];
  FIXTURE['search-name'] = [
    { symbol: 'XAIW', name: 'SpaceXAI Lab Ecosystem ETF', exchange: 'NYSE' },
  ];
  try {
    assert.equal(await resolveIpoCompany('rocketco', 'when did rocketco ipo'), null);
  } finally {
    FIXTURE['search-name'] = saved;
  }
});

test('market snapshot: listing date and live price, no vendor name', async () => {
  const m = await marketSnapshot('SPCX', 1000);
  assert.equal(m.corpus, 'market');
  assert.match(m.snippet, /listed since 2026-06-12/);
  assert.match(m.snippet, /Last price \$171\.50, up 1\.25% on the day/);
  assert.match(m.snippet, /Market cap \$2\.10T/);
  assert.ok(!/fmp|financialmodelingprep/i.test(m.snippet));
  assert.ok(!/[—–]/.test(m.snippet));
});

test('fast profile: a six-second ping by default', () => {
  const P = pingProfile();
  assert.equal(P.id, 'fast');
  assert.ok(P.routeBudgetMs + P.rateLimitMs + P.ledgerMs <= 6_100);
  assert.equal(P.web, false);
  assert.equal(P.regenerate, false);
  assert.ok(P.legs.retrieveCap < P.routeBudgetMs);
});

test('resolver: other IPO phrasings and a sanctions "listed" ping', () => {
  assert.equal(ipoSubject('when did Reddit IPO'), 'Reddit');
  assert.equal(ipoSubject('has Stripe gone public'), 'Stripe');
  assert.ok(extractIntents('has Stripe gone public').includes('ipo'));
  assert.ok(!extractIntents('which Iranian banks are listed by OFAC sanctions').includes('ipo'));
  assert.deepEqual(extractIntents('lockheed martin government contracts'), []);
});

test('adapter: the SPCX fixture becomes one cited IPO finding', async () => {
  const q = { intents: ['ipo'], tickers: ['SPCX'] };
  assert.ok(ipoEvents.isRelevant(q));
  assert.ok(!ipoEvents.isRelevant({ intents: [], tickers: ['SPCX'] }));
  const [f] = await ipoEvents.search(q);
  assert.ok(f, 'a finding');
  assert.equal(f.sourceSlug, 'ipo-events');
  assert.equal(f.meta.price, 135);
  assert.ok(Math.abs(f.meta.shares - 555.6e6) < 1e6, 'about 555.6M shares');
  assert.ok(Math.abs(f.meta.proceeds - 75e9) < 0.1e9, 'about $75B raised');
  assert.equal(f.meta.proceedsDerived, false, 'proceeds are reported, not derived');
  assert.equal(f.meta.exchange, 'Nasdaq');
  assert.equal(f.meta.ipoDate, '2026-06-12');
  assert.equal(f.date, '2026-06-12');
  assert.match(f.summary, /\$135\.00 per share/);
  assert.match(f.summary, /listed on Nasdaq as SPCX/);
  assert.match(f.citation.label, /^SEC filings/);
  assert.match(f.citation.href, /^https:\/\/www\.sec\.gov\//);
  assert.ok(!/fmp|financialmodelingprep/i.test(`${f.title} ${f.summary} ${f.citation.label}`));
  assert.ok(!/[—–]/.test(f.summary), 'no dashes in copy');
});

test('adapter: proceeds are derived (and labelled) only from returned numbers', async () => {
  const saved = FIXTURE['ipos-prospectus'];
  FIXTURE['ipos-prospectus'] = [];
  try {
    const [f] = await ipoEvents.search({ intents: ['ipo'], tickers: ['SPCX'] });
    assert.equal(f.meta.price, 135, 'price from the calendar');
    assert.equal(f.meta.proceedsDerived, true);
    assert.ok(Math.abs(f.meta.proceeds - 135 * 555.6e6) < 1);
    assert.match(f.summary, /about \$75\.0B raised/);
  } finally {
    FIXTURE['ipos-prospectus'] = saved;
  }
});

test('ranking: IPO filings lead an IPO ping', () => {
  const q = resolveQuery('what was the ipo value of spacex');
  const ranked = rankSourcedMatches(
    [
      { dataset: 'echo', relevance: 0.9, date: '2026-10-01' },
      { dataset: 'gov-contracts', relevance: 0.9, date: '2026-10-01' },
      { dataset: 'ipo-filings', relevance: 1, date: '2026-06-12' },
    ],
    q,
  );
  assert.equal(ranked[0].dataset, 'ipo-filings');
});

test('registry: IPO filings is a free core source', () => {
  assert.ok(getLiveSources('free').some((s) => s.slug === 'ipo-events'));
  assert.ok(coverageReport().coreSources.includes('ipo-events'));
});

const ipoFinding = {
  title: 'SpaceX IPO',
  summary:
    'SpaceX priced at $135.00 per share, 555.6M shares offered, about $75.0B raised, listed on Nasdaq as SPCX, first trade 2026-06-12.',
};

test('guard: a false negative is rejected when an IPO finding exists', () => {
  const draft = 'SpaceX has not held an initial public offering. It remains private.';
  assert.equal(findUnsupportedNegatives(draft, [ipoFinding]).length, 2);
});

test('guard: a grounded positive answer passes', () => {
  const draft =
    'SpaceX priced its IPO at $135.00 per share and raised about $75.0B [S1]. Ezana\u2019s datasets show 12 congressional trades in SPCX [S2].';
  assert.deepEqual(findUnsupportedNegatives(draft, [ipoFinding]), []);
});

test('guard: coverage notes never reach the brief', async () => {
  assert.ok(
    !/returned no record|say: "/i.test(GROUNDING_RULES),
    'the rules never ask for a no-record line',
  );
  const draft = [
    'Our datasets returned no record of a SpaceX initial public offering. SpaceX listed on Nasdaq as SPCX on 2026-06-12 [S1].',
    'Web search was not available for this brief. Ezana\u2019s datasets show 12 congressional trades in SPCX [S2].',
    'The provided sources do not include the offer price. This is general background rather than sourced research.',
  ].join('\n\n');
  const out = stripCoverageNotes(draft);
  assert.equal(
    out,
    'SpaceX listed on Nasdaq as SPCX on 2026-06-12 [S1].\n\nEzana\u2019s datasets show 12 congressional trades in SPCX [S2].',
  );
  const guarded = await enforceGrounding(draft, [ipoFinding], null);
  assert.ok(!/no record|web search|general background/i.test(guarded.text));
});

test('evidence brief: cited snippets when synthesis misses the deadline', () => {
  const brief = evidenceBrief('SpaceX', [
    { marker: 'S1', snippet: ipoFinding.summary },
    { marker: 'S2', snippet: 'SpaceX (SPCX) is a listed company trading on Nasdaq.' },
  ]);
  assert.match(brief, /^Here is what Sonar found on SpaceX\. SpaceX priced at \$135\.00/);
  assert.match(brief, /2026-06-12 \[S1\]\. .*Nasdaq \[S2\]\.$/);
  assert.equal(evidenceBrief('SpaceX', []), null);
});

test('guard: a negative a source states is supported', () => {
  const src = {
    title: 'Stripe',
    summary: 'Stripe has not filed for an IPO, per its own statement.',
  };
  assert.deepEqual(findUnsupportedNegatives('Stripe has not gone public.', [src]), []);
});

test('guard: a negative with zero findings is removed, never replaced with a no-record line', async () => {
  assert.equal(findUnsupportedNegatives('Stripe has not gone public.', []).length, 1);
  const out = await enforceGrounding('Stripe has not gone public.', [], null);
  assert.equal(out.text, '', 'the caller falls back to the evidence brief');
});

test('guard: regenerates once, then removes what still fails, keeping paragraphs', async () => {
  let n = 0;
  const regen = async () => {
    n += 1;
    return 'SpaceX never went public.\n\nSpaceX priced its IPO at $135.00 per share [S1].';
  };
  const out = await enforceGrounding('SpaceX has not held an IPO.', [ipoFinding], regen);
  assert.equal(n, 1, 'one regeneration');
  assert.equal(out.regenerated, true);
  assert.equal(out.text, 'SpaceX priced its IPO at $135.00 per share [S1].');

  const ok = await enforceGrounding(
    'SpaceX has not held an IPO.',
    [ipoFinding],
    async () => 'SpaceX priced its IPO at $135.00 per share [S1].',
  );
  assert.deepEqual(ok.removed, []);
  assert.match(ok.text, /\$135\.00/);
});
