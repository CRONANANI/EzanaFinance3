// Pure formatting and chart-geometry helpers for the Quant Lab workbench.
// No React, no DOM: scripts/check-quant-engine.mjs can import this directly.

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

/** A statistic that could not be computed is shown as "n/a", never as 0. */
export const NA = 'n/a';

export const fmtPct = (x, digits = 2) => (isNum(x) ? `${(x * 100).toFixed(digits)}%` : NA);
export const fmtSignedPct = (x, digits = 2) =>
  isNum(x) ? `${x > 0 ? '+' : ''}${(x * 100).toFixed(digits)}%` : NA;
export const fmtRatio = (x, digits = 2) => (isNum(x) ? x.toFixed(digits) : NA);
export const fmtInt = (x) => (isNum(x) ? Math.round(x).toLocaleString('en-US') : NA);
export const fmtMoney = (x, digits = 0) =>
  isNum(x)
    ? `${x < 0 ? '-' : ''}$${Math.abs(x).toLocaleString('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })}`
    : NA;
export const fmtDays = (x) => (isNum(x) ? `${Math.round(x)} d` : NA);

/** 'positive' | 'negative' | '' for a signed value. */
export const tone = (x) => (isNum(x) && x !== 0 ? (x > 0 ? 'positive' : 'negative') : '');

/**
 * SVG path data for one or more series drawn on a shared scale.
 * Every series has the same length (one point per session); null points break
 * the line. Returns { paths: string[], min, max }.
 */
export function linePaths(seriesList, width, height, pad = 4) {
  const all = seriesList.flat().filter(isNum);
  if (!all.length) return { paths: seriesList.map(() => ''), min: 0, max: 0 };
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const n = Math.max(...seriesList.map((s) => s.length));
  const x = (i) => (n > 1 ? pad + (i / (n - 1)) * (width - pad * 2) : width / 2);
  const y = (v) => pad + (1 - (v - min) / (max - min)) * (height - pad * 2);
  const paths = seriesList.map((s) => {
    let d = '';
    let pen = false;
    s.forEach((v, i) => {
      if (!isNum(v)) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  });
  return { paths, min, max };
}

/** Closed area path from a series down (or up) to a baseline value. */
export function areaPath(series, width, height, baseline, min, max, pad = 4) {
  const pts = series.map((v, i) => [i, v]).filter(([, v]) => isNum(v));
  if (pts.length < 2 || min === max) return '';
  const n = series.length;
  const x = (i) => pad + (i / (n - 1)) * (width - pad * 2);
  const y = (v) => pad + (1 - (v - min) / (max - min)) * (height - pad * 2);
  const top = pts.map(([i, v], k) => `${k ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
  const first = pts[0][0];
  const last = pts[pts.length - 1][0];
  return `${top.join('')}L${x(last).toFixed(1)} ${y(baseline).toFixed(1)}L${x(first).toFixed(1)} ${y(baseline).toFixed(1)}Z`;
}

/** Monthly returns grouped into rows per year: [{ year, months: (number|null)[12], total }]. */
export function monthlyGrid(monthly) {
  const years = new Map();
  for (const m of monthly || []) {
    const [y, mo] = String(m.month).split('-');
    if (!years.has(y)) years.set(y, Array(12).fill(null));
    years.get(y)[Number(mo) - 1] = m.return;
  }
  return [...years.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([year, months]) => ({
      year,
      months,
      total: months.some(isNum)
        ? months.filter(isNum).reduce((acc, r) => acc * (1 + r), 1) - 1
        : null,
    }));
}

/** CSV text for the trade ledger (values quoted, formulas neutralised). */
export function tradesCsv(trades) {
  const cols = [
    'ticker',
    'side',
    'shares',
    'signalDate',
    'entryDate',
    'entryPrice',
    'exitDate',
    'exitPrice',
    'holdDays',
    'pnl',
    'pnlPct',
    'costs',
    'exitReason',
  ];
  const cell = (v) => {
    if (v === null || v === undefined) return '';
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s) && typeof v !== 'number') s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [cols.join(','), ...(trades || []).map((t) => cols.map((c) => cell(t[c])).join(','))].join(
    '\n',
  );
}

/**
 * The workbench keeps its run settings as the strings a form produces, with
 * the risk-free rate in percent. This is the shape the API expects.
 */
export function toApiConfig(config) {
  return {
    ...config,
    initialCapital: Number(config.initialCapital),
    slippageBps: Number(config.slippageBps),
    commissionPerShare: Number(config.commissionPerShare),
    riskFreeRate: Number(config.riskFreeRate) / 100,
  };
}

/**
 * Starting values for sweeping one parameter: five points around its current
 * value, inside its bounds. A suggestion for the form, nothing more.
 */
export function suggestValues(param) {
  const out = [];
  for (const k of [0.5, 0.75, 1, 1.25, 1.5]) {
    let v = param.current * k;
    v = param.kind === 'int' ? Math.round(v) : Number(v.toFixed(2));
    v = Math.min(Math.max(v, param.min), param.max);
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

/** "20, 50, 100" to [20, 50, 100]; anything that is not a number is dropped. */
export function parseValues(text) {
  return String(text || '')
    .split(/[\s,;]+/)
    .filter((s) => s !== '')
    .map(Number)
    .filter(isNum);
}
