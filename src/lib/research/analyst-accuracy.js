/**
 * Analyst track records (Nov 20, 2026): rank the analysts and firms covering
 * a stock by how their past calls on THAT stock actually played out.
 * Pure functions, no imports, so the scoring runs under plain node in
 * scripts/check-analyst-accuracy.mjs.
 *
 * Inputs (FMP stable, fetched by the API route):
 *   targets: price-target-news rows, one per published target, with the
 *            individual analyst's name and firm, the target, the stock price
 *            when it was posted and the date.
 *   grades:  rating-change rows by firm (gradingCompany, newGrade, date).
 *   closes:  daily closes for the stock and for SPY (the market benchmark).
 *
 * Method (stated to readers in the card's "How this is scored" note):
 *   - A call is scored once 12 months have passed since it was made.
 *   - Direction: a target above the price at posting, or a Buy-type rating,
 *     is bullish; a target below the price, or a Sell-type rating, bearish.
 *     Hold-type ratings carry no direction and are not scored.
 *   - A call is right when the stock beat SPY over the next 12 months for a
 *     bullish call, or trailed it for a bearish one.
 *   - Target hit: the stock closed at or beyond the target at any point
 *     within the 12 months (individual analysts only).
 *   - Repeat calls: the same analyst (or firm) making the same-direction
 *     call again within 30 days counts once, so reiterations do not stack.
 *   - Ranking: hit rate shrunk toward 50% by five phantom calls, so two
 *     lucky calls cannot outrank a long record; at least 3 scored calls to
 *     be ranked.
 * Nothing is estimated: a call without price data on both ends is skipped.
 */

export const HORIZON_DAYS = 365;
export const DEDUPE_DAYS = 30;
export const MIN_CALLS = 3;
export const PRIOR_CALLS = 5;
export const LOOKBACK_YEARS = 6;
const DAY = 864e5;

const BULL_RE =
  /\b(strong buy|buy|outperform|overweight|accumulate|positive|add|market outperform|sector outperform|top pick|conviction buy)\b/i;
const BEAR_RE =
  /\b(strong sell|sell|underperform|underweight|reduce|negative|market underperform|sector underperform)\b/i;

/** 'bull' | 'bear' | null for a rating label such as "Overweight". */
export function ratingDirection(grade) {
  const g = String(grade || '').trim();
  if (!g) return null;
  if (BEAR_RE.test(g)) return 'bear';
  if (BULL_RE.test(g)) return 'bull';
  return null;
}

const num = (v) => {
  const n = typeof v === 'string' ? Number(v.replace(/[$,]/g, '')) : Number(v);
  return Number.isFinite(n) ? n : null;
};
const day = (v) => {
  const s = String(v || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
const clean = (v) =>
  String(v || '')
    .replace(/\s+/g, ' ')
    .trim();

/** Normalise one price-target-news row; null when unusable. */
export function normTarget(r) {
  if (!r || typeof r !== 'object') return null;
  const date = day(r.publishedDate ?? r.date ?? r.published_at);
  const analyst = clean(r.analystName ?? r.analyst ?? r.analyst_name);
  const firm = clean(r.analystCompany ?? r.company ?? r.newsPublisher ?? r.firm);
  const target = num(r.priceTarget ?? r.adjPriceTarget ?? r.target);
  const posted = num(r.priceWhenPosted ?? r.stockPriceAtPosting ?? r.price_when_posted);
  if (!date || !analyst || !target || target <= 0) return null;
  return { date, analyst, firm, target, posted: posted && posted > 0 ? posted : null };
}

/** Normalise one grades row; null when unusable. */
export function normGrade(r) {
  if (!r || typeof r !== 'object') return null;
  const date = day(r.date ?? r.publishedDate);
  const firm = clean(r.gradingCompany ?? r.company ?? r.firm);
  const grade = clean(r.newGrade ?? r.grade ?? r.toGrade);
  if (!date || !firm || !grade) return null;
  return { date, firm, grade, action: clean(r.action).toLowerCase() };
}

/**
 * Build a close lookup from FMP daily rows (flat array or {historical}).
 * Returns { dates: [...ascending], close: Map(date -> close) }.
 */
export function closeSeries(rows) {
  const arr = Array.isArray(rows) ? rows : Array.isArray(rows?.historical) ? rows.historical : [];
  const close = new Map();
  for (const r of arr) {
    const d = day(r?.date);
    const c = num(r?.close ?? r?.price ?? r?.adjClose);
    if (d && c && c > 0) close.set(d, c);
  }
  const dates = [...close.keys()].sort();
  return { dates, close };
}

/* First trading day on or after `d` (binary search); -1 when past the end. */
function idxOnOrAfter(dates, d) {
  let lo = 0;
  let hi = dates.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (dates[mid] < d) lo = mid + 1;
    else hi = mid;
  }
  return lo < dates.length ? lo : -1;
}

const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/**
 * Score one call. Returns null when it cannot be scored yet (under 12
 * months old) or lacks price data. `target` is optional (ratings have none).
 */
export function scoreCall({ date, direction, target, posted }, stock, spy, today) {
  if (direction !== 'bull' && direction !== 'bear') return null;
  const end = addDays(date, HORIZON_DAYS);
  if (end > today) return null;
  const i0 = idxOnOrAfter(stock.dates, date);
  const i1 = idxOnOrAfter(stock.dates, end);
  const j0 = idxOnOrAfter(spy.dates, date);
  const j1 = idxOnOrAfter(spy.dates, end);
  if (i0 < 0 || i1 < 0 || j0 < 0 || j1 < 0) return null;
  /* Guard against gaps: the start must be within a week of the call. */
  if (Date.parse(stock.dates[i0]) - Date.parse(date) > 7 * DAY) return null;
  const s0 = stock.close.get(stock.dates[i0]);
  const s1 = stock.close.get(stock.dates[i1]);
  const m0 = spy.close.get(spy.dates[j0]);
  const m1 = spy.close.get(spy.dates[j1]);
  const stockRet = s1 / s0 - 1;
  const mktRet = m1 / m0 - 1;
  const excess = stockRet - mktRet;
  const right = direction === 'bull' ? excess > 0 : excess < 0;
  let targetHit = null;
  if (target) {
    const base = posted || s0;
    const up = target >= base;
    targetHit = false;
    for (let i = i0; i <= i1; i += 1) {
      const c = stock.close.get(stock.dates[i]);
      if (up ? c >= target : c <= target) {
        targetHit = true;
        break;
      }
    }
  }
  return {
    right,
    /* Return earned by following the call: long if bullish, short if bearish. */
    callExcess: direction === 'bull' ? excess : -excess,
    targetHit,
  };
}

/* Collapse same-direction repeats within DEDUPE_DAYS (keep the first). */
function dedupe(calls) {
  const out = [];
  const lastByDir = {};
  for (const c of [...calls].sort((a, b) => a.date.localeCompare(b.date))) {
    const prev = lastByDir[c.direction];
    if (prev && Date.parse(c.date) - Date.parse(prev) < DEDUPE_DAYS * DAY) continue;
    lastByDir[c.direction] = c.date;
    out.push(c);
  }
  return out;
}

/** Hit rate shrunk toward 50% (PRIOR_CALLS phantom calls). */
export function shrunkScore(hits, n) {
  return (hits + PRIOR_CALLS * 0.5) / (n + PRIOR_CALLS);
}

function summarise(key, label, firm, calls, latest, stock, spy, today) {
  const scored = [];
  for (const c of dedupe(calls.filter((x) => x.direction))) {
    const s = scoreCall(c, stock, spy, today);
    if (s) scored.push(s);
  }
  const n = scored.length;
  const hits = scored.filter((s) => s.right).length;
  const withTarget = scored.filter((s) => s.targetHit !== null);
  return {
    key,
    name: label,
    firm: firm || null,
    calls: n,
    hits,
    hitRate: n ? hits / n : null,
    score: shrunkScore(hits, n),
    avgExcess: n ? scored.reduce((a, s) => a + s.callExcess, 0) / n : null,
    targetHitRate: withTarget.length
      ? withTarget.filter((s) => s.targetHit).length / withTarget.length
      : null,
    latest,
  };
}

const rank = (rows) =>
  rows
    .filter((r) => r.calls >= MIN_CALLS)
    .sort((a, b) => b.score - a.score || b.calls - a.calls || a.name.localeCompare(b.name));

/**
 * Rank everyone covering the stock.
 * Returns { analysts: [...], firms: [...], coverage } (each list ranked,
 * best first; `coverage` counts what was seen and scored).
 */
export function rankAnalysts({ targets = [], grades = [], stockRows, spyRows, today, limit = 10 }) {
  const t = today || new Date().toISOString().slice(0, 10);
  const stock = closeSeries(stockRows);
  const spy = closeSeries(spyRows);
  const since = addDays(t, -Math.round(LOOKBACK_YEARS * 365.25));

  /* Individual analysts, from price targets. */
  const byAnalyst = new Map();
  for (const raw of targets) {
    const r = normTarget(raw);
    if (!r || r.date < since) continue;
    const base = r.posted || stock.close.get(stock.dates[idxOnOrAfter(stock.dates, r.date)]);
    const direction = base ? (r.target > base ? 'bull' : r.target < base ? 'bear' : null) : null;
    const key = `${r.analyst.toLowerCase()}|${r.firm.toLowerCase()}`;
    if (!byAnalyst.has(key)) byAnalyst.set(key, { name: r.analyst, firm: r.firm, calls: [] });
    byAnalyst.get(key).calls.push({ date: r.date, direction, target: r.target, posted: base || null });
  }
  const analysts = [];
  for (const [key, a] of byAnalyst) {
    const last = [...a.calls].sort((x, y) => y.date.localeCompare(x.date))[0];
    analysts.push(
      summarise(key, a.name, a.firm, a.calls, { date: last.date, target: last.target }, stock, spy, t),
    );
  }

  /* Firms, from rating changes. */
  const byFirm = new Map();
  for (const raw of grades) {
    const r = normGrade(raw);
    if (!r || r.date < since) continue;
    const key = r.firm.toLowerCase();
    if (!byFirm.has(key)) byFirm.set(key, { name: r.firm, calls: [] });
    byFirm.get(key).calls.push({ date: r.date, direction: ratingDirection(r.grade), grade: r.grade });
  }
  const firms = [];
  for (const [key, f] of byFirm) {
    const last = [...f.calls].sort((x, y) => y.date.localeCompare(x.date))[0];
    firms.push(summarise(key, f.name, null, f.calls, { date: last.date, rating: last.grade }, stock, spy, t));
  }

  const rankedA = rank(analysts);
  const rankedF = rank(firms);
  return {
    analysts: rankedA.slice(0, limit),
    firms: rankedF.slice(0, limit),
    coverage: {
      analystsSeen: analysts.length,
      analystsRanked: rankedA.length,
      firmsSeen: firms.length,
      firmsRanked: rankedF.length,
      priceDays: stock.dates.length,
    },
  };
}
