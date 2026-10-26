/**
 * Eyes Above insight maths for the Ezana API. Pure (no server imports), so
 * scripts/check-ezana-api-eyes.mjs can test it directly.
 *
 *   pctChange(now, then)            percent change, 2 decimals, null-safe
 *   normFrequency(f)                FRED 'M' / NY Fed 'Monthly' -> 'monthly'
 *   seriesChange(points)            latest value, change on the prior
 *                                   observation and on a year earlier
 *   rankPorts(rows, sort, limit)    the port movers ranking
 *   rankMomentum(rows, sort, limit) the patent momentum ranking
 *   withYoy(points)                 monthly points with the change on the
 *                                   same month a year earlier
 *   matchesCountry(row, q)          country name or ISO3 match
 */

/** CPC sections (the first letter of a CPC symbol). */
export const CPC_SECTIONS = {
  A: 'Human necessities',
  B: 'Operations and transport',
  C: 'Chemistry and metallurgy',
  D: 'Textiles and paper',
  E: 'Fixed constructions',
  F: 'Mechanical engineering',
  G: 'Physics',
  H: 'Electricity',
  Y: 'Emerging cross-sectional',
};

const DAY = 86400000;
const finite = (v) => v != null && v !== '' && Number.isFinite(Number(v));
const round = (v, dp = 2) => (finite(v) ? Math.round(Number(v) * 10 ** dp) / 10 ** dp : null);

/** Percent change from `then` to `now` (2 decimals); null when undefined. */
export function pctChange(now, then) {
  if (!finite(now) || !finite(then) || Number(then) === 0) return null;
  return round((100 * (Number(now) - Number(then))) / Math.abs(Number(then)));
}

const FREQ = {
  d: 'daily',
  daily: 'daily',
  w: 'weekly',
  weekly: 'weekly',
  m: 'monthly',
  monthly: 'monthly',
  q: 'quarterly',
  quarterly: 'quarterly',
  a: 'annual',
  annual: 'annual',
};
/** One spelling for frequencies from FRED ('M', 'W', 'Q') and the NY Fed ('Monthly'). */
export function normFrequency(f) {
  if (!f) return null;
  const k = String(f).trim().toLowerCase();
  return FREQ[k] || FREQ[k.split(/[\s,]/)[0]] || k;
}

/* The same calendar date one year earlier (29 Feb -> 28 Feb). */
function yearBefore(iso) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const last = new Date(Date.UTC(y - 1, m, 0)).getUTCDate();
  return Date.UTC(y - 1, m - 1, Math.min(d, last));
}

/**
 * Latest observation, the change on the prior observation, and the change on
 * the observation a year earlier (the one nearest the same date a year back,
 * within 7 days, so weekly series match their week and monthly or quarterly
 * series their period). `points` are { date, value } in any order; null
 * values are ignored. Absolute and percent changes both, since some series
 * are already rates.
 */
export function seriesChange(points) {
  const pts = (points || [])
    .filter((p) => p && p.date && finite(p.value))
    .map((p) => ({ date: String(p.date).slice(0, 10), value: Number(p.value) }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const latest = pts.at(-1) || null;
  const prior = pts.length > 1 ? pts.at(-2) : null;
  let yearAgo = null;
  if (latest) {
    const target = yearBefore(latest.date);
    let best = Infinity;
    for (const p of pts) {
      const gap = Math.abs(Date.parse(`${p.date}T00:00:00Z`) - target);
      if (gap <= 7 * DAY && gap < best) {
        best = gap;
        yearAgo = p;
      }
    }
  }
  const diff = (a, b) => (a && b ? round(a.value - b.value, 4) : null);
  return {
    latest_date: latest?.date ?? null,
    latest_value: latest?.value ?? null,
    prior_date: prior?.date ?? null,
    prior_value: prior?.value ?? null,
    change_prior: diff(latest, prior),
    change_prior_pct: latest && prior ? pctChange(latest.value, prior.value) : null,
    year_ago_date: yearAgo?.date ?? null,
    year_ago_value: yearAgo?.value ?? null,
    change_yoy: diff(latest, yearAgo),
    change_yoy_pct: latest && yearAgo ? pctChange(latest.value, yearAgo.value) : null,
  };
}

/* Descending on f(row) with nulls last, then a stable tie-break on `id`. */
function byDesc(rows, f, id) {
  return [...rows].sort((a, b) => {
    const x = f(a);
    const y = f(b);
    if (x == null && y == null) return String(id(a)).localeCompare(String(id(b)));
    if (x == null) return 1;
    if (y == null) return -1;
    return y - x || String(id(a)).localeCompare(String(id(b)));
  });
}

export const PORT_SORTS = ['move', 'rise', 'fall', 'calls'];
/**
 * Port movers: 'move' largest absolute change first, 'rise' biggest increase
 * first, 'fall' biggest decrease first, 'calls' busiest (recent calls a day)
 * first. Rows carry change_pct and recent_calls_per_day.
 */
export function rankPorts(rows, sort = 'move', limit = 50) {
  const id = (r) => r.portid;
  const c = (r) => (finite(r.change_pct) ? Number(r.change_pct) : null);
  const f = {
    move: (r) => (c(r) == null ? null : Math.abs(c(r))),
    rise: c,
    fall: (r) => (c(r) == null ? null : -c(r)),
    calls: (r) => (finite(r.recent_calls_per_day) ? Number(r.recent_calls_per_day) : null),
  }[sort];
  if (!f) throw new Error(`unknown port sort ${sort}`);
  return byDesc(rows, f, id).slice(0, limit);
}

export const MOMENTUM_SORTS = ['change', 'grants'];
/**
 * Patent momentum: 'change' fastest growth in grants (last 12 months on the
 * prior 12) first, companies with no prior-year grants last; 'grants' most
 * grants in the last 12 months first.
 */
export function rankMomentum(rows, sort = 'change', limit = 50) {
  const id = (r) => r.ticker;
  const f = {
    change: (r) => (finite(r.change_pct) ? Number(r.change_pct) : null),
    grants: (r) => (finite(r.grants_12m) ? Number(r.grants_12m) : null),
  }[sort];
  if (!f) throw new Error(`unknown momentum sort ${sort}`);
  return byDesc(rows, f, id).slice(0, limit);
}

/**
 * Monthly points ({ month, value }) oldest first, each with yoy_change_pct on
 * the same month a year earlier when that month is present.
 */
export function withYoy(points) {
  const pts = (points || [])
    .filter((p) => p && p.month)
    .map((p) => ({ ...p, month: String(p.month).slice(0, 10) }))
    .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
  const byMonth = new Map(pts.map((p) => [p.month.slice(0, 7), p]));
  return pts.map((p) => {
    const y = Number(p.month.slice(0, 4)) - 1;
    const prev = byMonth.get(`${y}-${p.month.slice(5, 7)}`);
    return { ...p, yoy_change_pct: prev ? pctChange(p.value, prev.value) : null };
  });
}

/** True when `q` names the row's country or its ISO3 code (case-insensitive). */
export function matchesCountry(row, q) {
  if (!q) return true;
  const s = String(q).trim().toLowerCase();
  return (
    String(row.iso3 || '').toLowerCase() === s || String(row.country || '').toLowerCase() === s
  );
}
