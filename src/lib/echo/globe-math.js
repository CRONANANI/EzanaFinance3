/**
 * Ezana Echo article globe: the projection cobe 2.0 uses, in plain functions
 * (no DOM, no WebGL), so CobeGlobe can place labels, hit-test clicks and turn
 * to a city exactly where cobe draws its markers, and so the maths is tested
 * (scripts/check-echo-globe.mjs).
 */
export const BASE_THETA = 0.2;
export const MAX_THETA = 0.9;
export const MARKER_ELEVATION = 0.02;
export const RADIUS = 0.8; // cobe's globe radius in clip space

/** cobe's lat/lng to unit sphere (cobe 2.0 `U`). */
function toSphere(lat, lng) {
  const r = (lat * Math.PI) / 180;
  const a = (lng * Math.PI) / 180 - Math.PI;
  const c = Math.cos(r);
  return [-c * Math.cos(a), Math.sin(r), c * Math.sin(a)];
}

/**
 * Where a place sits on the canvas, as fractions of its width and height,
 * and whether it faces the viewer (cobe 2.0 `O`, square canvas, scale 1,
 * no offset). `depth` is the facing component, 0 at the rim.
 */
export function locationToScreen(lat, lng, phi, theta, radius = RADIUS + MARKER_ELEVATION) {
  const [px, py, pz] = toSphere(lat, lng).map((v) => v * radius);
  const ct = Math.cos(theta);
  const cp = Math.cos(phi);
  const st = Math.sin(theta);
  const sp = Math.sin(phi);
  const x = cp * px + sp * pz;
  const y = sp * st * px + ct * py - cp * st * pz;
  const z = -sp * ct * px + st * py + cp * ct * pz;
  return { x: (x + 1) / 2, y: (-y + 1) / 2, depth: z / radius, visible: z >= 0 };
}

/** The rotation that puts a place front and centre (cobe's own recipe). */
export function focusAngles(lat, lng) {
  const phi = Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2);
  const theta = Math.max(-MAX_THETA, Math.min(MAX_THETA, (lat * Math.PI) / 180));
  return { phi, theta };
}

/** The shortest signed turn from `from` to `to`, in radians. */
export function shortestTurn(from, to) {
  const t = Math.PI * 2;
  return ((((to - from) % t) + t * 1.5) % t) - Math.PI;
}
