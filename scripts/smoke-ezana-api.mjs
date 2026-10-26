#!/usr/bin/env node
/**
 * Live smoke test for the Ezana API: calls EVERY registry route once with
 * sensible example params and prints one row per route (path, status, rows,
 * ms, as_of). Run by hand against a preview or production; not part of CI.
 *
 *   EZANA_API_KEY=ezk_live_... node scripts/smoke-ezana-api.mjs
 *   EZANA_API_BASE=https://<preview>.vercel.app node scripts/smoke-ezana-api.mjs
 *
 * Use a key whose tier covers every scope (Quant Firm or Institution), or
 * routes outside its scopes show 403. Asserts per route: 200 (or 404 where a
 * sample id is deliberately unknown), data is an array or object, meta.as_of
 * present; and p95 latency under 800ms after one warm-up pass. Exit code 1 on
 * any failure.
 */
import { register } from 'node:module';

register('./mobile-node-loader.mjs', import.meta.url);
const { ENDPOINTS } = await import('../src/lib/ezana-api/registry.js');

const BASE = (process.env.EZANA_API_BASE || 'https://ezana.world').replace(/\/$/, '');
const KEY = process.env.EZANA_API_KEY;
if (!KEY) {
  console.error('Set EZANA_API_KEY (a Quant Firm or Institution key covers every scope).');
  process.exit(2);
}

/* Default sample per path placeholder. */
const PLACEHOLDER = {
  ticker: 'LMT',
  country: 'DNK',
  cik: '0001067983',
  key: 'kalshi:CONTROLH-2026',
  dimension: 'economic_output',
};

/* Per-route overrides: query string, explicit path values, or a list route
   to read a real id from ({ from: routeId, field: 'id', as: 'id' }). */
const SAMPLES = {
  'congress.trade': { from: 'congress.trades', field: 'id', as: 'id' },
  'congress.member_trades': { path: { id: 'P000197' } },
  'congress.committee_activity': { path: { id: 'HSAS' } },
  'lobbying.filing': { from: 'lobbying.filings', field: 'uuid', as: 'uuid' },
  'fec.candidate_funding': { path: { id: 'P000197' } },
  'contracts.recipient': { from: 'contracts.awards', field: 'recipient.id', as: 'id' },
  'predictions.market': { path: { id: '562802' } },
  'predictions.market_history': { path: { id: '562802' }, query: 'interval=1d' },
  'predictions.consensus': { query: 'ids=562802,kalshi:CONTROLH-2026-D' },
  'predictions.markets': { query: 'category=elections&sort=volume_24h&limit=5' },
  'predictions.movers': { query: 'window=24h&limit=5' },
  'predictions.events': { query: 'sort=volume_24h&limit=5' },
  'congress.member_portfolio': { path: { id: 'P000197' } },
  'congress.member_similar': { path: { id: 'P000197' } },
  'congress.committee_holdings': { path: { id: 'HSAS' } },
  'lobbying.client': { from: 'lobbying.filings', field: 'client.id', as: 'id' },
  'lobbying.registrant': { from: 'lobbying.filings', field: 'registrant.id', as: 'id' },
  'fec.candidate_donors': { path: { id: 'P000197' } },
  'fec.candidate_outside': { path: { id: 'P000197' } },
  'etf.holdings': { from: 'etf.funds', field: 'ticker', as: 'ticker' },
  'etf.overlap': { query: 'a=SCHD&b=QUAL' },
  'supply_chain.port_daily': { from: 'supply_chain.ports', field: 'portid', as: 'portid' },
  'supply_chain.freight_history': { from: 'supply_chain.freight', field: 'id', as: 'series' },
  'real_estate.history': { from: 'real_estate.indicators', field: 'id', as: 'series' },
  'night_lights.region': { from: 'night_lights.regions', field: 'id', as: 'id' },
  'macro.oecd_observations': {
    from: 'macro.oecd_series',
    field: 'slug',
    as: 'slug',
    query: 'iso3=DNK&limit=5',
  },
  'macro.oecd_ranking': { from: 'macro.oecd_series', field: 'slug', as: 'slug', query: 'limit=5' },
  'empire.compare': { query: 'a=DNK&b=SWE' },
  'sanctions.entity': { from: 'sanctions.entities', field: 'id', as: 'id' },
  'cross.composite': { path: { ticker: 'LMT' } },
};

const get = (obj, dotted) => dotted.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

async function call(path) {
  const t0 = performance.now();
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${KEY}` } });
  const ms = Math.round(performance.now() - t0);
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, ms, body };
}

const firstRows = new Map();

async function urlFor(e) {
  const s = SAMPLES[e.id] || {};
  const values = { ...PLACEHOLDER, ...(s.path || {}) };
  if (s.from) {
    let rows = firstRows.get(s.from);
    if (!rows) {
      const src = ENDPOINTS.find((x) => x.id === s.from);
      const r = await call(`${src.path}?limit=1`);
      rows = Array.isArray(r.body?.data) ? r.body.data : [];
      firstRows.set(s.from, rows);
    }
    const v = rows[0] ? get(rows[0], s.field) : null;
    if (v != null) values[s.as] = String(v);
  }
  let path = e.path.replace(/\{([a-z_]+)\}/g, (_, n) =>
    encodeURIComponent(values[n] ?? 'unknown-sample'),
  );
  const query = s.query ?? (e.params?.includes('limit') ? 'limit=5' : '');
  if (query) path += `?${query}`;
  return path;
}

const results = [];
for (const pass of ['warm-up', 'measured']) {
  for (const e of ENDPOINTS) {
    // eslint-disable-next-line no-await-in-loop
    const path = await urlFor(e);
    // eslint-disable-next-line no-await-in-loop
    const r = await call(path);
    if (pass === 'measured') results.push({ e, path, ...r });
  }
}

let failed = 0;
const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('path', 70)} ${pad('status', 6)} ${pad('rows', 5)} ${pad('ms', 6)} as_of`);
for (const r of results) {
  const d = r.body?.data;
  const rows = Array.isArray(d) ? d.length : d ? 1 : 0;
  const meta = r.body?.meta || {};
  const asOf = meta.as_of ?? meta.updated_at ?? '';
  const note = meta.coverage?.note ? ` (${meta.coverage.note})` : '';
  const okStatus = r.status === 200 || r.status === 404;
  const okShape = r.status !== 200 || (d !== undefined && typeof d === 'object');
  const okAsOf = r.status !== 200 || 'as_of' in meta || 'updated_at' in meta;
  const ok = okStatus && okShape && okAsOf;
  if (!ok) failed += 1;
  console.log(
    `${pad(r.path.slice(0, 70), 70)} ${pad(r.status, 6)} ${pad(rows, 5)} ${pad(r.ms, 6)} ${asOf}${note}${ok ? '' : '  <- FAIL'}`,
  );
}
const sorted = results.map((r) => r.ms).sort((a, b) => a - b);
const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
console.log(`\n${results.length} routes, p95 ${p95}ms, ${failed} failed`);
if (p95 > 800) {
  console.log('p95 is over 800ms');
  failed += 1;
}
process.exit(failed ? 1 : 0);
