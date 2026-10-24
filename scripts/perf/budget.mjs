/**
 * Performance budget for the dataset pages (Step 4.4). Fails when any
 * dataset route's warm LCP exceeds 1.0 s or its first-load JS exceeds
 * 200 KB. Runs in GitHub Actions against the Vercel preview URL on PRs that
 * touch src/app/datasets/** or src/lib/datasets/**.
 *
 *   BASE_URL=https://<preview>.vercel.app VERCEL_BYPASS=... node scripts/perf/budget.mjs
 */
import { chromium } from 'playwright';
import { datasetRoutes } from './routes.mjs';
import { chromiumPass } from './lab.mjs';

const BASE = (process.env.BASE_URL || '').replace(/\/$/, '');
const LCP_MS = Number(process.env.BUDGET_LCP_MS || 1000);
const JS_KB = Number(process.env.BUDGET_JS_KB || 200);
if (!BASE) {
  console.error('Set BASE_URL to the preview deployment.');
  process.exit(2);
}
const headers = process.env.VERCEL_BYPASS
  ? { 'x-vercel-protection-bypass': process.env.VERCEL_BYPASS }
  : {};

const browser = await chromium.launch();
const failures = [];
for (const r of datasetRoutes()) {
  if (r.skip) continue;
  const url = `${BASE}${r.route}`;
  /* One warm-up load, then the measured (warm) load. */
  await chromiumPass(browser, url, headers).catch(() => null);
  const m = await chromiumPass(browser, url, headers).catch((e) => ({ error: e.message }));
  const over = [];
  if (m.error) over.push(`error ${m.error}`);
  if (m.lcp != null && m.lcp > LCP_MS) over.push(`LCP ${Math.round(m.lcp)} ms > ${LCP_MS}`);
  if (m.jsKb != null && m.jsKb > JS_KB) over.push(`JS ${Math.round(m.jsKb)} KB > ${JS_KB}`);
  console.log(
    `${over.length ? 'FAIL' : 'ok  '} ${r.route}  LCP ${Math.round(m.lcp ?? 0)} ms  JS ${Math.round(m.jsKb ?? 0)} KB`,
  );
  if (over.length) failures.push(`${r.route}: ${over.join(', ')}`);
}
await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} route(s) over budget:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log('\nAll dataset routes within budget.');
