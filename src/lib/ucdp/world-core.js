/**
 * Country outlines keyed by ISO3 for the Armed Conflict Tracker map: world-atlas
 * countries-110m on the same 360 x 150 equirectangular viewBox as the Sanctions and Eyes Above
 * maps (x = lon + 180, y = 85 - lat), so map cells (lat, lon) land on it directly. Built on
 * the server once and handed to the page as one path string per country.
 */
import { feature } from 'topojson-client';
import countries from 'i18n-iso-countries';
/* The same viewBox as src/lib/eyes/world-path.js (imported there with its land topology,
   which this pure module must not load). */
const MAP_TOP = 85;
const MAP_BOTTOM = -65;
const MAP_W = 360;
const MAP_H = MAP_TOP - MAP_BOTTOM;

const r1 = (v) => Math.round(v * 10) / 10;
const project = (lon, lat) =>
  `${r1(lon + 180)} ${r1(MAP_TOP - Math.max(MAP_BOTTOM, Math.min(MAP_TOP, lat)))}`;
/* Outlines without an ISO numeric code in world-atlas. */
const NAME_ISO3 = { Kosovo: 'XKX', 'N. Cyprus': 'CYP', Somaliland: 'SOM' };

/** Build from a world-atlas topology (pure; the tests pass the JSON in). */
export function buildConflictWorld(topology) {
  const geo = feature(topology, topology.objects.countries);
  const out = [];
  for (const f of geo.features) {
    const name = f.properties?.name;
    if (!name || name === 'Antarctica' || !f.geometry) continue;
    const iso3 =
      countries.numericToAlpha3(String(f.id || '').padStart(3, '0')) || NAME_ISO3[name] || null;
    const g = f.geometry;
    const polys =
      g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    let d = '';
    for (const poly of polys) {
      for (const ring of poly) {
        let prev = null;
        let last = '';
        for (const [lon, lat] of ring) {
          const pt = project(lon, lat);
          const jump = prev == null || Math.abs(lon - prev) > 180;
          prev = lon;
          if (!jump && pt === last) continue;
          d += `${jump ? 'M' : 'L'}${pt}`;
          last = pt;
        }
        d += 'Z';
      }
    }
    if (d) out.push({ iso3, name, d });
  }
  return { w: MAP_W, h: MAP_H, countries: out };
}
