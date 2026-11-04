/**
 * Sonar 13F flows (Nov 4): "What are hedge funds selling right now?" reads
 * the flow-leaders snapshot (refresh_titans_flows) instead of falling to a
 * general briefing about what a 13F is.
 *   npm run test:sonar-flows
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { detectFlowsPing, mapFlowsPayload, buildFlowsDossier, flowsEvidence, FLOWS_ADDENDUM } =
  await import('@/lib/sonar/landing-flows');
const { CORPUS_TO_DATASET } = await import('@/lib/sonar/retrieval');

test('flows pings are detected with their side and sector', () => {
  assert.deepEqual(detectFlowsPing('What are hedge funds selling right now?'), {
    side: 'sell',
    sector: null,
  });
  assert.equal(detectFlowsPing('what are hedge funds buying').side, 'buy');
  assert.equal(detectFlowsPing('biggest 13F sells this quarter').side, 'sell');
  assert.deepEqual(detectFlowsPing('which stocks are institutions dumping in tech'), {
    side: 'sell',
    sector: 'Information Technology',
  });
  assert.equal(detectFlowsPing('smart money flows into energy').sector, 'Energy');
  assert.equal(detectFlowsPing('hedge fund positioning').side, 'both');
});

test('ordinary pings never take the flows path', () => {
  for (const q of [
    'aapl',
    'What has Nancy Pelosi been buying lately?',
    'Which defense stocks are members of Congress trading?',
    'what is a hedge fund',
    'Who is lobbying hardest on AI regulation?',
    'brazilian economy outlook',
  ]) {
    assert.equal(detectFlowsPing(q), null, q);
  }
});

const PAYLOAD = {
  period: '2026-06-30',
  prior_period: '2026-03-31',
  coverage: {
    filers_compared: 900,
    book_compared: 9e12,
    filers_total: 1477,
    book_total: 20.8e12,
    filers_prior_total: 1400,
  },
  totals: { sold_usd: 6.7e9, bought_usd: 10.5e9, exits: 1364, new_positions: 900 },
  most_sold: [
    {
      cusip: '67066G104',
      ticker: 'NVDA',
      issuer: 'NVIDIA CORPORATION COM',
      sector: 'Information Technology',
      sold_usd: 3.28e8,
      bought_usd: 9.1e7,
      net_usd: -2.37e8,
      sellers: 14,
      buyers: 23,
      exits: 0,
      holders_now: 50,
      holders_prior: 49,
    },
    {
      cusip: '037833100',
      ticker: 'AAPL',
      issuer: 'APPLE INC COM',
      sector: 'Information Technology',
      sold_usd: 2.92e8,
      bought_usd: 6.92e8,
      net_usd: 4e8,
      sellers: 16,
      buyers: 21,
      exits: 1,
      holders_now: 52,
      holders_prior: 52,
    },
    {
      cusip: '91324P102',
      ticker: 'UNH',
      issuer: 'UNITEDHEALTH GROUP',
      sector: 'Health Care',
      sold_usd: 1e8,
      bought_usd: 0,
      net_usd: -1e8,
      sellers: 5,
      buyers: 0,
      exits: 2,
      holders_now: 20,
      holders_prior: 22,
    },
  ],
  net_sold: [],
  most_bought: [
    {
      cusip: '037833100',
      ticker: 'AAPL',
      issuer: 'APPLE INC COM',
      sector: 'Information Technology',
      sold_usd: 2.92e8,
      bought_usd: 6.92e8,
      net_usd: 4e8,
      sellers: 16,
      buyers: 21,
      new_holders: 0,
    },
  ],
  net_bought: [],
  breadth_sold: [],
  sellers: [
    {
      cik: '1',
      filer_name: 'OP Asset Management Ltd',
      sold_usd: 2.6e9,
      bought_usd: 6.4e8,
      cut: 264,
      exits: 75,
      book_prior: 9.7e9,
      top_sold: ['NVDA', 'AAPL', 'MSFT'],
    },
  ],
  exits: [
    {
      cik: '2',
      filer_name: "O'Connor Alternative Investments LLC",
      cusip: '185123106',
      ticker: null,
      issuer: 'CLEARWATER',
      value_prior: 1.5e8,
      pct_of_prior_book: 0.204,
    },
  ],
  sectors: [
    {
      sector: 'Health Care',
      sold_usd: 1.46e9,
      bought_usd: 4.67e8,
      net_usd: -9.9e8,
      names_net_sold: 84,
    },
    { sector: 'Unclassified', sold_usd: 1e9, bought_usd: 1e9, net_usd: 0 },
  ],
};

function fakeAdmin(rows) {
  const q = {
    _key: null,
    _like: null,
    select() {
      return this;
    },
    eq(_c, v) {
      this._key = v;
      return this;
    },
    like(_c, v) {
      this._like = v;
      return this;
    },
    order() {
      return this;
    },
    async limit() {
      const keys = Object.keys(rows)
        .filter((k) => k.startsWith('flows:'))
        .sort()
        .reverse();
      return { data: keys.slice(0, 1).map((k) => ({ payload: rows[k], computed_at: 'x' })) };
    },
    async maybeSingle() {
      const p = rows[this._key];
      return { data: p ? { payload: p, computed_at: 'x' } : null, error: null };
    },
  };
  return { from: () => ({ ...q }) };
}

test('the payload maps and drops Unclassified sectors', () => {
  const m = mapFlowsPayload(PAYLOAD);
  assert.equal(m.quarter, '2026-06-30');
  assert.equal(m.mostSold[0].label, 'NVDA');
  assert.equal(m.exits[0].label, 'CLEARWATER', 'an unmapped security keeps its issuer');
  assert.equal(m.sectors.length, 1);
  assert.ok(Math.abs(m.coverage.share - 9 / 20.8) < 1e-9);
});

test('the dossier reads the complete quarter, filters a sector and falls back', async () => {
  const now = new Date('2026-11-04T12:00:00Z');
  const admin = fakeAdmin({ 'flows:2026-06-30': PAYLOAD });
  const d = await buildFlowsDossier({ admin, side: 'sell', now });
  assert.equal(d.kind, 'flows');
  assert.equal(d.quarter, '2026-06-30');
  assert.equal(d.open, null, 'no open-quarter snapshot, no early-filings card');
  assert.equal(d.matches.flowSells[0].label, 'NVDA');

  const tech = await buildFlowsDossier({ admin, side: 'sell', sector: 'Health Care', now });
  assert.deepEqual(
    tech.mostSold.map((r) => r.label),
    ['UNH'],
  );
  assert.equal(tech.sellers.length, 0, 'filer totals are not sector scoped, so they are hidden');

  const later = await buildFlowsDossier({
    admin: fakeAdmin({ 'flows:2026-03-31': { ...PAYLOAD, period: '2026-03-31' } }),
    now,
  });
  assert.equal(later.quarter, '2026-03-31', 'falls back to the newest flows snapshot');
  assert.equal(await buildFlowsDossier({ admin: fakeAdmin({}), now }), null);
});

test('the evidence leads with sales, states coverage and never says hedge fund for a filer', async () => {
  const d = await buildFlowsDossier({
    admin: fakeAdmin({ 'flows:2026-06-30': PAYLOAD }),
    side: 'sell',
    now: new Date('2026-11-04T12:00:00Z'),
  });
  const ev = flowsEvidence(d);
  assert.ok(ev.length >= 4);
  assert.ok(ev.every((e) => e.corpus === '13f'));
  assert.ok(CORPUS_TO_DATASET['13f'], 'the corpus maps to the 13F dataset');
  assert.match(ev[0].title, /^Most sold by 13F filers/);
  assert.match(ev[0].snippet, /NVDA .*\$328\.0M sold by 14 filers against 23 buyers/);
  const all = ev.map((e) => `${e.title} ${e.snippet}`).join(' ');
  assert.match(all, /Compared 900 13F filers/);
  assert.match(all, /short positions are not reported/);
  assert.ok(!/—/.test(all) && !/—/.test(FLOWS_ADDENDUM), 'no em dash');
});

test('new files carry no hex and no em dash', () => {
  for (const f of [
    'src/lib/sonar/landing-flows.js',
    'src/components/landing/SonarFlowsStack.jsx',
    'src/components/landing/sonar-flows.css',
  ]) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(src), `${f}: hex`);
    assert.ok(!src.includes('—'), `${f}: em dash`);
  }
});
