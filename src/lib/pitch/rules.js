/**
 * Who may do what on a pitch, in one place for the page.
 *
 * These are the same checks the pitch routes make before they write. The
 * server loader calls them to tell the page which controls to offer, and the
 * sample bundle calls them so sample content obeys the real rules. The routes
 * stay the authority: each one checks again on every request.
 *
 * Pure: no database, no React.
 */
import { roleForTier } from '../org-hierarchy.js';
import { STAGE_CONFIG, canAdvanceStage, canOverrideStage } from './stage-config.js';
import { isThesisFrozen } from './stages.js';

export const MANAGER_ROLES = ['executive', 'portfolio_manager'];
const SIGNOFF_TIERS = new Set([
  'senior_analyst',
  'portfolio_manager',
  'senior_portfolio_manager',
  'vice_president',
  'executive',
  'president',
]);
export const REVIEW_DAYS = 90;
export const AGING_DAYS = 30;
export const OVERRIDE_MIN_CHARS = 20;
export const OBJECTION_MIN_CHARS = 10;

export const isManager = (m) => Boolean(m && MANAGER_ROLES.includes(m.role));
/** Committee voters: executives and portfolio managers (the vote route's rule). */
export const isVoter = isManager;

/** Screening sign-off: senior analyst tier and above (the sign-off route's rule). */
export function canSignOff(member) {
  if (!member) return false;
  if (isManager(member)) return true;
  return SIGNOFF_TIERS.has(member.tier);
}

/** A portfolio manager by tier or role (the cross-desk route's rule). */
export function isDeskPm(member) {
  if (!member) return false;
  const coarse = (member.tier ? roleForTier(member.tier) : null) || member.role;
  return coarse === 'portfolio_manager';
}

/** Another desk's portfolio manager may record a cross-desk decision. */
export function canCrossDeskReview(member, pitch) {
  return Boolean(member && member.team_id && member.team_id !== pitch.team_id && isDeskPm(member));
}

/**
 * The author, or any manager, may edit the thesis until it freezes at
 * Cross-Desk Review (the edit route's rule).
 */
export function canEditThesis(member, pitch) {
  if (!member || !pitch || pitch.status !== 'active') return false;
  if (isThesisFrozen(pitch.stage)) return false;
  if (!['idea', 'screening', 'deep_dive'].includes(pitch.stage)) return false;
  return pitch.analyst_member_id === member.id || member.role !== 'analyst';
}

/**
 * Reject: a manager who is also allowed to move the pitch out of its current
 * stage. A held pitch is exited, not rejected.
 */
export function canReject(member, pitch) {
  if (!member || !pitch || pitch.status !== 'active') return false;
  if (!STAGE_CONFIG[pitch.stage] || pitch.stage === 'in_portfolio') return false;
  return isManager(member) && canAdvanceStage(pitch.stage, member);
}

/** Mark exited: a manager; a portfolio manager only on their own desk's pitch. */
export function canExit(member, pitch) {
  if (!member || !pitch || pitch.stage !== 'in_portfolio') return false;
  if (!isManager(member)) return false;
  if (member.role === 'portfolio_manager' && member.team_id && pitch.team_id !== member.team_id) {
    return false;
  }
  return true;
}

/** Record an outcome by hand at the committee vote: executives only. */
export function canRecordOutcome(member, pitch) {
  return Boolean(
    member &&
    pitch &&
    member.role === 'executive' &&
    pitch.stage === 'ic_vote' &&
    pitch.status === 'active',
  );
}

/**
 * Answer the 90-day falsification review on a held pitch. The row can only be
 * updated by its author or a manager, so only they are offered it.
 */
export function canReviewFalsification(member, pitch) {
  if (!member || !pitch || pitch.stage !== 'in_portfolio') return false;
  return pitch.analyst_member_id === member.id || isManager(member);
}

/** Who moves a pitch on from each stage, in words. */
const ADVANCER_WORDS = {
  auto: 'Any PM or executive',
  desk_senior_pm: 'Senior PM or executive',
  vp_ops: 'Vice president or president',
  vp_portfolio: 'Vice president or president',
  cio: 'President',
  president: 'President',
  trading_desk: 'Any PM or executive',
};
export function nextOwnerLabel(stage) {
  if (stage === 'ic_vote') return 'Investment committee';
  if (stage === 'in_portfolio') return 'Desk PM or executive';
  const cfg = STAGE_CONFIG[stage];
  return cfg ? ADVANCER_WORDS[cfg.advancedBy] || null : null;
}

/** When the 90-day thesis review of a held pitch falls due. */
export function reviewDueAt(pitch) {
  if (!pitch || pitch.stage !== 'in_portfolio') return null;
  const anchor = pitch.last_reaffirmed_at || pitch.stage_entered_at || null;
  if (!anchor) return null;
  const t = new Date(anchor).getTime();
  if (!Number.isFinite(t)) return null;
  return new Date(t + REVIEW_DAYS * 86400000).toISOString();
}

export { canAdvanceStage, canOverrideStage };
