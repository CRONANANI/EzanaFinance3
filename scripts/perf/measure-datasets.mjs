/**
 * Measure every dataset page against a deployment (Task 4.0).
 *
 *   BASE_URL=https://ezana.world node scripts/perf/measure-datasets.mjs
 *   BASE_URL=... VERCEL_BYPASS=<protection bypass secret> ...   (preview URLs)
 *   ONLY=/datasets/committees ...                               (one route)
 *   OUT=docs/perf/datasets-after.md ...                         (default: stdout + json)
 *
 * Per route: 3 cold requests (unique cache-busting query) and 5 warm ones,
 * recording TTFB and total HTML time; then one headless Chromium load
 * (desktop viewport, no throttling) recording FCP, LCP, TBT (sum of long
 * tasks over 50 ms), JS transferred and the RSC/HTML document size. When
 * LIGHTHOUSE=1 and the `lighthouse` CLI is on PATH it runs the desktop
 * preset instead of the Chromium pass. Writes a JSON next to the markdown.
 */
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { datasetRoutes } from './routes.mjs';
import { chromiumPass } from './lab.mjs';

const BASE = (process.env.BASE_URL || '').replace(/\/$/, '');
if (!BASE) {
  console.error('Set BASE_URL, e.g. BASE_URL=https://ezana.world');
  process.exit(2);
}
const headers = { 'User-Agent': 'EzanaPerf/1.0' };
if (process.env.VERCEL_BYPASS) headers['x-vercel-protection-bypass'] = process.env.VERCEL_BYPASS;

async function timeRequest(url) {
  const t0 = performance.now();
  const res = await fetch(url, { headers, redirect: 'follow' });
  const ttfb = performance.now() - t0; // headers received
  const body = await res.arrayBuffer();
  return {
    status: res.status,
    ttfb,
    total: performance.now() - t0,
    bytes: body.byteLength,
    cache: res.headers.get('x-vercel-cache') || res.headers.get('x-nextjs-cache') || '',
    serverTiming: res.headers.get('server-timing') || '',
  };
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};

function lighthousePass(url) {
  const out = execFileSync(
    'lighthouse',
    [url, '--preset=desktop', '--output=json', '--quiet', '--chrome-flags=--headless'],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  const r = JSON.parse(out);
  const a = r.audits;
  const jsBytes = (a['network-requests']?.details?.items || [])
    .filter((i) => i.resourceType === 'Script')
    .reduce((s, i) => s + (i.transferSize || 0), 0);
  return {
    fcp: a['first-contentful-paint']?.numericValue,
    lcp: a['largest-contentful-paint']?.numericValue,
    tbt: a['total-blocking-time']?.numericValue,
    jsKb: jsBytes / 1024,
  };
}

const routes = datasetRoutes().filter((r) => !process.env.ONLY || r.route === process.env.ONLY);
const browser = process.env.LIGHTHOUSE ? null : await chromium.launch();
const rows = [];
for (const r of routes) {
  if (r.skip) {
    rows.push({ route: r.route, skipped: r.skip });
    continue;
  }
  const url = `${BASE}${r.route}`;
  const cold = [];
  for (let i = 0; i < 3; i += 1)
    cold.push(await timeRequest(`${url}?__perf_cold=${Date.now()}${i}`));
  const warm = [];
  for (let i = 0; i < 5; i += 1) warm.push(await timeRequest(url));
  let lab = {};
  try {
    lab = process.env.LIGHTHOUSE ? lighthousePass(url) : await chromiumPass(browser, url, headers);
  } catch (e) {
    lab = { error: String(e?.message || e).slice(0, 120) };
  }
  const row = {
    route: r.route,
    status: warm[0]?.status,
    coldTtfb: median(cold.map((x) => x.ttfb)),
    coldTotal: median(cold.map((x) => x.total)),
    warmTtfb: median(warm.map((x) => x.ttfb)),
    warmTotal: median(warm.map((x) => x.total)),
    htmlKb: (warm[0]?.bytes || 0) / 1024,
    cache: warm.map((x) => x.cache).join(','),
    serverTiming: warm[0]?.serverTiming,
    ...lab,
  };
  rows.push(row);
  console.log(JSON.stringify(row));
}
await browser?.close();

const f = (v) => (v == null || Number.isNaN(v) ? '·' : Math.round(v));
const md = [
  `Measured ${new Date().toISOString()} against ${BASE}`,
  '',
  '| Route | Cold TTFB ms | Warm TTFB ms | Warm HTML ms | FCP ms | LCP ms | TBT ms | HTML KB | JS KB | Cache |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((r) =>
    r.skipped
      ? `| ${r.route} | skipped: ${r.skipped} |||||||||`
      : `| ${r.route} | ${f(r.coldTtfb)} | ${f(r.warmTtfb)} | ${f(r.warmTotal)} | ${f(r.fcp)} | ${f(r.lcp)} | ${f(r.tbt)} | ${f(r.htmlKb)} | ${f(r.jsKb)} | ${r.cache} |`,
  ),
].join('\n');
if (process.env.OUT) {
  writeFileSync(process.env.OUT, `${md}\n`);
  writeFileSync(process.env.OUT.replace(/\.md$/, '.json'), JSON.stringify(rows, null, 2));
}
console.log(`\n${md}`);
