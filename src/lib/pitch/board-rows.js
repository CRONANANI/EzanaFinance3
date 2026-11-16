/**
 * One pitch as the Pitch Pipeline page draws it: the gates of its current
 * stage, what the viewer may do, and what the viewer has already done.
 *
 * Pure. The server loader builds its rows here from database rows, and the
 * sample bundle builds its rows here from sample rows, so sample content
 * obeys the same rules as a real council.
 */
import { isBlindOpen, sealGates } from './ballot-privacy.js';
import { evaluateGates } from './gates.js';
import { STAGE_CONFIG } from './stage-config.js';
import { stageLabel } from './stages.js';
import {
  canAdvanceStage,
  canCrossDeskReview,
  canEditThesis,
  canExit,
  canOverrideStage,
  canRecordOutcome,
  canReject,
  canReviewFalsification,
  canSignOff,
  nextOwnerLabel,
  reviewDueAt,
} from './rules.js';

/**
 * What the gate engine says about one pitch, for this viewer: the gates of
 * its CURRENT stage only, exactly as POST .../advance will check them, and
 * which moves the viewer's role and tier allow. Sealed while the pitch's
 * blind vote is open.
 */
export function gateSummaryFor(pitch, ctx, actor) {
  const cfg = STAGE_CONFIG[pitch.stage];
  if (!cfg || !ctx) {
    return {
      gates: [],
      passed: 0,
      total: 0,
      all_pass: false,
      next_stage: null,
      next_stage_label: null,
      can_advance: false,
      can_override: false,
    };
  }
  const raw = evaluateGates(pitch.stage, pitch, ctx);
  const gates = ctx.ballotsSealed ? sealGates(raw) : raw;
  const hardFail = gates.filter((g) => g.severity === 'hard' && g.status !== 'pass').length;
  return {
    gates,
    passed: gates.filter((g) => g.status === 'pass').length,
    total: gates.length,
    all_pass: hardFail === 0,
    has_warnings: gates.some((g) => g.severity === 'soft' && g.status !== 'pass'),
    next_stage: cfg.next || null,
    next_stage_label: cfg.next ? stageLabel(cfg.next) : null,
    can_advance: Boolean(cfg.next) && canAdvanceStage(pitch.stage, actor),
    can_override: Boolean(cfg.next) && canOverrideStage(pitch.stage, actor),
  };
}

/**
 * What this viewer has and has not done on a pitch. Only the viewer's own
 * actions and counts: never another member's ballot.
 */
export function viewerStateFor(pitch, ctx, actor) {
  const signoffs = ctx?.signoffs || [];
  const cross = ctx?.crossDeskApprovals || [];
  const models = ctx?.models || [];
  const required = ctx?.requiredModels || [];
  return {
    is_author: pitch.analyst_member_id === actor.id,
    can_edit_thesis: canEditThesis(actor, pitch),
    can_reject: canReject(actor, pitch),
    can_exit: canExit(actor, pitch),
    can_record_outcome: canRecordOutcome(actor, pitch),
    can_review_falsification: canReviewFalsification(actor, pitch),
    can_sign_off: canSignOff(actor) && pitch.analyst_member_id !== actor.id,
    signed_off: signoffs.some((s) => s.member_id === actor.id),
    can_cross_desk: canCrossDeskReview(actor, pitch),
    cross_desk_decided: cross.some((a) => a.reviewer_member_id === actor.id),
    models_to_review: models.filter(
      (m) => m.file_url && !m.reviewed_at && (!required.length || required.includes(m.model_type)),
    ).length,
    ballot_cast: (ctx?.viewerVotes || []).some((v) => v.voter_member_id === actor.id),
  };
}

/**
 * The board row for one pitch.
 * @param {object} pitch an enriched pitch row (tally already removed if sealed)
 * @param {object|null} ctx its gate context (null for archived pitches)
 * @param {object} actor the viewer: { id, role, tier, team_id }
 * @param {{ meeting?: object|null, eligibleCount?: number, hindsight?: object|null }} extra
 */
export function boardRow(
  pitch,
  ctx,
  actor,
  { meeting = null, eligibleCount = 0, hindsight = null } = {},
) {
  const sealed = isBlindOpen(meeting);
  const received = ctx?.votesCast ?? 0;
  const quorumNeeded = ctx?.quorumNeeded ?? 0;
  return {
    ...pitch,
    gate: gateSummaryFor(pitch, ctx, actor),
    next_owner: nextOwnerLabel(pitch.stage),
    held: ctx ? Boolean(ctx.positionExists) : null,
    hindsight,
    review_due_at: reviewDueAt(pitch),
    /* Participation only. No tally, and nothing about who voted. */
    ballot:
      pitch.stage === 'ic_vote' && meeting
        ? {
            sealed,
            received,
            eligible: eligibleCount,
            quorum_needed: quorumNeeded,
            quorum_met: received > 0 && received >= quorumNeeded,
            closed: meeting.status === 'closed',
          }
        : null,
    viewer_state: viewerStateFor(pitch, ctx, actor),
  };
}
