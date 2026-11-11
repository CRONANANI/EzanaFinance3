/**
 * Dotted world geometry, shared by the Market Analysis map (canvas) and the
 * landing hero (pregenerated SVG). Nov 2026.
 *
 * Why this exists: both maps used `new DottedMap({ height: 170, grid:
 * 'diagonal' })`, a perfectly regular hexagonal lattice. Drawn at 1 to 1.4
 * CSS px per dot on the Market Analysis stage, that lattice beats against the
 * screen's pixel grid and the eye joins the dots into rows and diagonals
 * (moire). Building the lattice also ran ~66k point-in-polygon tests on the
 * main thread (about 3 s in Node) before the first paint.
 *
 * What this module does instead:
 *   - The lattice survives only as a LAND MASK and a dot-to-country table,
 *     precomputed by `scripts/generate-dotted-map.mjs` into
 *     `dotted-world-data.json` (bitset + run-length country codes). No
 *     polygon maths at runtime.
 *   - The projection is the library's own: `getPin` comes from
 *     `DottedMapWithoutCountries` built from the same numbers, so financial
 *     centre pins land exactly where they did before.
 *   - Visible dots are a deterministic, fixed-seed JITTERED resample of that
 *     mask (`sampleDots`), spaced in screen pixels by the caller. Same output
 *     on every load, server and client.
 *
 * Plain JS (no JSX, no TS) so the Node generator and tests can import it.
 */
import DottedMapWithoutCountries from 'dotted-map/without-countries';
import proj4 from 'proj4';

/** The lattice the mask is built from (unchanged from the old renderer). */
export const MAP_ROWS = 170;
export const MAP_GRID = 'diagonal';
/** Radius the old lattice SVG used, in grid units (hero assets). */
export const LATTICE_RADIUS = 0.18;
/** Maximum jitter, as a fraction of the sample spacing. */
export const DEFAULT_JITTER = 0.35;

const SQRT3_2 = Math.sqrt(3) / 2;

/* ---------------------------------------------------------------- codecs */

function toBase64(bytes) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromBase64(str) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(str, 'base64'));
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Booleans (length n) to a base64 bitset, LSB first. */
export function encodeBits(bits) {
  const bytes = new Uint8Array(Math.ceil(bits.length / 8));
  for (let i = 0; i < bits.length; i++) if (bits[i]) bytes[i >> 3] |= 1 << (i & 7);
  return toBase64(bytes);
}

export function decodeBits(str, n) {
  const bytes = fromBase64(str);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = (bytes[i >> 3] >> (i & 7)) & 1;
  return out;
}

/**
 * Per-cell country codes (string or null) to { codes, runs }: `codes` is the
 * code table (index 0 = no country) and `runs` a base64 stream of
 * [codeIndex u8, runLength u16 LE] triples.
 */
export function encodeIsoRuns(isos) {
  const codes = [null];
  const indexOf = new Map([[null, 0]]);
  const triples = [];
  let prev = -1;
  let len = 0;
  const flush = () => {
    while (len > 0) {
      const take = Math.min(len, 0xffff);
      triples.push(prev, take & 0xff, take >> 8);
      len -= take;
    }
  };
  for (const iso of isos) {
    const key = iso || null;
    if (!indexOf.has(key)) {
      indexOf.set(key, codes.length);
      codes.push(key);
    }
    const idx = indexOf.get(key);
    if (idx !== prev) {
      flush();
      prev = idx;
    }
    len += 1;
  }
  flush();
  return { codes, runs: toBase64(Uint8Array.from(triples)) };
}

export function decodeIsoRuns({ codes, runs }, n) {
  const bytes = fromBase64(runs);
  const out = new Array(n);
  let k = 0;
  for (let i = 0; i + 2 < bytes.length && k < n; i += 3) {
    const code = codes[bytes[i]] ?? null;
    const len = bytes[i + 1] | (bytes[i + 2] << 8);
    for (let j = 0; j < len && k < n; j++) out[k++] = code;
  }
  while (k < n) out[k++] = null;
  return out;
}

/* ------------------------------------------------------------ the world */

/** Number of lattice rows dotted-map iterates (y * ystep < height). */
export function latticeRows(height, ystep) {
  return Math.ceil(height / ystep);
}

/**
 * Serialisable data from a dotted-map `getMap` result plus a per-cell
 * country resolver. Used by the generator; cells are enumerated row-major,
 * the same order dotted-map inserts its points.
 */
export function packWorldData(mapJson, cellIsoOf) {
  const { width, height, ystep, grid } = mapJson;
  const rows = latticeRows(height, ystep);
  const bits = new Uint8Array(rows * width);
  for (const key of Object.keys(mapJson.points)) {
    const [col, row] = key.split(';').map(Number);
    bits[row * width + col] = 1;
  }
  const isos = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < width; col++) {
      if (!bits[row * width + col]) continue;
      const x = row % 2 === 0 && grid === 'diagonal' ? col + 0.5 : col;
      isos.push(cellIsoOf(x, row * ystep));
    }
  }
  return {
    version: 1,
    width,
    height,
    ystep,
    rows,
    grid,
    region: mapJson.region,
    projection: mapJson.projection,
    X_MIN: mapJson.X_MIN,
    Y_MAX: mapJson.Y_MAX,
    X_RANGE: mapJson.X_RANGE,
    Y_RANGE: mapJson.Y_RANGE,
    mask: encodeBits(bits),
    iso: encodeIsoRuns(isos),
  };
}

/** Grid coordinate to WGS84 [lng, lat] with the map's own projection. */
function makeUnproject(d, proj4String) {
  return (x, y) =>
    proj4(proj4String, 'WGS84', [
      (x * d.X_RANGE) / d.width + d.X_MIN,
      d.Y_MAX - (y * d.Y_RANGE) / d.height,
    ]);
}

/**
 * Rebuild the world from packed data. Cheap (no polygon maths): a typed
 * array pass over ~66k cells.
 */
export function buildWorld(data) {
  const { width, height, ystep, rows, grid } = data;
  const bits = decodeBits(data.mask, rows * width);
  const cellIndex = new Int32Array(rows * width).fill(-1);
  let count = 0;
  for (let i = 0; i < bits.length; i++) if (bits[i]) cellIndex[i] = count++;
  const cellX = new Float64Array(count);
  const cellY = new Float64Array(count);
  for (let row = 0, k = 0; row < rows; row++) {
    for (let col = 0; col < width; col++) {
      if (!bits[row * width + col]) continue;
      cellX[k] = row % 2 === 0 && grid === 'diagonal' ? col + 0.5 : col;
      cellY[k] = row * ystep;
      k++;
    }
  }
  const cellIso = decodeIsoRuns(data.iso, count);

  const pinMap = new DottedMapWithoutCountries({
    map: {
      points: {},
      X_MIN: data.X_MIN,
      Y_MAX: data.Y_MAX,
      X_RANGE: data.X_RANGE,
      Y_RANGE: data.Y_RANGE,
      grid,
      width,
      height,
      ystep,
      region: data.region,
      projection: data.projection,
    },
  });

  /** Index of the land cell nearest (x, y) in grid units, or -1 for sea. */
  const cellAt = (x, y) => {
    const row = Math.round(y / ystep);
    if (row < 0 || row >= rows) return -1;
    const col = Math.round(row % 2 === 0 && grid === 'diagonal' ? x - 0.5 : x);
    if (col < 0 || col >= width) return -1;
    return cellIndex[row * width + col];
  };

  return {
    width,
    height,
    ystep,
    rows,
    grid,
    count,
    cellX,
    cellY,
    cellIso,
    cellAt,
    /** Same snapping as the old `map.getPin` (positions unchanged). */
    getPin: (lat, lng) => pinMap.getPin({ lat, lng }),
    unproject: makeUnproject(data, pinMap.proj4String),
    _samples: new Map(),
  };
}

/* -------------------------------------------------------------- sampling */

/** Deterministic hash of three ints to [0, 1). */
function hash3(i, j, seed) {
  let h =
    Math.imul(i | 0, 0x27d4eb2d) ^ Math.imul(j | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * Land dots at `spacing` grid units: a hexagonal sample lattice, each point
 * moved by a fixed-seed random offset of up to `jitter * spacing`, kept only
 * if it still falls on a land cell. Cached per (spacing, jitter, seed).
 * @returns {{ count: number, x: Float32Array, y: Float32Array, cell: Int32Array }}
 */
export function sampleDots(world, spacing, { jitter = DEFAULT_JITTER, seed = 7 } = {}) {
  const key = `${spacing}|${jitter}|${seed}`;
  const hit = world._samples?.get(key);
  if (hit) return hit;
  const s = Math.max(spacing, 0.25);
  const h = s * SQRT3_2;
  const rowsN = Math.ceil(world.height / h) + 1;
  const colsN = Math.ceil(world.width / s) + 1;
  const cap = rowsN * colsN;
  const xs = new Float32Array(cap);
  const ys = new Float32Array(cap);
  const cells = new Int32Array(cap);
  const bucketSeed = seed ^ Math.round(s * 1000);
  let n = 0;
  for (let j = 0; j < rowsN; j++) {
    const y0 = j * h;
    const off = j % 2 ? s / 2 : 0;
    for (let i = 0; i < colsN; i++) {
      const r = jitter * s * Math.sqrt(hash3(i, j, bucketSeed));
      const a = 2 * Math.PI * hash3(i, j, bucketSeed + 1);
      const x = i * s + off + r * Math.cos(a);
      const y = y0 + r * Math.sin(a);
      const c = world.cellAt(x, y);
      if (c < 0) continue;
      xs[n] = x;
      ys[n] = y;
      cells[n] = c;
      n++;
    }
  }
  const out = { count: n, x: xs.subarray(0, n), y: ys.subarray(0, n), cell: cells.subarray(0, n) };
  world._samples?.set(key, out);
  return out;
}

/* ------------------------------------------------------------------ SVG */

const num = (v) => String(Math.round(v * 100) / 100);

/** The original regular-lattice SVG (byte-compatible with the hero assets). */
export function latticeSvg(world, { color, radius = LATTICE_RADIUS }) {
  const r = String(radius).replace(/^0\./, '.');
  let body = '';
  for (let i = 0; i < world.count; i++) {
    body += `<circle cx="${world.cellX[i]}" cy="${world.cellY[i]}" r="${r}"/>`;
  }
  return `<svg viewBox="0 0 ${world.width} ${world.height}" xmlns="http://www.w3.org/2000/svg"><g fill="${color}">${body}</g></svg>`;
}

/** A jittered dot field as compact SVG (coordinates to 2 decimals). */
export function dotsSvg(world, dots, { color, radius }) {
  const r = num(radius).replace(/^0\./, '.');
  let body = '';
  for (let i = 0; i < dots.count; i++) {
    body += `<circle cx="${num(dots.x[i])}" cy="${num(dots.y[i])}" r="${r}"/>`;
  }
  return `<svg viewBox="0 0 ${world.width} ${world.height}" xmlns="http://www.w3.org/2000/svg"><g fill="${color}">${body}</g></svg>`;
}
