/**
 * Generates public/images/datasets/mountains-bg.svg, the Sonar page's
 * backdrop mask (Oct 31). Three mountain ranges, far to near, each a ridge
 * silhouette whose fill fades from the crest down, with a bright crest line
 * and two faint contour lines under it. The page draws a dot pattern through
 * this mask (orbital-map.css, .dsi-mountains), so the ranges read as dotted
 * terrain, the same treatment as the old dotted world map. The ranges dip in
 * the middle so the Sonar stage and its dotted globe stay clear.
 *
 * Deterministic (fixed phases): re-running produces the same file.
 *   node scripts/gen-sonar-mountains.mjs
 */
import { writeFileSync } from 'node:fs';

const W = 1600;
const H = 600;
const STEP = 8;

/* Ridged sum of sines: sharp peaks, soft valleys. */
function ridge(x, { base, amp, waves, valley }) {
  let h = 0;
  for (const [f, a, p] of waves) h += a * (1 - Math.abs(Math.sin(x * f + p)));
  const total = waves.reduce((s, [, a]) => s + a, 0);
  const dip = 1 - valley * Math.exp(-(((x - W / 2) / 300) ** 2));
  return base - (h / total) * amp * dip;
}

const LAYERS = [
  {
    id: 'far',
    base: 330,
    amp: 190,
    valley: 0.75,
    alpha: 0.45,
    waves: [
      [0.0021, 1, 0.4],
      [0.0057, 0.55, 1.9],
      [0.013, 0.22, 0.7],
    ],
  },
  {
    id: 'mid',
    base: 420,
    amp: 160,
    valley: 0.8,
    alpha: 0.7,
    waves: [
      [0.0027, 1, 2.2],
      [0.0071, 0.5, 0.3],
      [0.017, 0.2, 1.4],
    ],
  },
  {
    id: 'near',
    base: 520,
    amp: 130,
    valley: 0.85,
    alpha: 1,
    waves: [
      [0.0033, 1, 1.1],
      [0.0089, 0.45, 2.6],
      [0.021, 0.18, 0.2],
    ],
  },
];

const r1 = (n) => Math.round(n * 10) / 10;
const xs = Array.from({ length: W / STEP + 1 }, (_, i) => i * STEP);

function line(layer, offset) {
  return xs.map((x, i) => `${i ? 'L' : 'M'}${x} ${r1(ridge(x, layer) + offset)}`).join('');
}

const defs = [];
const body = [];
for (const L of LAYERS) {
  const crest = line(L, 0);
  defs.push(
    `<linearGradient id="g-${L.id}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="white" stop-opacity="${L.alpha * 0.55}"/>` +
      `<stop offset="0.5" stop-color="white" stop-opacity="${L.alpha * 0.18}"/>` +
      `<stop offset="1" stop-color="white" stop-opacity="0"/>` +
      `</linearGradient>`,
  );
  body.push(`<path d="${crest}L${W} ${H}L0 ${H}Z" fill="url(#g-${L.id})"/>`);
  body.push(
    `<path d="${line(L, 26)}" fill="none" stroke="white" stroke-opacity="${L.alpha * 0.35}" stroke-width="4"/>`,
  );
  body.push(
    `<path d="${line(L, 58)}" fill="none" stroke="white" stroke-opacity="${L.alpha * 0.2}" stroke-width="4"/>`,
  );
  body.push(
    `<path d="${crest}" fill="none" stroke="white" stroke-opacity="${L.alpha}" stroke-width="6" stroke-linejoin="round"/>`,
  );
}

/* Soft left and right edges so the ranges dissolve into the page. */
defs.push(
  `<linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="white" stop-opacity="0"/>` +
    `<stop offset="0.08" stop-color="white"/>` +
    `<stop offset="0.92" stop-color="white"/>` +
    `<stop offset="1" stop-color="white" stop-opacity="0"/>` +
    `</linearGradient>`,
  `<mask id="fade"><rect width="${W}" height="${H}" fill="url(#edge)"/></mask>`,
);

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="none">` +
  `<defs>${defs.join('')}</defs>` +
  `<g mask="url(#fade)">${body.join('')}</g>` +
  `</svg>\n`;

writeFileSync(new URL('../public/images/datasets/mountains-bg.svg', import.meta.url), svg);
console.log(`mountains-bg.svg: ${svg.length} bytes`);
