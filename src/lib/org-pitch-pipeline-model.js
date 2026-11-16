/**
 * Pitch Pipeline page model (/org-team-hub/pitches).
 *
 * Pure: no React, no fetch, no server imports. The page, the sample bundle
 * and the tests all read these functions, so what the page lists (what waits
 * on a member, what is aging, what is due for review) is decided in one place
 * from the rows the server sends.
 */
import { AGING_DAYS } from './pitch/rules.js';

export const NA = 'N/A';
const DAY = 86400000;

/* Stages in the order a pitch moves through them. Names in sentence case. */
export const WORKING_STAGES = [
  'idea',
  'screening',
  'deep_dive',
  'cross_desk_review',
  'pitch_scheduled',
  'ic_vote',
  'approved',
  'in_portfolio',
];
export const END_STAGES = ['rejected', 'exited'];
export const ALL_STAGES = [...WORKING_STAGES, ...END_STAGES];
export const STAGE_NAMES = {
  idea: 'Idea',
  screening: 'Screening',
  deep_dive: 'Deep dive',
  cross_desk_review: 'Cross-desk review',
  pitch_scheduled: 'Pitch scheduled',
  ic_vote: 'IC vote',
  approved: 'Approved',
  in_portfolio: 'In portfolio',
  rejected: 'Rejected',
  exited: 'Exited',
};
export const stageName = (stage) => STAGE_NAMES[stage] || NA;
export const cleanStage = (s) => (ALL_STAGES.includes(s) ? s : null);

/* Gate names in sentence case. The server's own label is the fallback. */
const GATE_NAMES = {
  has_ticker_and_thesis: 'Ticker and thesis',
  desk_assigned: 'Desk assigned',
  screening_checklist_pass: 'Screening checklist',
  thesis_completeness_80: 'Thesis: six sections',
  thesis_completeness_100: 'Thesis: all eleven sections',
  senior_analyst_signoffs: 'Senior sign-offs',
  no_unresolved_challenges: 'No open challenges',
  all_challenges_resolved: 'Challenges resolved',
  compliance_no_hard_breach: 'Compliance',
  desk_meeting_logged: 'Desk meeting logged',
  required_models_complete: 'Required models reviewed',
  cross_desk_majority: 'Cross-desk majority',
  ic_meeting_assigned: 'IC meeting assigned',
  deck_uploaded: 'Deck listed',
  pre_read_distributed_48h: 'Pre-read',
  quorum_met: 'Quorum met',
  vote_closed: 'Vote closed',
  vote_passed: 'Vote carried',
  conflicts_recused: 'Conflicts recused',
  trade_executed: 'Position on the book',
};
export const gateName = (gate) => GATE_NAMES[gate?.id] || gate?.label || NA;

export const THESIS_FIELD_NAMES = {
  thesis_short: 'Short thesis',
  thesis_full: 'Full thesis',
  why_now: 'Why now',
  catalysts: 'Catalysts',
  risks: 'Risks',
  valuation_base: 'Base value',
  valuation_bull: 'Bull value',
  valuation_bear: 'Bear value',
  variant_perception: 'Variant perception',
  falsification: 'Falsification condition',
  position_size_pct: 'Position size',
};

/** The server's gate detail, with field keys and symbols turned into words. */
export function gateDetail(gate) {
  let d = String(gate?.detail || '');
  d = d.replace(
    /missing: (\w+)/g,
    (_, k) => `missing: ${(THESIS_FIELD_NAMES[k] || k).toLowerCase()}`,
  );
  d = d
    .replace(/Market-data checklist not configured/, 'No checklist is configured')
    .replace(/Compliance engine not configured/, 'No check is configured')
    .replace(/Pre-read distribution not tracked/, 'Not tracked')
    .replace(/needs ≥1 in-desk/, 'needs 1 from the pitching desk')
    .replace(/(\d+) in-desk/, '$1 from the pitching desk')
    .replace(/need ≥3 attendees/, 'needs 3 attendees')
    .replace(/Ticker \+ 20-char thesis required/, 'Needs a ticker and a thesis of 20 characters')
    .replace(/^(\d+) of (\d+) voted$/, '$1 ballots received, $2 needed')
    .replace(/Awaiting execution/, 'No position in this ticker yet')
    .replace(/Position open/, 'A position in this ticker is on the book')
    .replace(/dcf/g, 'DCF')
    .replace(/three_statement/g, 'three-statement')
    .replace(/earnings_analysis/g, 'earnings analysis');
  return d;
}

export const GATE_STATUS = {
  pass: { label: 'Passed', icon: 'bi-check-circle', tone: 'pos' },
  fail: { label: 'Not met', icon: 'bi-x-circle', tone: 'neg' },
  pending: { label: 'Pending', icon: 'bi-circle', tone: 'na' },
  warn: { label: 'Advisory', icon: 'bi-exclamation-triangle', tone: 'warn' },
};

export const VOTE_NAMES = { yes: 'Buy', no: 'Pass', abstain: 'Abstain' };
export const MODEL_NAMES = {
  dcf: 'DCF',
  three_statement: 'Three-statement model',
  comps: 'Comparable companies',
  earnings_analysis: 'Earnings analysis',
};
export const modelName = (t) => MODEL_NAMES[t] || String(t || NA).replace(/_/g, ' ');
export const DELIVERABLE_KINDS = [
  ['model', 'Model'],
  ['memo', 'Memo'],
  ['deck', 'Deck'],
  ['one_pager', 'One-pager'],
  ['supporting', 'Supporting'],
];
export const OUTCOME_NAMES = {
  accepted: 'Accepted',
  rejected: 'Rejected',
  watchlist: 'Watchlist',
  deferred: 'Deferred',
  withdrawn: 'Withdrawn',
};
export const HORIZONS = [
  ['1m', '1 month'],
  ['3m', '3 months'],
  ['6m', '6 months'],
  ['12m', '12 months'],
  ['24m', '24 months'],
  ['long-term', 'Long term'],
];
export const horizonName = (h) => HORIZONS.find(([k]) => k === h)?.[1] || h || NA;
export const PITCH_TYPES = [
  ['long', 'Long'],
  ['short', 'Short'],
  ['pair', 'Pair'],
  ['options', 'Options'],
];
export const CONVICTION = ['', 'Very low', 'Low', 'Medium', 'High', 'Very high'];

// ── Formatting ───────────────────────────────────────────────────────────────
const fin = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

export function fmtMoney(v) {
  const n = fin(v);
  if (n == null) return NA;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
/** A signed percentage with two decimals. */
export function fmtPct(v) {
  const n = fin(v);
  if (n == null) return NA;
  return `${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(n).toFixed(2)}%`;
}
/** A share or a size: no sign. */
export function fmtShare(v) {
  const n = fin(v);
  return n == null ? NA : `${n.toFixed(2)}%`;
}
export function fmtDate(iso) {
  if (!iso) return NA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NA;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
export function fmtShortDate(iso) {
  if (!iso) return NA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NA;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
export function fmtDateTime(iso) {
  if (!iso) return 'No date set';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'No date set';
  return `${d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}
export const toneOf = (v) => {
  const n = fin(v);
  return n == null ? 'na' : n > 0 ? 'pos' : n < 0 ? 'neg' : 'default';
};

// ── Counts ───────────────────────────────────────────────────────────────────
export function kpisOf(pitches) {
  const list = pitches || [];
  return {
    active: list.filter((p) => p.status === 'active').length,
    in_portfolio: list.filter((p) => p.stage === 'in_portfolio').length,
    aging: list.filter((p) => p.is_aging).length,
    archived: list.filter((p) => END_STAGES.includes(p.stage)).length,
  };
}

export function stageCounts(pitches) {
  const out = Object.fromEntries(ALL_STAGES.map((s) => [s, 0]));
  for (const p of pitches || []) if (p.stage in out) out[p.stage] += 1;
  return out;
}

/** The rows the tables show for a chosen stage. No stage: everything still working. */
export function rowsForStage(pitches, stage) {
  const list = pitches || [];
  if (stage) return list.filter((p) => p.stage === stage);
  return list.filter((p) => p.status === 'active');
}

// ── What waits on the viewer ─────────────────────────────────────────────────
const failing = (pitch, id) =>
  (pitch.gate?.gates || []).some((g) => g.id === id && g.status !== 'pass');

/**
 * Why a pitch waits on this member, most pressing first. Each reason names
 * the tab of the pitch dialog where the member acts. Empty when nothing on
 * the pitch is theirs to do.
 */
export function awaitingReasons(pitch, viewer) {
  if (!pitch || !viewer) return [];
  const s = pitch.viewer_state || {};
  const manager = viewer.role === 'executive' || viewer.role === 'portfolio_manager';
  const onDesk = !viewer.team_id || viewer.team_id === pitch.team_id;
  const out = [];
  const add = (key, label, icon, tab) => out.push({ key, label, icon, tab });

  if (pitch.stage === 'ic_vote' && pitch.ballot && !pitch.ballot.closed) {
    if (manager && !s.ballot_cast) add('ballot', 'Cast your ballot', 'bi-envelope-paper', 'voting');
    else if (viewer.role === 'executive' && pitch.ballot.quorum_met) {
      add('close', 'Quorum met: close the vote', 'bi-door-closed', 'voting');
    }
  }
  if (pitch.status === 'active' && pitch.gate?.all_pass && pitch.gate?.can_advance) {
    add(
      'advance',
      `Advance to ${stageName(pitch.gate.next_stage).toLowerCase()}`,
      'bi-arrow-right-circle',
      'gates',
    );
  }
  if (pitch.stage === 'screening' && s.can_sign_off && !s.signed_off) {
    add('signoff', 'Sign off or request changes', 'bi-pen', 'review');
  }
  if (pitch.stage === 'cross_desk_review' && s.can_cross_desk && !s.cross_desk_decided) {
    add('cross', 'Cross-desk review', 'bi-diagram-3', 'review');
  }
  if (pitch.stage === 'deep_dive' && manager && onDesk) {
    if (s.models_to_review > 0)
      add('models', 'Review a model', 'bi-file-earmark-spreadsheet', 'deliverables');
    if (failing(pitch, 'desk_meeting_logged')) {
      add('desk', 'Log the desk meeting', 'bi-people', 'deliverables');
    }
  }
  if (pitch.stage === 'pitch_scheduled' && manager && failing(pitch, 'ic_meeting_assigned')) {
    add('meeting', 'Assign an IC meeting', 'bi-calendar-event', 'voting');
  }
  if (s.is_author && s.can_edit_thesis) {
    if (failing(pitch, 'thesis_completeness_80') || failing(pitch, 'thesis_completeness_100')) {
      add('thesis', 'Complete the thesis', 'bi-pencil-square', 'thesis');
    }
    if (pitch.stage === 'deep_dive' && failing(pitch, 'required_models_complete') && !manager) {
      add('upload', 'Add the required models', 'bi-file-earmark-arrow-up', 'deliverables');
    }
  }
  if (pitch.stage === 'pitch_scheduled' && s.is_author && failing(pitch, 'deck_uploaded')) {
    add('deck', 'List the deck', 'bi-easel', 'deliverables');
  }
  if (pitch.stage === 'approved' && manager && pitch.held === false) {
    add('trade', 'Record the position on the Trading Desk', 'bi-bank', 'decision');
  }
  if (pitch.stage === 'in_portfolio' && s.can_review_falsification && reviewState(pitch).overdue) {
    add('review', 'Thesis review due', 'bi-arrow-repeat', 'decision');
  }
  return out;
}

export function awaitingQueue(pitches, viewer) {
  return (pitches || [])
    .map((p) => ({ pitch: p, reasons: awaitingReasons(p, viewer) }))
    .filter((r) => r.reasons.length > 0)
    .sort((a, b) => (b.pitch.days_in_stage || 0) - (a.pitch.days_in_stage || 0));
}

/** The 90-day review of a held pitch: due date, days to it, overdue or not. */
export function reviewState(pitch, now = Date.now()) {
  if (!pitch?.review_due_at) return { due: null, days: null, overdue: false };
  const t = new Date(pitch.review_due_at).getTime();
  const days = Math.round((t - now) / DAY);
  return { due: pitch.review_due_at, days, overdue: days < 0 };
}

/**
 * One status for a row, as an icon and words. Never a vote: during a blind
 * ballot the only thing said is that the ballot is open.
 */
export function rowStatus(pitch, now = Date.now()) {
  if (pitch.stage === 'ic_vote' && pitch.ballot) {
    if (pitch.ballot.closed)
      return { label: 'Vote closed', icon: 'bi-door-closed', tone: 'default' };
    return pitch.ballot.sealed
      ? { label: 'Blind ballot open', icon: 'bi-lock', tone: 'default' }
      : { label: 'Ballot open', icon: 'bi-envelope-open', tone: 'default' };
  }
  if (pitch.stage === 'in_portfolio') {
    const r = reviewState(pitch, now);
    if (r.overdue) return { label: 'Review due', icon: 'bi-exclamation-triangle', tone: 'warn' };
    return null;
  }
  if (pitch.status !== 'active') {
    const label = OUTCOME_NAMES[pitch.status] || OUTCOME_NAMES[pitch.decision];
    return label ? { label, icon: 'bi-archive', tone: 'na' } : null;
  }
  if (pitch.is_aging) return { label: 'Aging', icon: 'bi-hourglass-split', tone: 'warn' };
  if (pitch.gate?.all_pass && pitch.gate?.next_stage) {
    return { label: 'Gates passed', icon: 'bi-check-circle', tone: 'pos' };
  }
  return null;
}

// ── Side column ──────────────────────────────────────────────────────────────
/** The next committee meeting that is not closed, with the pitches on it. */
export function agendaOf(pitches, meetings) {
  const open = (meetings || []).filter((m) => m.status !== 'closed');
  const rank = (m) => (m.status === 'in_session' ? 0 : 1);
  const when = (m) => (m.meets_at ? new Date(m.meets_at).getTime() : Infinity);
  const next = [...open].sort((a, b) => rank(a) - rank(b) || when(a) - when(b))[0] || null;
  const items = next
    ? (pitches || []).filter((p) => p.ic_meeting_id === next.id && p.status === 'active')
    : [];
  const unassigned = (pitches || []).filter(
    (p) => p.status === 'active' && p.stage === 'pitch_scheduled' && !p.ic_meeting_id,
  );
  return { meeting: next, items, unassigned, upcoming: open.filter((m) => m !== next) };
}

export function agingByDesk(pitches) {
  const map = new Map();
  for (const p of pitches || []) {
    if (!p.is_aging) continue;
    const key = p.team_name || 'No desk';
    const row = map.get(key) || { desk: key, count: 0, oldest: 0 };
    row.count += 1;
    row.oldest = Math.max(row.oldest, p.days_in_stage || 0);
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.oldest - a.oldest);
}

export function reviewsDue(pitches, now = Date.now()) {
  return (pitches || [])
    .filter((p) => p.stage === 'in_portfolio' && p.review_due_at)
    .map((p) => ({ pitch: p, ...reviewState(p, now) }))
    .sort((a, b) => new Date(a.due) - new Date(b.due));
}

/** Approved by the committee and not yet moved to In portfolio. */
export function approvedReady(pitches) {
  return (pitches || []).filter((p) => p.stage === 'approved' && p.status === 'active');
}

/**
 * Each member's pitch record: pitches, mean return and alpha over the
 * pitches that have a reading, and committee votes cast. `votesCast` already
 * leaves out ballots in an open blind vote.
 */
export function analystRecord(pitches, members, votesCast = {}) {
  const byId = new Map((members || []).map((m) => [m.id, m]));
  const agg = new Map();
  for (const p of pitches || []) {
    if (!p.analyst_member_id) continue;
    const a = agg.get(p.analyst_member_id) || { count: 0, returns: [], alphas: [] };
    a.count += 1;
    const r = fin(p.hindsight?.return_pct);
    const al = fin(p.hindsight?.alpha_pct);
    if (r != null) a.returns.push(r);
    if (al != null) a.alphas.push(al);
    agg.set(p.analyst_member_id, a);
  }
  /* Members who voted but never pitched still have a record of votes cast. */
  for (const mid of Object.keys(votesCast || {})) {
    if (!agg.has(mid) && byId.has(mid)) agg.set(mid, { count: 0, returns: [], alphas: [] });
  }
  const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  return [...agg.entries()]
    .map(([id, a]) => ({
      member_id: id,
      name: byId.get(id)?.display_name || 'Member',
      pitches: a.count,
      avg_return: mean(a.returns),
      avg_alpha: mean(a.alphas),
      total_alpha: a.alphas.length ? a.alphas.reduce((s, x) => s + x, 0) : null,
      votes_cast: votesCast[id] ?? 0,
    }))
    .sort((a, b) => (b.total_alpha ?? -Infinity) - (a.total_alpha ?? -Infinity));
}

export { AGING_DAYS };
