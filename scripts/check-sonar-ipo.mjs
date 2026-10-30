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
const { findUnsupportedNegatives, enforceGrounding, NO_RECORD_LINE } =
  await import('@/lib/sonar/groundingGuard');
const { resolveIpoCompany } = await import('@/lib/sonar/landing-pipeline');
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
};

let calls = [];
globalThis.fetch = async (url) => {
  const u = new URL(String(url));
  calls.push(u.pathname);
  const key = u.pathname.split('/').pop();
  const sym = u.searchParams.get('symbol');
  let body = FIXTURE[key] ?? [];
  if (key === 'profile' && sym && sym !== 'SPCX') body = [];
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
    'SpaceX priced its IPO at $135.00 per share and raised about $75.0B [S1]. Our datasets returned no record of congressional trades in SPCX.';
  assert.deepEqual(findUnsupportedNegatives(draft, [ipoFinding]), []);
});

test('guard: a negative a source states is supported', () => {
  const src = {
    title: 'Stripe',
    summary: 'Stripe has not filed for an IPO, per its own statement.',
  };
  assert.deepEqual(findUnsupportedNegatives('Stripe has not gone public.', [src]), []);
});

test('guard: a negative with zero findings is replaced with the no-record line', async () => {
  assert.equal(findUnsupportedNegatives('Stripe has not gone public.', []).length, 1);
  const out = await enforceGrounding('Stripe has not gone public.', [], null);
  assert.equal(out.text, NO_RECORD_LINE);
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
