/**
 * Ezana API: options exposure maths, chart models and renderers, chart route
 * parity with the data routes they wrap, and the MCP server protocol.
 * Run: node --no-warnings --test scripts/check-ezana-api-charts.mjs (part of npm run test:api).
 * Self-contained node:test file, no network.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./mobile-node-loader.mjs', import.meta.url);

const reg = await import('../src/lib/ezana-api/registry.js');
const { TIERS, RESTRICTED_SCOPES } = await import('../src/lib/ezana-api/tiers.js');
const { HANDLERS } = await import('../src/lib/ezana-api/handlers.js');
const { buildOpenApi } = await import('../src/lib/ezana-api/openapi.js');
const opt = await import('../src/lib/ezana-api/insights/options.js');
const M = await import('../src/lib/ezana-api/charts/models.js');
const { renderSvg } = await import('../src/lib/ezana-api/charts/svg.js');
const { toVegaLite } = await import('../src/lib/ezana-api/charts/vega.js');
const { renderPng } = await import('../src/lib/ezana-api/charts/png.js');
const { renderChart } = await import('../src/lib/ezana-api/handlers/charts.js');
const mcp = await import('../src/lib/ezana-mcp/protocol.js');

const c = (o) => ({ size: 100, open_interest_date: '2026-11-27', quote_at: null, iv: null, ...o });

/* ── options exposure ──────────────────────────────────────────────── */

test('options: OCC symbols parse', () => {
  assert.deepEqual(opt.parseOcc('AAPL261218C00215000'), {
    root: 'AAPL',
    expiration: '2026-12-18',
    type: 'call',
    strike: 215,
  });
  assert.equal(opt.parseOcc('AAPL261218P00212500').strike, 212.5);
  assert.equal(opt.parseOcc('nonsense'), null);
});

test('options: contracts join snapshots by symbol; missing greeks stay null', () => {
  const chain = opt.joinChain(
    [
      {
        symbol: 'AAPL261218C00215000',
        open_interest: '1200',
        size: '100',
        open_interest_date: '2026-11-27',
      },
      { symbol: 'AAPL261218P00215000', open_interest: '800' },
    ],
    {
      AAPL261218C00215000: {
        greeks: { delta: 0.52, gamma: 0.03 },
        latestQuote: { t: '2026-11-28T15:00:00Z' },
      },
    },
  );
  assert.equal(chain.length, 2);
  assert.deepEqual(
    [chain[0].type, chain[0].strike, chain[0].expiration, chain[0].open_interest, chain[0].delta],
    ['call', 215, '2026-12-18', 1200, 0.52],
  );
  assert.equal(chain[1].type, 'put');
  assert.equal(chain[1].delta, null);
  assert.equal(chain[1].size, 100);
});

test('options: net delta = sum(OI x delta x size); puts subtract; missing greeks counted', () => {
  const chain = [
    c({
      type: 'call',
      strike: 100,
      expiration: '2026-12-18',
      open_interest: 1000,
      delta: 0.5,
      gamma: 0.02,
    }),
    c({
      type: 'put',
      strike: 100,
      expiration: '2026-12-18',
      open_interest: 400,
      delta: -0.5,
      gamma: 0.02,
    }),
    c({
      type: 'call',
      strike: 100,
      expiration: '2026-12-18',
      open_interest: 50,
      delta: null,
      gamma: null,
    }),
    c({
      type: 'call',
      strike: 105,
      expiration: '2027-01-15',
      open_interest: 200,
      delta: 0.3,
      gamma: 0.01,
    }),
    c({
      type: 'call',
      strike: 100,
      expiration: '2026-11-20',
      open_interest: 9999,
      delta: 0.9,
      gamma: 0,
    }),
  ];
  const g = opt.exposureGrid(chain, { spot: 101, asOf: '2026-11-28', strikes: 8, expirations: 7 });
  assert.deepEqual(g.expirations, ['2026-12-18', '2027-01-15'], 'expired contracts are dropped');
  assert.deepEqual(g.strikes, [105, 100], 'high to low');
  const cell = g.cells[1][0];
  assert.equal(cell.value, 1000 * 0.5 * 100 - 400 * 0.5 * 100);
  assert.equal(cell.missing_greeks, 1);
  assert.equal(cell.contracts, 3);
  assert.equal(g.cells[1][1], null, 'no contracts: null, not zero');
  assert.equal(g.total, 30000 + 6000);
  assert.equal(g.coverage.contracts_missing_greeks, 1);
  assert.equal(g.unit, 'shares');

  const usd = opt.exposureGrid(chain, { spot: 101, asOf: '2026-11-28', mode: 'net_delta_usd' });
  assert.equal(usd.cells[1][0].value, 30000 * 101);
  const calls = opt.exposureGrid(chain, { spot: 101, asOf: '2026-11-28', mode: 'call_delta' });
  assert.equal(calls.cells[1][0].value, 50000);
  const puts = opt.exposureGrid(chain, { spot: 101, asOf: '2026-11-28', mode: 'put_delta' });
  assert.equal(puts.cells[1][0].value, -20000);
  const oi = opt.exposureGrid(chain, { spot: 101, asOf: '2026-11-28', mode: 'open_interest' });
  assert.equal(oi.cells[1][0].value, 1450);
  const gex = opt.exposureGrid(chain, { spot: 101, asOf: '2026-11-28', mode: 'gamma_usd_1pct' });
  assert.equal(gex.cells[1][0].value, Math.round((1000 - 400) * 0.02 * 100 * 101 * 101 * 0.01));
});

test('options: strikes nearest the spot, limited counts', () => {
  const chain = [90, 95, 100, 105, 110, 115].map((k) =>
    c({ type: 'call', strike: k, expiration: '2026-12-18', open_interest: 10, delta: 0.5 }),
  );
  const g = opt.exposureGrid(chain, { spot: 103, asOf: '2026-11-28', strikes: 3, expirations: 1 });
  assert.deepEqual(
    g.strikes,
    [105, 100, 110].sort((a, b) => b - a),
  );
});

/* ── charts ────────────────────────────────────────────────────────── */

const grid = opt.exposureGrid(
  [
    c({ type: 'call', strike: 215, expiration: '2026-12-18', open_interest: 1000, delta: 0.5 }),
    c({ type: 'put', strike: 210, expiration: '2026-12-18', open_interest: 2000, delta: -0.4 }),
    c({ type: 'call', strike: 215, expiration: '2027-01-15', open_interest: 300, delta: 0.6 }),
  ],
  { spot: 213.45, asOf: '2026-11-28' },
);
const heat = M.exposureChart({ ticker: 'AAPL', ...grid });

test('charts: value labels', () => {
  assert.equal(M.formatValue(221000, 'shares'), '+221K');
  assert.equal(M.formatValue(-110000, 'shares'), '−110K');
  assert.equal(M.formatValue(1.25e6, 'usd'), '+$1.3M');
  assert.equal(M.formatValue(0.62, 'probability'), '62%');
  assert.equal(M.formatValue(9.04, 'robust_z'), '+9.0');
  assert.equal(M.formatValue(null, 'shares'), '–');
});

test('charts: exposure heatmap model keeps nulls and marks the strike nearest the spot', () => {
  assert.equal(heat.kind, 'heatmap');
  assert.deepEqual(heat.rows, ['$215', '$210']);
  assert.deepEqual(heat.cols, ['12/18', '1/15']);
  assert.deepEqual(heat.values, [
    [50000, 18000],
    [-80000, null],
  ]);
  assert.equal(heat.rowHighlight, 0);
});

test('charts: SVG is well formed, themed and escapes text', () => {
  const svg = renderSvg({ ...heat, title: 'A & <B>' }, 'light');
  assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(svg, /A &amp; &lt;B&gt;/);
  assert.match(svg, /#ffffff/);
  assert.ok(!/var\(--/.test(svg), 'no CSS variables in an exported image');
  for (const m of [
    M.procurementChart([{ entity: { ticker: 'X' }, value: 3 }], { fiscal_year: 2025 }),
    M.insiderFlowChart([{ ticker: 'Y', flow_score: -40 }]),
    M.contractsChart({
      ticker: 'Z',
      by_fiscal_year: [{ fiscal_year: 2025, amount: 5e6, complete: true }],
    }),
    M.marketHistoryChart(
      [
        { at: '2026-11-01T00:00:00Z', probability: 0.4 },
        { at: '2026-11-02T00:00:00Z', probability: 0.5 },
      ],
      'm1',
    ),
  ]) {
    const s = renderSvg(m);
    assert.ok(s.startsWith('<svg') && s.endsWith('</svg>'), m.kind);
    assert.equal((s.match(/<svg/g) || []).length, 1);
  }
});

test('charts: Vega-Lite spec carries every cell and the diverging scale', () => {
  const v = toVegaLite(heat);
  assert.equal(v.$schema, 'https://vega.github.io/schema/vega-lite/v5.json');
  assert.equal(v.data.values.length, 4);
  assert.equal(v.encoding.color.scale.domainMid, 0);
  const bars = toVegaLite(M.insiderFlowChart([{ ticker: 'Y', flow_score: -40 }]));
  assert.equal(bars.mark.type, 'bar');
});

test('charts: PNG renders for every chart kind', async () => {
  for (const m of [
    heat,
    M.insiderFlowChart([
      { ticker: 'Y', flow_score: -40 },
      { ticker: 'W', flow_score: 70 },
    ]),
    M.contractsChart({
      ticker: 'Z',
      by_fiscal_year: [{ fiscal_year: 2025, amount: 5e6, complete: false }],
    }),
    M.marketHistoryChart(
      [
        { at: '2026-11-01T00:00:00Z', probability: 0.4 },
        { at: '2026-11-03T00:00:00Z', probability: 0.6 },
      ],
      'm1',
    ),
  ]) {
    const png = await renderPng(m);
    assert.deepEqual([...png.slice(1, 4)], [80, 78, 71], `${m.kind} is a PNG`);
    assert.ok(png.length > 2000);
  }
});

test('charts: formats return the right shape', async () => {
  const json = await renderChart(heat, 'json');
  assert.ok(json.data.chart && json.data.vega_lite && json.data.svg.startsWith('<svg'));
  const svg = await renderChart(heat, 'svg', 'light');
  assert.match(svg.raw.contentType, /image\/svg\+xml/);
  const png = await renderChart(heat, 'png');
  assert.equal(png.raw.contentType, 'image/png');
  const vega = await renderChart(heat, 'vega');
  assert.ok(vega.data.$schema);
});

/* ── registry: chart routes match the data they wrap ───────────────── */

test('registry: each chart route has the scope, delay and params of its data route', () => {
  const charts = reg.ENDPOINTS.filter((e) => e.dimension === 'charts');
  assert.equal(charts.length, 5);
  for (const e of charts) {
    const data = reg.ENDPOINTS.find((x) => x.id === e.wraps);
    assert.ok(data, `${e.id} wraps ${e.wraps}`);
    assert.equal(e.scope, data.scope, `${e.id} scope`);
    assert.equal(Boolean(e.delayed), Boolean(data.delayed), `${e.id} delay`);
    for (const p of e.params.filter((x) => !['format', 'theme'].includes(x)))
      assert.ok(data.params.includes(p), `${e.id} param ${p}`);
    assert.equal(typeof HANDLERS[e.id], 'function');
  }
  const doc = buildOpenApi();
  const fmt = doc.paths['/v1/charts/options-exposure/{ticker}'].get.parameters.find(
    (p) => p.name === 'format',
  );
  assert.deepEqual(fmt.schema.enum, ['json', 'png', 'svg', 'vega']);
});

test('registry: options exposure is restricted to a scope no tier grants', () => {
  const e = reg.ENDPOINTS.find((x) => x.id === 'options.exposure');
  assert.equal(e.scope, 'options');
  assert.ok(RESTRICTED_SCOPES.includes('options'));
  for (const t of Object.values(TIERS)) assert.ok(!t.scopes.includes('options'), t.id);
});

/* ── MCP protocol ──────────────────────────────────────────────────── */

const calls = [];
const fakeCtx = (scopes = ['congress', 'alpha', 'options', 'contracts', 'predictions']) => ({
  key: { scopes },
  run: async (path, params) => {
    calls.push([path, params]);
    if (path.startsWith('/v1/options/exposure/')) {
      return {
        status: 200,
        body: {
          data: { ticker: 'AAPL', ...grid, label: 'Net delta exposure' },
          meta: { limitations: ['x'] },
        },
      };
    }
    if (path.startsWith('/v1/charts/')) return { status: 200, body: { data: { chart: heat } } };
    if (path === '/v1/alpha/signals') {
      return {
        status: 200,
        body: {
          data: [
            {
              id: 's',
              name: 'S',
              version: '1.0.0',
              maturity: 'descriptive',
              status: 'blocked_history',
              measures: 'm',
              gates: [{ gate: 'g', pass: false, observed: 5, required: '10' }],
            },
          ],
        },
      };
    }
    if (path === '/v1/denied')
      return { status: 403, body: { error: { status: 403, code: 'not_in_scope', message: 'no' } } };
    return { status: 200, body: { data: [{ a: 1 }], meta: {} } };
  },
  renderPng: async () => new Uint8Array([137, 80, 78, 71]),
});

const rpc = (method, params, id = 1) => ({ jsonrpc: '2.0', id, method, params });

test('mcp: initialize negotiates the version and declares tools', async () => {
  const r = await mcp.handleMessage(
    rpc('initialize', { protocolVersion: '2025-03-26' }),
    fakeCtx(),
  );
  assert.equal(r.result.protocolVersion, '2025-03-26');
  assert.deepEqual(r.result.capabilities, { tools: { listChanged: false } });
  assert.equal(r.result.serverInfo.name, 'ezana');
  const r2 = await mcp.handleMessage(
    rpc('initialize', { protocolVersion: '1999-01-01' }),
    fakeCtx(),
  );
  assert.equal(r2.result.protocolVersion, mcp.PROTOCOL_VERSIONS[0]);
  assert.equal(
    await mcp.handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }, fakeCtx()),
    null,
  );
  assert.equal((await mcp.handleMessage(rpc('ping'), fakeCtx())).result && true, true);
  assert.equal((await mcp.handleMessage(rpc('nope'), fakeCtx())).error.code, -32601);
  assert.equal((await mcp.handleMessage({ id: 1 }, fakeCtx())).error.code, -32600);
});

test('mcp: tools are listed read-only with input schemas', async () => {
  const r = await mcp.handleMessage(rpc('tools/list'), fakeCtx());
  const names = r.result.tools.map((t) => t.name);
  assert.deepEqual(names, [
    'ezana_list_endpoints',
    'ezana_call_endpoint',
    'ezana_chart',
    'ezana_delta_exposure',
    'ezana_alpha_signals',
  ]);
  for (const t of r.result.tools) {
    assert.equal(t.inputSchema.type, 'object');
    assert.equal(t.annotations.readOnlyHint, true);
  }
});

test('mcp: list endpoints only shows routes in the key scopes', async () => {
  const r = await mcp.handleMessage(
    rpc('tools/call', { name: 'ezana_list_endpoints', arguments: { dimension: 'options' } }),
    fakeCtx(['congress']),
  );
  assert.match(r.result.content[0].text, /No endpoints match/);
  const r2 = await mcp.handleMessage(
    rpc('tools/call', { name: 'ezana_list_endpoints', arguments: { dimension: 'options' } }),
    fakeCtx(),
  );
  assert.match(r2.result.content[0].text, /\/v1\/options\/exposure\/\{ticker\}/);
});

test('mcp: call endpoint validates the path and passes errors through', async () => {
  const bad = await mcp.handleMessage(
    rpc('tools/call', {
      name: 'ezana_call_endpoint',
      arguments: { path: 'https://evil.example/x' },
    }),
    fakeCtx(),
  );
  assert.equal(bad.result.isError, true);
  const dots = await mcp.handleMessage(
    rpc('tools/call', { name: 'ezana_call_endpoint', arguments: { path: '/v1/../api/admin' } }),
    fakeCtx(),
  );
  assert.equal(dots.result.isError, true);
  const denied = await mcp.handleMessage(
    rpc('tools/call', { name: 'ezana_call_endpoint', arguments: { path: '/v1/denied' } }),
    fakeCtx(),
  );
  assert.match(denied.result.content[0].text, /403 not_in_scope/);
  const okr = await mcp.handleMessage(
    rpc('tools/call', {
      name: 'ezana_call_endpoint',
      arguments: { path: '/v1/congress/trades', params: { limit: 2 } },
    }),
    fakeCtx(),
  );
  assert.deepEqual(okr.result.structuredContent.data, [{ a: 1 }]);
  assert.deepEqual(calls.at(-1), ['/v1/congress/trades', { limit: '2' }]);
});

test('mcp: charts and delta exposure return an image and a table', async () => {
  const ch = await mcp.handleMessage(
    rpc('tools/call', {
      name: 'ezana_chart',
      arguments: { chart: 'options-exposure', ticker: 'AAPL' },
    }),
    fakeCtx(),
  );
  assert.equal(ch.result.content[0].type, 'image');
  assert.equal(ch.result.content[0].mimeType, 'image/png');
  assert.deepEqual(calls.at(-1), ['/v1/charts/options-exposure/AAPL', { format: 'json' }]);
  const missing = await mcp.handleMessage(
    rpc('tools/call', { name: 'ezana_chart', arguments: { chart: 'contracts' } }),
    fakeCtx(),
  );
  assert.equal(missing.result.isError, true);
  const dx = await mcp.handleMessage(
    rpc('tools/call', {
      name: 'ezana_delta_exposure',
      arguments: { ticker: 'AAPL', mode: 'net_delta' },
    }),
    fakeCtx(),
  );
  assert.equal(dx.result.content[0].type, 'image');
  assert.match(dx.result.content[1].text, /\| Strike \| 2026-12-18 \| 2027-01-15 \|/);
  assert.match(dx.result.content[1].text, /\| 215 \| \+50K \| \+18K \|/);
  const noImg = await mcp.handleMessage(
    rpc('tools/call', {
      name: 'ezana_delta_exposure',
      arguments: { ticker: 'AAPL', chart: false },
    }),
    fakeCtx(),
  );
  assert.equal(noImg.result.content[0].type, 'text');
});

test('mcp: alpha signals summarise the blocking gate', async () => {
  const r = await mcp.handleMessage(
    rpc('tools/call', { name: 'ezana_alpha_signals', arguments: {} }),
    fakeCtx(),
  );
  assert.match(r.result.content[0].text, /Gate: g: 5 \(needs 10\)/);
});
