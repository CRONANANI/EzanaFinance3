/**
 * Prediction Markets page model. Pure functions, no React, no I/O, no
 * formatting: every number on /datasets/prediction-markets that is not a raw
 * column comes from here, and scripts/check-prediction-markets.mjs tests it.
 *
 * Rows are the compact client shape the universe route returns
 * (see page-store.js `toClientRow`):
 *   { id, venue: 'polymarket'|'kalshi', question, p, change24h, change7d,
 *     change30d, vol, vol24h, vol7d, vol30d, volNorm, liq, spread, bid, ask,
 *     closes, category, url, event }
 * Probabilities and spreads are 0..1. Volumes are in the venue's own unit:
 * dollars on Polymarket, contracts on Kalshi. They are never added together;
 * where a ranking must order both venues, a contract counts as $1 and the UI
 * says so.
 *
 * Compliance: gap and EV maths delegate to legislation-edge.js
 * (computeEdge, edgeConfidence) so the confidence tiers and the 1-point
 * display floor exist in exactly one place.
 */
import { computeEdge, edgeConfidence } from '../congress/legislation-edge.js';
import { isTrendingEligible } from './trending.js';

/* ── constants ───────────────────────────────────────────────────────── */

export const VENUES = ['polymarket', 'kalshi'];
export const WINDOWS = ['24h', '7d', '30d'];
export const WINDOW_DAYS = { '24h': 1, '7d': 7, '30d': 30 };
export const ET = 'America/New_York';

/**
 * Page taxonomy, in precedence order: a market carrying several tags takes the
 * first category below that matches (06-DATA.md, table 2.2).
 */
export const PAGE_CATEGORIES = [
  { slug: 'politics', label: 'Politics', poly: ['2'], kalshi: ['Politics'] },
  { slug: 'elections', label: 'Elections', poly: ['144'], kalshi: ['Elections'] },
  { slug: 'sports', label: 'Sports', poly: ['1'], kalshi: ['Sports'] },
  { slug: 'crypto', label: 'Crypto', poly: ['21'], kalshi: ['Crypto'] },
  {
    slug: 'economy',
    label: 'Economy',
    poly: ['100328', '120'],
    kalshi: ['Economics', 'Financials'],
  },
  { slug: 'geopolitics', label: 'Geopolitics', poly: ['100265'], kalshi: ['World'] },
  {
    slug: 'tech',
    label: 'Tech',
    poly: ['1401'],
    kalshi: ['Companies', 'Science and Technology'],
  },
  { slug: 'culture', label: 'Culture', poly: ['596'], kalshi: ['Entertainment'] },
];
export const CATEGORY_SLUGS = PAGE_CATEGORIES.map((c) => c.slug);
export const CATEGORY_LABEL = Object.fromEntries(PAGE_CATEGORIES.map((c) => [c.slug, c.label]));

/** Polymarket leaderboard categories the data API accepts, by page slug. */
export const LEADERBOARD_CATEGORY = {
  politics: 'POLITICS',
  elections: 'POLITICS',
  sports: 'SPORTS',
  crypto: 'CRYPTO',
  economy: 'ECONOMICS',
  geopolitics: 'POLITICS',
  tech: 'TECH',
  culture: 'CULTURE',
};

const num = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
/* Same micro-point rounding as edgeConfidence, so 0.015 - 0.005 is 0.01. */
const micro = (x) => Math.round(x * 1e6) / 1e6;

/* ── categories and filters ──────────────────────────────────────────── */

/**
 * Page category slug for a row, or null (unmapped markets count under All).
 * Polymarket rows carry `tags` (tag ids as strings); Kalshi rows carry the
 * event `category` string.
 */
export function normalizeCategory(row) {
  if (!row) return null;
  if (row.venue === 'polymarket' || row.platform === 'polymarket') {
    const tags = new Set((row.tags || row.tag_ids || []).map(String));
    if (!tags.size) return null;
    for (const c of PAGE_CATEGORIES) if (c.poly.some((t) => tags.has(t))) return c.slug;
    return null;
  }
  const cat = String(row.category || row.kalshiCategory || '')
    .trim()
    .toLowerCase();
  if (!cat) return null;
  for (const c of PAGE_CATEGORIES) {
    if (c.kalshi.some((k) => k.toLowerCase() === cat)) return c.slug;
  }
  return null;
}

/** Rows matching the page filters. category/venue null or 'all' = no filter. */
export function filterRows(rows, { category = null, venue = null, q = '' } = {}) {
  const cat = category && category !== 'all' ? category : null;
  const ven = venue && venue !== 'all' ? venue : null;
  const needle = String(q || '')
    .trim()
    .toLowerCase();
  return (rows || []).filter(
    (r) =>
      (!cat || r.category === cat) &&
      (!ven || r.venue === ven) &&
      (!needle ||
        String(r.question || '')
          .toLowerCase()
          .includes(needle)),
  );
}

/** Live chip counts per category under the current venue filter. */
export function categoryCounts(rows, venue = null) {
  const ven = venue && venue !== 'all' ? venue : null;
  const counts = { all: 0 };
  for (const slug of CATEGORY_SLUGS) counts[slug] = 0;
  for (const r of rows || []) {
    if (ven && r.venue !== ven) continue;
    counts.all += 1;
    if (r.category && counts[r.category] != null) counts[r.category] += 1;
  }
  return counts;
}

/* ── window helpers ──────────────────────────────────────────────────── */

/** Signed probability change over the window (0..1 scale), or null. */
export function windowChange(row, window = '24h') {
  if (window === '7d') return num(row?.change7d);
  if (window === '30d') return num(row?.change30d);
  return num(row?.change24h);
}

/** Volume traded in the window, in the venue's own unit, or null. */
export function windowVolume(row, window = '24h') {
  if (window === '7d') return num(row?.vol7d);
  if (window === '30d') return num(row?.vol30d);
  return num(row?.vol24h);
}

/**
 * A volume made comparable across venues for ORDERING ONLY: dollars as they
 * are, contracts at $1 each (a Kalshi contract pays at most $1). Never shown
 * as a total.
 */
export function orderingVolume(row, window = '24h') {
  return windowVolume(row, window) ?? 0;
}

/* ── gaps, edge, efficiency ─────────────────────────────────────────── */

/** |b - a| net of half the spread, micro-point rounded. */
export function netGap(a, b, halfSpread = 0) {
  const x = num(a);
  const y = num(b);
  if (x == null || y == null) return null;
  const h = num(halfSpread) ?? 0;
  return micro(Math.abs(y - x) - Math.max(0, h));
}

/**
 * EV% of a reference (model) probability against a market-implied one.
 * Delegates to computeEdge, so it is null under the 1-point display floor.
 */
export function evPct(model, implied, spread = null) {
  const i = num(implied);
  if (i == null) return null;
  return computeEdge(num(model), {
    outcomes: ['Yes', 'No'],
    outcomePrices: [String(i), String(1 - i)],
    spread,
  }).evPct;
}

/**
 * Cross-venue gap for the same event: net of half of EACH venue's spread,
 * tiered by edgeConfidence. Below the floor the gap is withheld (null).
 */
export function crossVenueGap(poly, kalshi) {
  const a = num(poly?.p);
  const b = num(kalshi?.p);
  if (a == null || b == null) return { gap: null, netGap: null, confidence: 'none' };
  const s = (num(poly?.spread) ?? 0) + (num(kalshi?.spread) ?? 0);
  const confidence = edgeConfidence(b - a, s);
  const net = netGap(a, b, s / 2);
  if (confidence === 'none') return { gap: null, netGap: null, confidence };
  return { gap: micro(b - a), netGap: net, confidence };
}

/** PnL as a share of volume traded, or null when volume is 0 or missing. */
export function efficiency(pnl, volume) {
  const p = num(pnl);
  const v = num(volume);
  if (p == null || v == null || v <= 0) return null;
  return p / v;
}

/** Bar fill for the efficiency column: 50% efficiency fills the bar. */
export function efficiencyBar(eff) {
  const e = num(eff);
  if (e == null || e <= 0) return 0;
  return Math.min(1, e / 0.5);
}

/** 0 at 50%, 1 at 0% or 100%. */
export function decidedness(p) {
  const x = num(p);
  if (x == null) return 0;
  return Math.min(1, Math.abs(x - 0.5) / 0.5);
}

/** Closing Soon pill layer opacity. */
export function decidedOpacity(p) {
  return 0.06 + decidedness(p) * 0.5;
}

/**
 * Hot: 24h volume at least 3x the market's own 30-day average daily volume.
 * Without a norm (no snapshot history yet), the trending "fresh" share: a
 * quarter or more of lifetime volume traded in the last 24 hours.
 */
export function isHot(row, norm = row?.volNorm) {
  const v24 = num(row?.vol24h);
  if (v24 == null || v24 <= 0) return false;
  const n = num(norm);
  if (n != null && n > 0) return v24 >= 3 * n;
  const total = num(row?.vol);
  return total != null && total > 0 && v24 / total >= 0.25;
}

/* ── movers ──────────────────────────────────────────────────────────── */

/** The trending eligibility rules, on the client row shape. */
export function isMoverEligible(row) {
  return isTrendingEligible({
    platform: row?.venue,
    probability: row?.p,
    volume_24h: row?.vol24h,
    spread: row?.spread,
  });
}

/**
 * Top movers. by 'moves': largest absolute window change first (ties: window
 * volume), ignoring changes under 1 point. by 'traded': most window volume.
 */
export function rankMovers(rows, by = 'moves', n = 8, window = '24h') {
  const pool = (rows || []).filter(isMoverEligible);
  if (by === 'traded') {
    return pool
      .filter((r) => orderingVolume(r, window) > 0)
      .sort((a, b) => orderingVolume(b, window) - orderingVolume(a, window) || cmpId(a, b))
      .slice(0, n);
  }
  return pool
    .filter((r) => {
      const c = windowChange(r, window);
      return c != null && Math.abs(c) >= 0.01;
    })
    .sort(
      (a, b) =>
        Math.abs(windowChange(b, window)) - Math.abs(windowChange(a, window)) ||
        orderingVolume(b, window) - orderingVolume(a, window) ||
        cmpId(a, b),
    )
    .slice(0, n);
}

function cmpId(a, b) {
  return String(a.id).localeCompare(String(b.id));
}

/** 12 largest absolute 24h movers for the shared ticker. */
export function tickerMovers(rows, n = 12) {
  return (rows || [])
    .filter((r) => num(r.change24h) != null && Math.abs(r.change24h) >= 0.01 && isMoverEligible(r))
    .sort(
      (a, b) =>
        Math.abs(b.change24h) - Math.abs(a.change24h) ||
        (num(b.vol24h) ?? 0) - (num(a.vol24h) ?? 0) ||
        cmpId(a, b),
    )
    .slice(0, n);
}

/* ── chart ───────────────────────────────────────────────────────────── */

/**
 * The n largest absolute single-period moves in a series of { t, p }:
 * [{ index, delta }] in time order (index is the later point of the pair).
 */
export function largestMoves(points, n = 2) {
  const out = [];
  for (let i = 1; i < (points || []).length; i += 1) {
    const a = num(points[i - 1]?.p);
    const b = num(points[i]?.p);
    if (a == null || b == null) continue;
    const d = micro(b - a);
    if (d !== 0) out.push({ index: i, delta: d });
  }
  return out
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta) || x.index - y.index)
    .slice(0, n)
    .sort((x, y) => x.index - y.index);
}

/** First and last probability of a series and the change between them. */
export function seriesChange(points) {
  const valid = (points || []).filter((pt) => num(pt?.p) != null);
  if (valid.length < 2) return null;
  const from = valid[0].p;
  const to = valid[valid.length - 1].p;
  return { from, to, change: micro(to - from) };
}

/** Evenly spaced subsample keeping the first and last point. */
export function downsample(points, n) {
  const list = (points || []).filter((pt) => num(pt?.p) != null);
  if (list.length <= n) return list;
  if (n <= 1) return [list[list.length - 1]];
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(list[Math.round((i * (list.length - 1)) / (n - 1))]);
  return out;
}

/** SVG polyline points for a 0..1 series in a w x h box (y inverted). */
export function sparkPath(points, w, h, pad = 1) {
  const list = (points || []).filter((pt) => num(pt?.p) != null);
  if (list.length < 2) return '';
  const ps = list.map((pt) => pt.p);
  let lo = Math.min(...ps);
  let hi = Math.max(...ps);
  if (hi - lo < 0.01) {
    const mid = (hi + lo) / 2;
    lo = mid - 0.005;
    hi = mid + 0.005;
  }
  const step = (w - 2 * pad) / (list.length - 1);
  return list
    .map((pt, i) => {
      const x = pad + i * step;
      const y = pad + (1 - (pt.p - lo) / (hi - lo)) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/* ── treemap ─────────────────────────────────────────────────────────── */

/**
 * Squarified treemap (Bruls, Huizing and van Wijk). items: [{ key, value }].
 * Returns [{ key, value, x, y, w, h }] covering the w x h box with areas
 * proportional to value. Deterministic: value desc, then key.
 */
export function squarify(items, w, h) {
  const list = (items || [])
    .filter((it) => num(it?.value) != null && it.value > 0)
    .map((it) => ({ ...it }))
    .sort((a, b) => b.value - a.value || String(a.key).localeCompare(String(b.key)));
  if (!list.length || w <= 0 || h <= 0) return [];
  const total = list.reduce((s, it) => s + it.value, 0);
  const scale = (w * h) / total;
  for (const it of list) it.area = it.value * scale;

  const out = [];
  let x = 0;
  let y = 0;
  let rw = w;
  let rh = h;
  let row = [];

  const worst = (r, side) => {
    const s = r.reduce((a, it) => a + it.area, 0);
    let max = 0;
    for (const it of r) {
      const ratio = Math.max((side * side * it.area) / (s * s), (s * s) / (side * side * it.area));
      if (ratio > max) max = ratio;
    }
    return max;
  };
  const layout = (r) => {
    const s = r.reduce((a, it) => a + it.area, 0);
    if (rw >= rh) {
      const colW = s / rh;
      let cy = y;
      for (const it of r) {
        const ih = it.area / colW;
        out.push({ key: it.key, value: it.value, x, y: cy, w: colW, h: ih, ...strip(it) });
        cy += ih;
      }
      x += colW;
      rw -= colW;
    } else {
      const rowH = s / rw;
      let cx = x;
      for (const it of r) {
        const iw = it.area / rowH;
        out.push({ key: it.key, value: it.value, x: cx, y, w: iw, h: rowH, ...strip(it) });
        cx += iw;
      }
      y += rowH;
      rh -= rowH;
    }
  };

  for (const it of list) {
    const side = Math.min(rw, rh);
    if (!row.length || worst([...row, it], side) <= worst(row, side)) {
      row.push(it);
    } else {
      layout(row);
      row = [it];
    }
  }
  if (row.length) layout(row);
  return out;
}

/* Carry caller fields through squarify without the internal area. */
function strip(it) {
  const { key, value, area, ...rest } = it;
  return rest;
}

/**
 * Category Map tiles before layout: per page category, window volume (in the
 * venue unit; for 'both', contracts at $1 for area only), market count, and
 * the average window move in points over markets that report one.
 */
export function categoryTiles(rows, venue = 'polymarket', window = '24h') {
  const pool = (rows || []).filter((r) => venue === 'both' || r.venue === venue);
  const by = new Map();
  for (const r of pool) {
    if (!r.category) continue;
    if (!by.has(r.category)) by.set(r.category, { value: 0, count: 0, moveSum: 0, moveN: 0 });
    const t = by.get(r.category);
    t.count += 1;
    t.value += orderingVolume(r, window);
    const c = windowChange(r, window);
    if (c != null) {
      t.moveSum += c * 100;
      t.moveN += 1;
    }
  }
  return PAGE_CATEGORIES.filter((c) => by.has(c.slug))
    .map((c) => {
      const t = by.get(c.slug);
      return {
        key: c.slug,
        label: c.label,
        value: t.value,
        count: t.count,
        avgMove: t.moveN ? Math.round((t.moveSum / t.moveN) * 10) / 10 : 0,
      };
    })
    .filter((t) => t.value > 0);
}

/** Tile fill opacity: 0.10 at no move, 0.48 at 3 points or more. */
export function tileOpacity(avgMove) {
  const m = Math.abs(num(avgMove) ?? 0);
  return 0.1 + (Math.min(m, 3) / 3) * 0.38;
}

/* ── pulse and calendar ──────────────────────────────────────────────── */

const dayFormatters = new Map();
function dayFormatter(tz) {
  if (!dayFormatters.has(tz)) {
    dayFormatters.set(
      tz,
      new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    );
  }
  return dayFormatters.get(tz);
}

/** 'YYYY-MM-DD' of an instant in a time zone (default ET), or null. */
export function dayKey(iso, tz = ET) {
  if (!iso) return null;
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return dayFormatter(tz).format(d);
}

/** Whole days from day key a to day key b (calendar days, DST-proof). */
function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

/** The day key `n` calendar days after `key`. */
function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/**
 * Seven day buckets starting today in `tz`: [{ date, count, top3, ids }].
 * A market belongs to the ET calendar day it closes on; markets already
 * closed (before `now`) are excluded. top3 by volume, ids for "+N more".
 */
export function closingByDay(rows, now = new Date(), tz = ET) {
  const today = dayKey(now, tz);
  const buckets = Array.from({ length: 7 }, (_, i) => ({
    date: addDays(today, i),
    count: 0,
    rows: [],
  }));
  const nowMs = new Date(now).getTime();
  for (const r of rows || []) {
    if (!r.closes) continue;
    const t = new Date(r.closes).getTime();
    if (!Number.isFinite(t) || t <= nowMs) continue;
    const k = dayKey(r.closes, tz);
    const i = daysBetween(today, k);
    if (i < 0 || i > 6) continue;
    buckets[i].count += 1;
    buckets[i].rows.push(r);
  }
  return buckets.map((b) => {
    const sorted = b.rows.sort(
      (a, c) =>
        orderingVolume(c, '24h') - orderingVolume(a, '24h') ||
        (num(c.vol) ?? 0) - (num(a.vol) ?? 0) ||
        cmpId(a, c),
    );
    return { date: b.date, count: b.count, top3: sorted.slice(0, 3), ids: sorted.map((r) => r.id) };
  });
}

/** The n open markets resolving within 7 days whose probability sits closest to 50%. */
export function mostUncertain(rows, n = 3, now = new Date()) {
  const nowMs = new Date(now).getTime();
  const horizon = nowMs + 7 * 86400000;
  return (rows || [])
    .filter((r) => {
      const t = r.closes ? new Date(r.closes).getTime() : NaN;
      return Number.isFinite(t) && t > nowMs && t <= horizon && num(r.p) != null;
    })
    .sort(
      (a, b) =>
        Math.abs(a.p - 0.5) - Math.abs(b.p - 0.5) ||
        (num(b.vol) ?? 0) - (num(a.vol) ?? 0) ||
        cmpId(a, b),
    )
    .slice(0, n);
}

/**
 * Market Pulse figures for the filtered rows. Volumes are per venue with
 * their unit, never summed.
 */
export function pulseStats(rows, window = '24h', now = new Date()) {
  const list = rows || [];
  const open = { polymarket: 0, kalshi: 0, total: 0 };
  const volume = {
    polymarket: { value: 0, unit: 'usd', n: 0 },
    kalshi: { value: 0, unit: 'contracts', n: 0 },
  };
  for (const r of list) {
    if (!open[r.venue] && open[r.venue] !== 0) continue;
    open[r.venue] += 1;
    open.total += 1;
    const v = windowVolume(r, window);
    if (v != null) {
      volume[r.venue].value += v;
      volume[r.venue].n += 1;
    }
  }
  const [biggestMover = null] = rankMovers(list, 'moves', 1, window);
  const closing = closingByDay(list, now);
  const closingTotal = closing.reduce((s, d) => s + d.count, 0);
  let peak = null;
  for (const d of closing) if (d.count > 0 && (!peak || d.count > peak.count)) peak = d;
  return { open, volume, biggestMover, closing, closingTotal, peak };
}

/* ── conviction ──────────────────────────────────────────────────────── */

/**
 * One market on the Conviction plot: x is liquidity on Polymarket (in
 * dollars) and volume on Kalshi (contracts; Kalshi publishes no liquidity),
 * y is the spread in points, size is window volume. Null when either axis is
 * missing.
 */
export function convictionPoint(row, window = '24h') {
  const spread = num(row?.spread);
  if (spread == null) return null;
  const liq = num(row?.liq);
  const usesLiq = row?.venue === 'polymarket' && liq != null && liq > 0;
  const x = usesLiq ? liq : num(row?.vol);
  if (x == null || x <= 0) return null;
  return {
    x,
    xBasis: usesLiq ? 'liquidity' : 'volume',
    spreadPts: micro(spread * 100),
    size: windowVolume(row, window) ?? 0,
  };
}

export const CONVICTION = {
  xMin: 1e3,
  xMax: 1e7,
  yMax: 10,
  trustLiquidity: 250000,
  trustSpreadPts: 2,
  rMin: 3,
  rMax: 9,
};

/**
 * Plot positions for the Conviction scatter, 0..1 on both axes (y up), and a
 * radius from a sqrt scale on window volume. Points outside the axes clamp to
 * the edge and are flagged.
 */
export function convictionLayout(rows, window = '24h', limit = 300) {
  const pts = [];
  for (const r of rows || []) {
    const c = convictionPoint(r, window);
    if (c) pts.push({ row: r, ...c });
  }
  pts.sort((a, b) => b.x - a.x || cmpId(a.row, b.row));
  const kept = pts.slice(0, limit);
  const maxSize = Math.max(1, ...kept.map((p) => p.size));
  const lx0 = Math.log10(CONVICTION.xMin);
  const lx1 = Math.log10(CONVICTION.xMax);
  return kept.map((p) => {
    const nxRaw = (Math.log10(p.x) - lx0) / (lx1 - lx0);
    const nyRaw = p.spreadPts / CONVICTION.yMax;
    return {
      ...p,
      nx: Math.min(1, Math.max(0, nxRaw)),
      ny: Math.min(1, Math.max(0, nyRaw)),
      clipped: nxRaw < 0 || nxRaw > 1 || nyRaw > 1,
      r: CONVICTION.rMin + Math.sqrt(p.size / maxSize) * (CONVICTION.rMax - CONVICTION.rMin),
      trusted:
        p.xBasis === 'liquidity' &&
        p.x >= CONVICTION.trustLiquidity &&
        p.spreadPts <= CONVICTION.trustSpreadPts,
    };
  });
}

/** Category group colour key for a Conviction dot. */
export function convictionGroup(row) {
  if (row?.category === 'politics' || row?.category === 'elections') return 'politics';
  if (row?.category === 'sports') return 'sports';
  if (row?.category === 'crypto') return 'crypto';
  return 'other';
}

/* ── edge board ──────────────────────────────────────────────────────── */

const CONF_RANK = { high: 3, medium: 2, low: 1, none: 0 };

/**
 * Edge Board tab A rows from the legislation pairs. Pairs under the display
 * floor (confidence 'none', edge null) never appear. Sorted by absolute gap
 * or by confidence, optionally High only, filtered by the search text.
 */
export function edgeRows(pairs, { sort = 'gap', highOnly = false, q = '' } = {}) {
  const needle = String(q || '')
    .trim()
    .toLowerCase();
  const rows = (pairs || [])
    .filter((p) => p && p.edge != null && p.confidence && p.confidence !== 'none')
    .filter((p) => !highOnly || p.confidence === 'high')
    .filter(
      (p) =>
        !needle ||
        `${p.billTitle || ''} ${p.market?.question || ''}`.toLowerCase().includes(needle),
    )
    .map((p) => {
      const half = (num(p.spread) ?? 0) / 2;
      return { ...p, halfSpread: half, netGap: netGap(p.implied, p.model, half) };
    });
  return rows.sort((a, b) =>
    sort === 'confidence'
      ? CONF_RANK[b.confidence] - CONF_RANK[a.confidence] || b.netGap - a.netGap
      : b.netGap - a.netGap || CONF_RANK[b.confidence] - CONF_RANK[a.confidence],
  );
}

/* ── open markets table ──────────────────────────────────────────────── */

/** Table rows: filtered, ordered by volume (contracts at $1 for ordering). */
export function tableRows(rows, { closesOn = null } = {}) {
  return (rows || [])
    .filter((r) => !closesOn || dayKey(r.closes) === closesOn)
    .sort((a, b) => (num(b.vol) ?? 0) - (num(a.vol) ?? 0) || cmpId(a, b));
}

/* ── traders and outcomes ────────────────────────────────────────────── */

const IDENTICON_COLORS = ['blue', 'emerald', 'purple', 'orange'];

/**
 * A 3 x 3 mirrored identicon seeded by a wallet or name: { cells, color }.
 * cells is 9 booleans, row-major, left column mirrored onto the right.
 * Deterministic (FNV-1a), never Math.random.
 */
export function identicon(seed) {
  let h = 0x811c9dc5;
  for (const ch of String(seed || 'ezana')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const bit = (i) => ((h >>> i) & 1) === 1;
  const cells = [];
  for (let r = 0; r < 3; r += 1) {
    const left = bit(r * 2);
    const mid = bit(r * 2 + 1);
    cells.push(left, mid, left);
  }
  if (!cells.some(Boolean)) cells[4] = true;
  return { cells, color: IDENTICON_COLORS[(h >>> 8) % IDENTICON_COLORS.length] };
}

/**
 * A short label for one outcome of a multi-outcome event: the part after the
 * last ": " (Kalshi "Event: Outcome"), else the subject of a "Will X win/be"
 * question, else the question itself.
 */
export function outcomeLabel(question) {
  const q = String(question || '').trim();
  const colon = q.lastIndexOf(': ');
  if (colon > 0 && colon < q.length - 2) return q.slice(colon + 2);
  const m = q.match(/^Will (?:the )?(.+?) (?:win|be|become|remain|lead|finish|take|get)\b/i);
  if (m) return m[1];
  return q;
}
