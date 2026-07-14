/**
 * STAGE_CONFIG — per-stage advancement rules: the forward target, the gates
 * that must pass, which roles may advance, and which roles may OVERRIDE a
 * failing soft gate.
 *
 * ic_vote.overrideRoles is [] — the IC vote is never overridable, not even by
 * the CIO/executive. That is the whole point of a vote.
 */

export const STAGE_CONFIG = {
  idea: {
    next: 'screening',
    advanceRoles: ['analyst', 'portfolio_manager', 'executive'],
    gates: ['thesis_min'],
    overrideRoles: ['executive'],
  },
  screening: {
    next: 'deep_dive',
    advanceRoles: ['portfolio_manager', 'executive'],
    gates: ['screening_signoffs'],
    overrideRoles: ['executive'],
  },
  deep_dive: {
    next: 'cross_desk_review',
    advanceRoles: ['portfolio_manager', 'executive'],
    gates: ['desk_meeting', 'model_complete', 'deliverables_required'],
    overrideRoles: ['executive'],
  },
  cross_desk_review: {
    next: 'pitch_scheduled',
    advanceRoles: ['portfolio_manager', 'executive'],
    gates: ['cross_desk_majority', 'no_open_challenges'],
    overrideRoles: ['executive'],
  },
  pitch_scheduled: {
    next: 'ic_vote',
    advanceRoles: ['portfolio_manager', 'executive'],
    gates: ['ic_meeting_scheduled'],
    overrideRoles: ['executive'],
  },
  ic_vote: {
    next: 'approved',
    advanceRoles: ['executive'],
    gates: ['ic_quorum', 'ic_majority'],
    overrideRoles: [], // NEVER overridable — including the CIO.
  },
  approved: {
    next: 'in_portfolio',
    advanceRoles: ['portfolio_manager', 'executive'],
    gates: [],
    overrideRoles: ['executive'],
  },
  in_portfolio: {
    next: 'exited',
    advanceRoles: ['portfolio_manager', 'executive'],
    gates: [],
    overrideRoles: ['executive'],
  },
};

export function stageConfig(stage) {
  return STAGE_CONFIG[stage] || null;
}

/** Can `role` advance a pitch out of `stage`? */
export function canAdvanceStage(stage, role) {
  const cfg = STAGE_CONFIG[stage];
  return !!cfg && cfg.advanceRoles.includes(role);
}

/** Can `role` override a failing (soft) gate at `stage`? ic_vote → never. */
export function canOverrideStage(stage, role) {
  const cfg = STAGE_CONFIG[stage];
  return !!cfg && cfg.overrideRoles.includes(role);
}
