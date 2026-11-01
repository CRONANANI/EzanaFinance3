/**
 * Daily price series for a commodity a Sonar brief cites (Nov 1). SERVER
 * ONLY. The primary market data feed first (FMP: the commodity's futures
 * symbol, or the proxy's listing), then Alpha Vantage (its commodity series
 * where one exists, else the proxy's daily equity series). Each call is
 * bounded and fails soft; the route answers `points: []` when both miss.
 *
 * Results are memoized per warm instance for 30 minutes: the chart is a view
 * of daily closes, not a ticker.
 */
import { fetchWithTimeout } from '@/lib/http/fetch-json';
import { getFmpKey } from '@/lib/fmp/upcoming-events';
import { getAlphaVantageApiKey } from '@/lib/alpha-vantage';
import { BoundedMap } from '@/lib/bounded-map';
import { COMMODITY_BY_ID } from './commodity-stats';

const FMP_STABLE = 'https://financialmodelingprep.com/stable';
const AV_BASE = 'https://www.alphavantage.co/query';
const TIMEOUT_MS = 6000;
const TTL_MS = 30 * 60 * 1000;
const cache = new BoundedMap(200);

const isoDay = (d) => new Date(d).toISOString().slice(0, 10);
const clean = (rows) =>
  rows
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.d) && Number.isFinite(r.v) && r.v > 0)
    .sort((a, b) => a.d.localeCompare(b.d));

async function getJson(url) {
  try {
    const res = await fetchWithTimeout(url, { cache: 'no-store' }, TIMEOUT_MS);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** FMP daily closes: the light endpoint, then the full one. */
async function fromFmp(symbol, from, to) {
  const key = getFmpKey();
  if (!key) return [];
  const q = `symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&apikey=${encodeURIComponent(key)}`;
  const light = await getJson(`${FMP_STABLE}/historical-price-eod/light?${q}`);
  const rows = Array.isArray(light) ? light : light?.historical || [];
  let out = clean(
    rows.map((r) => ({ d: String(r.date).slice(0, 10), v: Number(r.price ?? r.close) })),
  );
  if (out.length >= 2) return out;
  const full = await getJson(`${FMP_STABLE}/historical-price-eod/full?${q}`);
  const rows2 = Array.isArray(full) ? full : full?.historical || [];
  out = clean(
    rows2.map((r) => ({ d: String(r.date).slice(0, 10), v: Number(r.close ?? r.price) })),
  );
  return out;
}

/** Alpha Vantage: the commodity series, else the proxy's daily closes. */
async function fromAlphaVantage(c, from, to) {
  const key = getAlphaVantageApiKey();
  if (!key) return [];
  const k = encodeURIComponent(key);
  if (c.av) {
    /* WTI, Brent and natural gas come daily; the others monthly. */
    const daily = ['WTI', 'BRENT', 'NATURAL_GAS'].includes(c.av);
    const data = await getJson(
      `${AV_BASE}?function=${c.av}&interval=${daily ? 'daily' : 'monthly'}&apikey=${k}`,
    );
    const rows = Array.isArray(data?.data) ? data.data : [];
    return clean(rows.map((r) => ({ d: r.date, v: Number(r.value) }))).filter(
      (r) => r.d >= from && r.d <= to,
    );
  }
  if (c.avEquity) {
    const data = await getJson(
      `${AV_BASE}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(c.avEquity)}&outputsize=full&apikey=${k}`,
    );
    const ts = data?.['Time Series (Daily)'] || {};
    return clean(Object.entries(ts).map(([d, o]) => ({ d, v: Number(o?.['4. close']) }))).filter(
      (r) => r.d >= from && r.d <= to,
    );
  }
  return [];
}

/* At most ~260 points reach the client: plenty for a 300px line. */
function thin(points, max = 260) {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
}

/**
 * @param {string} id      commodity id from commodity-stats.js
 * @param {string} from    YYYY-MM-DD, clamped to the last five years and at
 *                         least 30 days before today
 * @returns {Promise<null | { id, label, symbol, proxy, from, to, points, first, last, changePct, feed }>}
 *   null for an unknown id; `points` is empty when no feed had the series.
 *   `feed` ('primary' | 'fallback' | null) is for logs only, never shown.
 */
export async function getCommoditySeries(id, from) {
  const c = COMMODITY_BY_ID[id];
  if (!c) return null;
  const today = new Date();
  const to = isoDay(today);
  const earliest = isoDay(today.getTime() - 5 * 365 * 864e5);
  const latest = isoDay(today.getTime() - 30 * 864e5);
  let start = /^\d{4}-\d{2}-\d{2}$/.test(String(from || ''))
    ? from
    : isoDay(today.getTime() - 365 * 864e5);
  if (start < earliest) start = earliest;
  if (start > latest) start = latest;

  const key = `${id}:${start}:${to}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  let feed = 'primary';
  let points = await fromFmp(c.fmp, start, to);
  if (points.length < 2) {
    feed = 'fallback';
    points = await fromAlphaVantage(c, start, to);
  }
  if (points.length < 2) {
    feed = null;
    points = [];
  }
  const first = points[0] || null;
  const last = points[points.length - 1] || null;
  const value = {
    id: c.id,
    label: c.label,
    symbol: c.proxy ? c.fmp : null,
    proxy: c.proxy || null,
    from: start,
    to,
    points: thin(points),
    first,
    last,
    changePct: first && last ? ((last.v - first.v) / first.v) * 100 : null,
    feed,
  };
  /* A miss is remembered for 5 minutes only, so a recovered feed shows up. */
  cache.set(key, { at: points.length ? Date.now() : Date.now() - TTL_MS + 5 * 60 * 1000, value });
  return value;
}
