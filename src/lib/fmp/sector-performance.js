/**
 * FMP sector performance — server-side helpers.
 *
 * Two upstream endpoints:
 *   1. Historical snapshot (per trading day):
 *      GET {STABLE}/sector-performance-snapshot?date=YYYY-MM-DD&exchange=...
 *      → [{ date, sector, exchange, averageChange }]
 *   2. Live intraday ("today's move"):
 *      GET {V3}/sector-performance
 *      → [{ sector, changesPercentage: "0.50185%" }]
 *
 * Range computation:
 *   1D  → live endpoint only
 *   1W  → compound (today live) × (5 previous trading-day snapshots)
 *   1M  → compound (today live) × (21 previous trading-day snapshots)
 *   YTD → compound (today live) × (all trading-day snapshots since Jan 1)
 *
 * We *compound* daily averageChange values instead of summing them — the gap
 * is small on any single day but matters over weeks and in volatile periods.
 *   cumReturn = (prod(1 + d_i / 100) - 1) * 100
 *
 * We intentionally never call the historical snapshot endpoint for "today".
 * FMP's snapshot is meant for closed trading days; today's move lives on
 * the live v3 endpoint.
 *
 * API key is server-only — never prefix with NEXT_PUBLIC_.
 */

const STABLE = 'https://financialmodelingprep.com/stable';
const V3 = 'https://financialmodelingprep.com/api/v3';

// Single source of truth for the 11 sectors. FMP's own spelling lives here;
// CANONICAL_TO_DISPLAY maps to the GICS-style labels used across the rest of
// the app (see src/lib/stress-test.js → GICS_SECTORS) so the heatmap stays
// consistent with other research components.
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
 * FMP ships sector names with inconsistent casing / pluralization between
 * endpoints and even between accounts. Fold all of them back to the
 * canonical spelling used above.
 */
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

/** Parse FMP's "0.50185%" string (or a bare number) to a finite number. Returns 0 for unparseable. */
function parsePercent(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  if (typeof input === 'string') {
    const n = parseFloat(input.replace('%', '').trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

async function fetchJson(url) {
  // next.revalidate = 60 lets Next.js cache upstream responses for 60s; the
  // same stable URL called twice in close succession hits the cache instead
  // of FMP. Critical on the snapshot walk (20+ same-day calls from different
  // range toggles) — otherwise we'd burn the API limit very quickly.
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`FMP ${res.status}: ${(body || url).slice(0, 200)}`);
  }
  return res.json();
}

function requireApiKey() {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error('FMP_API_KEY is not configured on the server.');
  return key;
}

/** Live intraday sector performance — 1D only. Returns a Map<canonicalSector, pct>. */
async function getLivePerformance() {
  const apikey = requireApiKey();
  const url = `${V3}/sector-performance?apikey=${encodeURIComponent(apikey)}`;
  const raw = await fetchJson(url);
  const out = new Map();
  if (!Array.isArray(raw)) return out;
  for (const row of raw) {
    const sector = normalizeSector(row?.sector);
    if (!sector) continue;
    const pct = parsePercent(
      row?.changesPercentage ?? row?.changePercentage ?? row?.averageChange,
    );
    out.set(sector, pct);
  }
  return out;
}

/** Historical snapshot for a specific date. Returns Map<canonicalSector, pct>. */
async function getSnapshotForDate(date, exchange) {
  const apikey = requireApiKey();
  const params = new URLSearchParams({ date, apikey });
  if (exchange) params.set('exchange', exchange);
  const url = `${STABLE}/sector-performance-snapshot?${params.toString()}`;
  const raw = await fetchJson(url);
  if (!Array.isArray(raw)) return new Map();

  // Aggregate across exchanges if no filter was applied. FMP doesn't return
  // a consolidated row on the unfiltered call — it returns one row per
  // (sector, exchange). Equal-weight averaging is an approximation but
  // matches what the upstream heatmap on financialmodelingprep.com shows.
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
  const out = new Map();
  for (const [sector, { sum, n }] of buckets) {
    out.set(sector, n > 0 ? sum / n : 0);
  }
  return out;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Walk back `tradingDaysBack` trading days from yesterday, collecting snapshot
 * maps. Skips weekends and days that come back empty (holidays, pre-listing
 * dates, FMP gaps). Requests are SERIALIZED on purpose — the snapshot endpoint
 * is rate-sensitive and the per-URL Next cache does the heavy lifting on
 * repeat calls from different range toggles.
 */
async function getTradingDaySnapshots(tradingDaysBack, exchange) {
  const snapshots = [];
  if (tradingDaysBack <= 0) return snapshots;

  const cursor = new Date();
  cursor.setUTCDate(cursor.getUTCDate() - 1); // start from yesterday (today = live endpoint)

  let safety = tradingDaysBack * 3 + 10; // weekends + holidays cushion
  while (snapshots.length < tradingDaysBack && safety > 0) {
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

/**
 * Snapshot walk for YTD: walk back from yesterday until we cross into last
 * year, OR until we've collected more trading days than could plausibly have
 * elapsed (safety ceiling). Stops early when the cursor hits Dec 31 of the
 * prior year.
 */
async function getYtdSnapshots(exchange) {
  const snapshots = [];
  const now = new Date();
  const thisYear = now.getUTCFullYear();
  const cursor = new Date();
  cursor.setUTCDate(cursor.getUTCDate() - 1);

  // 253 = one full trading year of cushion — we'll always bail out earlier
  // once we cross into the prior year.
  let safety = 400;
  while (cursor.getUTCFullYear() === thisYear && safety > 0) {
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

/** Compound an array of daily percent changes into a cumulative % return. */
function compound(dailyPercents) {
  let factor = 1;
  for (const p of dailyPercents) {
    if (Number.isFinite(p)) factor *= 1 + p / 100;
  }
  return (factor - 1) * 100;
}

/**
 * Emit a stable 11-tile list in canonical order, mapping to the display
 * labels used elsewhere in the app (GICS-style). Missing sectors come out
 * as 0 so the heatmap is always exactly 11 tiles.
 */
function toPoints(results) {
  return CANONICAL_SECTORS.map((canonical) => {
    const displayName = CANONICAL_TO_DISPLAY[canonical] || canonical;
    const raw = results.get(canonical);
    const changePct = Number.isFinite(raw) ? raw : 0;
    return {
      sector: canonical,
      name: displayName,
      changePct,
    };
  });
}

/**
 * Public entry — cumulative % change per sector for the requested window.
 * @param {'1D'|'1W'|'1M'|'YTD'} range
 * @param {string} [exchange]  Optional FMP exchange filter (NASDAQ, NYSE, ...)
 */
export async function getSectorPerformance(range, exchange) {
  if (range === '1D') {
    const live = await getLivePerformance();
    return toPoints(live);
  }

  let snapshots;
  if (range === '1W') {
    snapshots = await getTradingDaySnapshots(4, exchange); // + today = 5 days
  } else if (range === '1M') {
    snapshots = await getTradingDaySnapshots(20, exchange); // + today = 21 days
  } else if (range === 'YTD') {
    snapshots = await getYtdSnapshots(exchange);
  } else {
    throw new Error(`Unsupported range: ${range}`);
  }

  const live = await getLivePerformance();

  const result = new Map();
  for (const sector of CANONICAL_SECTORS) {
    const daily = [];
    const today = live.get(sector);
    if (typeof today === 'number') daily.push(today);
    for (const snap of snapshots) {
      const v = snap.get(sector);
      // FMP returning an empty averageChange → treat as 0 for that day; don't
      // throw, don't skip the sector entirely.
      daily.push(typeof v === 'number' ? v : 0);
    }
    result.set(sector, compound(daily));
  }
  return toPoints(result);
}

// Exported for tests + reuse in other research cards that want the raw map.
export const __internals__ = {
  normalizeSector,
  parsePercent,
  compound,
  getLivePerformance,
  getSnapshotForDate,
  getTradingDaySnapshots,
  CANONICAL_TO_DISPLAY,
};
