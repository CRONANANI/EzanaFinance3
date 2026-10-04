/**
 * Geometry for the company card's price chart: daily closes as a line, and
 * one portrait marker per member purchase, placed on the close nearest the
 * purchase date. Pure, so the layout is testable without a browser.
 *
 * Markers that land on the same day (or within a few pixels) stack upward,
 * so two members who bought the same week are both visible, and a day with
 * several buys by one member shows once with a count.
 */

const DAY = 86400000;

export const CHART = {
  width: 640,
  height: 220,
  pad: { top: 26, right: 14, bottom: 28, left: 46 },
  marker: 22, // portrait diameter
  stackGap: 2,
  sameSpotPx: 10,
};

export function parseDay(s) {
  const d = new Date(`${String(s).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/* Nice y-axis bounds and ticks around [lo, hi]. */
export function niceTicks(lo, hi, count = 4) {
  if (!(hi > lo)) return { min: lo || 0, max: (hi || 0) + 1, ticks: [lo || 0] };
  const span = hi - lo;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Number(v.toFixed(6)));
  return { min, max, ticks };
}

/* Year ticks across the x range: Jan 1 of each year inside it. */
export function yearTicks(t0, t1) {
  const out = [];
  const y0 = new Date(t0).getUTCFullYear();
  const y1 = new Date(t1).getUTCFullYear();
  for (let y = y0 + 1; y <= y1; y++) out.push({ t: Date.UTC(y, 0, 1), label: String(y) });
  /* Fewer than two full years: label quarters instead. */
  if (out.length < 2) {
    out.length = 0;
    const d = new Date(t0);
    d.setUTCDate(1);
    d.setUTCMonth(Math.ceil(d.getUTCMonth() / 3) * 3);
    for (let t = d.getTime(); t <= t1;) {
      const dd = new Date(t);
      out.push({
        t,
        label: dd.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      });
      dd.setUTCMonth(dd.getUTCMonth() + 3);
      t = dd.getTime();
    }
  }
  return out;
}

/**
 * Lay out the chart.
 * @param {{date:string, close:number}[]} candles  oldest first
 * @param {{bioguide_id:string, date:string, amount:number}[]} purchases
 * @param {Record<string, object>} holdersById
 * @param {object} [opts]  { width, height }
 */
export function layoutChart(candles, purchases, holdersById, opts = {}) {
  const W = opts.width || CHART.width;
  const H = opts.height || CHART.height;
  const P = CHART.pad;
  const series = (candles || [])
    .map((c) => ({ t: parseDay(c.date), v: Number(c.close) }))
    .filter((p) => p.t != null && Number.isFinite(p.v))
    .sort((a, b) => a.t - b.t);
  if (series.length < 2) return { ok: false, reason: 'no_prices', W, H };

  const t0 = series[0].t;
  const t1 = series[series.length - 1].t;
  const lo = Math.min(...series.map((p) => p.v));
  const hi = Math.max(...series.map((p) => p.v));
  const y = niceTicks(lo, hi);
  const x = (t) => P.left + ((t - t0) / Math.max(1, t1 - t0)) * (W - P.left - P.right);
  const yv = (v) =>
    P.top + (1 - (v - y.min) / Math.max(1e-9, y.max - y.min)) * (H - P.top - P.bottom);
  const path = series
    .map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${yv(p.v).toFixed(1)}`)
    .join(' ');

  /* Nearest close for a date: binary search on the sorted series. */
  const nearest = (t) => {
    let a = 0;
    let b = series.length - 1;
    while (a < b) {
      const m = (a + b) >> 1;
      if (series[m].t < t) a = m + 1;
      else b = m;
    }
    const cand = [series[a], series[a - 1]].filter(Boolean);
    return cand.reduce((best, p) => (Math.abs(p.t - t) < Math.abs(best.t - t) ? p : best));
  };

  /* One marker per (member, day); several buys that day fold into a count. */
  const byKey = new Map();
  for (const p of purchases || []) {
    const t = parseDay(p.date);
    if (t == null || t < t0 - 7 * DAY || t > t1 + 7 * DAY) continue;
    const k = `${p.bioguide_id}|${String(p.date).slice(0, 10)}`;
    const cur = byKey.get(k) || {
      bioguide_id: p.bioguide_id,
      date: String(p.date).slice(0, 10),
      t,
      amount: 0,
      buys: 0,
    };
    cur.amount += Number(p.amount) || 0;
    cur.buys += 1;
    byKey.set(k, cur);
  }
  const markers = [...byKey.values()]
    .sort((a, b) => a.t - b.t)
    .map((m) => {
      const near = nearest(m.t);
      return {
        ...m,
        holder: holdersById[m.bioguide_id] || null,
        cx: x(near.t),
        cy: yv(near.v),
        price: near.v,
        level: 0,
      };
    });
  /* Stack markers whose x is within a marker width of an earlier one. */
  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    let level = 0;
    for (let j = 0; j < i; j++) {
      const o = markers[j];
      if (Math.abs(o.cx - m.cx) < CHART.marker + CHART.sameSpotPx && o.level === level) {
        level += 1;
        j = -1; // restart the scan at the new level
      }
    }
    m.level = level;
    /* Portraits sit above the line, each level one marker higher. */
    m.my = m.cy - CHART.marker * 0.9 - level * (CHART.marker + CHART.stackGap);
    if (m.my < CHART.marker / 2 + 2) m.my = CHART.marker / 2 + 2;
  }

  return {
    ok: true,
    W,
    H,
    t0,
    t1,
    path,
    yTicks: y.ticks.map((v) => ({ v, y: yv(v) })),
    xTicks: yearTicks(t0, t1).map((k) => ({ ...k, x: x(k.t) })),
    first: { ...series[0], x: x(series[0].t), y: yv(series[0].v) },
    last: {
      ...series[series.length - 1],
      x: x(series[series.length - 1].t),
      y: yv(series[series.length - 1].v),
    },
    markers,
    maxLevel: markers.reduce((a, m) => Math.max(a, m.level), 0),
  };
}

/* FMP range that covers the earliest purchase. */
export function rangeFor(purchases, now = Date.now()) {
  const earliest = (purchases || []).map((p) => parseDay(p.date)).filter((t) => t != null);
  if (!earliest.length) return '5Y';
  const years = (now - Math.min(...earliest)) / (365.25 * DAY);
  return years <= 1 ? '1Y' : years <= 3 ? '3Y' : years <= 5 ? '5Y' : years <= 10 ? '10Y' : 'ALL';
}
