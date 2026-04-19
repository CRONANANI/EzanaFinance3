/**
 * FMP sector performance — server-side helpers.
 *
 * Upstream: https://financialmodelingprep.com/stable/sector-performance-snapshot
 *   GET ?date=YYYY-MM-DD&exchange=NASDAQ|NYSE|... &apikey=...
 *   → [{ date, sector, exchange, averageChange }]
 *
 * IMPORTANT: the previous v3 "live intraday" endpoint
 * (financialmodelingprep.com/api/v3/sector-performance) was retired for
 * accounts opened after Aug 31, 2025. Calling it now returns HTTP 200 with:
 *   { "Error Message": "Legacy Endpoint : ... no longer supported" }
 * That's what was surfacing as "Failed to fetch sector performance" in the
 * heatmap. So we derive every window — including 1D — from the stable
 * snapshot endpoint, which is what FMP's own public sector page uses too.
 *
 * Range computation:
 *   1D  → the most recent available trading-day snapshot (today's move, or
 *         Friday's close if called on a weekend, or the last close before a
 *         holiday). Matches the "1D" column on financialmodelingprep.com.
 *   1W  → the 5 most recent trading-day snapshots, compounded.
 *   1M  → the 21 most recent trading-day snapshots, compounded.
 *   YTD → every trading-day snapshot since Jan 1 of the current year,
 *         compounded.
 *
 * Compounding (not summing) matters over longer windows:
 *   cumReturn = (prod(1 + d_i / 100) - 1) * 100
 *
 * API key is server-only — never prefix with NEXT_PUBLIC_.
 */

const STABLE = 'https://financialmodelingprep.com/stable';

export const CANONICAL_SECTORS = [
  'Basic Materials',
  'Communication Services',
  'Consumer Cyclical',
  'Consumer Defensive',
  'Energy',
  'Financial Services',
  'Healthcare',
  'Industrials',
  'Real Estate',
  'Technology',
  'Utilities',
];

// Canonical (FMP) → display label used elsewhere in the app (GICS-style).
const CANONICAL_TO_DISPLAY = {
  'Basic Materials': 'Materials',
  'Communication Services': 'Communication Services',
  'Consumer Cyclical': 'Consumer Discretionary',
  'Consumer Defensive': 'Consumer Staples',
  'Energy': 'Energy',
  'Financial Services': 'Financials',
  'Healthcare': 'Health Care',
  'Industrials': 'Industrials',
  'Real Estate': 'Real Estate',
  'Technology': 'Technology',
  'Utilities': 'Utilities',
};

/**
 * Structured error surfaced to the route so it can classify 401/402/403/410/429.
 * We use `status` as the discriminator even for upstream 200-with-error-body
 * responses — see fetchJson() for the classifier.
 */
export class FmpError extends Error {
  constructor(status, body, url) {
    super(`FMP ${status}: ${(body || '').slice(0, 200)}`);
    this.name = 'FmpError';
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

function normalizeSector(name) {
  if (typeof name !== 'string') return null;
  const clean = name.trim();
  if (!clean) return null;
  const lower = clean.toLowerCase();
  if (lower === 'communication services' || lower === 'communications' || lower === 'communication') {
    return 'Communication Services';
  }
  if (lower === 'financial' || lower === 'financials' || lower === 'financial services') {
    return 'Financial Services';
  }
  if (lower === 'health care' || lower === 'healthcare') return 'Healthcare';
  if (lower === 'consumer discretionary' || lower === 'consumer cyclical') return 'Consumer Cyclical';
  if (lower === 'consumer staples' || lower === 'consumer defensive') return 'Consumer Defensive';
  if (lower === 'basic materials' || lower === 'materials') return 'Basic Materials';
  if (lower === 'information technology' || lower === 'technology' || lower === 'tech') return 'Technology';
  if (lower === 'real estate') return 'Real Estate';
  if (lower === 'energy') return 'Energy';
  if (lower === 'industrials' || lower === 'industrial') return 'Industrials';
  if (lower === 'utilities' || lower === 'utility') return 'Utilities';
  return clean;
}

function parsePercent(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  if (typeof input === 'string') {
    const n = parseFloat(input.replace('%', '').trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function requireApiKey() {
  const key = process.env.FMP_API_KEY;
  if (!key) {
    throw new Error(
      'FMP_API_KEY is not set. Add it to .env.local and restart the dev server.',
    );
  }
  return key;
}

/**
 * GET JSON from FMP. Throws `FmpError` on HTTP failures AND on the quirky
 * 200-with-error-object responses FMP sometimes returns (legacy-endpoint
 * retirement notices come back as 200 + `{"Error Message": ...}`).
 *
 * The classifier maps message keywords to canonical HTTP codes so upstream
 * can decide whether to degrade vs surface an error:
 *   "Legacy Endpoint"     → 410 Gone
 *   "Invalid API Key"     → 401 Unauthorized
 *   "Premium"/"Exclusive" → 402 Payment Required
 */
async function fetchJson(url, revalidate) {
  const res = await fetch(url, { next: { revalidate } });
  const text = await res.text();

  if (text.trimStart().startsWith('{"Error Message"')) {
    let syntheticStatus = res.status === 200 ? 400 : res.status;
    if (/legacy endpoint/i.test(text)) syntheticStatus = 410;
    else if (/invalid api key/i.test(text)) syntheticStatus = 401;
    else if (/premium|special endpoint|exclusive/i.test(text)) syntheticStatus = 402;
    throw new FmpError(syntheticStatus, text, url);
  }

  if (!res.ok) throw new FmpError(res.status, text, url);

  try {
    return JSON.parse(text);
  } catch {
    throw new FmpError(res.status, text, url);
  }
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Historical snapshot for a specific date. Returns a Map<canonicalSector, pct>
 * with the ISO date stamped as a non-enumerable `__date` property so callers
 * can carry "as-of" back to the UI without an extra fetch.
 */
async function getSnapshotForDate(date, exchange) {
  const apikey = requireApiKey();
  const params = new URLSearchParams({ date, apikey });
  if (exchange) params.set('exchange', exchange);
  const url = `${STABLE}/sector-performance-snapshot?${params.toString()}`;

  // Historical snapshots are immutable once the day closes. 24h cache means
  // repeat calls from 1W/1M/YTD toggles hit Next's fetch cache instead of
  // FMP's rate limiter.
  const raw = await fetchJson(url, 24 * 60 * 60);
  const out = new Map();
  if (!Array.isArray(raw) || raw.length === 0) return out;

  // FMP returns one row per (sector, exchange). Equal-weight average across
  // exchanges when no filter was applied — matches the consolidated view on
  // FMP's public sector page.
  const buckets = new Map();
  for (const row of raw) {
    const sector = normalizeSector(row?.sector);
    if (!sector) continue;
    const pct = parsePercent(row?.averageChange);
    const cur = buckets.get(sector) ?? { sum: 0, n: 0 };
    cur.sum += pct;
    cur.n += 1;
    buckets.set(sector, cur);
  }
  for (const [sector, { sum, n }] of buckets) {
    out.set(sector, n > 0 ? sum / n : 0);
  }
  Object.defineProperty(out, '__date', { value: date, enumerable: false });
  return out;
}

/**
 * Walk back from today, returning up to `count` non-empty trading-day
 * snapshots (most recent first). Skips weekends and days FMP returned empty
 * (holidays, or "today" before market close).
 *
 * Serialized on purpose. The snapshot URL for a given date is static, so
 * Next's per-URL cache turns subsequent callers into cache hits — this also
 * keeps us well below FMP's per-minute rate limit even on the YTD walk.
 */
async function walkBackSnapshots({ count, exchange, stopWhen }) {
  const snapshots = [];
  const cursor = new Date();
  // Budget of calendar days we'll probe. Trading days ≈ 252/365 of calendar
  // days, so 2× + 10 days of slack covers weekends + holiday clusters.
  const budget = typeof count === 'number' ? count * 2 + 10 : 400;
  let safety = budget;

  while (safety > 0) {
    if (typeof stopWhen === 'function' && stopWhen(cursor)) break;
    if (typeof count === 'number' && snapshots.length >= count) break;

    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      const snap = await getSnapshotForDate(isoDate(cursor), exchange);
      if (snap.size > 0) snapshots.push(snap);
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    safety -= 1;
  }
  return snapshots;
}

function compound(dailyPercents) {
  let factor = 1;
  for (const p of dailyPercents) {
    if (Number.isFinite(p)) factor *= 1 + p / 100;
  }
  return (factor - 1) * 100;
}

function toPoints(results) {
  return CANONICAL_SECTORS.map((canonical) => {
    const displayName = CANONICAL_TO_DISPLAY[canonical] || canonical;
    const raw = results.get(canonical);
    const changePct = Number.isFinite(raw) ? raw : 0;
    return { sector: canonical, name: displayName, changePct };
  });
}

/**
 * Public entry — cumulative % change per sector for the requested window.
 *
 * @param {'1D'|'1W'|'1M'|'YTD'} range
 * @param {string} [exchange]  Optional FMP exchange filter
 * @returns {Promise<{
 *   data: Array<{sector:string,name:string,changePct:number}>,
 *   asOf: string|null,
 *   degraded?: { reason: string }
 * }>}
 */
export async function getSectorPerformance(range, exchange) {
  let count;
  let stopWhen;

  if (range === '1D') {
    count = 1;
  } else if (range === '1W') {
    count = 5;
  } else if (range === '1M') {
    count = 21;
  } else if (range === 'YTD') {
    const year = new Date().getUTCFullYear();
    stopWhen = (cursor) => cursor.getUTCFullYear() < year;
  } else {
    throw new Error(`Unsupported range: ${range}`);
  }

  const snapshots = await walkBackSnapshots({ count, exchange, stopWhen });

  if (snapshots.length === 0) {
    // Not an error per se — could happen right after new-year rollover with
    // a holiday-heavy opening stretch. Surface clearly so the UI can show a
    // helpful empty state instead of silently rendering all-zero tiles.
    return {
      data: toPoints(new Map()),
      asOf: null,
      degraded: { reason: 'No recent trading-day data available from FMP yet.' },
    };
  }

  const result = new Map();
  for (const sector of CANONICAL_SECTORS) {
    const daily = [];
    for (const snap of snapshots) {
      const v = snap.get(sector);
      // Missing averageChange for a sector on a given date → treat as 0.
      daily.push(typeof v === 'number' ? v : 0);
    }
    result.set(sector, compound(daily));
  }

  // Most recent snapshot date — useful in the UI so "1D" shows the right
  // trading date when the market's closed (Sat/Sun → Friday's close).
  const asOf = snapshots[0]?.__date ?? null;

  return { data: toPoints(result), asOf };
}

// Exposed for tests + adjacent research cards that want the raw helpers.
export const __internals__ = {
  CANONICAL_TO_DISPLAY,
  compound,
  normalizeSector,
  parsePercent,
  getSnapshotForDate,
  walkBackSnapshots,
};
