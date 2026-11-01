/**
 * Where a pulse signal happened, for the flashes on the Sonar stage's
 * globe (OrbitalMap, Oct 31).
 *
 * A signal is placed at the first country its headline or brief title names;
 * otherwise at its dimension's home market (Capitol Watch and Regulatory
 * Winds in Washington, the market dimensions in New York), which is where
 * the US datasets behind them are about. Nothing is invented: a pulse with no
 * signals flashes nothing.
 *
 * The globe (.dsi-globe, public/images/datasets/worldmap-globe.svg) is an
 * equirectangular world map drawn into a 256 x 108 box at (272, 116) of the
 * stage's 800 x 362 local space, so a longitude and latitude map to it
 * linearly.
 */

export const GLOBE_BOX = { x: 272, y: 116, w: 256, h: 108 };

/* [longitude, latitude] of each capital or main financial centre. */
const PLACES = {
  'United States': [-77.04, 38.9],
  Canada: [-75.7, 45.42],
  Mexico: [-99.13, 19.43],
  Brazil: [-47.88, -15.79],
  Argentina: [-58.38, -34.6],
  Chile: [-70.67, -33.45],
  Colombia: [-74.07, 4.71],
  Peru: [-77.04, -12.05],
  Venezuela: [-66.9, 10.48],
  'United Kingdom': [-0.13, 51.51],
  Ireland: [-6.26, 53.35],
  France: [2.35, 48.86],
  Germany: [13.4, 52.52],
  Netherlands: [4.9, 52.37],
  Belgium: [4.35, 50.85],
  Switzerland: [7.45, 46.95],
  Spain: [-3.7, 40.42],
  Portugal: [-9.14, 38.72],
  Italy: [12.5, 41.9],
  Greece: [23.73, 37.98],
  Poland: [21.01, 52.23],
  Sweden: [18.07, 59.33],
  Norway: [10.75, 59.91],
  Finland: [24.94, 60.17],
  Denmark: [12.57, 55.68],
  Austria: [16.37, 48.21],
  Ukraine: [30.52, 50.45],
  Russia: [37.62, 55.76],
  Turkey: [32.85, 39.93],
  Israel: [35.21, 31.77],
  Iran: [51.39, 35.69],
  Iraq: [44.37, 33.31],
  'Saudi Arabia': [46.68, 24.71],
  'United Arab Emirates': [54.37, 24.45],
  Qatar: [51.53, 25.29],
  Egypt: [31.24, 30.04],
  Nigeria: [7.49, 9.06],
  'South Africa': [28.19, -25.75],
  Kenya: [36.82, -1.29],
  Ethiopia: [38.75, 9.03],
  Morocco: [-6.84, 34.02],
  India: [77.21, 28.61],
  Pakistan: [73.05, 33.68],
  China: [116.4, 39.9],
  'Hong Kong': [114.17, 22.32],
  Taiwan: [121.56, 25.03],
  Japan: [139.69, 35.69],
  'South Korea': [126.98, 37.57],
  'North Korea': [125.75, 39.03],
  Singapore: [103.82, 1.35],
  Indonesia: [106.85, -6.21],
  Malaysia: [101.69, 3.14],
  Thailand: [100.5, 13.76],
  Vietnam: [105.83, 21.03],
  Philippines: [120.98, 14.6],
  Australia: [149.13, -35.28],
  'New Zealand': [174.78, -41.29],
};

/* Other names a headline uses for the same place. */
const ALIASES = {
  'U.S.': 'United States',
  USA: 'United States',
  America: 'United States',
  UK: 'United Kingdom',
  'U.K.': 'United Kingdom',
  Britain: 'United Kingdom',
  England: 'United Kingdom',
  UAE: 'United Arab Emirates',
  Korea: 'South Korea',
  Russian: 'Russia',
  Chinese: 'China',
  Japanese: 'Japan',
  Indian: 'India',
  Brazilian: 'Brazil',
  Mexican: 'Mexico',
  Canadian: 'Canada',
  German: 'Germany',
  French: 'France',
  Israeli: 'Israel',
  Iranian: 'Iran',
  Ukrainian: 'Ukraine',
  Turkish: 'Turkey',
  Eurozone: 'Germany',
};

const HOME = {
  capitol: [-77.04, 38.9],
  regulatory: [-77.04, 38.9],
  titans: [-74.01, 40.71],
  eyes: [-74.01, 40.71],
  whispers: [-74.01, 40.71],
  hive: [-74.01, 40.71],
  lighthouse: [-77.04, 38.9],
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/* Longest names first, so "South Korea" wins over "Korea". */
const NAMES = [...Object.keys(PLACES), ...Object.keys(ALIASES)].sort((a, b) => b.length - a.length);
const NAME_RE = new RegExp(`(^|[^\\p{L}])(${NAMES.map(escapeRe).join('|')})(?=[^\\p{L}]|$)`, 'u');

/** The place a text names first, as [lon, lat], or null. */
export function placeIn(text) {
  const m = String(text || '').match(NAME_RE);
  if (!m) return null;
  return PLACES[ALIASES[m[2]] || m[2]] || null;
}

/* A small, stable offset per signal (at most 3 degrees), so two signals
   from the same city do not flash on the very same dot. */
function jitter(key) {
  let h = 0;
  for (const ch of String(key || '')) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return [((h & 0xff) / 255 - 0.5) * 6, (((h >> 8) & 0xff) / 255 - 0.5) * 6];
}

/**
 * Where a pulse item flashes on the globe, in stage pixels.
 * @param {{ key?: string, dimensionId?: string, headline?: string, detail?: { title?: string } }} item
 * @returns {{ x: number, y: number, lon: number, lat: number, dimensionId: string } | null}
 */
export function eventLocation(item) {
  if (!item) return null;
  const named = placeIn(item.headline) || placeIn(item.detail?.title);
  const base = named || HOME[item.dimensionId] || null;
  if (!base) return null;
  const [dx, dy] = jitter(item.key);
  const lon = Math.max(-179, Math.min(179, base[0] + dx));
  const lat = Math.max(-80, Math.min(80, base[1] + dy));
  return { ...globePoint(lon, lat), lon, lat, dimensionId: item.dimensionId };
}

/** Longitude and latitude to the globe's stage pixels. */
export function globePoint(lon, lat) {
  const x = GLOBE_BOX.x + ((lon + 180) / 360) * GLOBE_BOX.w;
  const y = GLOBE_BOX.y + ((90 - lat) / 180) * GLOBE_BOX.h;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}
