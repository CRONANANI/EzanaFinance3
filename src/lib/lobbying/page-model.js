/**
 * Lobbying Activity page model (Oct 21, 2026 redesign). Pure: no React, no
 * I/O, no string formatting (that lives in page-format.js). Shared by the
 * /api/lobbying/page route and the page so both read periods, filters and
 * coverage the same way.
 *
 * Honesty gates that live here:
 *   - YoY is null (rendered as a middle dot) when the prior period is empty
 *     or either period is not loaded to YOY_MIN_COVERAGE.
 *   - Quarter status distinguishes "still being filed" (inside the filing
 *     window) from "loaded so far" (our copy is incomplete) from complete,
 *     and future quarters are never drawn as bars.
 *   - LD-203 dates are clamped to the report's filing period.
 *   - Name-matched tickers are never presented as verified.
 */
import { ENTITY_GROUPS } from './entities.js';

const DAY_MS = 86400000;

/* ── periods ────────────────────────────────────────────────────────────── */

export const QUARTERS = ['q1', 'q2', 'q3', 'q4'];
const Q_INDEX = { q1: 0, q2: 1, q3: 2, q4: 3 };

/** First year the page charts (the cache starts at 2024). */
export const FIRST_YEAR = 2024;

/** LD-2 reports are due 20 days after quarter end; late ones keep arriving. */
export const FILING_WINDOW_DAYS = 45;

/** YoY is shown only when both periods are at least this loaded (percent). */
export const YOY_MIN_COVERAGE = 95;

export function quarterStart(year, quarter) {
  return Date.UTC(year, Q_INDEX[quarter] * 3, 1);
}
export function quarterEnd(year, quarter) {
  return Date.UTC(year, Q_INDEX[quarter] * 3 + 3, 1);
}

/** The quarter containing `nowMs`. */
export function currentQuarter(nowMs) {
  const d = new Date(nowMs);
  return { year: d.getUTCFullYear(), quarter: QUARTERS[Math.floor(d.getUTCMonth() / 3)] };
}

/** Quarters that have ended in `year` as of `nowMs`. */
export function endedQuarters(year, nowMs) {
  return QUARTERS.filter((q) => quarterEnd(year, q) <= nowMs);
}

/** Every quarter from FIRST_YEAR Q1 to the last quarter of the current year. */
export function quarterAxis(nowMs) {
  const { year } = currentQuarter(nowMs);
  const out = [];
  for (let y = FIRST_YEAR; y <= year; y += 1)
    for (const q of QUARTERS) out.push({ year: y, quarter: q });
  return out;
}

/** Period keys offered in the filter bar. */
export function periodOptions(nowMs) {
  const { year } = currentQuarter(nowMs);
  return [`fy${year - 2}`, `fy${year - 1}`, 'ytd', 'quarter', '90d'];
}

/** Quarters selectable in the quarter picker, newest first, ended or current. */
export function quarterOptions(nowMs) {
  return quarterAxis(nowMs)
    .filter((x) => quarterStart(x.year, x.quarter) <= nowMs)
    .map((x) => `${x.year}${x.quarter}`)
    .reverse();
}

export function defaultPeriod(nowMs) {
  return `fy${currentQuarter(nowMs).year - 1}`;
}

/** The latest ended quarter, the quarter picker's default. */
export function latestEndedQuarter(nowMs) {
  const ended = quarterAxis(nowMs).filter((x) => quarterEnd(x.year, x.quarter) <= nowMs);
  const last = ended[ended.length - 1];
  return last ? `${last.year}${last.quarter}` : `${FIRST_YEAR}q1`;
}

/**
 * A period key to a filing scope and its same-period-last-year twin.
 * Keys: fyYYYY | ytd | YYYYqN | 90d. Unknown keys fall back to the default.
 * @returns {{ key, kind, year, quarters, from, to, prior, coverage:[{year,quarter}], members }}
 */
export function resolvePeriod(key, nowMs) {
  const { year: cy } = currentQuarter(nowMs);
  const k = String(key || '').toLowerCase();

  const fy = /^fy(\d{4})$/.exec(k);
  if (fy) {
    const year = Number(fy[1]);
    if (year >= FIRST_YEAR && year <= cy) {
      return {
        key: k,
        kind: 'year',
        year,
        quarters: null,
        from: null,
        to: null,
        prior: { year: year - 1, quarters: null, from: null, to: null },
        coverage: QUARTERS.map((quarter) => ({ year, quarter })),
        priorCoverage: QUARTERS.map((quarter) => ({ year: year - 1, quarter })),
        members: { year, periods: ['mid_year', 'year_end'] },
      };
    }
  }

  if (k === 'ytd') {
    const quarters = endedQuarters(cy, nowMs);
    const qs = quarters.length ? quarters : ['q1'];
    return {
      key: 'ytd',
      kind: 'ytd',
      year: cy,
      quarters: qs,
      from: null,
      to: null,
      prior: { year: cy - 1, quarters: qs, from: null, to: null },
      coverage: qs.map((quarter) => ({ year: cy, quarter })),
      priorCoverage: qs.map((quarter) => ({ year: cy - 1, quarter })),
      members: {
        year: cy,
        periods: Date.UTC(cy, 6, 1) <= nowMs ? ['mid_year', 'year_end'] : ['mid_year'],
      },
    };
  }

  const qk = /^(\d{4})(q[1-4])$/.exec(k);
  if (qk) {
    const year = Number(qk[1]);
    const quarter = qk[2];
    if (year >= FIRST_YEAR && quarterStart(year, quarter) <= nowMs) {
      return {
        key: k,
        kind: 'quarter',
        year,
        quarters: [quarter],
        from: null,
        to: null,
        prior: { year: year - 1, quarters: [quarter], from: null, to: null },
        coverage: [{ year, quarter }],
        priorCoverage: [{ year: year - 1, quarter }],
        members: { year, periods: [Q_INDEX[quarter] < 2 ? 'mid_year' : 'year_end'] },
      };
    }
  }

  if (k === '90d') {
    const to = new Date(nowMs).toISOString();
    const from = new Date(nowMs - 90 * DAY_MS).toISOString();
    return {
      key: '90d',
      kind: 'range',
      year: null,
      quarters: null,
      from,
      to,
      prior: {
        year: null,
        quarters: null,
        from: new Date(nowMs - 455 * DAY_MS).toISOString(),
        to: new Date(nowMs - 365 * DAY_MS).toISOString(),
      },
      coverage: quarterAxis(nowMs).filter(
        (x) =>
          quarterEnd(x.year, x.quarter) > nowMs - 90 * DAY_MS &&
          quarterStart(x.year, x.quarter) <= nowMs,
      ),
      priorCoverage: quarterAxis(nowMs).filter(
        (x) =>
          quarterEnd(x.year, x.quarter) > nowMs - 455 * DAY_MS &&
          quarterStart(x.year, x.quarter) <= nowMs - 365 * DAY_MS,
      ),
      members: { year: null, periods: null, from },
    };
  }

  return resolvePeriod(defaultPeriod(nowMs), nowMs);
}

/* ── filters ────────────────────────────────────────────────────────────── */

export const MIN_STOPS = [0, 10000, 50000, 100000, 250000, 500000, 1000000, 5000000, 10000000];

/** Entity groups, keyed to ENTITY_GROUPS in entities.js. */
export const ENTITY_KEYS = ['all', 'congress', 'agencies', 'whitehouse'];

export function snapMin(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  let best = 0;
  for (const s of MIN_STOPS) if (s <= n) best = s;
  return best;
}

const ISSUE_CODE = /^[A-Z]{3}$/;

/**
 * URLSearchParams (or a plain object) to the page filters. Every value is
 * validated; anything unknown falls back to its default.
 */
export function parseFilters(params, nowMs) {
  const get = (k) =>
    typeof params?.get === 'function'
      ? params.get(k)
      : params?.[k] == null
        ? null
        : String(params[k]);
  const rawPeriod = (get('period') || '').toLowerCase();
  const period = resolvePeriod(rawPeriod || defaultPeriod(nowMs), nowMs).key;
  const issue = (get('issue') || '').toUpperCase();
  const entity = (get('entity') || '').toLowerCase();
  const q = (get('q') || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return {
    period,
    issue: ISSUE_CODE.test(issue) ? issue : null,
    entity: ENTITY_KEYS.includes(entity) ? entity : 'all',
    min: snapMin(get('min')),
    public: ['1', 'true', 'yes'].includes(String(get('public') || '').toLowerCase()),
    q,
  };
}

export function defaultFilters(nowMs) {
  return { period: defaultPeriod(nowMs), issue: null, entity: 'all', min: 0, public: false, q: '' };
}

/** Filters to URL params, omitting defaults (02-INTERACTIONS.json url). */
export function serializeFilters(f, nowMs) {
  const out = new URLSearchParams();
  if (f.period && f.period !== defaultPeriod(nowMs)) out.set('period', f.period);
  if (f.issue) out.set('issue', f.issue);
  if (f.entity && f.entity !== 'all') out.set('entity', f.entity);
  if (f.min > 0) out.set('min', String(f.min));
  if (f.public) out.set('public', '1');
  if (f.q) out.set('q', f.q);
  return out;
}

/** How many filters differ from the default (the phone Filters chip). */
export function activeFilterCount(f, nowMs) {
  const d = defaultFilters(nowMs);
  return ['period', 'issue', 'entity', 'min', 'public', 'q'].filter((k) => f[k] !== d[k]).length;
}

/** Which page filters each card reads (02-INTERACTIONS.json filters_apply_to). */
export const FILTERS_APPLY = {
  pulse: ['period', 'issue', 'entity', 'min', 'public', 'q'],
  leaders: ['period', 'issue', 'entity', 'min', 'public', 'q'],
  issues: ['period', 'entity', 'min', 'public'],
  pressure: ['period', 'min', 'public'],
  rhythm: ['issue', 'entity', 'min', 'public'],
  door: ['period', 'issue', 'entity'],
  lens: ['period', 'issue', 'min'],
  filings: ['period', 'issue', 'entity', 'min', 'public', 'q'],
  entity: ['period', 'issue', 'entity', 'min', 'public'],
  members: ['period', 'min'],
};

/** Only the filters a view reads, so unrelated changes do not refetch it. */
export function pickFilters(f, view) {
  const keys = FILTERS_APPLY[view] || [];
  const out = { period: f.period, issue: null, entity: 'all', min: 0, public: false, q: '' };
  for (const k of keys) out[k] = f[k];
  if (!keys.includes('period')) out.period = null;
  return out;
}

/**
 * The /api/lobbying/page query string one card requests: the view, its own
 * options (`extra`, e.g. { by: 'firm' }), then only the filters that card
 * applies. The page uses the string as its cache key and the server uses it
 * to seed the first paint, so both sides must build it here.
 */
export function viewQuery(view, f, nowMs, extra = {}) {
  const out = new URLSearchParams({ view });
  for (const [k, v] of Object.entries(extra)) out.set(k, String(v ?? ''));
  for (const [k, v] of serializeFilters(pickFilters(f, view), nowMs)) out.set(k, v);
  return out.toString();
}

/** Escape a search string into an ILIKE contains-pattern. */
export function likePattern(q) {
  const t = String(q || '')
    .trim()
    .slice(0, 80);
  return t ? `%${t.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
}

/**
 * The jsonb `p` the SQL views take (see the lobbying_page_aggregates
 * migration). `which` = 'now' | 'prior' picks the period or its twin.
 */
export function filterPayload(f, nowMs, which = 'now') {
  const p = {};
  if (f.period) {
    const r = resolvePeriod(f.period, nowMs);
    const s = which === 'prior' ? r.prior : r;
    if (s.year != null) p.year = s.year;
    if (s.quarters) p.quarters = s.quarters;
    if (s.from) p.from = s.from;
    if (s.to) p.to = s.to;
  }
  if (f.issue) p.issue = f.issue;
  if (f.entity && f.entity !== 'all' && ENTITY_GROUPS[f.entity])
    p.buckets = ENTITY_GROUPS[f.entity];
  if (f.min > 0) p.min = f.min;
  if (f.public) p.public = true;
  const q = likePattern(f.q);
  if (q) p.q = q;
  return p;
}

/** LD-203 scope for Money to Members: the page period mapped to semiannual reports. */
export function membersPayload(f, nowMs, types) {
  const r = resolvePeriod(f.period, nowMs);
  const p = {};
  if (r.members.year != null) p.year = r.members.year;
  if (r.members.periods) p.periods = r.members.periods;
  if (r.members.from) p.from = r.members.from;
  if (f.min > 0) p.min = f.min;
  if (Array.isArray(types) && types.length) p.types = types;
  return p;
}

export const CONTRIBUTION_TYPES = ['feca', 'he', 'me', 'pic', 'ple'];

/* ── coverage and quarter status ───────────────────────────────────────── */

/**
 * One quarter's state.
 *   not_yet_filed  the quarter has not ended (reports are filed after it ends)
 *   filing         inside the filing window; `pct` is the share received
 *   incomplete     past the window but our copy is below 100%
 *   complete
 * @param {{rowsLoaded?:number,totalCount?:number|null,coveragePct?:number|null,complete?:boolean}|null} cov
 */
export function quarterStatus(year, quarter, cov, nowMs) {
  const end = quarterEnd(year, quarter);
  if (nowMs < end) return { status: 'not_yet_filed', pct: null };
  const pct = cov?.complete ? 100 : (cov?.coveragePct ?? null);
  if (nowMs < end + FILING_WINDOW_DAYS * DAY_MS) return { status: 'filing', pct };
  if (pct != null && pct < 100) return { status: 'incomplete', pct };
  return { status: 'complete', pct: pct ?? 100 };
}

/**
 * Coverage of a period from per-quarter ingest rows: loaded / reported for
 * the ended quarters it spans, and the status of its least-complete quarter.
 * @returns {{ pct:number|null, status:'complete'|'filing'|'incomplete'|'unknown', quarters:Array }}
 */
export function periodCoverage(periodKey, coverageRows, nowMs, which = 'now') {
  const r = resolvePeriod(periodKey, nowMs);
  const by = new Map((coverageRows || []).map((c) => [`${c.year}-${c.quarter}`, c]));
  const quarters = (which === 'prior' ? r.priorCoverage : r.coverage)
    .filter((x) => quarterEnd(x.year, x.quarter) <= nowMs)
    .map((x) => ({
      ...x,
      cov: by.get(`${x.year}-${x.quarter}`) || null,
      ...quarterStatus(x.year, x.quarter, by.get(`${x.year}-${x.quarter}`), nowMs),
    }));
  if (!quarters.length || quarters.some((x) => !x.cov))
    return { pct: null, status: 'unknown', quarters };
  let loaded = 0;
  let total = 0;
  let known = true;
  for (const x of quarters) {
    loaded += Number(x.cov.rowsLoaded) || 0;
    if (x.cov.complete) total += Number(x.cov.rowsLoaded) || 0;
    else if (x.cov.totalCount != null) total += Number(x.cov.totalCount) || 0;
    else known = false;
  }
  const pct = known && total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : null;
  const status = quarters.some((x) => x.status === 'filing')
    ? 'filing'
    : quarters.some((x) => x.status === 'incomplete')
      ? 'incomplete'
      : 'complete';
  return { pct: status === 'complete' ? 100 : pct, status, quarters };
}

/* ── arithmetic the cards need ─────────────────────────────────────────── */

const finite = (n) => typeof n === 'number' && Number.isFinite(n);

/** Signed percent change, one decimal; null when prior is 0 or missing. */
export function yoyDelta(now, prior) {
  const a = Number(now);
  const b = Number(prior);
  if (!finite(a) || !finite(b) || b === 0 || prior == null || now == null) return null;
  return Math.round(((a - b) / Math.abs(b)) * 1000) / 10;
}

/** YoY only when both periods are loaded well enough to compare. */
export function gatedYoy(now, prior, covNow, covPrior) {
  const ok = (c) => c && c.pct != null && c.pct >= YOY_MIN_COVERAGE;
  if (!ok(covNow) || !ok(covPrior)) return { value: null, reason: 'coverage' };
  const value = yoyDelta(now, prior);
  return { value, reason: value == null ? 'no_prior' : null };
}

/** Percent of total, one decimal, null-safe. */
export function shareOfTotal(value, total) {
  if (value == null || total == null) return null;
  const v = Number(value);
  const t = Number(total);
  if (!finite(v) || !finite(t) || t <= 0) return null;
  return Math.round((v / t) * 1000) / 10;
}

/** Heat opacity 0.05 to 0.88 (square-root spread), 0 for empty cells. */
export function heatScale(count, max) {
  const c = Number(count);
  const m = Number(max);
  if (!finite(c) || !finite(m) || c <= 0 || m <= 0) return 0;
  return Math.round((0.05 + 0.83 * Math.sqrt(Math.min(c, m) / m)) * 1000) / 1000;
}

/** Ranked issue rows with share of filings; shares can sum past 100%. */
export function issueShareRows(byIssue, n = 12) {
  const total = Number(byIssue?.total) || 0;
  const rows = (byIssue?.issues || [])
    .filter((r) => r && r.code)
    .slice(0, n)
    .map((r) => ({
      code: r.code,
      label: r.label || r.code,
      filings: Number(r.filings) || 0,
      share: shareOfTotal(r.filings, total),
    }));
  const max = rows.reduce((m, r) => Math.max(m, r.share || 0), 0);
  const sum = rows.reduce((s, r) => s + (r.share || 0), 0);
  return {
    total,
    rows: rows.map((r) => ({
      ...r,
      bar: max > 0 ? Math.round(((r.share || 0) / max) * 1000) / 10 : 0,
    })),
    multiCite: sum > 100,
  };
}

/** Rows ranked by spend with share of the period total and bar vs rank 1. */
export function leaderboardRows(rows, totalSpend) {
  const list = (rows || []).filter((r) => r && Number(r.spend) > 0);
  const top = list.length ? Number(list[0].spend) : 0;
  return list.map((r, i) => ({
    ...r,
    rank: i + 1,
    spend: Number(r.spend),
    share: shareOfTotal(r.spend, totalSpend),
    bar: top > 0 ? Math.round((Number(r.spend) / top) * 1000) / 10 : 0,
  }));
}

/**
 * The rhythm chart's quarters: every quarter on the axis with its spend,
 * filings and status. A not_yet_filed quarter carries no bar values.
 */
export function quarterSeries(rows, coverageRows, nowMs) {
  const data = new Map((rows || []).map((r) => [`${r.year}-${r.quarter}`, r]));
  const cov = new Map((coverageRows || []).map((c) => [`${c.year}-${c.quarter}`, c]));
  return quarterAxis(nowMs).map(({ year, quarter }) => {
    const k = `${year}-${quarter}`;
    const st = quarterStatus(year, quarter, cov.get(k), nowMs);
    const r = data.get(k);
    const ghost = st.status === 'not_yet_filed';
    return {
      year,
      quarter,
      key: `${year}${quarter}`,
      status: st.status,
      pct: st.pct,
      spend: ghost ? null : Number(r?.spend) || 0,
      filings: ghost ? null : Number(r?.filings) || 0,
    };
  });
}

/** Lead number for the Revolving Door card. */
export function doorShare(doorFilings, filings) {
  return shareOfTotal(doorFilings, filings);
}

/** Contract award dollars per lobbying dollar, whole dollars; null when lobbying is 0. */
export function awardsPerDollar(awards, lobbying) {
  const a = Number(awards);
  const l = Number(lobbying);
  if (!finite(a) || !finite(l) || l <= 0) return null;
  return Math.round(a / l);
}

/**
 * Clamp an LD-203 contribution date into its report's filing period
 * (mid_year: Jan 1 to Jun 30, year_end: Jul 1 to Dec 31). Filer typos such
 * as 2004 or 2029 land on the period edge and are flagged.
 * @returns {{ date:string, clamped:boolean }|null}
 */
export function clampToPeriod(date, year, period) {
  const y = Number(year);
  if (!date || !Number.isInteger(y) || (period !== 'mid_year' && period !== 'year_end'))
    return null;
  const t = Date.parse(`${String(date).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  const lo = period === 'mid_year' ? Date.UTC(y, 0, 1) : Date.UTC(y, 6, 1);
  const hi = period === 'mid_year' ? Date.UTC(y, 5, 30) : Date.UTC(y, 11, 31);
  const c = Math.min(Math.max(t, lo), hi);
  return { date: new Date(c).toISOString().slice(0, 10), clamped: c !== t };
}

/** verified (hand-checked), name_match (exact client name only) or none. */
export function mappingBadge(row) {
  if (!row || !row.ticker) return 'none';
  return row.verified === true ? 'verified' : 'name_match';
}

/* ── pressure map ──────────────────────────────────────────────────────── */

const ENTITY_SHORT = [
  [/^house of representatives$/i, 'House'],
  [/^senate$/i, 'Senate'],
  [/^white house office$/i, 'White House'],
  [/^executive office of the president/i, 'EOP'],
];

/** "Defense, Dept of (DOD)" to "DOD"; "HOUSE OF REPRESENTATIVES" to "House". */
export function entityShortLabel(name) {
  const s = String(name || '').trim();
  for (const [re, label] of ENTITY_SHORT) if (re.test(s)) return label;
  const abbr = /\(([A-Z][A-Za-z&.]{1,9})\)\s*$/.exec(s);
  if (abbr) return abbr[1];
  const dept = /^([^,]+), Dept of/i.exec(s);
  if (dept) return dept[1];
  return s.length > 14 ? `${s.slice(0, 13)}…` : s;
}

/** Ink flips to the ground colour once the heat layer is this opaque. */
export const HEAT_INK_FLIP = 0.45;

export function pressureMatrix(payload) {
  const issues = payload?.issues || [];
  const entities = payload?.entities || [];
  const cells = new Map((payload?.cells || []).map((c) => [`${c.issue}|${c.entity}`, c]));
  const max = (payload?.cells || []).reduce((m, c) => Math.max(m, Number(c.filings) || 0), 0);
  const colTotals = entities.map((e) =>
    issues.reduce((s, i) => s + (Number(cells.get(`${i.code}|${e.name}`)?.filings) || 0), 0),
  );
  return {
    max,
    total: Number(payload?.total) || 0,
    cols: entities.map((e, j) => ({
      name: e.name,
      label: entityShortLabel(e.name),
      filings: Number(e.filings) || 0,
      shown: colTotals[j],
    })),
    rows: issues.map((i) => {
      const row = entities.map((e) => {
        const c = cells.get(`${i.code}|${e.name}`);
        const n = Number(c?.filings) || 0;
        const heat = heatScale(n, max);
        return {
          entity: e.name,
          filings: n,
          heat,
          dark: heat > HEAT_INK_FLIP,
          topClients: c?.topClients || [],
        };
      });
      return {
        code: i.code,
        label: i.label || i.code,
        filings: Number(i.filings) || 0,
        shown: row.reduce((s, c) => s + c.filings, 0),
        cells: row,
      };
    }),
  };
}

/* ── charts ───────────────────────────────────────────────────────────── */

/** Linear scale with a 0 floor and a nice ceiling. */
export function niceCeiling(v) {
  const n = Number(v);
  if (!finite(n) || n <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(n));
  for (const m of [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (n <= m * mag) return m * mag;
  return 10 * mag;
}

/** Log10 scale from domain [d0, d1] to range [r0, r1]; clamps to the domain. */
export function logScale(d0, d1, r0, r1) {
  const a = Math.log10(Math.max(d0, 1e-9));
  const b = Math.log10(Math.max(d1, d0 * 10));
  return (v) => {
    const x = Math.log10(Math.min(Math.max(Number(v) || d0, d0), d1));
    return r0 + ((x - a) / (b - a || 1)) * (r1 - r0);
  };
}

/** Decade ticks (1, 10, 100...) inside [lo, hi], with the domain ends snapped to decades. */
export function logDomain(values) {
  const v = (values || []).map(Number).filter((n) => finite(n) && n > 0);
  if (!v.length) return { lo: 1, hi: 10, ticks: [1, 10] };
  const lo = 10 ** Math.floor(Math.log10(Math.min(...v)));
  const hi = 10 ** Math.ceil(Math.log10(Math.max(...v)));
  const ticks = [];
  for (let t = lo; t <= hi * 1.0001; t *= 10) ticks.push(t);
  return { lo, hi: hi === lo ? lo * 10 : hi, ticks };
}

/**
 * Scatter points for Lobbying vs Contracts. Rows without both figures are
 * dropped; `ratio` is awardsPerDollar. Name-matched rows keep `matched`.
 */
export function ratioPoints(rows) {
  return (rows || [])
    .filter((r) => Number(r.lobbying) > 0 && Number(r.awardValue) > 0)
    .map((r) => ({
      ticker: r.ticker,
      company: r.company || r.client || r.ticker,
      matched: Boolean(r.matched),
      lobbying: Number(r.lobbying),
      awards: Number(r.awardValue),
      ratio: awardsPerDollar(r.awardValue, r.lobbying),
    }));
}

/** SVG path for a sparkline through `values` in a w x h box. */
export function sparkPath(values, w, h, pad = 1) {
  const v = (values || []).map(Number).filter(finite);
  if (v.length < 2) return '';
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const span = hi - lo || 1;
  const step = (w - pad * 2) / (v.length - 1);
  return v
    .map((n, i) => {
      const x = pad + i * step;
      const y = pad + (h - pad * 2) * (1 - (n - lo) / span);
      return `${i ? 'L' : 'M'}${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`;
    })
    .join('');
}

/* ── CSV ──────────────────────────────────────────────────────────────── */

export const CSV_COLUMNS = [
  'posted',
  'client',
  'ticker',
  'mapping',
  'firm',
  'amount',
  'issues',
  'lobbyists',
  'year',
  'quarter',
  'url',
];

/** One CSV cell, quoted, with spreadsheet formula injection neutralised. */
export function csvCell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function filingsCsv(rows) {
  const lines = [CSV_COLUMNS.join(',')];
  for (const r of rows || []) {
    lines.push(
      [
        r.posted ? String(r.posted).slice(0, 10) : '',
        r.client,
        r.ticker,
        mappingBadge(r),
        r.firm,
        r.amount ?? '',
        (r.issues || []).join('; '),
        r.lobbyists,
        r.year,
        r.quarter,
        r.url,
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return lines.join('\n');
}
