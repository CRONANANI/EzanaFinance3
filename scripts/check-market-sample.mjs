/* FMP refusal handling and the controlled demonstration mode (lib/market-sample). No network. */
import test from 'node:test';
import assert from 'node:assert/strict';

let status = 200;
let calls = 0;
const internal = {};
globalThis.fetch = async (url) => {
  calls += 1;
  if (String(url).startsWith('https://ezana.test/api/')) return internal[url]();
  return new Response(JSON.stringify([{ symbol: 'AAPL', price: 201.5, name: 'Apple Inc.' }]), {
    status,
  });
};
const { withFmpSample, sampleAllowed, resetFmpRefusal, sampleMode } =
  await import('../src/lib/market-sample/index.js');
const { sampleForFmpUrl } = await import('../src/lib/market-sample/generators.js');
const { dataStateOf, isSampleRecord } = await import('../src/lib/market-sample/state.js');

const FMP = 'https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey=x';
const route = (allowed) =>
  withFmpSample(
    async () => {
      const r = await fetch(FMP);
      return new Response(JSON.stringify(r.ok ? await r.json() : []), { status: r.ok ? 200 : 503 });
    },
    { allow: async () => allowed },
  );

test('live FMP response: declared live, untouched', async () => {
  status = 200;
  resetFmpRefusal();
  const res = await route(true)();
  assert.equal(dataStateOf(res), 'live');
  const [q] = await res.json();
  assert.equal(q.name, 'Apple Inc.');
  assert.equal(isSampleRecord(q), false);
});

for (const code of [401, 402, 403]) {
  test(`FMP ${code}, normal production user: unavailable, never synthetic`, async () => {
    status = code;
    resetFmpRefusal();
    const res = await route(false)();
    assert.equal(dataStateOf(res), 'unavailable');
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), []);
  });
}

test('FMP 403, authorized demo context: sample, labelled, deterministic, no-store', async () => {
  status = 403;
  resetFmpRefusal();
  const res = await route(true)();
  assert.equal(dataStateOf(res), 'sample');
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const [q] = await res.json();
  assert.match(q.name, /sample/);
  assert.equal(isSampleRecord(q), true);
  assert.equal(q.price, sampleForFmpUrl(FMP)[0].price);
});

test('a persistent refusal is not retried within the cool-down; recovery after it', async () => {
  status = 403;
  resetFmpRefusal();
  await route(false)();
  const before = calls;
  const res = await route(false)();
  assert.equal(calls, before);
  assert.equal(dataStateOf(res), 'unavailable');
  status = 200;
  resetFmpRefusal(); // the 10-minute window has passed
  assert.equal(dataStateOf(await route(false)()), 'live');
});

test('a wrapped route reading a sample route inherits sample (no sample passed on as live)', async () => {
  status = 200;
  resetFmpRefusal();
  internal['https://ezana.test/api/market/index-week'] = () =>
    new Response('[]', { status: 200, headers: { 'x-ezana-data-state': 'sample' } });
  const outer = withFmpSample(
    async () => {
      await fetch('https://ezana.test/api/market/index-week');
      return new Response('{}');
    },
    { allow: async () => false },
  );
  assert.equal(dataStateOf(await outer()), 'sample');
});

test('demonstration policy: off by default; demo only in preview or for verified staff', async () => {
  assert.equal(sampleMode({}), 'off');
  assert.equal(await sampleAllowed(null, { env: {} }), false);
  assert.equal(
    await sampleAllowed(null, { env: { FMP_SAMPLE_MODE: 'demo', VERCEL_ENV: 'preview' } }),
    true,
  );
  const prod = { FMP_SAMPLE_MODE: 'demo', VERCEL_ENV: 'production' };
  assert.equal(await sampleAllowed(null, { env: prod, user: null }), false);
  assert.equal(
    await sampleAllowed(null, { env: prod, user: { email: 'x@y.z', app_metadata: {} } }),
    false,
  );
  /* A role the user can write themselves (user_metadata) is not trusted. */
  assert.equal(
    await sampleAllowed(null, {
      env: prod,
      user: { user_metadata: { role: 'admin' }, app_metadata: {} },
    }),
    false,
  );
  assert.equal(
    await sampleAllowed(null, { env: prod, user: { app_metadata: { role: 'admin' } } }),
    true,
  );
});

test('endpoints without a sample keep the refusal; statement and history shapes', () => {
  assert.equal(
    sampleForFmpUrl('https://financialmodelingprep.com/stable/search?query=app'),
    undefined,
  );
  assert.equal(
    sampleForFmpUrl('https://financialmodelingprep.com/stable/earnings?symbol=AAPL'),
    undefined,
  );
  const h = sampleForFmpUrl(
    'https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=AAPL&from=2026-10-01&to=2026-10-31',
  );
  assert.ok(h.length >= 20 && h.every(isSampleRecord));
  const inc = sampleForFmpUrl(
    'https://financialmodelingprep.com/stable/income-statement?symbol=AMPY&limit=5',
  );
  assert.ok(inc.every(isSampleRecord));
});

test('isolation: no wrapped route writes to the database; Sonar, trading and crons never use the wrapper', async () => {
  const { readFileSync, readdirSync, statSync } = await import('node:fs');
  const { join } = await import('node:path');
  const walk = (d) =>
    readdirSync(d).flatMap((f) => {
      const p = join(d, f);
      return statSync(p).isDirectory() ? walk(p) : /\.(js|jsx|mjs)$/.test(f) ? [p] : [];
    });
  const files = walk('src');
  const wrapped = files.filter(
    (f) => /withFmpSample\(/.test(readFileSync(f, 'utf8')) && !f.includes('market-sample'),
  );
  assert.ok(wrapped.length >= 10);
  for (const f of wrapped) {
    const s = readFileSync(f, 'utf8');
    assert.ok(
      !/\.from\([^)]*\)[\s\S]{0,300}?\.(upsert|insert|update|delete)\(/.test(s),
      `${f} writes to the database`,
    );
    assert.ok(!/(sonar|trading|cron)\//.test(f), `${f} must not be wrapped`);
  }
  for (const f of files.filter((x) =>
    /src\/(lib\/sonar|lib\/trading|app\/api\/(sonar|trading|cron|alpaca))\//.test(x),
  )) {
    assert.ok(!/market-sample/.test(readFileSync(f, 'utf8')), `${f} imports market-sample`);
  }
});
