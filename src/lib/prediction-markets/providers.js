/**
 * Venue providers for the Prediction Markets page. Server only: nothing calls
 * a venue from the browser. Each function normalizes the upstream shape into
 * a plain domain object and fails to null (unreachable) or [] (no data), so
 * routes can tell an outage from an empty answer.
 *
 * Upstreams, all public and keyless:
 *   Polymarket CLOB   clob.polymarket.com/prices-history
 *   Polymarket data   data-api.polymarket.com/v1/leaderboard, /positions
 *   Kalshi trade API  external-api.kalshi.com/trade-api/v2/.../candlesticks
 *   Kalshi social     api.elections.kalshi.com/v1/social/leaderboard
 *                     (undocumented; values are returned raw, unit unconfirmed)
 */

const CLOB = 'https://clob.polymarket.com';
const PM_DATA = 'https://data-api.polymarket.com';
const KALSHI_TRADE = 'https://external-api.kalshi.com/trade-api/v2';
const KALSHI_SOCIAL = 'https://api.elections.kalshi.com/v1/social';
const TIMEOUT = 10_000;

/* Range → upstream resolution. Polymarket: interval + fidelity (minutes).
   Kalshi: lookback + period_interval (1, 60 or 1440 minutes). */
export const RANGES = {
  '1d': { ms: 86400000, poly: { interval: '1d', fidelity: 15 }, kalshi: 60 },
  '1w': { ms: 7 * 86400000, poly: { interval: '1w', fidelity: 60 }, kalshi: 60 },
  '1m': { ms: 30 * 86400000, poly: { interval: '1m', fidelity: 360 }, kalshi: 1440 },
  all: { ms: 730 * 86400000, poly: { interval: 'max', fidelity: 1440 }, kalshi: 1440 },
};

const num = (v) => {
  if (v == null || v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};
const unit = (v) => {
  const x = num(v);
  return x != null && x >= 0 && x <= 1 ? x : null;
};

async function getJson(url) {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) return { ok: false, status: res.status, data: null };
    return { ok: true, status: res.status, data: await res.json() };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

/** Polymarket YES price history: [{ t (ms), p }] or null when unreachable. */
export async function polymarketHistory(tokenId, range = '1w') {
  if (!tokenId) return [];
  const r = RANGES[range] || RANGES['1w'];
  const qs = new URLSearchParams({
    market: String(tokenId),
    interval: r.poly.interval,
    fidelity: String(r.poly.fidelity),
  });
  const res = await getJson(`${CLOB}/prices-history?${qs}`);
  if (!res.ok) return null;
  const hist = Array.isArray(res.data?.history) ? res.data.history : [];
  return hist
    .map((h) => ({ t: Math.round(num(h.t) * 1000), p: unit(h.p) }))
    .filter((h) => Number.isFinite(h.t) && h.p != null);
}

/** Kalshi ticker parts from an index market id ('kalshi:KXSB-27-GB'). */
export function kalshiTicker(marketId) {
  const ticker = String(marketId || '').replace(/^kalshi:/, '');
  const series = ticker.split('-')[0];
  return ticker && series ? { ticker, series } : null;
}

/**
 * Kalshi candles: { points: [{ t, p }], volume: [{ t, v }] } (volume in
 * contracts per period) or null when unreachable. A period with no trade
 * takes the bid/ask midpoint, so the line does not drop to zero.
 */
export async function kalshiHistory(marketId, range = '1w', now = Date.now()) {
  const k = kalshiTicker(marketId);
  if (!k) return { points: [], volume: [] };
  const r = RANGES[range] || RANGES['1w'];
  const qs = new URLSearchParams({
    start_ts: String(Math.floor((now - r.ms) / 1000)),
    end_ts: String(Math.floor(now / 1000)),
    period_interval: String(r.kalshi),
  });
  const res = await getJson(
    `${KALSHI_TRADE}/series/${encodeURIComponent(k.series)}/markets/${encodeURIComponent(k.ticker)}/candlesticks?${qs}`,
  );
  if (!res.ok) return null;
  const candles = Array.isArray(res.data?.candlesticks) ? res.data.candlesticks : [];
  const points = [];
  const volume = [];
  for (const c of candles) {
    const t = num(c.end_period_ts);
    if (t == null) continue;
    const close = unit(c.price?.close_dollars);
    const bid = unit(c.yes_bid?.close_dollars);
    const ask = unit(c.yes_ask?.close_dollars);
    const mid = bid != null && ask != null && ask >= bid ? (bid + ask) / 2 : null;
    const p = close ?? mid;
    if (p != null) points.push({ t: t * 1000, p: Math.round(p * 1e4) / 1e4 });
    volume.push({ t: t * 1000, v: Math.round(num(c.volume_fp) ?? 0) });
  }
  return { points, volume };
}

export const PM_WINDOWS = { day: 'DAY', week: 'WEEK', month: 'MONTH', all: 'ALL' };

/** Polymarket leaderboard rows, or null when unreachable. */
export async function polymarketLeaderboard({
  window = 'week',
  by = 'pnl',
  category = null,
  limit = 10,
} = {}) {
  const qs = new URLSearchParams({
    timePeriod: PM_WINDOWS[window] || 'WEEK',
    orderBy: by === 'vol' ? 'VOL' : 'PNL',
    limit: String(limit),
  });
  if (category) qs.set('category', category);
  const res = await getJson(`${PM_DATA}/v1/leaderboard?${qs}`);
  if (!res.ok) return null;
  const list = Array.isArray(res.data) ? res.data : [];
  return list.slice(0, limit).map((r, i) => ({
    rank: num(r.rank) ?? i + 1,
    wallet: typeof r.proxyWallet === 'string' ? r.proxyWallet : null,
    name: r.userName && r.userName !== r.proxyWallet ? String(r.userName) : null,
    xHandle: r.xUsername ? String(r.xUsername).replace(/^@/, '') : null,
    verified: Boolean(r.verifiedBadge),
    image:
      typeof r.profileImage === 'string' && /^https:\/\//.test(r.profileImage)
        ? r.profileImage
        : null,
    pnl: num(r.pnl),
    volume: num(r.vol),
  }));
}

/**
 * Kalshi leaderboard (30-day window; Kalshi returns nothing for shorter ones),
 * or null when unreachable. `value` is the raw number Kalshi publishes.
 */
export async function kalshiLeaderboard({ by = 'pnl', limit = 10 } = {}) {
  const qs = new URLSearchParams({
    metric_name: by === 'vol' ? 'volume' : 'projected_pnl',
    limit: String(limit),
    since_day_before: '30',
  });
  const res = await getJson(`${KALSHI_SOCIAL}/leaderboard?${qs}`);
  if (!res.ok) return null;
  const list = Array.isArray(res.data?.rank_list) ? res.data.rank_list : [];
  return list.slice(0, limit).map((r, i) => ({
    rank: num(r.rank) ?? i + 1,
    name: r.is_anonymous ? null : r.nickname ? String(r.nickname) : null,
    value: num(r.value),
  }));
}

/** A trader's largest open Polymarket positions, or null when unreachable. */
export async function polymarketPositions(wallet, limit = 3) {
  const qs = new URLSearchParams({
    user: wallet,
    sortBy: 'CURRENT',
    sortDirection: 'DESC',
    sizeThreshold: '1',
    limit: String(limit),
  });
  const res = await getJson(`${PM_DATA}/positions?${qs}`);
  if (!res.ok) return null;
  const list = Array.isArray(res.data) ? res.data : [];
  return list.slice(0, limit).map((p) => ({
    title: String(p.title || ''),
    side: String(p.outcome || ''),
    size: num(p.size),
    avgPrice: unit(p.avgPrice),
    curPrice: unit(p.curPrice),
    value: num(p.currentValue),
    asset: p.asset ? String(p.asset) : null,
    oppositeAsset: p.oppositeAsset ? String(p.oppositeAsset) : null,
    outcomeIndex: num(p.outcomeIndex),
  }));
}
