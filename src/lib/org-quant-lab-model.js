/**
 * Council tab of Quant Lab (/for-the-quants): the pure model.
 *
 * Council members see the retail Overview unchanged under "My research", and
 * a "Council" tab built here from their council's own records: the position
 * book, sector teams, stored policy rules and benchmark (the US Equities fund
 * part), open pitches with their required-model checklists and the viewer's
 * own Model assignments (GET /api/org/quant-lab), and the lab's risk engine
 * run on the council's holdings (GET /api/org/quant-lab/risk). The live
 * routes and the sample bundle (src/lib/org-quant-lab-sample.js) hand over
 * the same shapes, so one set of functions draws both.
 *
 * Honesty rules, the same as Compliance and the Pitch Pipeline:
 * - The policy pre-check is the Compliance rule engine (evaluateProposal and
 *   ideaRows). It describes; it never blocks, saves or advises. A rule whose
 *   inputs are missing reads "Not tested", never a pass. The cash floor is
 *   recorded only, never checked.
 * - Fund risk is a replay of today's weights over about a year of closes,
 *   not the fund's own history. A holding without price history is left out
 *   and named; a figure that cannot be computed is N/A.
 * - Quant Lab strategies and runs are private to their author. Nothing here
 *   reads or shares them.
 *
 * Pure: no React, no fetch, no server imports.
 */
import { MODEL_NAMES, STAGE_NAMES } from './org-pitch-pipeline-model.js';
import {
  RULE_META,
  holdingsSummary,
  ideaRows,
  isHardRule,
  ruleValueText,
  sectorCap,
} from './org-compliance-model.js';
import { STATUS_LABEL } from './org-assignments-model.js';

export const NA = 'N/A';
const DAY = 86400000;

/** Pitch stages that have left the pipeline. */
export const CLOSED_STAGES = ['rejected', 'exited', 'in_portfolio', 'approved'];
/** Desk fallback when a team has no desk config (the column default). */
export const DEFAULT_REQUIRED_MODELS = ['dcf', 'three_statement', 'comps', 'earnings_analysis'];

export const LINKS = {
  pitches: '/org-team-hub/pitches',
  pitch: (id) => `/org-team-hub/pitches?pitch=${encodeURIComponent(id)}`,
  assignments: '/org-team-hub/assignments',
  compliance: '/org-team-hub/compliance',
  orgChart: '/org-team-hub/org-chart',
  trading: '/org-trading',
  strategyLab: '/for-the-quants/strategy-lab',
  riskPortfolio: '/for-the-quants/risk-portfolio',
};

/* ── Formatting ─────────────────────────────────────────────────────────── */

const finite = (v) => v != null && v !== '' && Number.isFinite(Number(v));
const upper = (t) =>
  String(t || '')
    .toUpperCase()
    .trim();

/** A fraction as a percentage, unsigned: 0.1234 -> 12.34% */
export const fmtFrac = (v, digits = 2) =>
  finite(v) ? `${(Number(v) * 100).toFixed(digits)}%` : NA;

/** A fraction as a signed change: 0.1234 -> +12.34% */
export function fmtSignedFrac(v, digits = 2) {
  if (!finite(v)) return NA;
  const n = Number(v) * 100;
  const r = n.toFixed(digits);
  if (Number(r) === 0) return `${Math.abs(Number(r)).toFixed(digits)}%`;
  return `${n > 0 ? '+' : ''}${r}%`;
}

/** A percentage number, unsigned: 32.1 -> 32.1% */
export const fmtPctNum = (v, digits = 1) => (finite(v) ? `${Number(v).toFixed(digits)}%` : NA);

export const fmtRatio = (v, digits = 2) => (finite(v) ? Number(v).toFixed(digits) : NA);

/** Nov 20 */
export function fmtShortDate(v) {
  if (!v) return NA;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return NA;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export const modelLabel = (t) => MODEL_NAMES[t] || String(t || NA).replace(/_/g, ' ');
export const stageLabel = (s) => STAGE_NAMES[s] || (s ? String(s).replace(/_/g, ' ') : NA);

/* ── Pitch models checklist ─────────────────────────────────────────────── */

/**
 * The desk's required models against one pitch's uploaded models, built the
 * way GET /api/org/pitches/[pitchId]/models builds it: a model counts toward
 * the gate only once it is uploaded and reviewed.
 */
export function modelChecklist(required, rows) {
  const byType = new Map((rows || []).map((m) => [m.model_type, m]));
  const checklist = (required || []).map((type) => {
    const row = byType.get(type) || null;
    const uploaded = Boolean(row && row.file_url);
    const reviewed = Boolean(row && row.reviewed_at);
    return {
      model_type: type,
      uploaded,
      reviewed,
      version: row?.version ?? null,
      complete: uploaded && reviewed,
    };
  });
  return {
    checklist,
    requiredCount: checklist.length,
    uploadedCount: checklist.filter((c) => c.uploaded).length,
    completeCount: checklist.filter((c) => c.complete).length,
  };
}

/** Open pitches, the viewer's first, then newest first. */
export function openPitches(pitches, viewerMemberId = null) {
  return (pitches || [])
    .filter((p) => p && p.ticker && !p.archived_at && !CLOSED_STAGES.includes(p.stage))
    .sort((a, b) => {
      const am = viewerMemberId && a.analyst_member_id === viewerMemberId ? 0 : 1;
      const bm = viewerMemberId && b.analyst_member_id === viewerMemberId ? 0 : 1;
      if (am !== bm) return am - bm;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
}

function nameOf(members) {
  const byId = new Map((members || []).map((m) => [m.id, m.display_name || null]));
  return (id) => (id && byId.get(id)) || null;
}

/**
 * Rows for "Pitch evidence and model checklist": each open pitch with its
 * desk's required models, how many are uploaded and how many are reviewed.
 * Only the checklist the Pitch Pipeline keeps; nothing else is implied.
 */
export function pitchRows(extras, members, viewerMemberId = null) {
  const name = nameOf(members);
  return openPitches(extras?.pitches, viewerMemberId).map((p) => {
    const m = extras?.models?.[p.id] || null;
    const versions = (m?.checklist || []).map((c) => c.version).filter(finite);
    const missing = (m?.checklist || []).filter((c) => !c.complete).map((c) => c.model_type);
    return {
      id: p.id,
      ticker: upper(p.ticker),
      owner:
        viewerMemberId && p.analyst_member_id === viewerMemberId
          ? 'You'
          : name(p.analyst_member_id) || 'Former member',
      mine: Boolean(viewerMemberId && p.analyst_member_id === viewerMemberId),
      stage: stageLabel(p.stage),
      required: m ? m.requiredCount : null,
      uploaded: m ? m.uploadedCount : null,
      reviewed: m ? m.completeCount : null,
      latestVersion: versions.length ? Math.max(...versions.map(Number)) : null,
      missing: missing.map(modelLabel),
      allReviewed: Boolean(m && m.requiredCount > 0 && m.completeCount === m.requiredCount),
      href: LINKS.pitch(p.id),
    };
  });
}

/* ── Sector concentration ───────────────────────────────────────────────── */

/**
 * Weight by sector, read the way the policy engine reads it (market value,
 * the book's sector field), against the lowest active sector cap. `near` is
 * within 10% of the cap, as Compliance marks it.
 */
export function sectorRows(positions, rules) {
  const h = holdingsSummary(positions || []);
  const cap = sectorCap(rules || []);
  const capRule = (rules || []).find(
    (r) =>
      r.is_active !== false &&
      r.rule_type === 'max_sector_pct' &&
      Number(r.rule_value?.pct) === Number(cap),
  );
  const rows = h.sectors.map((s) => ({
    sector: s.sector,
    pct: s.pct,
    unclassified: Boolean(s.unclassified),
    over: cap != null && !s.unclassified && s.pct > cap,
    near: cap != null && !s.unclassified && s.pct <= cap && s.pct > cap * 0.9,
  }));
  return {
    cap,
    hard: capRule ? isHardRule(capRule) : false,
    rows,
    total: h.totalValue,
    scale: Math.max(cap || 0, ...rows.map((r) => r.pct), 1),
  };
}

/* ── IPS pre-check ──────────────────────────────────────────────────────── */

/** What the policy engine is given for a pitch: only what the pitch records. */
export function ipsInputs(pitch) {
  return {
    ticker: upper(pitch?.ticker),
    sector: pitch?.sector || '',
    sizePct: finite(pitch?.position_size_pct) ? Number(pitch.position_size_pct) : '',
    marketCap: '',
  };
}

const IPS_STATUS = {
  blocked: { text: 'Blocked', icon: 'bi-x-circle', tone: 'negative' },
  warning: { text: 'Warning', icon: 'bi-exclamation-triangle', tone: 'warning' },
  clear: { text: 'Within limit', icon: 'bi-check-circle', tone: 'positive' },
  untested: { text: 'Not tested', icon: 'bi-question-circle', tone: 'muted' },
  recorded: { text: 'Recorded only', icon: 'bi-journal-text', tone: 'muted' },
};

/**
 * One row per active rule from the Compliance idea check (ideaRows), with a
 * status word, an icon and the engine's own sentence.
 */
export function ipsRows(rules, inputs, result) {
  const { rows, counts } = ideaRows(rules || [], inputs, result);
  const order = { hard: 0, soft: 1, portfolio: 2 };
  const out = rows
    .map((r) => {
      const meta = RULE_META[r.rule.rule_type] || {};
      let key = r.state === 'breach' ? (r.hard ? 'blocked' : 'warning') : r.state;
      if (r.state === 'untested' && meta.checked === 'recorded') key = 'recorded';
      return {
        id: r.rule.id,
        name: meta.label || r.rule.label || 'Rule',
        limit: ruleValueText(r.rule),
        hard: r.hard,
        status: IPS_STATUS[key] || IPS_STATUS.untested,
        detail: r.detail,
        group: r.group,
      };
    })
    .sort((a, b) => (order[a.group] ?? 3) - (order[b.group] ?? 3));
  return { rows: out, counts };
}

/** The pre-check's one-line verdict, descriptive only. */
export function ipsSummary(counts) {
  if (!counts) return NA;
  const parts = [];
  if (counts.hard) parts.push(`${counts.hard} hard`);
  if (counts.soft) parts.push(`${counts.soft} soft`);
  const head = parts.length
    ? `Rules this pitch would breach: ${parts.join(', ')}.`
    : 'No rule is breached by what this pitch records.';
  return counts.untested ? `${head} ${counts.untested} not tested.` : head;
}

/* ── Fund risk ──────────────────────────────────────────────────────────── */

/**
 * The risk card from the risk route's report. status: 'ready' | 'empty' |
 * 'no_history'. Concentration is the largest weight and the effective number
 * of holdings (1 / sum of squared weights).
 */
export function riskView(report) {
  if (!report) return { status: 'empty' };
  if (report.empty) {
    return {
      status: report.reason === 'no_history' ? 'no_history' : 'empty',
      skipped: report.skipped || [],
    };
  }
  const top = (report.holdings || [])[0] || null;
  const replay = (report.replay || []).filter((p) => p && p.date);
  const last = replay[replay.length - 1] || null;
  return {
    status: 'ready',
    from: report.from,
    to: report.to,
    observations: report.observations,
    benchmark: report.benchmark || 'SPY',
    volatility: report.volatility,
    beta: report.beta,
    valueAtRisk95: report.valueAtRisk95,
    valueAtRisk95Dollars: report.valueAtRisk95Dollars,
    expectedShortfall95: report.expectedShortfall95,
    largest: top ? { ticker: top.ticker, weight: top.weight } : null,
    effectiveHoldings: report.effectiveHoldings,
    holdingsCount: (report.holdings || []).length,
    skipped: report.skipped || [],
    beyondCap: report.beyondCap || [],
    replay,
    fundReturn: last ? last.portfolio : null,
    benchReturn: last ? last.benchmark : null,
  };
}

/** SVG paths for the replay chart on a w x h box, with y ticks (fractions). */
export function replayPaths(replay, w, h) {
  const pts = (replay || []).filter((p) => finite(p.portfolio));
  if (pts.length < 2) return null;
  const vals = [];
  for (const p of pts) {
    vals.push(Number(p.portfolio));
    if (finite(p.benchmark)) vals.push(Number(p.benchmark));
  }
  let lo = Math.min(0, ...vals);
  let hi = Math.max(0, ...vals);
  const pad = (hi - lo || 0.02) * 0.08;
  lo -= pad;
  hi += pad;
  const x = (i) => (i / (pts.length - 1)) * w;
  const y = (v) => h - ((v - lo) / (hi - lo)) * h;
  const path = (key) => {
    let d = '';
    let pen = false;
    pts.forEach((p, i) => {
      if (!finite(p[key])) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(Number(p[key])).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const ticks = [0, 1, 2, 3, 4].map((i) => hi - ((hi - lo) * i) / 4);
  const idx = [0, 1, 2, 3, 4].map((i) => Math.round(((pts.length - 1) * i) / 4));
  return {
    fund: path('portfolio'),
    bench: pts.some((p) => finite(p.benchmark)) ? path('benchmark') : null,
    zero: y(0),
    yTicks: ticks,
    xTicks: [...new Set(idx)].map((i) => fmtShortDate(pts[i].date)),
  };
}

/* ── Model assignments ──────────────────────────────────────────────────── */

const ASSIGNMENT_ICON = {
  assigned: 'bi-circle',
  in_progress: 'bi-arrow-repeat',
  submitted: 'bi-send',
  under_review: 'bi-eye',
  returned: 'bi-arrow-counterclockwise',
};

/**
 * Open Model assignments the Assignments page shows this viewer, soonest due
 * first. `owner` is "You" for the viewer's own, else the assignees.
 */
export function assignmentRows(list, now = Date.now()) {
  return (list || [])
    .filter((a) => a && !['complete', 'graded'].includes(a.status))
    .sort((a, b) => {
      if (Boolean(a.mine) !== Boolean(b.mine)) return a.mine ? -1 : 1;
      const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return ad - bd;
    })
    .map((a) => {
      const due = a.due_date ? new Date(a.due_date).getTime() : null;
      /* Overdue is derived by the Assignments loader; it is never stored. */
      const overdue = Boolean(a.overdue);
      return {
        id: a.id,
        title: a.title || 'Untitled',
        owner: a.mine
          ? 'You'
          : (a.assignees || []).length
            ? a.assignees.length > 1
              ? `${a.assignees[0]} and ${a.assignees.length - 1} more`
              : a.assignees[0]
            : NA,
        mine: Boolean(a.mine),
        due: fmtShortDate(a.due_date),
        dueInDays: due == null ? null : Math.round((due - now) / DAY),
        overdue,
        status: STATUS_LABEL[a.status] || NA,
        icon: ASSIGNMENT_ICON[a.status] || 'bi-circle',
        tone: a.status === 'in_progress' ? 'accent' : a.status === 'returned' ? 'warning' : 'muted',
      };
    });
}
