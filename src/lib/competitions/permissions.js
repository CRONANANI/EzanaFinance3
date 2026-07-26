/**
 * Permission helpers for pitch competitions. The host org's executives and
 * portfolio managers manage a competition; everyone else (analysts, visiting
 * orgs) is read-only in Phase 1. Mirrors the org app's role-gating convention —
 * the RLS policies enforce this at the DB, and these helpers enforce it again in
 * the API/route layer (defense in depth).
 */

export const COMPETITION_MANAGER_ROLES = ['executive', 'portfolio_manager'];

export const COMPETITION_STATUSES = [
  'draft',
  'open',
  'in_progress',
  'judging',
  'complete',
  'archived',
];

/**
 * True when `member` may manage `competition` — an active executive/PM of the
 * competition's HOST org. When `competition` is omitted, checks role only (for
 * the create path, where the host org is the member's own org).
 */
export function canManageCompetition(member, competition) {
  if (!member || member.is_active === false) return false;
  if (!COMPETITION_MANAGER_ROLES.includes(member.role)) return false;
  if (competition && competition.host_org_id && competition.host_org_id !== member.org_id) {
    return false;
  }
  return true;
}

/** URL-safe slug from a competition name (a short suffix is added by the caller
 *  to guarantee uniqueness against the slug UNIQUE constraint). */
export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}
