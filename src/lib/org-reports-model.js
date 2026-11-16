/**
 * Stakeholder reports (/org-team-hub/reports): the pure part.
 *
 * A stakeholder report is a frozen copy of the fund, saved once and printed
 * from the saved copy. This file holds everything that does not need the
 * database or the network, so the routes, the page, the sample content and
 * the tests share one implementation:
 *
 *   canExportReports      who may generate, open and delete (role plus the
 *                         faculty advisor's export setting)
 *   comparedWindow        the fund and its benchmark over the SAME dates
 *   assembleReport        the frozen payload (version 2)
 *   summarizeReport       one saved row, read the same way for old and new
 *   preSaveChecks         what the check before saving says
 *   renderPrintableHtml   the printable document (route and page preview)
 *
 * Honesty rules this file carries (problems 1 to 12 of the description):
 * - "Gain on cost of current holdings" is not time-weighted and says so.
 * - A difference to the benchmark is only ever worked out over the same dates
 *   and the same holdings for both sides (comparedWindow). Reports saved
 *   before this method existed show their benchmark with the note that the
 *   windows differ, and no difference.
 * - Every saved report and the printable copy carry DISCLOSURE.
 * - Roster and analyst names left out at generation are not stored at all.
 *
 * Pure: no React, no fetch, no server imports.
 */

export const NA = 'N/A';
export const DEFAULT_PERIOD = 'Current Term';
export const PAYLOAD_VERSION = 2;

export const DISCLOSURE =
  'Gain on cost of current holdings, not time-weighted. The benchmark is measured over the same dates as the fund. Unaudited, student-prepared, descriptive only. Past results do not predict future outcomes.';

export const LEGACY_NOTE =
  'Saved before November 2026: the benchmark was measured from the first fund record, not over the same dates as the fund, so no difference is shown.';

export const EXPORT_SCOPES = {
  exec_pm_advisor: 'Executives, portfolio managers and faculty advisors',
  exec_advisor: 'Executives and faculty advisors',
};

/* ── Formatting ─────────────────────────────────────────────────────────── */
const finite = (v) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
export const num = finite;

export function fmtMoney(v) {
  const n = finite(v);
  if (n == null) return NA;
  const s = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? '-' : ''}$${s}`;
}

export function fmtPct(v, digits = 2) {
  const n = finite(v);
  if (n == null) return NA;
  const r = Number(n.toFixed(digits));
  return `${r > 0 ? '+' : r < 0 ? '-' : ''}${Math.abs(r).toFixed(digits)}%`;
}

export function fmtPts(v) {
  const n = finite(v);
  if (n == null) return NA;
  const r = Number(n.toFixed(2));
  return `${r > 0 ? '+' : r < 0 ? '-' : ''}${Math.abs(r).toFixed(2)} pts`;
}

/** Plain weight, no sign: 40.08% */
export function fmtWeight(v) {
  const n = finite(v);
  return n == null ? NA : `${n.toFixed(2)}%`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'Nov 15, 2026' from an ISO date or timestamp (calendar day, UTC). */
export function fmtDay(v) {
  if (!v) return NA;
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let y;
  let mo;
  let d;
  if (m) {
    y = Number(m[1]);
    mo = Number(m[2]) - 1;
    d = Number(m[3]);
  } else {
    const t = new Date(s);
    if (Number.isNaN(t.getTime())) return NA;
    y = t.getUTCFullYear();
    mo = t.getUTCMonth();
    d = t.getUTCDate();
  }
  return `${MONTHS[mo]} ${d}, ${y}`;
}

export const tone = (v) => {
  const n = finite(v);
  if (n == null) return 'na';
  return n > 0 ? 'pos' : n < 0 ? 'neg' : '';
};

export function cleanPeriod(label) {
  const s = String(label ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return s || DEFAULT_PERIOD;
}

/* ── Access ─────────────────────────────────────────────────────────────── */
/**
 * Who may generate, open and delete stakeholder reports. Faculty advisors
 * are executives (sub_role Faculty Advisor), so 'executive' covers them. The
 * advisor's "Who can export stakeholder reports" setting decides whether
 * portfolio managers are included. Analysts never are.
 *
 * @param {{ role?: string, is_active?: boolean }|null} member
 * @param {{ who_can_export_reports?: string }|null} governance
 */
export function canExportReports(member, governance) {
  if (!member || member.is_active === false) return false;
  if (member.role === 'executive') return true;
  if (member.role === 'portfolio_manager') {
    const scope = governance?.who_can_export_reports || 'exec_pm_advisor';
    return scope !== 'exec_advisor';
  }
  return false;
}

/** Why a member cannot use the page: 'ok' | 'managers_only' | 'export_restricted'. */
export function reportAccess(member, governance) {
  if (canExportReports(member, governance)) return 'ok';
  if (member?.role === 'portfolio_manager') return 'export_restricted';
  return 'managers_only';
}

/* ── The same-window comparison ─────────────────────────────────────────── */
function closeOnOrAfter(series, day) {
  if (!series) return null;
  const dates = Object.keys(series)
    .filter((d) => d >= day)
    .sort();
  for (const d of dates) {
    const v = finite(series[d]);
    if (v != null && v > 0) return { date: d, close: v };
  }
  return null;
}

function closeOnOrBefore(series, day) {
  if (!series) return null;
  const dates = Object.keys(series)
    .filter((d) => d <= day)
    .sort()
    .reverse();
  for (const d of dates) {
    const v = finite(series[d]);
    if (v != null && v > 0) return { date: d, close: v };
  }
  return null;
}

/**
 * The fund against its benchmark over the same dates.
 *
 * Gain on cost cannot be compared with a benchmark: the cost may come from a
 * purchase made before the holding was recorded, and Ezana does not know that
 * date. So the comparison uses dates Ezana does know. For each current,
 * priced holding: its closing price on the first trading day on or after the
 * day it was recorded, and on the end date; the benchmark's closes on the
 * SAME two days. Both sides are weighted by the holding's value on its start
 * day. Holdings without a price at both ends are left out of BOTH sides and
 * counted.
 *
 * @param {{ positions: object[], history: Record<string, Record<string, number>>,
 *           symbol: string, endDay: string }} input
 * @returns {null | { symbol, start, end, fund_pct, benchmark_pct, difference_pts,
 *                    matched, total, left_out }}
 */
export function comparedWindow({ positions, history, symbol, endDay }) {
  const list = Array.isArray(positions) ? positions : [];
  const sym = String(symbol || 'SPY').toUpperCase();
  const bench = history?.[sym];
  const total = list.length;
  if (!bench || !endDay || total === 0) return null;
  const benchEnd = closeOnOrBefore(bench, endDay);
  if (!benchEnd) return null;

  let base = 0;
  let gain = 0;
  let benchWeighted = 0;
  let matched = 0;
  let start = null;
  for (const p of list) {
    const shares = finite(p.shares);
    const day = String(p.added_at || '').slice(0, 10);
    const tk = String(p.ticker_symbol || p.ticker || '').toUpperCase();
    if (!shares || shares <= 0 || !day || !tk || day > benchEnd.date) continue;
    const series = history?.[tk];
    const s0 = closeOnOrAfter(series, day);
    const s1 = closeOnOrBefore(series, benchEnd.date);
    const b0 = s0 ? finite(bench[s0.date]) : null;
    if (!s0 || !s1 || s1.date < s0.date || b0 == null || b0 <= 0) continue;
    const w = shares * s0.close;
    base += w;
    gain += shares * (s1.close - s0.close);
    benchWeighted += w * (benchEnd.close / b0 - 1);
    matched += 1;
    if (!start || s0.date < start) start = s0.date;
  }
  if (matched === 0 || base <= 0) return null;
  const fundPct = (gain / base) * 100;
  const benchPct = (benchWeighted / base) * 100;
  return {
    symbol: sym,
    start,
    end: benchEnd.date,
    fund_pct: fundPct,
    benchmark_pct: benchPct,
    difference_pts: fundPct - benchPct,
    matched,
    total,
    left_out: total - matched,
  };
}

/* ── The frozen payload ─────────────────────────────────────────────────── */
/**
 * Build the version 2 payload saved with a report. Everything the printable
 * copy and the list show is in here, so an old report reprints with its own
 * figures. Left-out roster and analyst names are never written.
 */
export function assembleReport({
  universityName,
  periodLabel,
  generatedAt,
  generatedByName = null,
  cohort = null,
  positions = [],
  bySector = [],
  byAnalyst = [],
  pitches = [],
  roster = [],
  benchmarkSymbol = 'SPY',
  comparison = null,
  includeRoster = true,
  includeAnalystNames = true,
}) {
  const list = Array.isArray(positions) ? positions : [];
  let totalValue = 0;
  let totalCost = 0;
  let priced = 0;
  for (const p of list) {
    totalValue += finite(p.current_value ?? p.value) ?? 0;
    totalCost += (finite(p.shares) ?? 0) * (finite(p.avg_cost) ?? 0);
    if (p.priced) priced += 1;
  }
  const returnPct =
    totalCost > 0 && priced > 0 ? ((totalValue - totalCost) / totalCost) * 100 : null;
  const recorded = list
    .map((p) => String(p.added_at || '').slice(0, 10))
    .filter(Boolean)
    .sort();
  const endDay = String(generatedAt || '').slice(0, 10) || null;

  const sectors = (Array.isArray(bySector) ? bySector : []).map((s) => ({
    sector: s.sector || 'Unclassified',
    weight_pct: finite(s.weight_pct),
    contribution_pct: finite(s.contribution_pct),
    positions: finite(s.positions),
  }));

  /* Pitch outcomes: only pitches with a follow-up outcome, sorted by their
     difference to SPY over each pitch's own dates (decision to last update). */
  const outcomes = (Array.isArray(pitches) ? pitches : [])
    .filter((p) => p && p.has_outcome !== false)
    .slice()
    .sort((a, b) => (finite(b.alpha_pct) ?? -Infinity) - (finite(a.alpha_pct) ?? -Infinity))
    .slice(0, 10)
    .map((p) => ({
      ticker: p.ticker || null,
      analyst: includeAnalystNames ? p.analyst || null : null,
      return_pct: finite(p.return_pct),
      alpha_pct: finite(p.alpha_pct),
      current_state: p.current_state || null,
      decision_at: p.decision_at || null,
      computed_at: p.computed_at || null,
    }));

  return {
    version: PAYLOAD_VERSION,
    universityName: universityName || 'Student investment fund',
    periodLabel: cleanPeriod(periodLabel),
    generatedAt,
    generatedByName: generatedByName || null,
    cohort: cohort || null,
    include: { roster: Boolean(includeRoster), analystNames: Boolean(includeAnalystNames) },
    performance: {
      total_value: totalValue,
      total_cost: totalCost,
      return_pct: returnPct,
      positions: list.length,
      priced_count: priced,
      unpriced_count: list.length - priced,
      benchmark_symbol: String(benchmarkSymbol || 'SPY').toUpperCase(),
    },
    window: {
      first_recorded: recorded[0] || null,
      end: endDay,
    },
    comparison: comparison || null,
    unclassifiedSectors: sectors.filter((s) => s.sector === 'Unclassified').length,
    attribution: {
      bySector: sectors,
      ...(includeAnalystNames ? { byAnalyst: Array.isArray(byAnalyst) ? byAnalyst : [] } : {}),
    },
    topPitches: outcomes,
    roster: includeRoster
      ? (Array.isArray(roster) ? roster : []).map((m) => ({
          name: m.name || m.display_name || null,
          role: m.role || null,
          title: m.title || null,
          sub_role: m.sub_role || null,
        }))
      : [],
  };
}

/* ── Reading a saved row ────────────────────────────────────────────────── */
/**
 * One saved report, read the same way whatever its age. Older reports
 * (before version 2) have no window, no comparison, no unpriced count and no
 * record of the include choices: those read null, and the page shows N/A.
 *
 * @param {{ id, title, period_label, created_at, generated_by, payload }} row
 * @param {Map<string,string>|Record<string,string>} [names] user id to name
 */
export function summarizeReport(row, names) {
  const p = row?.payload || {};
  const perf = p.performance || {};
  const v2 = Number(p.version) >= PAYLOAD_VERSION;
  const c = v2 ? p.comparison || null : null;
  const lookup = (id) =>
    !id ? null : names instanceof Map ? names.get(id) || null : (names && names[id]) || null;
  return {
    id: row?.id ?? null,
    title: row?.title || 'Fund report',
    period: row?.period_label || p.periodLabel || DEFAULT_PERIOD,
    createdAt: row?.created_at || p.generatedAt || null,
    author: p.generatedByName || lookup(row?.generated_by),
    cohort: p.cohort || null,
    council: p.universityName || null,
    fundValue: finite(perf.total_value),
    gainPct: finite(perf.return_pct),
    positions: finite(perf.positions),
    symbol: (c?.symbol || perf.benchmark_symbol || 'SPY').toUpperCase(),
    legacy: !v2,
    comparison: c
      ? {
          start: c.start || null,
          end: c.end || null,
          fundPct: finite(c.fund_pct),
          benchmarkPct: finite(c.benchmark_pct),
          differencePts: finite(c.difference_pts),
          matched: finite(c.matched),
          total: finite(c.total),
        }
      : null,
    legacyBenchmarkPct: v2 ? null : finite(perf.benchmark_return_pct),
    legacyBenchmarkSource: v2 ? null : perf.benchmark_source || null,
    unpricedCount: v2 ? finite(perf.unpriced_count) : null,
    includeRoster: v2 ? Boolean(p.include?.roster) : null,
    includeNames: v2 ? Boolean(p.include?.analystNames) : null,
    firstRecorded: v2 ? p.window?.first_recorded || null : null,
    unclassifiedSectors: v2 ? finite(p.unclassifiedSectors) : null,
  };
}

/** One line under a saved row: its dates and the disclosure. */
export function rowDisclosure(s) {
  if (!s) return DISCLOSURE;
  if (s.legacy) return `${LEGACY_NOTE} Gain on cost of current holdings, not time-weighted.`;
  if (!s.comparison) {
    return `No benchmark price history was available, so no difference is shown. ${DISCLOSURE}`;
  }
  return `Compared dates: ${fmtDay(s.comparison.start)} to ${fmtDay(s.comparison.end)}. ${DISCLOSURE}`;
}

/* ── The check before saving ───────────────────────────────────────────── */
/**
 * @param {ReturnType<typeof summarizeReport>} s a summary of the would-be report
 * @returns {{ ok: boolean, text: string }[]}
 */
export function preSaveChecks(s) {
  if (!s) return [];
  const out = [];
  const unpriced = s.unpricedCount ?? 0;
  out.push({
    ok: unpriced === 0,
    text:
      unpriced === 0
        ? 'Every holding has a price.'
        : `${unpriced} ${unpriced === 1 ? 'holding has' : 'holdings have'} no price and ${
            unpriced === 1 ? 'is' : 'are'
          } valued at cost.`,
  });
  const c = s.comparison;
  if (!c) {
    out.push({
      ok: false,
      text: `No ${s.symbol} price history for these dates, so no benchmark or difference will be saved.`,
    });
  } else {
    out.push({
      ok: c.matched === c.total,
      text:
        c.matched === c.total
          ? `${s.symbol} compared over the same dates on all ${c.total} holdings.`
          : `${s.symbol} compared over the same dates on ${c.matched} of ${c.total} holdings. The others have no price at both ends and are left out of both sides.`,
    });
  }
  const unc = s.unclassifiedSectors ?? 0;
  out.push({
    ok: unc === 0,
    text: unc === 0 ? 'Every holding has a sector.' : 'Some holdings have no sector: Unclassified.',
  });
  out.push({
    ok: true,
    text: s.includeRoster ? 'Roster names included.' : 'Roster left out. No names saved.',
  });
  out.push({
    ok: true,
    text: s.includeNames
      ? 'Analyst names included on pitch outcomes.'
      : 'Analyst names left out. Not saved.',
  });
  return out;
}

const ROLE_TEXT = {
  executive: 'Executive',
  portfolio_manager: 'Portfolio manager',
  analyst: 'Analyst',
};

const STATE_TEXT = {
  outperforming: 'Outperforming',
  underperforming: 'Underperforming',
  in_line: 'In line',
  inline: 'In line',
  roughly_in_line: 'In line',
};

export function stateText(state) {
  if (!state) return NA;
  const k = String(state).toLowerCase().replace(/\s+/g, '_');
  return (
    STATE_TEXT[k] ||
    String(state)
      .replace(/_/g, ' ')
      .replace(/^./, (c) => c.toUpperCase())
  );
}

export function roleText(role) {
  return ROLE_TEXT[role] || NA;
}
