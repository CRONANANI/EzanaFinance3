/**
 * Lobbying Activity page: display strings. Pure; the arithmetic lives in
 * page-model.js. No em dashes in anything this returns.
 */
import { MIN_STOPS, resolvePeriod, currentQuarter } from './page-model.js';
import { ENTITY_LABEL } from './entities.js';

const MIDDOT = '·';

/**
 * Money, the page's one rule: billions with two decimals, then millions
 * (one decimal under $100M, comma-grouped above), then thousands. Never a
 * bare four-digit "$1284M": anything that rounds to $1,000M is $1.00B.
 */
export function fmtSpend(v) {
  if (v == null || v === '') return MIDDOT;
  const n = Number(v);
  if (!Number.isFinite(n)) return MIDDOT;
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 999.5e6) return `${sign}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 99.95e6) return `${sign}$${Math.round(a / 1e6).toLocaleString('en-US')}M`;
  if (a >= 999.5e3) return `${sign}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${sign}$${Math.round(a / 1e3).toLocaleString('en-US')}K`;
  return `${sign}$${Math.round(a).toLocaleString('en-US')}`;
}

/** Axis money: $10M, $1B, no decimals. */
export function fmtAxisMoney(v) {
  const n = Number(v) || 0;
  if (n >= 1e9) return `$${+(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${+(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${+(n / 1e3).toFixed(1)}K`;
  return `$${n}`;
}

export function fmtCount(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : MIDDOT;
}

/** 12.3% (null renders as a middle dot). */
export function fmtPct(v, digits = 1) {
  if (v == null || !Number.isFinite(Number(v))) return MIDDOT;
  return `${Number(v).toFixed(digits)}%`;
}

/** +4.2% / -1.0%, the sign always shown. */
export function fmtSignedPct(v) {
  if (v == null || !Number.isFinite(Number(v))) return MIDDOT;
  const n = Number(v);
  return `${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(n).toFixed(1)}%`;
}

export function fmtDate(iso) {
  if (!iso) return MIDDOT;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return MIDDOT;
  return new Date(t).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function fmtQuarter(year, quarter) {
  return `${year} ${String(quarter || '').toUpperCase()}`;
}

/** $100K+ for a min stop; "Any" for 0. */
export function fmtMinStop(v) {
  const n = Number(v) || 0;
  if (n <= 0) return 'Any';
  if (n >= 1e6) return `$${n / 1e6}M+`;
  return `$${n / 1e3}K+`;
}

export const MIN_LABELS = MIN_STOPS.map(fmtMinStop);

/** FY 2025 / 2026 YTD / 2026 Q3 / Last 90 days. */
export function fmtPeriod(key, nowMs) {
  const r = resolvePeriod(key, nowMs);
  if (r.kind === 'year') return `FY ${r.year}`;
  if (r.kind === 'ytd') return `${r.year} YTD`;
  if (r.kind === 'quarter') return fmtQuarter(r.year, r.quarters[0]);
  return 'Last 90 days';
}

/** The prior-period label for YoY captions: "vs FY 2024". */
export function fmtPriorPeriod(key, nowMs) {
  const r = resolvePeriod(key, nowMs);
  if (r.kind === 'year') return `vs FY ${r.year - 1}`;
  if (r.kind === 'ytd') return `vs ${r.year - 1} same quarters`;
  if (r.kind === 'quarter') return `vs ${fmtQuarter(r.year - 1, r.quarters[0])}`;
  return 'vs same 90 days last year';
}

export const ENTITY_FILTER_LABEL = {
  all: 'All',
  congress: 'Congress',
  agencies: 'Agencies',
  whitehouse: ENTITY_LABEL.whitehouse,
};

/**
 * The active filters as short parts, in the order a reader scans them:
 * issue, entity, minimum, public-only, search, period.
 */
export function filterParts(f, nowMs, issueLabel) {
  const parts = [];
  if (f.issue) parts.push(issueLabel || f.issue);
  if (f.entity && f.entity !== 'all') parts.push(ENTITY_FILTER_LABEL[f.entity]);
  if (f.min > 0) parts.push(fmtMinStop(f.min));
  if (f.public) parts.push('Public companies');
  if (f.q) parts.push(`"${f.q}"`);
  if (f.period) parts.push(fmtPeriod(f.period, nowMs));
  return parts;
}

/** Card subtitle restating the filters that card reads. */
export function cardSubtitle(f, nowMs, issueLabel) {
  return filterParts(f, nowMs, issueLabel).join(` ${MIDDOT} `);
}

/** The honest empty state, naming the filters with a way out. */
export function emptyMessage(f, nowMs, issueLabel, what = 'filings') {
  const parts = filterParts(f, nowMs, issueLabel);
  const narrow = parts.length > 1;
  const ways = [];
  if (f.period && f.period !== '90d' && !/^fy/.test(f.period)) ways.push('widen the period');
  if (f.period === '90d') ways.push('widen the period');
  if (f.min > 0) ways.push('clear the minimum');
  if (f.q) ways.push('clear the search');
  if (f.issue) ways.push('pick another issue');
  const way = ways.length ? `${ways.slice(0, 2).join(' or ')}` : 'reset the filters';
  return `No ${what} match these filters. ${parts.join(` ${MIDDOT} `)}${narrow ? ' is a narrow slice' : ' returned nothing'}; ${way}.`;
}

/**
 * The partial-period chip, or null when complete.
 *   filing      "2026 Q3 is still being filed, 51% received"
 *   incomplete  "FY 2025: 47% of filings loaded so far"
 */
export function coverageChip(periodKey, coverage, nowMs) {
  if (!coverage || coverage.status === 'complete' || coverage.status === 'unknown') return null;
  const pct = coverage.pct != null ? `${coverage.pct}%` : null;
  if (coverage.status === 'filing') {
    const q = coverage.quarters.find((x) => x.status === 'filing');
    const label = q ? fmtQuarter(q.year, q.quarter) : fmtPeriod(periodKey, nowMs);
    const qpct = q?.pct != null ? `${q.pct}%` : pct;
    return qpct
      ? `${label} is still being filed, ${qpct} received`
      : `${label} is still being filed`;
  }
  return pct
    ? `${fmtPeriod(periodKey, nowMs)}: ${pct} of filings loaded so far`
    : `${fmtPeriod(periodKey, nowMs)}: still loading filings`;
}

/** The single quiet coverage line under the source line. */
export function coverageLine(rows, updatedAt, nowMs) {
  const { year: cy } = currentQuarter(nowMs);
  const by = new Map((rows || []).map((r) => [`${r.year}-${r.quarter}`, r]));
  const parts = [];
  for (let y = cy - 2; y <= cy; y += 1) {
    const qs = ['q1', 'q2', 'q3', 'q4']
      .map((q) => ({ q, r: by.get(`${y}-${q}`) }))
      .filter((x) => x.r && x.r.rowsLoaded > 0);
    if (!qs.length) continue;
    const allDone = qs.length === 4 && qs.every((x) => x.r.complete);
    if (allDone) parts.push(`${y} complete`);
    else
      parts.push(
        `${y} ${qs
          .map((x) => `${x.q.toUpperCase()} ${x.r.complete ? 100 : (x.r.coveragePct ?? '?')}%`)
          .join(' ')}`,
      );
  }
  const sync = updatedAt ? ` ${MIDDOT} last sync ${fmtDate(updatedAt)}` : '';
  return parts.length ? `Coverage: ${parts.join(` ${MIDDOT} `)}${sync}` : null;
}

export const CONTRIBUTION_TYPE_LABEL = {
  feca: 'FECA',
  he: 'Honorary',
  me: 'Meeting',
  pic: 'Inaugural',
  ple: 'Library',
};

export const MEMBERS_PERIOD_LABEL = { mid_year: 'Mid-year', year_end: 'Year-end' };

/** "LD-203 2025 mid-year and year-end" for the Money to Members subtitle. */
export function membersScopeLabel(periods) {
  const list = (periods || [])
    .slice()
    .sort((a, b) => a.year - b.year || (a.period === 'mid_year' ? -1 : 1));
  if (!list.length) return 'LD-203';
  const years = [...new Set(list.map((p) => p.year))];
  if (years.length === 1)
    return `LD-203 ${MIDDOT} ${years[0]} ${list.map((p) => MEMBERS_PERIOD_LABEL[p.period]?.toLowerCase()).join(' and ')}`;
  return `LD-203 ${MIDDOT} ${list.map((p) => `${p.year} ${MEMBERS_PERIOD_LABEL[p.period]?.toLowerCase()}`).join(', ')}`;
}
