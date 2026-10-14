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
    for (const poly of polys) {
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
    if (d) countries.push({ name, d });
  }
  const points = Object.entries(SMALL_JURISDICTIONS).map(([name, [lon, lat]]) => ({
    name,
    ...project(lon, lat),
  }));
  cached = { w: MAP_W, h: MAP_H, countries, points };
  return cached;
}
