/**
 * Pitch stages — the single ordered ladder + labels/helpers.
 *
 * Replaces the old STAGE_TRANSITIONS list in org-pitch-state-machine.js. Pure
 * data + pure helpers, no DB, no UI.
 */

export const STAGES = [
  'idea',
  'screening',
  'deep_dive',
  'cross_desk_review',
  'pitch_scheduled',
  'ic_vote',
  'approved',
  'in_portfolio',
  'exited',
  'rejected',
];

export const STAGE_LABELS = {
  idea: 'Idea',
  screening: 'Screening',
  deep_dive: 'Deep Dive',
  cross_desk_review: 'Cross-Desk Review',
  pitch_scheduled: 'Pitch Scheduled',
  ic_vote: 'IC Vote',
  approved: 'Approved',
  in_portfolio: 'In Portfolio',
  exited: 'Exited',
  rejected: 'Rejected',
};

/** The forward advancement path (terminal 'rejected' is reached via reject, not advance). */
export const FORWARD_ORDER = [
  'idea',
  'screening',
  'deep_dive',
  'cross_desk_review',
  'pitch_scheduled',
  'ic_vote',
  'approved',
  'in_portfolio',
  'exited',
];

export const TERMINAL_STAGES = ['exited', 'rejected'];

/** The stage at (and after) which the thesis is frozen. */
export const THESIS_FREEZE_STAGE = 'cross_desk_review';

export function stageLabel(stage) {
  return STAGE_LABELS[stage] || stage || '';
}

export function stageIndex(stage) {
  return FORWARD_ORDER.indexOf(stage);
}

/** The next forward stage, or null at the end / for terminal stages. */
export function nextStage(stage) {
  const i = FORWARD_ORDER.indexOf(stage);
  if (i < 0 || i >= FORWARD_ORDER.length - 1) return null;
  return FORWARD_ORDER[i + 1];
}

/**
 * The thesis freezes at cross_desk_review — cross-desk PMs and the IC must vote
 * on a thesis that cannot change underneath them. Enforced server-side.
 */
export function isThesisFrozen(stage) {
  const froze = FORWARD_ORDER.indexOf(THESIS_FREEZE_STAGE);
  const cur = FORWARD_ORDER.indexOf(stage);
  if (cur < 0 || froze < 0) return false;
  return cur >= froze;
}

export function isTerminal(stage) {
  return TERMINAL_STAGES.includes(stage);
}
