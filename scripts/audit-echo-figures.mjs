/**
 * Echo figure audit: opens every published article against a running dev
 * server and measures the real text boxes inside every figure SVG, reporting
 * text that runs outside its frame and text that sits on other text. This is
 * how the 2026-10-04 figure fixes were found and verified; run it after
 * touching anything in src/components/echo/figures/.
 *
 *   npm run dev            (in one terminal)
 *   node scripts/audit-echo-figures.mjs [--base http://localhost:3000] [--width 760] [--detail]
 *
 * Exit code 1 when any figure has an issue, so it can gate a commit. Rotated
 * text (axis titles) is skipped: getBBox() reports the unrotated box.
 */
import { chromium } from 'playwright';

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i === -1 ? d : process.argv[i + 1];
};
const BASE = arg('--base', 'http://localhost:3000');
const WIDTH = Number(arg('--width', 760));
const DETAIL = process.argv.includes('--detail');

/* The article list comes from the site's own sitemap, so the audit covers
   exactly what is published (and needs no module aliases to load). */
const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
const PUBLISHED_CURATED_SLUGS = [...xml.matchAll(/\/ezana-echo\/([a-z0-9-]+)<\/loc>/g)].map(
  (m) => m[1],
);
if (!PUBLISHED_CURATED_SLUGS.length) {
  console.error(`No /ezana-echo/<slug> URLs in ${BASE}/sitemap.xml; is the dev server up?`);
  process.exit(2);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH + 32, height: 1200 } });
let total = 0;
let bad = 0;
const byType = {};

for (const slug of PUBLISHED_CURATED_SLUGS) {
  const res = await page.goto(`${BASE}/ezana-echo/${slug}`, { waitUntil: 'networkidle' });
  if (!res || res.status() >= 400) {
    console.log(`!! ${slug}: HTTP ${res?.status()}`);
    continue;
  }
  await page.evaluate(() =>
    document.querySelectorAll('.echo-fig').forEach((f) => f.classList.add('is-revealed')),
  );
  await page.waitForTimeout(1200); // staged draw-ins
  const report = await page.evaluate(() => {
    const out = [];
    for (const fig of document.querySelectorAll('.echo-fig')) {
      const label = fig.querySelector('.echo-fig-label')?.textContent?.trim() || '(unlabelled)';
      const issues = [];
      for (const svg of fig.querySelectorAll('svg')) {
        const vb = svg.viewBox?.baseVal;
        const boxes = [];
        for (const t of svg.querySelectorAll('text')) {
          if (!t.textContent.trim()) continue;
          const cs = getComputedStyle(t);
          if (cs.display === 'none' || cs.opacity === '0' || cs.visibility === 'hidden') continue;
          if ((t.getAttribute('transform') || '').includes('rotate')) continue;
          let bb;
          try {
            bb = t.getBBox();
          } catch {
            continue;
          }
          boxes.push({ t: t.textContent.trim(), x: bb.x, y: bb.y, w: bb.width, h: bb.height });
        }
        if (vb && vb.width) {
          for (const b of boxes) {
            if (b.x < vb.x - 1 || b.x + b.w > vb.x + vb.width + 1)
              issues.push(
                `clipped: "${b.t}" x ${Math.round(b.x)}..${Math.round(b.x + b.w)} of ${vb.width}`,
              );
            if (b.y < vb.y - 1 || b.y + b.h > vb.y + vb.height + 1)
              issues.push(
                `clipped: "${b.t}" y ${Math.round(b.y)}..${Math.round(b.y + b.h)} of ${vb.height}`,
              );
          }
        }
        for (let i = 0; i < boxes.length; i++)
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i];
            const c = boxes[j];
            const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x);
            const oy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
            if (ox > 3 && oy > 3)
              issues.push(`overlap: "${a.t}" × "${c.t}" (${Math.round(ox)}×${Math.round(oy)}px)`);
          }
      }
      out.push({ label, type: fig.className, issues });
    }
    return out;
  });
  for (const r of report) {
    total += 1;
    if (!r.issues.length) continue;
    bad += 1;
    const t = r.label.split('·')[0].trim();
    byType[t] = (byType[t] || 0) + 1;
    console.log(`\n${slug} · ${r.label}`);
    for (const i of r.issues.slice(0, DETAIL ? 50 : 6)) console.log(`   ${i}`);
    if (!DETAIL && r.issues.length > 6)
      console.log(`   … ${r.issues.length - 6} more (run with --detail)`);
  }
}
await browser.close();
console.log(
  `\n${total} figures across ${PUBLISHED_CURATED_SLUGS.length} articles at ${WIDTH}px: ${bad} with issues.`,
);
process.exit(bad ? 1 : 0);
