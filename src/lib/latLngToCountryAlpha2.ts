import bbox from "@turf/bbox";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import countries from "i18n-iso-countries";
import * as topojson from "topojson-client";
import countriesTopo from "world-atlas/countries-110m.json";

type Bboxed = {
  feature: {
    type: "Feature";
    id?: string | number;
    geometry: { type: string; coordinates: unknown };
    properties: Record<string, unknown> | null;
  };
  bbox: [number, number, number, number];
  alpha2: string | null;
};

let indexed: Bboxed[] | null = null;

function bboxArea(b: [number, number, number, number]): number {
  return (b[2] - b[0]) * (b[3] - b[1]);
}

function initIndexed(): Bboxed[] {
  const topo = countriesTopo as { objects: { countries: object } };
  const geo = topojson.feature(countriesTopo as never, topo.objects.countries) as {
    features: Bboxed["feature"][];
  };
  const rows: Bboxed[] = geo.features.map((feature) => ({
    feature,
    bbox: bbox(feature) as [number, number, number, number],
    alpha2: feature.id != null ? countries.numericToAlpha2(String(feature.id)) : null,
  }));
  rows.sort((a, b) => bboxArea(a.bbox) - bboxArea(b.bbox));
  return rows;
}

const isoCache = new Map<string, string | null>();

/** Resolve ISO 3166-1 alpha-2 for a WGS84 point (lng, lat). Cached per rounded coordinate. */
export function latLngToAlpha2Cached(lng: number, lat: number): string | null {
  const key = `${lng.toFixed(3)},${lat.toFixed(3)}`;
  const hit = isoCache.get(key);
  if (hit !== undefined) return hit;

  if (!indexed) indexed = initIndexed();

  const pt = turfPoint([lng, lat]);
  for (const { feature, bbox: b, alpha2 } of indexed) {
    if (!alpha2 || !feature.geometry) continue;
    if (lng < b[0] || lat < b[1] || lng > b[2] || lat > b[3]) continue;
    if (booleanPointInPolygon(pt, feature as Parameters<typeof booleanPointInPolygon>[1])) {
      isoCache.set(key, alpha2);
      return alpha2;
    }
  }
  isoCache.set(key, null);
  return null;
}
