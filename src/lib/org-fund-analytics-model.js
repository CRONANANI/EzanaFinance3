/**
 * Fund Analytics (/org-team-hub/fund-analytics) model: the calculations and
 * the derivations the page draws, kept pure (no React, no I/O, no server
 * imports) so the server loader, the sample bundle and the tests all run the
 * same rules. Nothing is invented: a missing input yields null or an empty
 * list, and the page prints N/A or its empty state.
 */
import { NA, fmtDate, fmtSignedPct } from './org-command-center.js';

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const accepted = (p) => String(p?.decision || '').toLowerCase() === 'accepted';

/* ── Formatting ─────────────────────────────────────────────────────────── */

/** 40.08%. A share or a rate is not a change, so it carries no sign. */
export function fmtPct(v, digits = 2) {
  const n = num(v);
  if (n == null) return NA;
  return `${n.toFixed(digits)}%`;
}

/** "36.05 points". The gap between two returns is in points, not percent. */
export function fmtPoints(v) {
  const n = num(v);
  if (n == null) return NA;
  const abs = Math.abs(n).toFixed(2);
  return `${abs} ${abs === '1.00' ? 'point' : 'points'}`;
}

/** A member row as a real name. Never a role word standing in for a person. */
export function resolveMemberName(member) {
  if (!member) return 'Unassigned';
  const dn = String(member.display_name || '').trim();
  if (dn) return dn;
  const title = String(member.title || '').trim();
  if (title) return title;
  return 'Unassigned';
}

/* ── Periods ────────────────────────────────────────────────────────────── */

export const FUND_PERIODS = [
  { value: 'semester', code: 'SEMESTER', label: 'This semester' },
  { value: 'ytd', code: 'YTD', label: 'Year to date' },
  { value: 'inception', code: 'INCEPTION', label: 'Since inception' },
];
export const FUND_PERIOD_VALUES = FUND_PERIODS.map((p) => p.value);
export const periodLabel = (value) =>
  (FUND_PERIODS.find((p) => p.value === value) || FUND_PERIODS[0]).label;

/**
 * First day of a period, anchored to the latest daily record (so the window
 * is right for a fund whose records stopped last week). "This semester" is
 * the trailing five months, "ytd" the calendar year of the latest record,
 * "inception" everything (null).
 */
export function periodStart(period, latestDate) {
  if (!latestDate) return null;
  const d = new Date(`${latestDate}T00:00:00Z`);
  if (period === 'ytd') {
    return new Date(Date.UTC(d.getUTCFullYear(), 0, 1)).toISOString().slice(0, 10);
  }
  if (period === 'semester') {
    const s = new Date(d);
    s.setUTCMonth(s.getUTCMonth() - 5);
    return s.toISOString().slice(0, 10);
  }
  return null;
}

/**
 * The daily fund records scoped to a period: the chart series, the latest
 * record, and the headline figures for that period, so the chart and the
 * headline can never disagree.
 *
 * When the window reaches back to (or past) the fund's first record, the
 * stored figures are used as they are: return on cost, and the benchmark
 * measured from the first recorded day. When the window starts later, every
 * line is re-based to zero on the window's first record and the headline is
 * the change over the window, in points.
 *
 * @param {Array<{snapshot_date:string,total_value:any,return_pct:any,
 *                benchmark_return_pct:any,alpha_pct:any}>} rows oldest first
 * @param {string} period one of FUND_PERIOD_VALUES
 */
export function scopeFundSeries(rows, period = 'semester') {
  const all = (Array.isArray(rows) ? rows : []).filter((r) => r && r.snapshot_date);
  if (all.length === 0) return { series: [], latest: null, periodStats: null };

  const latestDate = all[all.length - 1].snapshot_date;
  const start = periodStart(period, latestDate);
  const scoped = start ? all.filter((r) => r.snapshot_date >= start) : all;
  if (scoped.length === 0) return { series: [], latest: null, periodStats: null };

  const fullHistory = scoped.length === all.length;
  const base = scoped[0];
  const baseRet = fullHistory ? 0 : (num(base.return_pct) ?? 0);
  const baseBench = fullHistory ? 0 : (num(base.benchmark_return_pct) ?? 0);
  const series = scoped.map((r) => {
    const ret = num(r.return_pct);
    const bench = num(r.benchmark_return_pct);
    return {
      date: r.snapshot_date,
      fund_value: num(r.total_value),
      fund_return_pct: ret == null ? null : ret - baseRet,
      benchmark_return_pct: bench == null ? null : bench - baseBench,
    };
  });

  const last = scoped[scoped.length - 1];
  const ret = num(last.return_pct);
  const bench = num(last.benchmark_return_pct);
  const latest = {
    total_value: num(last.total_value),
    return_pct: ret,
    benchmark_return_pct: bench,
    alpha_pct: num(last.alpha_pct) ?? (ret != null && bench != null ? ret - bench : null),
    as_of: last.snapshot_date,
  };

  const end = series[series.length - 1];
  const pRet = end.fund_return_pct;
  const pBench = end.benchmark_return_pct;
  const periodStats = {
    period,
    start_date: base.snapshot_date,
    end_date: last.snapshot_date,
    full_history: fullHistory,
    rebased: !fullHistory,
    days: series.length,
    fund_value: latest.total_value,
    return_pct: pRet,
    benchmark_return_pct: pBench,
    alpha_pct: fullHistory
      ? latest.alpha_pct
      : pRet != null && pBench != null
        ? pRet - pBench
        : null,
  };
  return { series, latest, periodStats };
}

/**
 * The four headline figures and what they cover. With daily records they are
 * the period's figures; with none, the current book's figures stand in and
 * are labelled as such.
 */
export function headlineOf(data) {
  const stats = data?.periodStats || null;
  const perf = data?.performance || null;
  if (stats) {
    return {
      source: 'records',
      fundValue: stats.fund_value ?? perf?.total_value ?? null,
      returnPct: stats.return_pct,
      benchmarkPct: stats.benchmark_return_pct,
      alphaPct: stats.alpha_pct,
      start: stats.start_date,
      end: stats.end_date,
      fullHistory: Boolean(stats.full_history),
      rebased: Boolean(stats.rebased),
    };
  }
  return {
    source: perf ? 'book' : 'none',
    fundValue: perf?.total_value ?? null,
    returnPct: perf?.return_pct ?? null,
    benchmarkPct: perf?.benchmark_return_pct ?? null,
    alphaPct: perf?.alpha_pct ?? null,
    start: null,
    end: null,
    fullHistory: true,
    rebased: false,
  };
}

/** One sentence on what the headline figures cover. Describes, never advises. */
export function coverageNote(headline, period) {
  if (!headline || headline.source === 'none') return null;
  if (headline.source === 'book') {
    return 'No daily fund records yet. Return, benchmark and alpha are for the current holdings since they were bought.';
  }
  const range = `${fmtDate(headline.start)} to ${fmtDate(headline.end)}`;
  if (headline.rebased) {
    return `Return, benchmark and alpha are the change from ${range}, in points. Fund value is the latest daily record.`;
  }
  if (period !== 'inception') {
    return `The fund's daily records start on ${fmtDate(headline.start)}, so ${periodLabel(period).toLowerCase()} covers the full history: ${range}. Fund value is the latest daily record.`;
  }
  return `Return is the gain on cost of the holdings, and the benchmark is measured from the first daily record: ${range}. Fund value is the latest daily record.`;
}

/* ── Chart: fund return against benchmark return ────────────────────────── */

function niceStep(span, target) {
  const raw = span / Math.max(1, target);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * pow;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const tickDate = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}`;
};
/** Axis label: signed, two decimals, and zero carries no sign. */
export const axisPct = (v) => (Math.abs(v) < 1e-9 ? '0.00%' : fmtSignedPct(v));

/**
 * Geometry for the return chart. The y axis is cumulative return in percent,
 * with zero always in range. Returns null with fewer than two points.
 *
 * @param {Array<{date:string,fund_value:number|null,fund_return_pct:number|null,
 *                benchmark_return_pct:number|null}>} series
 * @param {{width?:number,height?:number}} [opts]
 */
export function buildReturnChart(series, opts = {}) {
  const W = opts.width || 600;
  const H = opts.height || 260;
  const pts = (Array.isArray(series) ? series : []).filter((p) => num(p?.fund_return_pct) != null);
  if (pts.length < 2) return null;
  const n = pts.length;
  const fund = pts.map((p) => Number(p.fund_return_pct));
  const bench = pts.map((p) => num(p.benchmark_return_pct));
  const hasBench = bench.some((b) => b != null);

  const pool = [...fund, ...bench.filter((b) => b != null), 0];
  let lo = Math.min(...pool);
  let hi = Math.max(...pool);
  if (hi === lo) {
    hi += 1;
    lo -= 1;
  }
  const step = niceStep(hi - lo, 5);
  const yMin = Math.floor(lo / step) * step;
  const yMax = Math.ceil(hi / step) * step;

  const left = 62;
  const right = 6;
  const top = 8;
  const bottom = 24;
  const plotW = Math.max(40, W - left - right);
  const plotH = H - top - bottom;
  const xAt = (i) => left + (i / (n - 1)) * plotW;
  const yAt = (v) => top + (1 - (v - yMin) / (yMax - yMin)) * plotH;
  const path = (arr) => {
    let out = '';
    let pen = false;
    arr.forEach((v, i) => {
      if (v == null) {
        pen = false;
        return;
      }
      out += `${pen ? 'L' : 'M'}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)} `;
      pen = true;
    });
    return out.trim();
  };

  const line = path(fund);
  const zeroY = yAt(0);
  const yTicks = [];
  for (let v = yMin; v <= yMax + step / 2; v += step) {
    yTicks.push({ y: yAt(v), label: axisPct(v), zero: Math.abs(v) < 1e-9 });
  }
  const want = Math.min(W < 460 ? 4 : 6, n);
  const xTicks = [];
  for (let k = 0; k < want; k += 1) {
    const i = Math.round((k * (n - 1)) / Math.max(1, want - 1));
    xTicks.push({ x: xAt(i), label: tickDate(pts[i].date) });
  }

  return {
    W,
    H,
    left,
    right,
    top,
    baseY: top + plotH,
    zeroY,
    plotW,
    plotH,
    line,
    /* The fill runs between the line and the zero line. */
    area: `${line} L${xAt(n - 1).toFixed(1)} ${zeroY.toFixed(1)} L${left} ${zeroY.toFixed(1)} Z`,
    benchLine: hasBench ? path(bench) : null,
    hasBench,
    yTicks,
    xTicks,
    points: pts.map((p, i) => ({
      x: xAt(i),
      y: yAt(fund[i]),
      benchY: bench[i] == null ? null : yAt(bench[i]),
      date: p.date,
      fundValue: num(p.fund_value),
      fundReturn: fund[i],
      benchReturn: bench[i],
    })),
    firstDate: pts[0].date,
    lastDate: pts[n - 1].date,
  };
}

/* ── Holdings by sector ─────────────────────────────────────────────────── */

export function sectorTotals(positions) {
  const list = Array.isArray(positions) ? positions : [];
  const total = list.reduce((s, p) => s + (num(p.value) ?? 0), 0);
  const map = new Map();
  for (const p of list) {
    const sector = p.sector || 'Unclassified';
    const s = map.get(sector) || { value: 0, cost: 0, positions: 0 };
    s.value += num(p.value) ?? 0;
    s.cost += num(p.cost) ?? 0;
    s.positions += 1;
    map.set(sector, s);
  }
  return { total, map };
}

/** Each team's sector: the sector that holds most of the team's value. */
export function teamSectorMap(positions) {
  const byTeam = new Map();
  for (const p of Array.isArray(positions) ? positions : []) {
    if (!p.team_id || !p.sector) continue;
    const secs = byTeam.get(p.team_id) || new Map();
    secs.set(p.sector, (secs.get(p.sector) || 0) + (num(p.value) ?? 0));
    byTeam.set(p.team_id, secs);
  }
  const out = new Map();
  for (const [teamId, secs] of byTeam) {
    let best = null;
    for (const [sector, val] of secs) if (!best || val > best.val) best = { sector, val };
    if (best) out.set(teamId, best.sector);
  }
  return out;
}

/**
 * The largest sector against the council's one sector cap. With no cap rule
 * nothing is ever flagged (source 'none').
 */
export function concentrationOf(positions, capPct) {
  const cap = num(capPct);
  if (cap == null) return { breach: false, source: 'none' };
  const { total, map } = sectorTotals(positions);
  if (total <= 0) return { breach: false, source: 'ips', limit_pct: cap };
  let worst = null;
  let over = 0;
  for (const [sector, s] of map) {
    const weight = (s.value / total) * 100;
    if (weight > cap) over += 1;
    if (!worst || weight > worst.weight_pct) worst = { sector, weight_pct: weight };
  }
  return {
    breach: over > 0,
    source: 'ips',
    limit_pct: cap,
    sector: worst?.sector ?? null,
    weight_pct: worst?.weight_pct ?? null,
    over_count: over,
    sector_count: map.size,
  };
}

/**
 * One row per sector, largest first: weight, contribution (the sector's gain
 * or loss as a percent of fund value), the one cap, and the portfolio manager
 * whose team mostly holds the sector.
 */
export function sectorRows({ positions, teams, members, capPct }) {
  const cap = num(capPct);
  const { total, map } = sectorTotals(positions);
  if (total <= 0) return [];
  const teamSector = teamSectorMap(positions);
  const pmBySector = new Map();
  for (const t of Array.isArray(teams) ? teams : []) {
    const sector = teamSector.get(t.id);
    if (!sector) continue;
    const pm = (members || []).find(
      (m) => m.team_id === t.id && m.role === 'portfolio_manager' && m.is_active !== false,
    );
    pmBySector.set(sector, { pm_name: pm ? resolveMemberName(pm) : null, team_id: t.id });
  }
  return [...map.entries()]
    .map(([sector, s]) => {
      const weight = (s.value / total) * 100;
      const meta = pmBySector.get(sector) || {};
      return {
        sector,
        weight_pct: weight,
        cap_pct: cap,
        over_cap: cap != null ? weight > cap : false,
        pm_name: meta.pm_name ?? null,
        team_id: meta.team_id ?? null,
        contribution_pct: ((s.value - s.cost) / total) * 100,
        positions: s.positions,
      };
    })
    .sort((a, b) => b.weight_pct - a.weight_pct);
}

/* ── Analysts and pitches ───────────────────────────────────────────────── */

/**
 * Which analyst a holding is credited to: the analyst whose pitch for the
 * ticker was approved. Only when no pitch for the ticker was approved does
 * another pitch for it count, so a rejected pitch never takes the credit
 * from an approved one.
 */
export function analystByTicker(pitches) {
  const out = new Map();
  const list = (Array.isArray(pitches) ? pitches : []).filter(
    (p) => p.ticker && p.analyst_member_id,
  );
  for (const p of list) if (!out.has(p.ticker)) out.set(p.ticker, p.analyst_member_id);
  for (const p of list) if (accepted(p)) out.set(p.ticker, p.analyst_member_id);
  return out;
}

/**
 * The analyst leaderboard, largest contribution first.
 *
 * Hit rate is the share of a member's pitches with a reading that beat the
 * benchmark (alpha above zero), the same rule the scorecard uses, so a row
 * and the scorecard it opens agree.
 *
 * @param {{members:Array,teams:Array,positions:Array,pitches:Array,
 *          hindsightByPitch:Map<string,object>}} input
 */
export function leaderboardOf({ members, teams, positions, pitches, hindsightByPitch }) {
  const teamById = new Map((teams || []).map((t) => [t.id, t]));
  const teamSector = teamSectorMap(positions);
  const credit = analystByTicker(pitches);
  const contribByMember = new Map();
  for (const pos of positions || []) {
    const mid = credit.get(pos.ticker);
    if (mid) contribByMember.set(mid, (contribByMember.get(mid) || 0) + (num(pos.pl) ?? 0));
  }

  const agg = new Map();
  for (const p of pitches || []) {
    if (!p.analyst_member_id) continue;
    const a = agg.get(p.analyst_member_id) || {
      count: 0,
      outcomes: 0,
      hits: 0,
      returns: [],
      alphas: [],
    };
    a.count += 1;
    const h = hindsightByPitch?.get(p.id);
    if (h) {
      const r = num(h.return_pct);
      const al = num(h.alpha_pct);
      a.outcomes += 1;
      if ((al ?? 0) > 0) a.hits += 1;
      if (r != null) a.returns.push(r);
      if (al != null) a.alphas.push(al);
    }
    agg.set(p.analyst_member_id, a);
  }

  return (members || [])
    .filter((m) => m.is_active !== false && (m.role === 'analyst' || agg.has(m.id)))
    .map((m) => {
      const a = agg.get(m.id) || { count: 0, outcomes: 0, hits: 0, returns: [], alphas: [] };
      const team = m.team_id ? teamById.get(m.team_id) : null;
      return {
        member_id: m.id,
        name: resolveMemberName(m),
        avatar_url: null,
        sleeve: (m.team_id && teamSector.get(m.team_id)) || team?.name || null,
        pitches: a.count,
        outcomes: a.outcomes,
        hit_rate_pct: a.outcomes > 0 ? (a.hits / a.outcomes) * 100 : null,
        avg_return_pct: avg(a.returns),
        avg_alpha_pct: avg(a.alphas),
        coverage_count: a.count,
        contribution_usd: a.count > 0 ? (contribByMember.get(m.id) ?? 0) : null,
      };
    })
    .sort((x, y) => (y.contribution_usd ?? -Infinity) - (x.contribution_usd ?? -Infinity))
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

/**
 * Holdings that helped and holdings that hurt, up to five each. A holding
 * with a loss is never listed as a contributor, and one with a gain is never
 * listed as a detractor.
 */
export function contributorsOf({ positions, pitches, members }) {
  const list = Array.isArray(positions) ? positions : [];
  if (list.length === 0) return { top: [], bottom: [] };
  const byId = new Map((members || []).map((m) => [m.id, m]));
  const credit = analystByTicker(pitches);
  const totalCost = list.reduce((s, p) => s + (num(p.cost) ?? 0), 0);
  const rows = list.map((p) => {
    const mid = credit.get(p.ticker);
    const pl = num(p.pl) ?? 0;
    return {
      ticker: p.ticker,
      sector: p.sector || null,
      analyst_name: mid && byId.get(mid) ? resolveMemberName(byId.get(mid)) : null,
      contribution_usd: pl,
      contribution_pct: totalCost > 0 ? (pl / totalCost) * 100 : null,
    };
  });
  const sorted = [...rows].sort((a, b) => b.contribution_usd - a.contribution_usd);
  return {
    top: sorted.filter((r) => r.contribution_usd > 0).slice(0, 5),
    bottom: sorted
      .filter((r) => r.contribution_usd < 0)
      .slice(-5)
      .reverse(),
  };
}

/** Pitch funnel counts and the holdings no analyst has pitched. */
export function pipelineOf({ pitches, positions }) {
  const list = Array.isArray(pitches) ? pitches : [];
  const held = new Set((positions || []).map((p) => p.ticker));
  const submitted = list.length;
  const approved = list.filter(accepted).length;
  const executed = list.filter((p) => accepted(p) && held.has(p.ticker)).length;
  const pitched = new Set(list.filter((p) => p.analyst_member_id).map((p) => p.ticker));
  const coverageGaps = (positions || [])
    .filter((p) => !pitched.has(p.ticker))
    .map((p) => ({ ticker: p.ticker, sector: p.sector || null, team_id: p.team_id || null }));
  return { submitted, approved, executed, coverage_gaps: coverageGaps };
}

/** The funnel as rows: each stage with its share of submitted pitches. */
export function funnelRows(pipeline) {
  const submitted = num(pipeline?.submitted) ?? 0;
  const share = (v) => (submitted > 0 ? (v / submitted) * 100 : null);
  return [
    { key: 'submitted', label: 'Submitted', count: submitted },
    { key: 'approved', label: 'Approved', count: num(pipeline?.approved) ?? 0 },
    { key: 'executed', label: 'Executed', count: num(pipeline?.executed) ?? 0 },
  ].map((r) => ({ ...r, pct: share(r.count) }));
}

/** A pitch reading in words. Colour is never the only signal: each has an icon. */
export const PITCH_STATES = {
  outperforming: { label: 'Outperforming', icon: 'bi-arrow-up', tone: 'pos', order: 3 },
  roughly_inline: { label: 'Roughly in line', icon: 'bi-arrow-right', tone: 'na', order: 2 },
  underperforming: { label: 'Underperforming', icon: 'bi-arrow-down', tone: 'neg', order: 1 },
};
export const PITCH_PENDING = { label: 'Pending', icon: 'bi-hourglass', tone: 'na', order: 0 };
export function pitchState(state) {
  const key = String(state || '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (PITCH_STATES[key]) return PITCH_STATES[key];
  if (key.includes('out')) return PITCH_STATES.outperforming;
  if (key.includes('under')) return PITCH_STATES.underperforming;
  if (key.includes('line')) return PITCH_STATES.roughly_inline;
  return PITCH_PENDING;
}

/* ── Sorting ────────────────────────────────────────────────────────────── */

/**
 * Sort rows by one key. Text sorts by locale, numbers by value, and a missing
 * value always sits at the end, whichever way the column is sorted.
 */
export function sortRows(rows, key, dir = 'desc', read = (r, k) => r[k]) {
  const sign = dir === 'asc' ? 1 : -1;
  return [...(rows || [])].sort((a, b) => {
    const av = read(a, key);
    const bv = read(b, key);
    const aMissing = av == null || av === '';
    const bMissing = bv == null || bv === '';
    if (aMissing || bMissing) return Number(aMissing) - Number(bMissing);
    if (typeof av === 'string' || typeof bv === 'string') {
      return sign * String(av).localeCompare(String(bv));
    }
    return sign * (Number(av) - Number(bv));
  });
}

/** Next sort after a header click: a new column starts at its natural end. */
export function nextSort(current, key, firstDir = 'desc') {
  if (current.key !== key) return { key, dir: firstDir };
  return { key, dir: current.dir === 'desc' ? 'asc' : 'desc' };
}

/* ── Insight line ───────────────────────────────────────────────────────── */

/**
 * One sentence on where the fund stands. It describes and never advises.
 * Returns null when there is nothing to say.
 */
export function composeInsight({ headline, concentration, benchLabel }) {
  const alpha = num(headline?.alphaPct);
  const bench = benchLabel && benchLabel !== NA ? benchLabel : 'its benchmark';
  const span =
    headline?.source === 'records'
      ? `from ${fmtDate(headline.start)} to ${fmtDate(headline.end)}`
      : 'on the current holdings';
  const parts = [];
  let tone = 'neutral';
  if (alpha != null) {
    parts.push(
      alpha >= 0
        ? `The fund is ahead of ${bench} by ${fmtPoints(alpha)} ${span}.`
        : `The fund is behind ${bench} by ${fmtPoints(alpha)} ${span}.`,
    );
  }
  if (concentration?.source === 'ips' && concentration.sector) {
    if (concentration.breach) {
      tone = 'warning';
      parts.push(
        `${concentration.sector} is ${fmtPct(concentration.weight_pct)} of the fund, above the ${fmtPct(concentration.limit_pct)} sector cap.`,
      );
    } else {
      parts.push(`Every sector is within the ${fmtPct(concentration.limit_pct)} sector cap.`);
    }
  }
  if (parts.length === 0) return null;
  return { tone, text: parts.join(' ') };
}

/* ── Council standing ───────────────────────────────────────────────────── */

/**
 * The open competition to show: one the council has entered, the active one
 * first. Null when the council is in none.
 */
export function pickCompetition(competitions) {
  const entered = (Array.isArray(competitions) ? competitions : []).filter(
    (c) => c?.myEntry && c.myEntry.status !== 'withdrawn',
  );
  return entered.find((c) => c.status === 'active') || entered[0] || null;
}

/** Rank and field size from a competition's standings. */
export function standingOf(competition, standings) {
  if (!competition) return null;
  const rows = Array.isArray(standings) ? standings : [];
  const mine = rows.find((r) => r.isMine) || null;
  const ranked = rows.filter((r) => num(r.return_pct) != null).length;
  return {
    id: competition.id,
    name: competition.name || 'Competition',
    status: competition.status || null,
    ends_at: competition.ends_at || null,
    rank:
      mine && num(mine.return_pct) != null ? mine.rank : (num(competition.myEntry?.rank) ?? null),
    field: rows.length || null,
    ranked,
    return_pct: num(mine?.return_pct) ?? num(competition.myEntry?.return_pct),
  };
}

/* ── Team attention map ─────────────────────────────────────────────────── */

export const ATTENTION_GROUPS = [
  ['sector', 'Sectors'],
  ['theme', 'Themes'],
  ['entity', 'Companies and people'],
  ['industry', 'Industries'],
  ['geo', 'Geographies'],
  ['asset_class', 'Asset classes'],
];

/** Up to five topics per group, each with its bar share of the group's top score. */
export function attentionGroups(dimensions, perGroup = 5) {
  const dims = dimensions || {};
  return ATTENTION_GROUPS.map(([key, label]) => {
    const rows = (dims[key] || []).slice(0, perGroup);
    const max = Math.max(1, ...rows.map((r) => num(r.score) ?? 0));
    return {
      key,
      label,
      rows: rows.map((r) => ({
        value: r.value,
        members: r.memberCount,
        share: Math.max(4, ((num(r.score) ?? 0) / max) * 100),
      })),
    };
  }).filter((g) => g.rows.length > 0);
}

export { NA };
