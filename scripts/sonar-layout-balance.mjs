/**
 * Sonar answer layout balance (Nov 2026): no answer may run down one narrow column beside
 * empty space. For each query and width this pings /datasets?q=..., waits for the answer,
 * and measures:
 *   1. the three result columns (.snr-col-left, .snr-col-dossier, .snr-stack): the tallest may
 *      not run more than MAX_OVERHANG px past the second tallest;
 *   2. the full-width grids (.snr-cii-grid, the country board .snr-bd-grid): every row of cells spans the grid's width.
 * Writes a screenshot per case to ./test-results/sonar-layout/ and exits non-zero on any failure.
 *
 * Run (dev server or production):
 *   node scripts/sonar-layout-balance.mjs http://localhost:3000
 *   node scripts/sonar-layout-balance.mjs https://ezana.world "Is Turkey's lira under pressure?"
 * Needs the network-reachable app; not part of `npm test`.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const QUERIES = process.argv.slice(3).length
  ? process.argv.slice(3)
  : [
      "Is Turkey's lira under pressure?",
      'How is the German economy doing?',
      'Which countries produce the most crude oil?',
      'What is happening to copper prices?',
      'Is Rosneft sanctioned?',
    ];
const WIDTHS = [1440, 1280, 1024];
const MAX_OVERHANG = 320;
const OUT = 'test-results/sonar-layout';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
let failures = 0;
for (const q of QUERIES) {
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const label = `${q.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}-${width}`;
    try {
      await page.goto(`${BASE}/datasets?q=${encodeURIComponent(q)}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForSelector('.snr-band.snr-stage2', { timeout: 90_000 });
      await page.waitForTimeout(2_500); // entrance motion and late cards
      const m = await page.evaluate(() => {
        const box = (sel) => {
          const el = document.querySelector(`.snr-cols ${sel}`) || document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return r.height > 0 ? { top: r.top + scrollY, bottom: r.bottom + scrollY } : null;
        };
        const cols = ['.snr-col-left', '.snr-col-dossier', '.snr-stack'].map(box).filter(Boolean);
        const grids = [...document.querySelectorAll('.snr-cii-grid, .snr-bd-grid')].map((g) => {
          const gr = g.getBoundingClientRect();
          const rows = new Map();
          for (const c of g.children) {
            const r = c.getBoundingClientRect();
            const k = Math.round(r.top);
            const row = rows.get(k) || { left: Infinity, right: -Infinity };
            row.left = Math.min(row.left, r.left);
            row.right = Math.max(row.right, r.right);
            rows.set(k, row);
          }
          return [...rows.values()].map((r) => ({
            gapLeft: Math.round(r.left - gr.left),
            gapRight: Math.round(gr.right - r.right),
          }));
        });
        return { cols, grids };
      });
      const bottoms = m.cols.map((c) => c.bottom).sort((a, b) => b - a);
      const overhang = bottoms.length >= 2 ? Math.round(bottoms[0] - bottoms[1]) : 0;
      const holes = m.grids.flat().filter((r) => r.gapLeft > 2 || r.gapRight > 2);
      await page.screenshot({ path: `${OUT}/${label}.png`, fullPage: true });
      const ok = overhang <= MAX_OVERHANG && !holes.length;
      if (!ok) failures += 1;
      console.log(
        `${ok ? 'ok  ' : 'FAIL'} ${width}px  ${q}  column overhang ${overhang}px${holes.length ? `, ${holes.length} detail row(s) not full width` : ''}`,
      );
    } catch (err) {
      failures += 1;
      console.log(`FAIL ${width}px  ${q}  ${err.message.split('\n')[0]}`);
    } finally {
      await page.close();
    }
  }
}
await browser.close();
console.log(
  failures
    ? `\n${failures} case(s) failed. Screenshots: ${OUT}/`
    : `\nAll balanced. Screenshots: ${OUT}/`,
);
process.exit(failures ? 1 : 0);
