/**
 * Gate engine — pure functions. Each gate takes (pitch, ctx) and returns
 *   { id, label, status: 'pass'|'partial'|'fail', detail, action }
 * where `action` deep-links to the tab that fixes it (e.g. { tab: 'deliverables' }).
 *
 * `ctx` is assembled server-side from the DB by the advance endpoint and the
 * gate-panel loader — never trust the client. Every gate is honest-empty: with
 * no data it fails with a specific, actionable detail, never a fabricated pass.
 */

import { STAGE_CONFIG } from './stage-config';

const pass = (id, label, detail, action) => ({ id, label, status: 'pass', detail, action });
const partial = (id, label, detail, action) => ({ id, label, status: 'partial', detail, action });
const fail = (id, label, detail, action) => ({ id, label, status: 'fail', detail, action });

/** A minimal, defensible thesis before a pitch leaves 'idea'. */
function thesisMin(pitch) {
  const has = (v) => typeof v === 'string' && v.trim().length > 0;
  const missing = [];
  if (!has(pitch.thesis_short)) missing.push('one-liner');
  if (!has(pitch.thesis_full)) missing.push('full thesis');
  if (pitch.conviction_level == null) missing.push('conviction');
  if (!has(pitch.falsification)) missing.push('falsification');
  if (missing.length === 0)
    return pass('thesis_min', 'Thesis', 'Thesis, conviction & falsification set', {
      tab: 'thesis',
    });
  return fail('thesis_min', 'Thesis', `Missing: ${missing.join(', ')}`, { tab: 'thesis' });
}

/** Screening sign-offs: N senior sign-offs incl. ≥1 in-desk. */
function screeningSignoffs(pitch, ctx) {
  const need = ctx.deskConfig?.min_senior_signoffs ?? 3;
  const signoffs = ctx.signoffs || [];
  const inDesk = signoffs.filter((s) => s.in_desk).length;
  const total = signoffs.length;
  const label = 'Screening sign-offs';
  const action = { tab: 'signoff' };
  if (total >= need && inDesk >= 1)
    return pass('screening_signoffs', label, `${total} of ${need} · ${inDesk} in-desk`, action);
  if (total >= need && inDesk < 1)
    return partial('screening_signoffs', label, `${total} of ${need} but needs ≥1 in-desk`, action);
  return fail(
    'screening_signoffs',
    label,
    `${total} of ${need}${inDesk < 1 ? ' · needs ≥1 in-desk' : ''}`,
    action,
  );
}

/** The desk-meeting record must exist with an 'advance' decision. */
function deskMeeting(pitch, ctx) {
  const m = ctx.deskMeeting || null;
  const label = 'Desk meeting';
  const action = { tab: 'deep_dive' };
  if (!m || !m.held_at) return fail('desk_meeting', label, 'Not held', action);
  if (m.decision !== 'advance')
    return fail('desk_meeting', label, `Recorded: ${m.decision || 'no decision'}`, action);
  return pass('desk_meeting', label, 'Held · advance', action);
}

/** The 3-statement model must be marked complete. */
function modelComplete(pitch, ctx) {
  const models = ctx.models || [];
  const three = models.find((x) => x.kind === 'three_statement');
  const label = 'Model';
  const action = { tab: 'supporting_data' };
  if (three?.complete) return pass('model_complete', label, '3-statement complete', action);
  return fail('model_complete', label, 'Missing: 3-statement', action);
}

/** Required deliverables for IC. */
function deliverablesRequired(pitch, ctx) {
  const req = ctx.requiredDeliverables ?? 0;
  const have = ctx.completedRequiredDeliverables ?? 0;
  const label = 'Deliverables';
  const action = { tab: 'deliverables' };
  if (req === 0) return pass('deliverables_required', label, 'None required', action);
  if (have >= req)
    return pass('deliverables_required', label, `${have} of ${req} required`, action);
  return fail('deliverables_required', label, `${have} of ${req} required`, action);
}

/**
 * Cross-desk majority — approvals from OTHER desks. The pitching desk's own PM
 * cannot count. An objection blocks (it must carry a reason, enforced by the DB).
 */
function crossDeskMajority(pitch, ctx) {
  const need = ctx.crossDeskNeeded ?? 0;
  const approvals = (ctx.crossDeskApprovals || []).filter(
    (a) => a.reviewer_team_id && a.reviewer_team_id !== pitch.team_id,
  );
  const approved = approvals.filter((a) => a.decision === 'approve').length;
  const objections = approvals.filter((a) => a.decision === 'object').length;
  const label = 'Cross-desk review';
  const action = { tab: 'cross_desk' };
  const detail = `${approved} of ${need} needed · ${approved} approved · ${objections} objection${objections === 1 ? '' : 's'}`;
  if (objections > 0) return fail('cross_desk_majority', label, detail, action);
  if (need > 0 && approved >= need) return pass('cross_desk_majority', label, detail, action);
  return fail('cross_desk_majority', label, detail, action);
}

/** No unresolved challenges may reach the IC. */
function noOpenChallenges(pitch, ctx) {
  const open = ctx.openChallenges || [];
  const label = 'Open challenges';
  const action = { tab: 'discussion' };
  if (open.length === 0) return pass('no_open_challenges', label, 'None open', action);
  const who = open[0]?.author_name ? ` (${open[0].author_name})` : '';
  return fail('no_open_challenges', label, `${open.length} open${who}`, action);
}

function icMeetingScheduled(pitch, ctx) {
  const label = 'IC meeting';
  const action = { tab: 'vote' };
  if (pitch.ic_meeting_id || ctx.icMeeting)
    return pass('ic_meeting_scheduled', label, 'Scheduled', action);
  return fail('ic_meeting_scheduled', label, 'Not scheduled', action);
}

function icQuorum(pitch, ctx) {
  const cast = ctx.votesCast ?? 0;
  const quorum = ctx.quorumNeeded ?? 0;
  const label = 'Quorum';
  const action = { tab: 'vote' };
  if (cast >= quorum) return pass('ic_quorum', label, `${cast} of ${quorum} voted`, action);
  return fail('ic_quorum', label, `${cast} of ${quorum} voted`, action);
}

function icMajority(pitch, ctx) {
  const forVotes = ctx.votesFor ?? 0;
  const cast = ctx.votesCast ?? 0;
  const label = 'IC majority';
  const action = { tab: 'vote' };
  const needSuper = ctx.threshold === 'supermajority';
  const bar = needSuper ? Math.ceil(cast * (2 / 3)) : Math.floor(cast / 2) + 1;
  if (cast > 0 && forVotes >= bar)
    return pass('ic_majority', label, `${forVotes} of ${cast} for`, action);
  return fail('ic_majority', label, `${forVotes} of ${cast} for · need ${bar}`, action);
}

export const GATES = {
  thesis_min: thesisMin,
  screening_signoffs: screeningSignoffs,
  desk_meeting: deskMeeting,
  model_complete: modelComplete,
  deliverables_required: deliverablesRequired,
  cross_desk_majority: crossDeskMajority,
  no_open_challenges: noOpenChallenges,
  ic_meeting_scheduled: icMeetingScheduled,
  ic_quorum: icQuorum,
  ic_majority: icMajority,
};

/**
 * Evaluate every gate configured for `stage`. Returns the array of gate
 * results (the gate_snapshot). Pure — all inputs come from `ctx`.
 */
export function evaluateGates(stage, pitch, ctx = {}) {
  const cfg = STAGE_CONFIG[stage];
  if (!cfg) return [];
  return cfg.gates.map((id) => {
    const fn = GATES[id];
    if (!fn) return fail(id, id, 'Unknown gate', null);
    return fn(pitch, ctx);
  });
}

/** True only when every gate for the stage passes (partial counts as not-passing). */
export function allGatesPass(gateResults) {
  return gateResults.length === 0 || gateResults.every((g) => g.status === 'pass');
}

export function failingGates(gateResults) {
  return gateResults.filter((g) => g.status !== 'pass');
}
