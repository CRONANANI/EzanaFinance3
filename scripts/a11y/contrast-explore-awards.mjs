/**
 * Contrast check for the Government Contracts "Explore all awards" card.
 * Resolves the card's tokens from src/app/theme-variables.css in dark (the
 * :root default) and light (body.light-mode) with headless Chromium, then
 * computes WCAG ratios for each text/background pair.
 *   node scripts/a11y/contrast-explore-awards.mjs
 */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const css = readFileSync('src/app/theme-variables.css', 'utf8');
const PAIRS = [
  ['Title / body ink', '--text-primary', '--bg-primary', 4.5],
  ['Table cells', '--text-secondary', '--bg-primary', 4.5],
  ['Labels, headers, placeholders', '--text-muted', '--bg-primary', 4.5],
  ['Header row labels', '--text-muted', '--bg-secondary', 4.5],
  ['Amount column (emerald text)', '--emerald-text', '--bg-primary', 4.5],
  ['Count (emerald text)', '--emerald-text', '--bg-primary', 3],
  ['Input text on field', '--text-primary', '--surface-input', 4.5],
  ['Input and pager button borders (UI control)', '--text-muted', '--bg-primary', 3],
  ['Focus ring (emerald)', '--emerald-text', '--surface-input', 3],
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(
  `<html><head><style>${css}</style></head><body><div id="p"></div></body></html>`,
);
const out = {};
for (const mode of ['dark', 'light']) {
  out[mode] = await page.evaluate(
    ({ mode: m, pairs }) => {
      document.body.className = m === 'light' ? 'light-mode' : '';
      const probe = document.getElementById('p');
      const rgb = (v) => {
        probe.style.color = `var(${v})`;
        const c = getComputedStyle(probe)
          .color.match(/[\d.]+/g)
          .map(Number);
        return c;
      };
      const lum = ([r, g, b]) => {
        const f = (x) => {
          const s = x / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      /* Alpha colours are composited over the background. */
      const over = (fg, bg) => {
        const a = fg[3] ?? 1;
        return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));
      };
      return pairs.map(([label, fgv, bgv, min]) => {
        const bg = rgb(bgv);
        const fg = over(rgb(fgv), bg);
        const L1 = lum(fg);
        const L2 = lum(bg);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        return {
          label,
          fg: fgv,
          bg: bgv,
          ratio: Math.round(ratio * 100) / 100,
          min,
          pass: ratio >= min,
        };
      });
    },
    { mode, pairs: PAIRS },
  );
}
await browser.close();
let fail = 0;
for (const [mode, rows] of Object.entries(out)) {
  console.log(`\n${mode}`);
  for (const r of rows) {
    if (!r.pass) fail += 1;
    console.log(
      `${r.pass ? 'PASS' : 'FAIL'}  ${r.ratio.toFixed(2)}:1 (min ${r.min})  ${r.label}  ${r.fg} on ${r.bg}`,
    );
  }
}
process.exit(fail ? 1 : 0);
