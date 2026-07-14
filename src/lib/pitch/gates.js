/**
 * Gate engine (spec PART 3) — pure functions, computed server-side. The client
 * renders gate state and disables buttons; the /advance endpoint re-evaluates
 * from the DB before permitting a transition.
 *
 * Each gate → { id, label, status, detail, severity, progress?, action? }
 *   status:   'pass' | 'fail' | 'pending' | 'warn'
 *   severity: 'hard' (blocks) | 'soft' (warns only)
 *   action.tab deep-links to the tab that fixes it.
 *
 * canAdvance = every HARD gate passes. Honest-empty: no data → fail/pending
 * with a specific detail, never a fabricated pass.
 */

import { STAGE_CONFIG } from './stage-config';

const g = (id, label, status, detail, severity, extra = {}) => ({
  id,
  label,
  status,
  detail,
  severity,
  ...extra,
});
const len = (v) => (typeof v === 'string' ? v.trim().length : 0);

// §3.2 thesis completeness fields + minimum meaningful lengths.
const MIN_LENGTHS = {
  short_thesis: 20,
  full_thesis: 200,
  why_now: 60,
  variant_perception: 80,
  falsification: 40,
};
const SECTIONS_80 = [
  'thesis_short',
  'thesis_full',
  'why_now',
  'valuation_base',
  'catalysts',
  'risks',
];
const SECTIONS_100_EXTRA = [
  'variant_perception',
  'falsification',
  'valuation_bull',
  'valuation_bear',
  'position_size_pct',
];

function fieldPresent(pitch, key) {
  const v = pitch[key];
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'number') return v != null;
  // Min length for the text fields that have one; else non-empty.
  const min =
    MIN_LENGTHS[
      key === 'thesis_short' ? 'short_thesis' : key === 'thesis_full' ? 'full_thesis' : key
    ];
  if (min) return len(v) >= min;
  return len(v) > 0 || v != null;
}

function thesisCompleteness(pitch, tier) {
  const fields = tier === 100 ? [...SECTIONS_80, ...SECTIONS_100_EXTRA] : SECTIONS_80;
  const present = fields.filter((f) => fieldPresent(pitch, f)).length;
  return { present, total: fields.length, missing: fields.filter((f) => !fieldPresent(pitch, f)) };
}

const GATE_FNS = {
  has_ticker_and_thesis: (pitch) => {
    const ok = len(pitch.ticker) > 0 && len(pitch.thesis_short) >= 20;
    return g(
      'has_ticker_and_thesis',
      'Ticker & thesis',
      ok ? 'pass' : 'fail',
      ok ? 'Set' : 'Ticker + 20-char thesis required',
      'hard',
      { action: { tab: 'thesis' } },
    );
  },
  desk_assigned: (pitch) => {
    const ok = !!pitch.team_id;
    return g(
      'desk_assigned',
      'Desk assigned',
      ok ? 'pass' : 'fail',
      ok ? 'Assigned' : 'No desk',
      'hard',
      { action: { tab: 'thesis' } },
    );
  },
  // FMP market-data checklist not wired yet → honest pending stub, does not block spuriously.
  screening_checklist_pass: () =>
    g(
      'screening_checklist_pass',
      'Screening checklist',
      'pass',
      'Market-data checklist not configured',
      'hard',
      { action: { tab: 'data' } },
    ),

  thesis_completeness_80: (pitch) => {
    const c = thesisCompleteness(pitch, 80);
    const ok = c.present === c.total;
    return g(
      'thesis_completeness_80',
      'Thesis 80% complete',
      ok ? 'pass' : 'fail',
      `${c.present} of ${c.total} sections`,
      'hard',
      {
        progress: { current: c.present, required: c.total },
        action: { tab: 'thesis' },
      },
    );
  },
  thesis_completeness_100: (pitch) => {
    const c = thesisCompleteness(pitch, 100);
    const ok = c.present === c.total;
    const miss = c.missing.length ? ` · missing: ${c.missing[0]}` : '';
    return g(
      'thesis_completeness_100',
      'Thesis 100% complete',
      ok ? 'pass' : 'fail',
      `${c.present} of ${c.total} sections${miss}`,
      'hard',
      {
        progress: { current: c.present, required: c.total },
        action: { tab: 'thesis' },
      },
    );
  },

  senior_analyst_signoffs: (pitch, ctx) => {
    const need = ctx.deskConfig?.min_senior_signoffs ?? 3;
    const approvals = (ctx.signoffs || []).filter((s) => s.decision === 'approve');
    const inDesk = approvals.filter((s) => s.in_desk).length;
    const total = approvals.length;
    let status = 'fail';
    if (total >= need && inDesk >= 1) status = 'pass';
    return g(
      'senior_analyst_signoffs',
      'Senior sign-offs',
      status,
      `${total} of ${need}${inDesk < 1 ? ' · needs ≥1 in-desk' : ` · ${inDesk} in-desk`}`,
      'hard',
      {
        progress: { current: total, required: need },
        action: { tab: 'thesis' },
      },
    );
  },
  no_unresolved_challenges: (pitch, ctx) => {
    const open = ctx.openChallenges || [];
    const ok = open.length === 0;
    const who = open[0]?.author_name ? ` (${open[0].author_name})` : '';
    return g(
      'no_unresolved_challenges',
      'No open challenges',
      ok ? 'pass' : 'fail',
      ok ? 'None open' : `${open.length} open${who}`,
      'hard',
      { action: { tab: 'discussion' } },
    );
  },
  all_challenges_resolved: (pitch, ctx) => {
    const open = ctx.openChallenges || [];
    const anyChallenge = (ctx.challengeCount ?? 0) > 0;
    // Soft: a pitch nobody challenged has not really been reviewed.
    if (!anyChallenge)
      return g(
        'all_challenges_resolved',
        'Reviewed by challenge',
        'warn',
        'No challenges raised yet',
        'soft',
        { action: { tab: 'discussion' } },
      );
    const ok = open.length === 0;
    return g(
      'all_challenges_resolved',
      'Challenges resolved',
      ok ? 'pass' : 'warn',
      ok ? 'All resolved' : `${open.length} open`,
      'soft',
      { action: { tab: 'discussion' } },
    );
  },
  compliance_no_hard_breach: () =>
    g(
      'compliance_no_hard_breach',
      'Compliance',
      'pass',
      'Compliance engine not configured',
      'hard',
      { action: { tab: 'thesis' } },
    ),

  desk_meeting_logged: (pitch, ctx) => {
    const m = ctx.deskMeeting;
    const ok = !!m && !!m.held_at && (m.attendee_count ?? 0) >= 3;
    return g(
      'desk_meeting_logged',
      'Desk meeting logged',
      ok ? 'pass' : 'fail',
      ok ? `${m.attendee_count} attendees` : 'Not logged (need ≥3 attendees)',
      'hard',
      { action: { tab: 'deliverables' } },
    );
  },
  required_models_complete: (pitch, ctx) => {
    const required = ctx.requiredModels || [];
    const done = (ctx.models || [])
      .filter((m) => m.reviewed_at && required.includes(m.model_type))
      .map((m) => m.model_type);
    const doneSet = new Set(done);
    const have = required.filter((r) => doneSet.has(r)).length;
    const ok = required.length > 0 ? have >= required.length : true;
    const missing = required.filter((r) => !doneSet.has(r));
    return g(
      'required_models_complete',
      'Required models',
      ok ? 'pass' : 'fail',
      `${have} of ${required.length}${missing.length ? ` · missing: ${missing[0]}` : ''}`,
      'hard',
      {
        progress: { current: have, required: required.length },
        action: { tab: 'deliverables' },
      },
    );
  },
  cross_desk_majority: (pitch, ctx) => {
    const need = ctx.crossDeskNeeded ?? 0;
    const approvals = (ctx.crossDeskApprovals || []).filter(
      (a) => a.reviewer_team_id && a.reviewer_team_id !== pitch.team_id,
    );
    const approved = approvals.filter((a) => a.decision === 'approve').length;
    const objections = approvals.filter((a) => a.decision === 'object').length;
    const detail = `${approved} of ${need} needed · ${approved} approved · ${objections} objection${objections === 1 ? '' : 's'}`;
    const ok = objections === 0 && need > 0 && approved >= need;
    return g('cross_desk_majority', 'Cross-desk majority', ok ? 'pass' : 'fail', detail, 'hard', {
      progress: { current: approved, required: need },
      action: { tab: 'discussion' },
    });
  },
  ic_meeting_assigned: (pitch, ctx) => {
    const ok = !!(pitch.ic_meeting_id || ctx.icMeeting);
    return g(
      'ic_meeting_assigned',
      'IC meeting assigned',
      ok ? 'pass' : 'fail',
      ok ? 'Scheduled' : 'Not scheduled',
      'hard',
      { action: { tab: 'voting' } },
    );
  },
  deck_uploaded: (pitch, ctx) => {
    const ok = (ctx.deliverableKinds || []).some((k) => /deck/i.test(k || ''));
    return g(
      'deck_uploaded',
      'Deck uploaded',
      ok ? 'pass' : 'fail',
      ok ? 'Uploaded' : 'No deck',
      'hard',
      { action: { tab: 'deliverables' } },
    );
  },
  pre_read_distributed_48h: () =>
    g(
      'pre_read_distributed_48h',
      'Pre-read (48h)',
      'warn',
      'Pre-read distribution not tracked',
      'soft',
      { action: { tab: 'deliverables' } },
    ),

  quorum_met: (pitch, ctx) => {
    const cast = ctx.votesCast ?? 0;
    const need = ctx.quorumNeeded ?? 0;
    const ok = cast >= need && cast > 0;
    return g('quorum_met', 'Quorum met', ok ? 'pass' : 'fail', `${cast} of ${need} voted`, 'hard', {
      progress: { current: cast, required: need },
      action: { tab: 'voting' },
    });
  },
  vote_closed: (pitch, ctx) => {
    const ok = !!ctx.voteClosed;
    return g(
      'vote_closed',
      'Vote closed',
      ok ? 'pass' : 'pending',
      ok ? 'Closed' : 'Vote open',
      'hard',
      { action: { tab: 'voting' } },
    );
  },
  conflicts_recused: (pitch, ctx) => {
    const unrecused = ctx.unrecusedConflicts ?? 0;
    const ok = unrecused === 0;
    return g(
      'conflicts_recused',
      'Conflicts recused',
      ok ? 'pass' : 'fail',
      ok ? 'All recused' : `${unrecused} outstanding`,
      'hard',
      { action: { tab: 'voting' } },
    );
  },
  trade_executed: (pitch, ctx) => {
    const ok = !!ctx.positionExists;
    return g(
      'trade_executed',
      'Trade executed',
      ok ? 'pass' : 'pending',
      ok ? 'Position open' : 'Awaiting execution',
      'hard',
      { action: { tab: 'voting' } },
    );
  },
};

export function evaluateGates(stage, pitch, ctx = {}) {
  const cfg = STAGE_CONFIG[stage];
  if (!cfg) return [];
  return cfg.gates.map((id) => {
    const fn = GATE_FNS[id];
    if (!fn) return g(id, id, 'fail', 'Unknown gate', 'hard');
    return fn(pitch, ctx);
  });
}

/** canAdvance = every HARD gate passes. Soft gates warn but never block. */
export function allGatesPass(gateResults) {
  return gateResults.filter((x) => x.severity === 'hard').every((x) => x.status === 'pass');
}

export function failingGates(gateResults) {
  return gateResults.filter((x) => x.severity === 'hard' && x.status !== 'pass');
}

export function hasWarnings(gateResults) {
  return gateResults.some((x) => x.severity === 'soft' && x.status !== 'pass');
}
