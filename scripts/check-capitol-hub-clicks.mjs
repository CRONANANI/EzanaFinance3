/**
 * Click-through of the Capitol Watch hub: every button, link and tab inside
 * .cwh-page is clicked once; console errors, failed requests (400 or higher;
 * 401 is expected signed out) and unhandled rejections are recorded per
 * element, and any drawer, card or modal that opened is closed again.
 *
 * Usage (dev or prod server already running):
 *   BASE=http://127.0.0.1:3000 node scripts/check-capitol-hub-clicks.mjs
 *   STORAGE=auth.json ...   a Playwright storage state for a signed-in run
 * Exits 1 when any element reports an error.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const SIGNED_IN = Boolean(process.env.STORAGE);
const SETTLE_MS = Number(process.env.SETTLE_MS || 900);
/* Requests that are not the page's own (error reporting, analytics). */
const IGNORE = /sentry|ingest|monitoring|vercel-insights|_vercel|google|posthog/i;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  storageState: process.env.STORAGE || undefined,
  acceptDownloads: false,
});
const page = await context.newPage();
page.on('dialog', (d) => d.dismiss().catch(() => {}));

let bucket = [];
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (IGNORE.test(t) || /Failed to load resource/.test(t) || /did not match\. Server/.test(t))
    return;
  bucket.push(`console: ${t.slice(0, 160)}`);
});
page.on('pageerror', (e) => bucket.push(`pageerror: ${e.message.slice(0, 160)}`));
page.on('response', (r) => {
  const url = r.url();
  if (IGNORE.test(url) || !url.startsWith(BASE)) return;
  const s = r.status();
  if (s < 400) return;
  if (s === 401 && !SIGNED_IN) return;
  bucket.push(`${s} ${r.request().method()} ${new URL(url).pathname}`);
});

await page.goto(`${BASE}/datasets/capitol-watch`, { waitUntil: 'load', timeout: 180000 });
await page.waitForSelector('.cwh-page', { timeout: 60000 });
await page.waitForTimeout(Number(process.env.WARM_MS || 8000));
const loadErrors = bucket;
bucket = [];

/* Close whatever the click opened, and come back to the hub if it navigated. */
async function reset() {
  await page.waitForLoadState('load').catch(() => {});
  try {
    for (let i = 0; i < 3; i += 1) await page.keyboard.press('Escape');
    for (const sel of [
      '.ccd-close',
      '[aria-label="Close company card"]',
      '.eqb-gate-x',
      '.cwh-sheet-scrim',
    ]) {
      const el = await page.$(sel);
      if (el && (await el.isVisible())) await el.click();
    }
  } catch {
    /* the click navigated away; handled below */
  }
  if (!page.url().startsWith(`${BASE}/datasets/capitol-watch`)) {
    await page.goto(`${BASE}/datasets/capitol-watch`, { waitUntil: 'load', timeout: 180000 });
    await page.waitForSelector('.cwh-page', { timeout: 60000 });
    await page.waitForTimeout(2500);
  }
}

const describe = (el) =>
  el.evaluate((n) => {
    const label = (n.getAttribute('aria-label') || n.textContent || '').replace(/\s+/g, ' ').trim();
    const where = n.closest('section, header, aside')?.querySelector('h2, h3')?.textContent?.trim();
    return `${n.tagName.toLowerCase()} "${label.slice(0, 40)}"${where ? ` in ${where.slice(0, 32)}` : ''}`;
  });

const rows = [];
const seen = new Set();
const handles = await page.$$('.cwh-page button, .cwh-page a[href], .cwh-page [role="tab"]');
for (let i = 0; i < handles.length; i += 1) {
  /* Re-query by index: clicks can re-render the list. */
  const all = await page.$$('.cwh-page button, .cwh-page a[href], .cwh-page [role="tab"]');
  const el = all[i];
  if (!el) break;
  const name = await describe(el).catch(() => `#${i}`);
  if (seen.has(name)) continue;
  seen.add(name);
  const info = await el.evaluate((n) => ({
    href: n.getAttribute('href'),
    download: n.hasAttribute('download'),
    target: n.getAttribute('target'),
    disabled: n.disabled || n.getAttribute('aria-disabled') === 'true',
  }));
  if (info.download || info.target === '_blank' || /^https?:/.test(info.href || '')) {
    rows.push([name, 'skipped (external or download)', '']);
    continue;
  }
  if (info.disabled) {
    rows.push([name, 'disabled', '']);
    continue;
  }
  if (!(await el.isVisible().catch(() => false))) {
    rows.push([name, 'hidden at 1440', '']);
    continue;
  }
  bucket = [];
  let result = 'ok';
  try {
    await el.scrollIntoViewIfNeeded({ timeout: 3000 });
    await el.click({ timeout: 4000 });
    await page.waitForTimeout(SETTLE_MS);
    await page.waitForLoadState('load').catch(() => {});
    if (info.href && !info.href.startsWith('#')) result = `navigates to ${info.href}`;
  } catch (e) {
    result = `click failed: ${e.message.split('\n')[0].slice(0, 60)}`;
  }
  rows.push([name, result, bucket.join('; ')]);
  await reset();
}

const width = (k) => Math.max(...rows.map((r) => r[k].length), 8);
const [w0, w1] = [Math.min(width(0), 70), Math.min(width(1), 40)];
console.log(`Signed ${SIGNED_IN ? 'in' : 'out'} · ${rows.length} elements`);
if (loadErrors.length) console.log(`On load: ${loadErrors.join('; ')}`);
console.log(`${'ELEMENT'.padEnd(w0)}  ${'RESULT'.padEnd(w1)}  ERRORS`);
for (const [a, b, c] of rows)
  console.log(`${a.slice(0, w0).padEnd(w0)}  ${b.slice(0, w1).padEnd(w1)}  ${c || '-'}`);
const bad = rows.filter((r) => r[2] || r[1].startsWith('click failed'));
console.log(`\n${bad.length} with errors, ${loadErrors.length} load errors`);
await browser.close();
process.exit(bad.length || loadErrors.length ? 1 : 0);
