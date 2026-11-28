/* Temporary FMP billing fallback (lib/market-sample). */
import test from 'node:test';
import assert from 'node:assert/strict';

let calls = 0;
let status = 403;
globalThis.fetch = async (url) => {
  calls += 1;
  return new Response(JSON.stringify([{ symbol: 'REAL', price: 1 }]), { status });
};
const { withFmpSample } = await import('../src/lib/market-sample/index.js');
const { sampleForFmpUrl } = await import('../src/lib/market-sample/generators.js');

test('a refusal inside a wrapped route is answered with labelled, deterministic sample data', async () => {
  const handler = withFmpSample(async () => {
    const r = await fetch('https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey=x');
    return new Response(JSON.stringify(await r.json()));
  });
  const res = await handler();
  assert.equal(res.headers.get('x-ezana-sample'), '1');
  const [q] = await res.json();
  assert.equal(q.symbol, 'AAPL');
  assert.match(q.name, /sample/);
  assert.equal(q._sample, true);
  assert.deepEqual(
    sampleForFmpUrl('https://financialmodelingprep.com/stable/quote?symbol=AAPL')[0].price,
    q.price,
  );
  /* Within the cool-down FMP is not called again. */
  const before = calls;
  await handler();
  assert.equal(calls, before);
});

test('outside a wrapped route nothing is replaced, and endpoints without a sample keep the refusal', async () => {
  const r = await fetch('https://financialmodelingprep.com/stable/quote?symbol=AAPL');
  assert.equal(r.status, 403);
  assert.equal(
    sampleForFmpUrl('https://financialmodelingprep.com/stable/search?query=app'),
    undefined,
  );
  assert.equal(
    sampleForFmpUrl('https://financialmodelingprep.com/stable/earnings?symbol=AAPL'),
    undefined,
  );
});

test('statement, history and ratio shapes', () => {
  const inc = sampleForFmpUrl(
    'https://financialmodelingprep.com/stable/income-statement?symbol=AMPY&limit=5',
  );
  assert.equal(inc.length, 5);
  assert.ok(inc[0].revenue > inc[4].revenue);
  const h = sampleForFmpUrl(
    'https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=AAPL&from=2026-10-01&to=2026-10-31',
  );
  assert.ok(h.length >= 20 && h[0].date >= h[h.length - 1].date);
  assert.ok(
    sampleForFmpUrl('https://financialmodelingprep.com/stable/ratios-ttm?symbol=AAPL')[0]
      .peRatioTTM > 0,
  );
});
