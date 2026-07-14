/**
 * Stock pitch stage transition rules (server-enforced).
 *
 * STAGE NAMING = option (a): internal keys are authoritative here; the design
 * labels (Idea / Screening / Deep Dive / Model Complete / Pitch Scheduled /
 * IC Vote / Approved / In Portfolio / Exited) are mapped in the UI ONLY.
 */

// Stage labels + the active ladder now come from the new stage machine
// (src/lib/pitch/stages.js) so there is ONE source of truth after the stage
// rename migration. Re-exported here to preserve this module's import surface.
import { STAGE_LABELS, FORWARD_ORDER, stageLabel } from '@/lib/pitch/stages';

export const DESIGN_STAGE_LABELS = STAGE_LABELS;

// Active kanban stages: idea → approved (in_portfolio/exited/rejected are the
// tracker + archive lanes, never kanban columns).
export const ACTIVE_STAGES = FORWARD_ORDER.filter((s) => s !== 'in_portfolio' && s !== 'exited');

export function designStageLabel(stage) {
  return stageLabel(stage);
}

// Stage names match the DB after 20260728000000_pitch_stage_machine.sql:
//   idea → screening → deep_dive → cross_desk_review → pitch_scheduled →
//   ic_vote → approved → in_portfolio → exited (+ terminal rejected).
// Remap from the old vocabulary (reported in the commit):
//   research_approved→screening; research_in_progress & pm_review→deep_dive
//   (their intra-stage hops collapse away); committee_scheduled→pitch_scheduled;
//   committee_vote→ic_vote; decision→approved. The old pm_review→committee_scheduled
//   model+memo/meeting gate splits across the new cross_desk_review step.
export const STAGE_TRANSITIONS = [
  {
    from: 'idea',
    to: 'screening',
    permission: 'pitch.approve_research',
    roles: ['portfolio_manager', 'executive'],
  },
  {
    from: 'idea',
    to: 'rejected',
    permission: 'pitch.approve_research',
    roles: ['portfolio_manager', 'executive'],
    requireNote: true,
  },
  {
    from: 'screening',
    to: 'deep_dive',
    permission: 'pitch.submit',
    roles: ['analyst', 'portfolio_manager', 'executive'],
    auto: true,
  },
  {
    from: 'deep_dive',
    to: 'cross_desk_review',
    permission: 'pitch.review_pm',
    roles: ['portfolio_manager', 'executive'],
    // Gate: cannot leave deep dive without an attached model AND memo.
    requireDeliverableKinds: ['model', 'memo'],
  },
  {
    from: 'cross_desk_review',
    to: 'pitch_scheduled',
    permission: 'pitch.review_pm',
    roles: ['portfolio_manager', 'executive'],
    requireMeetingAt: true,
  },
  {
    from: 'pitch_scheduled',
    to: 'ic_vote',
    permission: 'pitch.schedule_committee',
    roles: ['executive'],
  },
  {
    from: 'ic_vote',
    to: 'approved',
    permission: 'pitch.final_decision',
    roles: ['executive'],
    minVotes: 1,
  },
  // ── Post-approval lifecycle (2a additions) ──────────────────────────────
  {
    from: 'approved',
    to: 'in_portfolio',
    permission: 'pitch.assign_monitor',
    roles: ['portfolio_manager', 'executive'],
  },
  {
    from: 'in_portfolio',
    to: 'exited',
    permission: 'pitch.assign_monitor',
    roles: ['portfolio_manager', 'executive'],
    requireNote: true, // post-mortem / archive_reason
  },
];

export function canEditThesis(pitch) {
  return pitch.status === 'active' && ['idea', 'screening', 'deep_dive'].includes(pitch.stage);
}

export function findTransition(from, to) {
  return STAGE_TRANSITIONS.find((t) => t.from === from && t.to === to);
}

export function validateTransition(pitch, toStage, ctx) {
  const {
    viewer,
    deliverableCount = 0,
    deliverableKinds = [],
    note,
    committee_meeting_at,
    voteCount = 0,
  } = ctx;

  if (pitch.status !== 'active' && toStage !== 'rejected') {
    // in_portfolio/exited operate on accepted (non-active) pitches, allow them.
    const postApproval = ['in_portfolio', 'exited'].includes(toStage);
    if (!postApproval) {
      return { ok: false, error: 'Pitch is no longer active' };
    }
  }

  if (toStage === 'rejected') {
    if (!note?.trim()) return { ok: false, error: 'Rejection rationale required' };
    return { ok: true, terminalStatus: 'rejected' };
  }

  const rule = findTransition(pitch.stage, toStage);
  if (!rule) {
    return { ok: false, error: `Invalid transition: ${pitch.stage} → ${toStage}` };
  }

  if (!rule.roles.includes(viewer.role)) {
    return { ok: false, error: `Role ${viewer.role} cannot move pitch to ${toStage}` };
  }

  if (rule.requireNote && !note?.trim()) {
    return { ok: false, error: 'Note required for this transition' };
  }

  if (rule.requireMeetingAt && !committee_meeting_at) {
    return { ok: false, error: 'Committee meeting date required' };
  }

  if (rule.minDeliverables && deliverableCount < rule.minDeliverables) {
    return { ok: false, error: 'At least one deliverable required before PM review' };
  }

  if (rule.requireDeliverableKinds?.length) {
    const missing = rule.requireDeliverableKinds.filter((k) => !deliverableKinds.includes(k));
    if (missing.length) {
      return {
        ok: false,
        error: `Attach a ${missing.join(' + ')} before scheduling to the IC`,
        gate: 'model_memo',
      };
    }
  }

  if (rule.minVotes && voteCount < rule.minVotes) {
    return { ok: false, error: 'At least one vote required before closing' };
  }

  if (viewer.role === 'portfolio_manager' && viewer.team_id && pitch.team_id !== viewer.team_id) {
    return { ok: false, error: 'PM can only act on pitches in their team' };
  }

  return { ok: true };
}

/**
 * Cheap, side-effect-free gate probe used by the board so cards can show *why*
 * an advance is blocked without attempting a transition. Returns the next
 * forward transition and whether its gates are currently satisfied.
 */
export function nextForwardGate(pitch, { deliverableKinds = [], deliverableCount = 0 } = {}) {
  const forward = STAGE_TRANSITIONS.find(
    (t) => t.from === pitch.stage && !t.auto && t.to !== 'rejected',
  );
  if (!forward) return null;

  if (forward.requireDeliverableKinds?.length) {
    const missing = forward.requireDeliverableKinds.filter((k) => !deliverableKinds.includes(k));
    if (missing.length) {
      return { to: forward.to, blocked: true, reason: `Needs ${missing.join(' + ')}` };
    }
  }
  if (forward.minDeliverables && deliverableCount < forward.minDeliverables) {
    return { to: forward.to, blocked: true, reason: 'Needs a deliverable' };
  }
  if (forward.requireMeetingAt) {
    return { to: forward.to, blocked: false, reason: 'Set IC meeting date' };
  }
  return { to: forward.to, blocked: false, reason: null };
}
