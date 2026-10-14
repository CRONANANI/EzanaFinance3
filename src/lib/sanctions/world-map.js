/**
 * Country outlines for the Sanctions map: world-atlas countries-110m projected
 * equirectangular onto the same 360 x 150 viewBox as src/lib/eyes/world-path.js
 * (x = lon + 180, y = 85 - lat). Built on the server and handed to the page as
 * one path string per country, so the topology never ships to the client.
 * Antarctica is dropped; a ring that jumps the antimeridian starts a new
 * subpath instead of drawing a line across the map.
 */
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';
import { MAP_BOTTOM, MAP_H, MAP_TOP, MAP_W } from '@/lib/eyes/world-path';
import { SMALL_JURISDICTIONS } from './programs';

const r1 = (v) => Math.round(v * 10) / 10;
const project = (lon, lat) => ({
  x: r1(lon + 180),
  y: r1(MAP_TOP - Math.max(MAP_BOTTOM, Math.min(MAP_TOP, lat))),
});

let cached = null;

/* Area-weighted centroid of a ring (shoelace), with its area, so a
   country's marker sits inside its largest landmass: metropolitan France,
   not French Guiana; mainland US, not Alaska. Longitudes are unwrapped
   across the antimeridian first (Russia's and Fiji's rings cross it), and
   the result is wrapped back onto the map. */
function ringCentroid(ring) {
  let offset = 0;
  let prev = null;
  const pts = ring.map(([lon, lat]) => {
    let u = lon + offset;
    if (prev != null && u - prev > 180) {
      offset -= 360;
      u -= 360;
    } else if (prev != null && u - prev < -180) {
      offset += 360;
      u += 360;
    }
    prev = u;
    return { x: u + 180, y: project(0, lat).y };
  });
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const f = pts[j].x * pts[i].y - pts[i].x * pts[j].y;
    a += f;
    cx += (pts[j].x + pts[i].x) * f;
    cy += (pts[j].y + pts[i].y) * f;
  }
  if (!a) return null;
  const x = (((cx / (3 * a)) % 360) + 360) % 360;
  return { area: Math.abs(a / 2), x, y: cy / (3 * a) };
}

export function worldCountries() {
  if (cached) return cached;
  const geo = feature(world, world.objects.countries);
  const countries = [];
  for (const f of geo.features) {
    const name = f.properties?.name;
    if (!name || name === 'Antarctica') continue;
    const g = f.geometry;
    if (!g) continue;
    const polys =
      g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    let d = '';
    let best = null;
    for (const poly of polys) {
      const c = poly[0] ? ringCentroid(poly[0]) : null;
      if (c && (!best || c.area > best.area)) best = c;
      for (const ring of poly) {
        let prev = null;
        let last = '';
        for (const [lon, lat] of ring) {
          const p = project(lon, lat);
          const jump = prev == null || Math.abs(lon - prev) > 180;
          const pt = `${p.x} ${p.y}`;
          prev = lon;
          /* Points that round onto the previous one add bytes, not shape. */
          if (!jump && pt === last) continue;
          d += `${jump ? 'M' : 'L'}${pt}`;
          last = pt;
        }
        d += 'Z';
      }
    }
    if (d) {
      countries.push({
        name,
        d,
        cx: best ? r1(best.x) : null,
        cy: best ? r1(best.y) : null,
      });
    }
  }
  const points = Object.entries(SMALL_JURISDICTIONS).map(([name, [lon, lat]]) => ({
    name,
    ...project(lon, lat),
  }));
  cached = { w: MAP_W, h: MAP_H, countries, points };
  return cached;
}
