/**
 * Land outline for the Eyes Above maps: world-atlas land-110m projected
 * equirectangular onto a 360 x 150 viewBox (longitude -180..180, latitude
 * 85..-65; x = lon + 180, y = 85 - lat). Built on the server and passed to
 * the page as one SVG path string, so the topology never ships to the client.
 * A ring that jumps the antimeridian starts a new subpath instead of drawing
 * a line across the map.
 */
import { feature } from 'topojson-client';
import land from 'world-atlas/land-110m.json';

export const MAP_TOP = 85;
export const MAP_BOTTOM = -65;
export const MAP_W = 360;
export const MAP_H = MAP_TOP - MAP_BOTTOM;

const r1 = (v) => Math.round(v * 10) / 10;

let cached = null;

export function worldLandPath() {
  if (cached) return cached;
  const geo = feature(land, land.objects.land);
  const parts = [];
  const ring = (coords) => {
    let prev = null;
    let d = '';
    for (const [lon, lat] of coords) {
      const x = r1(lon + 180);
      const y = r1(MAP_TOP - Math.max(MAP_BOTTOM, Math.min(MAP_TOP, lat)));
      d += `${prev == null || Math.abs(lon - prev) > 180 ? 'M' : 'L'}${x} ${y}`;
      prev = lon;
    }
    parts.push(`${d}Z`);
  };
  for (const f of geo.features) {
    const g = f.geometry;
    const polys =
      g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    for (const poly of polys) {
      /* Antarctica (the one landmass reaching below 80S) sits off the map. */
      if (poly[0].some(([, lat]) => lat < -80)) continue;
      for (const r of poly) ring(r);
    }
  }
  cached = parts.join('');
  return cached;
}
