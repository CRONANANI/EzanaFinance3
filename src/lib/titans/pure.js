/**
 * Pure helpers for the Titans Shadow read layer (no imports), unit tested by
 * scripts/check-titans-2.mjs.
 */

const DAY = 86400000;

/**
 * Issuers where three or more different insiders bought (code P) within any
 * 14-day window. Pure; exported for the unit test.
 */
export function clusterBuys(rows, { windowDays = 14, minInsiders = 3 } = {}) {
  const byIssuer = new Map();
  for (const r of rows) {
    if (r.code !== 'P' || !r.date || !(r.ticker || r.company)) continue;
    const k = r.ticker || r.company;
    if (!byIssuer.has(k)) byIssuer.set(k, []);
    byIssuer.get(k).push(r);
  }
  const out = [];
  for (const [, list] of byIssuer) {
    list.sort((a, b) => a.date.localeCompare(b.date));
    let best = null;
    for (let i = 0; i < list.length; i += 1) {
      const start = Date.parse(list[i].date);
      const inWin = list.filter((x) => {
        const t = Date.parse(x.date);
        return t >= start && t <= start + windowDays * DAY;
      });
      const insiders = new Set(inWin.map((x) => x.insider).filter(Boolean));
      if (insiders.size >= minInsiders && (!best || insiders.size > best.insiders.length)) {
        best = {
          ticker: list[i].ticker,
          company: list[i].company,
          from: inWin[0].date,
          to: inWin[inWin.length - 1].date,
          insiders: [...insiders],
          value: inWin.reduce((s, x) => s + (x.value || 0), 0),
          trades: inWin.length,
        };
      }
    }
    if (best) out.push(best);
  }
  return out.sort((a, b) => b.insiders.length - a.insiders.length || b.value - a.value);
}

/** Overlap of two holding lists by CUSIP (else name). Pure; unit tested. */
export function overlap(a, b) {
  const key = (h) => h.cusip || String(h.name || '').toUpperCase();
  const mapB = new Map();
  for (const h of b) {
    const k = key(h);
    mapB.set(k, (mapB.get(k) || 0) + (h.pct || 0));
  }
  const mapA = new Map();
  const meta = new Map();
  for (const h of a) {
    const k = key(h);
    mapA.set(k, (mapA.get(k) || 0) + (h.pct || 0));
    if (!meta.has(k)) meta.set(k, h);
  }
  const shared = [];
  for (const [k, wa] of mapA) {
    if (!mapB.has(k)) continue;
    const wb = mapB.get(k);
    const m = meta.get(k);
    shared.push({
      key: k,
      name: m.name,
      ticker: m.ticker,
      weightA: wa,
      weightB: wb,
      overlap: Math.min(wa, wb),
    });
  }
  shared.sort((x, y) => y.overlap - x.overlap);
  return { shared, overlapPct: shared.reduce((s, x) => s + x.overlap, 0) };
}

/** Revenue growth, percent, from two reported values; null otherwise. */
export function growthPct(now, prior) {
  if (now == null || prior == null || prior === 0) return null;
  return ((now - prior) / Math.abs(prior)) * 100;
}
