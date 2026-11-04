/**
 * Sonar company brief (Nov 3): a ticker ping ("aapl") reads its price
 * performance and what analysts publish, the brief is market moves then
 * analysts then datasets, and headlines never become a paragraph of their
 * own. Network is stubbed.
 *   npm run test:sonar-company-brief
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.FMP_API_KEY = 'test-fmp';
process.env.FINNHUB_API_KEY = 'test-fh';

const { analystEvidence, actionLine } = await import('@/lib/sonar/analyst-evidence');
const { evidenceBrief } = await import('@/lib/sonar/landing-pipeline');

const FMP = {
  'stock-price-change': [
    { symbol: 'AAPL', '1M': 3.21, '3M': 8.05, '6M': 12.4, ytd: 24.5, '1Y': 30.2 },
  ],
  'quote-short': [{ symbol: 'AAPL', price: 300 }],
  'price-target-consensus': [
    { symbol: 'AAPL', targetHigh: 400, targetLow: 250, targetConsensus: 330, targetMedian: 335 },
  ],
  'grades-consensus': [
    { symbol: 'AAPL', strongBuy: 2, buy: 25, hold: 10, sell: 1, strongSell: 0, consensus: 'Buy' },
  ],
  grades: [
    {
      symbol: 'AAPL',
      date: '2026-10-31',
      gradingCompany: 'Morgan Stanley',
      previousGrade: 'Overweight',
      newGrade: 'Overweight',
      action: 'maintain',
    },
    {
      symbol: 'AAPL',
      date: '2026-10-21',
      gradingCompany: 'Goldman Sachs',
      previousGrade: 'Neutral',
      newGrade: 'Buy',
      action: 'upgrade',
    },
    {
      symbol: 'AAPL',
      date: '2025-01-02',
      gradingCompany: 'Old Firm',
      previousGrade: 'Buy',
      newGrade: 'Sell',
      action: 'downgrade',
    },
  ],
};
let fmpOff = new Set();
globalThis.fetch = async (url) => {
  const u = new URL(String(url));
  if (u.hostname.includes('finnhub')) {
    return new Response(
      JSON.stringify([
        { period: '2026-11-01', strongBuy: 3, buy: 20, hold: 8, sell: 2, strongSell: 0 },
      ]),
    );
  }
  const key = u.pathname.split('/').pop();
  if (fmpOff.has(key)) return new Response('forbidden', { status: 403 });
  return new Response(JSON.stringify(FMP[key] ?? []));
};

const NOW = new Date('2026-11-03T12:00:00Z');

test('performance, targets, ratings and actions, attributed, no vendor names', async () => {
  const items = await analystEvidence('aapl', { now: NOW });
  const by = (re) => items.find((i) => re.test(i.title));
  assert.match(
    by(/performance/).snippet,
    /1 month \+3\.2%, 3 months \+8\.1%, 6 months \+12\.4%, year to date \+24\.5%, 1 year \+30\.2%/,
  );
  assert.equal(by(/performance/).corpus, 'market');
  const t = by(/price targets/).snippet;
  assert.match(
    t,
    /consensus \$330\.00, median \$335\.00, range \$250\.00 \(low\) to \$400\.00 \(high\)/,
  );
  assert.match(t, /implies \+10\.0%/);
  assert.match(
    by(/ratings on/).snippet,
    /2 strong buy, 25 buy, 10 hold, 1 sell, 0 strong sell, from 38 analysts; consensus rating Buy/,
  );
  const a = by(/rating actions/).snippet;
  assert.match(
    a,
    /Morgan Stanley maintained Overweight \(2026-10-31\); Goldman Sachs upgraded to Buy from Neutral \(2026-10-21\)/,
  );
  assert.ok(!/Old Firm/.test(a), 'older than 120 days is left out');
  assert.ok(!/fmp|finnhub|financialmodelingprep/i.test(items.map((i) => i.snippet).join(' ')));
});

test('ratings fall back to recommendation trends; a refused endpoint costs one snippet', async () => {
  fmpOff = new Set(['grades-consensus', 'price-target-consensus']);
  try {
    const items = await analystEvidence('AAPL', { now: NOW });
    assert.ok(!items.some((i) => /price targets/.test(i.title)));
    assert.match(
      items.find((i) => /ratings on/.test(i.title)).snippet,
      /\(2026-11\): 3 strong buy, 20 buy, 8 hold, 2 sell, 0 strong sell, from 33 analysts\./,
    );
    assert.ok(items.some((i) => /performance/.test(i.title)));
  } finally {
    fmpOff = new Set();
  }
});

test('action wording', () => {
  assert.equal(
    actionLine({
      gradingCompany: 'Jefferies',
      newGrade: 'Hold',
      action: 'init',
      date: '2026-09-01',
    }),
    'Jefferies initiated at Hold (2026-09-01)',
  );
  assert.equal(
    actionLine({
      gradingCompany: 'UBS',
      newGrade: 'Neutral',
      previousGrade: 'Buy',
      action: 'downgrade',
    }),
    'UBS downgraded to Neutral from Buy',
  );
  assert.equal(actionLine({ newGrade: 'Buy' }), null);
});

test('fallback brief: moves, then analysts, then datasets; no headline paragraph', () => {
  const brief = evidenceBrief('Apple', [
    {
      marker: 'S1',
      corpus: 'market',
      snippet: 'Apple Inc. (AAPL) is a listed company. Last price $300.00.',
    },
    { marker: 'S2', corpus: 'market', snippet: 'AAPL share price change: 1 month +3.2%.' },
    {
      marker: 'S3',
      corpus: 'analysts',
      snippet: 'Analyst price targets for AAPL: consensus $330.00.',
    },
    { marker: 'S4', corpus: 'contracts', snippet: 'APPLE SEVEN SERVICES awarded $73K.' },
    {
      marker: 'S5',
      corpus: 'news',
      snippet: 'Reported by CNET on 2026-11-03: Apple CEO says memory prices will rise.',
    },
  ]);
  const paras = brief.split('\n\n');
  assert.equal(paras.length, 3);
  assert.match(paras[0], /^Here is what Sonar found on Apple\. .*\[S1\]\. .*\[S2\]\.$/);
  assert.match(paras[1], /\[S3\]/);
  assert.match(paras[2], /\[S4\]/);
  assert.ok(!/\[S5\]|Headline|Reported by/.test(brief), 'no headlines');
});
