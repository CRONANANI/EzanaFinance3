/**
 * Synthetic portfolio value series when DB history (portfolio_daily_returns) is
 * empty or for 1D intraday when we have no tick table.
 * End value = user's current total; first value derived from HERO window %.
 */

import { HERO_DATA } from '@/lib/dashboard-hero-data';

/** @typedef {'1D'|'1M'|'6M'|'1Y'} PortfolioRange */

/**
 * @param {number} endValue
 * @param {PortfolioRange} range
 * @param {number} [changePct] - from HERO_DATA[range].change; window move %
 * @returns {{ at: string, value: number }[]}
 */
export function buildSyntheticValuePoints(endValue, range, changePct) {
  const ch = changePct != null && Number.isFinite(changePct) ? changePct : HERO_DATA[range].change;
  const start = endValue > 0 && ch != null ? endValue / (1 + ch / 100) : endValue;
  const n = (() => {
    switch (range) {
      case '1D':
        return 14;
      case '1M':
        return 30;
      case '6M':
        return 26;
      case '1Y':
        return 12;
      default:
        return 20;
    }
  })();

  const now = Date.now();
  const points = [];
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    const wobble = 0.012 * Math.sin(t * Math.PI * 2.1) * (1 - t * 0.2);
    const v = start * (1 - t) * (1 + wobble) + endValue * t;
    const at = timestampForIndex(range, i, n, now);
    points.push({ at, value: Math.max(0, v) });
  }
  if (points.length) {
    points[points.length - 1] = { ...points[points.length - 1], value: endValue };
  }
  return points;
}

/**
 * @param {PortfolioRange} range
 * @param {number} i
 * @param {number} n
 * @param {number} nowMs
 */
function timestampForIndex(range, i, n, nowMs) {
  const d = new Date(nowMs);
  if (range === '1D') {
    d.setHours(0, 0, 0, 0);
    const dayMs = 24 * 60 * 60 * 1000;
    const t0 = d.getTime() + 9.5 * 60 * 60 * 1000;
    const span = 6.5 * 60 * 60 * 1000;
    return new Date(t0 + (n <= 1 ? 0 : (i / (n - 1)) * span)).toISOString();
  }
  if (range === '1M') {
    d.setDate(d.getDate() - (n - 1 - i));
    d.setHours(16, 0, 0, 0);
    return d.toISOString();
  }
  if (range === '6M') {
    d.setDate(d.getDate() - (n - 1 - i) * 7);
    d.setHours(16, 0, 0, 0);
    return d.toISOString();
  }
  d.setDate(1);
  d.setMonth(d.getMonth() - (n - 1 - i));
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

/**
 * Range-aware X-axis tick (short).
 * @param {string} iso
 * @param {PortfolioRange} range
 * @returns {string}
 */
export function formatXAxisLabel(iso, range) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  switch (range) {
    case '1D':
      return d.toLocaleTimeString([], { hour: 'numeric', hour12: true });
    case '1M':
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    case '6M':
      return d.toLocaleDateString([], { month: 'short' });
    case '1Y':
      return d.toLocaleDateString([], { month: 'short', year: '2-digit' });
    default:
      return d.toLocaleDateString();
  }
}

/**
 * @param {string} iso
 * @param {PortfolioRange} range
 * @returns {string}
 */
export function formatTooltipTimeLabel(iso, range) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  switch (range) {
    case '1D':
      return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    case '1M':
    case '6M':
      return d.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    case '1Y':
      return d.toLocaleDateString([], {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    default:
      return d.toLocaleString();
  }
}

/**
 * @param {PortfolioRange} range
 * @returns {number}
 */
export function minTickGapForRange(range) {
  switch (range) {
    case '1D':
      return 40;
    case '1M':
    case '6M':
      return 30;
    case '1Y':
      return 40;
    default:
      return 32;
  }
}

/**
 * Pick up to 6 tick labels for the hero axis row from time-ordered points.
 * @param {{ at: string, value: number }[]} points
 * @param {PortfolioRange} range
 * @returns {string[]}
 */
export function buildAxisLabelRow(points, range) {
  if (!points?.length) return [];
  const maxTicks = 6;
  if (points.length <= maxTicks) {
    return points.map((p) => formatXAxisLabel(p.at, range));
  }
  const out = [];
  for (let k = 0; k < maxTicks; k++) {
    const idx = Math.round((k / (maxTicks - 1)) * (points.length - 1));
    out.push(formatXAxisLabel(points[idx].at, range));
  }
  return out;
}
