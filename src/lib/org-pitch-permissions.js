/**
 * Pitch pipeline permission map — a leaf module with no imports, extracted
 * from org-pitches.js to break the org-pitches <-> org-pitch-api-helpers
 * dependency cycle (both need hasPitchPermission). org-pitches re-exports
 * these names, so existing consumers are unaffected.
 */

export const PITCH_PERMISSIONS = {
  'pitch.submit': ['analyst', 'portfolio_manager', 'executive'],
  'pitch.approve_research': ['portfolio_manager', 'executive'],
  'pitch.review_pm': ['portfolio_manager', 'executive'],
  'pitch.schedule_committee': ['executive'],
  'pitch.vote': ['executive', 'portfolio_manager'],
  'pitch.final_decision': ['executive'],
  'pitch.assign_monitor': ['portfolio_manager', 'executive'],
  'pitch.withdraw': ['analyst'],
};

export function hasPitchPermission(member, key) {
  if (!member) return false;
  const roles = PITCH_PERMISSIONS[key];
  if (!roles) return false;
  return roles.includes(member.role);
}
