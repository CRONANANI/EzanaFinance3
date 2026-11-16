/**
 * Sample content for Reports (/org-team-hub/reports).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/reports/sample (and the printable route for a sample id), so
 * the page can be presented from a council with no saved reports. Real
 * councils never receive it, the page labels it "Sample content", and
 * nothing done to it (generate, delete) is saved.
 *
 * It is the same sample council every rebuilt Team Hub page shows: the
 * latest report freezes the Trading Desk sample's twelve holdings
 * ($240,050.00, +46.73% gain on cost, one holding unpriced), filed under the
 * four sector teams, against SPY +10.08% (the Command Center's benchmark).
 * The two older reports freeze the same book on earlier dates: only holdings
 * recorded by then, with smaller gains, and their own SPY figures. Every
 * payload is built by assembleReport, the function the live route uses, so
 * the sample obeys the real rules. People are invented.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { buildTradingDeskSample } from './org-trading-desk-sample.js';
import { assembleReport } from './org-reports-model.js';

const DAY = 86400000;
const COUNCIL = 'Sample council';

/* [period label, days before now, author, gain scale, SPY over the same dates,
    include roster, include analyst names] */
const REPORTS = [
  ['Fall 2026 midterm', 1, 'Selam Haile', 1, 10.08, true, true],
  ['Fall 2026', 16, 'Chidi Okoye', 0.88, 8.64, true, true],
  ['Advisory board edition', 46, 'Ingrid Lindqvist', 0.8, 7.15, false, false],
];

/* Pitch outcomes over each pitch's own dates: [ticker, analyst, return, vs SPY, state]. */
const PITCHES = [
  ['NVDA', 'Elena Rossi', 35.3, 25.22, 'outperforming'],
  ['LLY', 'Mikael Bekele', 28.1, 18.02, 'outperforming'],
  ['MRK', 'Mikael Bekele', 19.4, 9.87, 'outperforming'],
  ['JPM', 'Amara Tesfaye', 9.6, -0.48, 'in_line'],
  ['UNH', 'Tomas Alvarez', -8.05, -17.62, 'underperforming'],
];

const cents = (v) => Math.round(v * 100) / 100;

/**
 * @param {{ role?: string, userId?: string, displayName?: string, now?: number }} opts
 */
export function buildReportsSample({
  role = 'executive',
  userId,
  displayName,
  now = Date.now(),
} = {}) {
  const desk = buildTradingDeskSample({ userId, role, displayName, now });
  const teamName = new Map((desk.roster?.teams || []).map((t) => [t.id, t.name]));
  const book = (desk.book?.positions || []).map((p) => ({
    ...p,
    sector: teamName.get(p.team_id) || null,
  }));
  /* The viewer is left out: a sample document names only invented people. */
  const roster = (desk.roster?.members || [])
    .filter((m) => m.user_id !== userId && m.id !== 'sample-member-me')
    .map((m) => ({ name: m.display_name, role: m.role, sub_role: m.sub_role || null }));
  const year = new Date(now).getUTCFullYear();

  const reports = REPORTS.map(([period, daysAgo, author, k, spy, withRoster, withNames], i) => {
    const at = new Date(now - daysAgo * DAY).toISOString();
    const day = at.slice(0, 10);
    const positions = book
      .filter((p) => String(p.added_at).slice(0, 10) <= day)
      .map((p) => {
        const value = p.priced ? cents(p.cost + (p.value - p.cost) * k) : p.value;
        return { ...p, value, current_value: value };
      });

    /* Sectors, the same way attributionBySector works them out. */
    const totalValue = positions.reduce((s, p) => s + p.value, 0);
    const totalCost = positions.reduce((s, p) => s + p.cost, 0);
    const bySectorMap = new Map();
    for (const p of positions) {
      const s = bySectorMap.get(p.sector) || { value: 0, cost: 0, positions: 0 };
      s.value += p.value;
      s.cost += p.cost;
      s.positions += 1;
      bySectorMap.set(p.sector, s);
    }
    const bySector = [...bySectorMap.entries()]
      .map(([sector, s]) => ({
        sector,
        positions: s.positions,
        weight_pct: (s.value / totalValue) * 100,
        contribution_pct: ((s.value - s.cost) / totalCost) * 100,
      }))
      .sort((a, b) => b.weight_pct - a.weight_pct);

    /* The same-window comparison: priced holdings, each from the day it was
       recorded (the sample records holdings at cost on that day). */
    const priced = positions.filter((p) => p.priced);
    const base = priced.reduce((s, p) => s + p.cost, 0);
    const fundPct = ((priced.reduce((s, p) => s + p.value, 0) - base) / base) * 100;
    const start = priced.map((p) => String(p.added_at).slice(0, 10)).sort()[0];
    const comparison = {
      symbol: 'SPY',
      start,
      end: day,
      fund_pct: fundPct,
      benchmark_pct: spy,
      difference_pts: fundPct - spy,
      matched: priced.length,
      total: positions.length,
      left_out: positions.length - priced.length,
    };

    const pitches = PITCHES.map(([ticker, analyst, ret, alpha, state]) => ({
      ticker,
      analyst,
      return_pct: cents(ret * k),
      alpha_pct: cents(alpha * k),
      current_state: state,
      has_outcome: true,
    }));

    const payload = assembleReport({
      universityName: COUNCIL,
      periodLabel: period,
      generatedAt: at,
      generatedByName: author,
      cohort: `${year} analyst class`,
      positions,
      bySector,
      pitches,
      roster,
      benchmarkSymbol: 'SPY',
      comparison,
      includeRoster: withRoster,
      includeAnalystNames: withNames,
    });
    return {
      id: `sample-report-${String(i + 1).padStart(3, '0')}`,
      org_id: 'sample',
      title: `${COUNCIL} fund report, ${period}`,
      period_label: period,
      created_at: at,
      generated_by: null,
      payload,
      is_demo: true,
    };
  });

  return { is_demo: true, council: COUNCIL, reports };
}

/** A sample report by id, or null. */
export function sampleReportById(id, opts) {
  if (!/^sample-report-\d{3}$/.test(String(id || ''))) return null;
  return buildReportsSample(opts).reports.find((r) => r.id === id) || null;
}
