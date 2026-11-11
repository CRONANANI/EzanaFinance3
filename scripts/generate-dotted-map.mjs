#!/usr/bin/env node
/**
 * Regenerate the dotted world assets from ONE geometry
 * (src/lib/geo/dotted-world.js). Nov 2026.
 *
 *   node --no-warnings scripts/generate-dotted-map.mjs            # data + hero SVGs
 *   node --no-warnings scripts/generate-dotted-map.mjs --data     # data JSON only
 *   node --no-warnings scripts/generate-dotted-map.mjs --hero     # hero SVGs only
 *   node --no-warnings scripts/generate-dotted-map.mjs --hero --hero-style=jitter --out-dir=/tmp/x
 *
 * Outputs:
 *   src/lib/geo/dotted-world-data.json
 *     The land mask (bitset) and the dot-to-country table (run-length) for
 *     the 170-row diagonal lattice, plus the projection numbers. The Market
 *     Analysis map reads this instead of building the lattice in the
 *     browser (that took ~66k point-in-polygon tests on the main thread).
 *   public/images/landing/hero-dotted-map-{sparse,dense}.svg
 *     The landing hero's static layer (see HeroDottedMap.jsx for why it is a
 *     file). The default `lattice` style reproduces the shipped assets byte
 *     for byte; `jitter` writes the jittered field the app map uses, for
 *     comparison. Only replace the shipped files after checking the result
 *     at the hero's size.
 *
 * The country table uses the same lookup the map used to run in the browser
 * (the former src/lib/latLngToCountryAlpha2.ts, removed now that this runs at
 * build time): world-atlas 110m countries, smallest bounding box first,
 * point in polygon at each cell's exact lattice point.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import DottedMap, { getMapJSON } from 'dotted-map';
import proj4 from 'proj4';
import bbox from '@turf/bbox';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point as turfPoint } from '@turf/helpers';
import * as topojson from 'topojson-client';
import {
  MAP_ROWS,
  MAP_GRID,
  LATTICE_RADIUS,
  packWorldData,
  buildWorld,
  latticeSvg,
  dotsSvg,
  sampleDots,
} from '../src/lib/geo/dotted-world.js';

const require = createRequire(import.meta.url);
const countries = require('i18n-iso-countries');
const countriesTopo = require('world-atlas/countries-110m.json');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, dflt) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
};
const doData = flag('data') || !flag('hero');
const doHero = flag('hero') || !flag('data');
const heroStyle = opt('hero-style', 'lattice');
const outDir = path.resolve(ROOT, opt('out-dir', 'public/images/landing'));

/* Hero colours: dark-ish emerald on the light landing ground; phones get the
   denser (darker) variant. Unchanged from the shipped assets. */
const HERO = {
  sparse: 'rgba(5, 150, 105, 0.7)',
  dense: 'rgba(4, 120, 87, 0.92)',
};

function makeIsoLookup() {
  const geo = topojson.feature(countriesTopo, countriesTopo.objects.countries);
  const rows = geo.features.map((feature) => ({
    feature,
    bbox: bbox(feature),
    alpha2: feature.id != null ? countries.numericToAlpha2(String(feature.id)) : null,
  }));
  const area = (b) => (b[2] - b[0]) * (b[3] - b[1]);
  rows.sort((a, b) => area(a.bbox) - area(b.bbox));
  return (lng, lat) => {
    const pt = turfPoint([lng, lat]);
    for (const { feature, bbox: b, alpha2 } of rows) {
      if (!alpha2 || !feature.geometry) continue;
      if (lng < b[0] || lat < b[1] || lng > b[2] || lat > b[3]) continue;
      if (booleanPointInPolygon(pt, feature)) return alpha2;
    }
    return null;
  };
}

const dataPath = path.join(ROOT, 'src/lib/geo/dotted-world-data.json');

if (doData) {
  const t0 = Date.now();
  const mapJson = JSON.parse(getMapJSON({ height: MAP_ROWS, grid: MAP_GRID }));
  const proj4String = new DottedMap({ height: MAP_ROWS, grid: MAP_GRID }).proj4String;
  const isoAt = makeIsoLookup();
  const data = packWorldData(mapJson, (x, y) => {
    const [lng, lat] = proj4(proj4String, 'WGS84', [
      (x * mapJson.X_RANGE) / mapJson.width + mapJson.X_MIN,
      mapJson.Y_MAX - (y * mapJson.Y_RANGE) / mapJson.height,
    ]);
    return isoAt(lng, lat);
  });
  fs.writeFileSync(dataPath, `${JSON.stringify(data)}\n`);
  const kb = (fs.statSync(dataPath).size / 1024).toFixed(1);
  console.log(
    `data: ${Object.keys(mapJson.points).length} land cells, ${kb} KB, ${Date.now() - t0} ms`,
  );
}

if (doHero) {
  const world = buildWorld(JSON.parse(fs.readFileSync(dataPath, 'utf8')));
  fs.mkdirSync(outDir, { recursive: true });
  for (const [variant, color] of Object.entries(HERO)) {
    const svg =
      heroStyle === 'jitter'
        ? dotsSvg(world, sampleDots(world, 1), { color, radius: LATTICE_RADIUS * 1.05 })
        : latticeSvg(world, { color, radius: LATTICE_RADIUS });
    const file = path.join(outDir, `hero-dotted-map-${variant}.svg`);
    fs.writeFileSync(file, svg);
    console.log(`hero (${heroStyle}): ${file} ${(svg.length / 1024).toFixed(0)} KB`);
  }
}
