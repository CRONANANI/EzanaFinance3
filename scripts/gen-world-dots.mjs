// Generates src/lib/sonar/world-dots.js: a 2.5 degree land dot grid tagged by ISO3, for the
// research board's dotted map (Nov 2026). Dev-time only; d3-geo is not a dependency:
//   npm i --no-save d3-geo@3.1.1 && node scripts/gen-world-dots.mjs src/lib/sonar/world-dots.js
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { geoContains, geoBounds, geoCentroid, geoArea } from 'd3-geo';
import countries from 'i18n-iso-countries';
const require = createRequire(import.meta.url);
const world = require('world-atlas/countries-50m.json');
if (!process.argv[2])
  throw new Error('usage: node scripts/gen-world-dots.mjs src/lib/sonar/world-dots.js');
countries.registerLocale(require('i18n-iso-countries/langs/en.json'));

const STEP = 2.5;
const TOP = 82.5; // first row centre latitude
const BOTTOM = -56; // drop Antarctica
const COLS = 360 / STEP;
const ROWS = Math.floor((TOP - BOTTOM) / STEP) + 1;
const out = process.argv[2];

const feats = feature(world, world.objects.countries)
  .features.map((f) => {
    const iso3 = countries.numericToAlpha3(String(f.id).padStart(3, '0'));
    return iso3 && iso3 !== 'ATA' ? { f, iso3, b: geoBounds(f) } : null;
  })
  .filter(Boolean);

const isoList = [...new Set(feats.map((x) => x.iso3))].sort();
const idx = new Map(isoList.map((c, i) => [c, i]));
const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(-1));
const inBox = (b, lon, lat) => {
  const [[x0, y0], [x1, y1]] = b;
  if (lat < y0 - 0.01 || lat > y1 + 0.01) return false;
  return x0 <= x1 ? lon >= x0 - 0.01 && lon <= x1 + 0.01 : lon >= x0 || lon <= x1;
};
for (let r = 0; r < ROWS; r++) {
  const lat = TOP - r * STEP;
  for (let c = 0; c < COLS; c++) {
    const lon = -180 + STEP / 2 + c * STEP;
    for (const x of feats) {
      if (!inBox(x.b, lon, lat)) continue;
      if (geoContains(x.f, [lon, lat])) {
        grid[r][c] = idx.get(x.iso3);
        break;
      }
    }
  }
}
// Every country gets at least one dot: small ones get their centroid's cell.
const have = new Set(grid.flat());
const centroids = {};
for (const x of feats) {
  // centroid of the largest polygon
  const g = x.f.geometry;
  const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
  let best = null;
  for (const p of polys) {
    const pf = { type: 'Feature', geometry: { type: 'Polygon', coordinates: p } };
    const a = geoArea(pf);
    if (!best || a > best.a) best = { a, pf };
  }
  const [lon, lat] = geoCentroid(best.pf);
  const c = Math.max(0, Math.min(COLS - 1, Math.floor((lon + 180) / STEP)));
  const r = Math.max(0, Math.min(ROWS - 1, Math.round((TOP - lat) / STEP)));
  if (!centroids[x.iso3] || best.a > centroids[x.iso3].a) centroids[x.iso3] = { c, r, a: best.a };
}
// Smallest first, so a tiny state never loses its only dot to a larger neighbour; a cell
// already given to another small country is skipped for the nearest free one.
const small = Object.entries(centroids)
  .filter(([iso3]) => !have.has(idx.get(iso3)))
  .sort((a, b) => a[1].a - b[1].a);
const taken = new Set();
const ring = [[0, 0]];
for (let d = 1; d <= 2; d++)
  for (let dr = -d; dr <= d; dr++)
    for (let dc = -d; dc <= d; dc++)
      if (Math.max(Math.abs(dr), Math.abs(dc)) === d) ring.push([dr, dc]);
for (const [iso3, { c, r }] of small) {
  for (const [dr, dc] of ring) {
    const rr = r + dr;
    const cc = (c + dc + COLS) % COLS;
    if (rr < 0 || rr >= ROWS || taken.has(`${rr}.${cc}`)) continue;
    const prev = grid[rr][cc];
    // Never take the last few dots of a neighbour (Qatar beside Bahrain).
    if (prev >= 0 && grid.flat().filter((v) => v === prev).length <= 3) continue;
    grid[rr][cc] = idx.get(iso3);
    taken.add(`${rr}.${cc}`);
    break;
  }
}
// Run-length rows: "start.len.country" tokens, base 36.
const rows = grid.map((row) => {
  const toks = [];
  let c = 0;
  while (c < COLS) {
    if (row[c] < 0) {
      c++;
      continue;
    }
    const v = row[c];
    let e = c;
    while (e + 1 < COLS && row[e + 1] === v) e++;
    toks.push(`${c.toString(36)}.${(e - c + 1).toString(36)}.${v.toString(36)}`);
    c = e + 1;
  }
  return toks.join(' ');
});
// Label anchors: the country's centroid cell (largest landmass).
const anchors = isoList.map((iso) => {
  const a = centroids[iso];
  return `${a.c.toString(36)}.${a.r.toString(36)}`;
});
// Names: English short names plus the forms publishers use.
const names = {};
for (const iso of isoList) {
  const all = countries.getName(iso, 'en', { select: 'all' }) || [];
  for (const n of all) names[n] = iso;
}
Object.assign(names, {
  'United States': 'USA',
  'United States of America': 'USA',
  US: 'USA',
  USA: 'USA',
  'United Kingdom': 'GBR',
  UK: 'GBR',
  Britain: 'GBR',
  Russia: 'RUS',
  'Russian Federation': 'RUS',
  Iran: 'IRN',
  'South Korea': 'KOR',
  'Korea, South': 'KOR',
  'Republic of Korea': 'KOR',
  'North Korea': 'PRK',
  Syria: 'SYR',
  Venezuela: 'VEN',
  Bolivia: 'BOL',
  Vietnam: 'VNM',
  Laos: 'LAO',
  Tanzania: 'TZA',
  Moldova: 'MDA',
  Turkey: 'TUR',
  Türkiye: 'TUR',
  Turkiye: 'TUR',
  'Czech Republic': 'CZE',
  Czechia: 'CZE',
  'Democratic Republic of the Congo': 'COD',
  'DR Congo': 'COD',
  'Congo, Dem. Rep.': 'COD',
  'Republic of the Congo': 'COG',
  'Congo, Rep.': 'COG',
  'Ivory Coast': 'CIV',
  "Cote d'Ivoire": 'CIV',
  Brunei: 'BRN',
  Taiwan: 'TWN',
  'Hong Kong': 'HKG',
  UAE: 'ARE',
  'United Arab Emirates': 'ARE',
  'Saudi Arabia': 'SAU',
  'Egypt, Arab Rep.': 'EGY',
  'Iran, Islamic Rep.': 'IRN',
  'Venezuela, RB': 'VEN',
  'Yemen, Rep.': 'YEM',
  Libya: 'LBY',
  'South Sudan': 'SSD',
  Kosovo: 'XKX',
  Palestine: 'PSE',
  Eswatini: 'SWZ',
  'Cabo Verde': 'CPV',
  'East Timor': 'TLS',
  'Timor-Leste': 'TLS',
  Macedonia: 'MKD',
  'North Macedonia': 'MKD',
  Burma: 'MMR',
  Myanmar: 'MMR',
  'Kyrgyz Republic': 'KGZ',
  'Slovak Republic': 'SVK',
});
const keep = Object.fromEntries(
  Object.entries(names)
    .map(([k, v]) => [
      k
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim(),
      v,
    ])
    .filter(([k, v]) => k && (idx.has(v) || ['HKG', 'XKX'].includes(v))),
);
const src = `/**
 * World dots (Nov 2026): a land dot grid for the research board's dotted map, generated from
 * Natural Earth via world-atlas countries-50m (public domain) by scripts/gen-world-dots.mjs
 * (needs d3-geo, not a dependency: npm i --no-save d3-geo@3.1.1).
 * Generated file: do not edit by hand.
 *
 * Grid: ${STEP} degree cells, equirectangular, ${COLS} columns (180W to 180E) by ${ROWS} rows
 * (${TOP}N to about ${BOTTOM}S, Antarctica dropped). Each row is run-length tokens
 * "start.length.country" in base 36; country is an index into WORLD_ISO3. Every country has
 * at least one dot (small ones get the cell of their centroid). ANCHORS give each country's
 * label cell "col.row" (the centroid of its largest landmass).
 */
export const WORLD_COLS = ${COLS};
export const WORLD_ROWS = ${ROWS};
export const WORLD_ISO3 = ${JSON.stringify(isoList)};
export const WORLD_ANCHORS = ${JSON.stringify(anchors)};
export const WORLD_ROWS_RLE = ${JSON.stringify(rows, null, 0)};
/* Lower-case, accent-free country names (and the forms publishers use) to ISO3. */
export const WORLD_NAMES = ${JSON.stringify(keep)};
`;
fs.writeFileSync(out, src);
console.log(
  'cols',
  COLS,
  'rows',
  ROWS,
  'countries',
  isoList.length,
  'bytes',
  src.length,
  'land',
  grid.flat().filter((v) => v >= 0).length,
);
