/**
 * Side-panel speed check: the Capitol Watch member drawer and the Politician
 * Tracker member panel must open with their data on screen within 500 ms of
 * the click when the reader has pointed at the name first (warm), which is
 * what the hover prefetch is for. A cold open (no hover) is reported too, for
 * information only.
 *
 * For each of the first N members on each page: hover 250 ms, click, and time
 * until `[data-ready="true"]` appears on the panel; close; next member. The
 * cold pass clicks without hovering, on members the warm pass did not touch.
 *
 * Usage (production server already running, `npm run build && npm start`):
 *   BASE=http://127.0.0.1:3000 node scripts/check-panel-speed.mjs
 *   N=5 BUDGET_MS=500 ...
 * Exits 1 when any warm open exceeds the budget or never becomes ready.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const N = Number(process.env.N || 5);
const BUDGET_MS = Number(process.env.BUDGET_MS || 500);
const HOVER_MS = 250;
const TIMEOUT_MS = 10000;

const PAGES = [
  {
    name: 'Capitol Watch drawer',
    path: '/datasets/capitol-watch',
    /* Member names anywhere on the hub carry data-member. */
    triggers: '.cwh-page [data-member]',
    panel: '.cwh-dr[data-ready="true"]',
    close: async (page) => {
      await page.keyboard.press('Escape');
      await page.waitForSelector('.cwh-dr', { state: 'detached', timeout: 3000 }).catch(() => {});
    },
  },
  {
    name: 'Politician Tracker panel',
    path: '/datasets/politician-tracker',
    triggers: '.ptk-card[data-member], .ptk-row[data-member]',
    panel: '.ptk-panel[data-ready="true"]',
    close: async (page) => {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
    },
  },
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on('dialog', (d) => d.dismiss().catch(() => {}));

async function timeOpen(el, spec, { warm }) {
  await el.scrollIntoViewIfNeeded();
  if (warm) {
    await el.hover();
    await page.waitForTimeout(HOVER_MS);
  }
  const t0 = Date.now();
  await el.click({ force: !warm });
  try {
    await page.waitForSelector(spec.panel, { timeout: TIMEOUT_MS });
    return Date.now() - t0;
  } catch {
    return null;
  } finally {
    await spec.close(page);
  }
}

const rows = [];
let failed = false;
for (const spec of PAGES) {
  await page.goto(`${BASE}${spec.path}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector(spec.triggers, { timeout: 30000 }).catch(() => {});
  /* One trigger per distinct member. */
  const handles = await page.$$(spec.triggers);
  const seen = new Set();
  const list = [];
  for (const h of handles) {
    const id = await h.getAttribute('data-member');
    if (!id || seen.has(id) || !(await h.isVisible())) continue;
    seen.add(id);
    list.push({ id, h });
  }
  if (!list.length) {
    rows.push({ panel: spec.name, member: '(none found)', pass: 'warm', ms: null, ok: false });
    failed = true;
    continue;
  }
  const warm = list.slice(0, N);
  const cold = list.slice(N, N * 2);
  for (const { id, h } of warm) {
    const ms = await timeOpen(h, spec, { warm: true });
    const ok = ms != null && ms <= BUDGET_MS;
    if (!ok) failed = true;
    rows.push({ panel: spec.name, member: id, pass: 'warm', ms, ok });
  }
  for (const { id, h } of cold) {
    const ms = await timeOpen(h, spec, { warm: false });
    rows.push({ panel: spec.name, member: id, pass: 'cold', ms, ok: null });
  }
}
await browser.close();

const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('PANEL', 28)}${pad('MEMBER', 10)}${pad('PASS', 6)}${pad('MS', 8)}RESULT`);
for (const r of rows) {
  const result = r.ok == null ? 'info' : r.ok ? 'ok' : `OVER ${BUDGET_MS} MS`;
  console.log(
    `${pad(r.panel, 28)}${pad(r.member, 10)}${pad(r.pass, 6)}${pad(r.ms ?? 'never', 8)}${result}`,
  );
}
const med = (pass) => {
  const v = rows
    .filter((r) => r.pass === pass && r.ms != null)
    .map((r) => r.ms)
    .sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
};
console.log(`\nmedian warm ${med('warm') ?? 'n/a'} ms, median cold ${med('cold') ?? 'n/a'} ms`);
process.exit(failed ? 1 : 0);
