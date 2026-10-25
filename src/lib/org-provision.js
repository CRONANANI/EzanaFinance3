/**
 * Applicant provisioning authorization (QA ORG-3). Pure: decides which role
 * and tier a manager may give a provisioned applicant.
 *   - Only an executive can provision an executive.
 *   - A tier, when given, must be a real tier the provisioner may assign
 *     (strictly below their own rank; the President may assign any).
 */
import { isValidTier, assignableTiers } from '@/lib/org-hierarchy';

export const PROVISION_ROLES = ['executive', 'portfolio_manager', 'analyst'];

/**
 * @param {object} provisioner the caller's org_members row (role, tier)
 * @param {object} body the request body ({ role?, tier? })
 * @returns {{ ok: true, role: string, tier: string|null } | { ok: false, status: number, error: string }}
 */
export function resolveProvisionRoleTier(provisioner, body) {
  const role = PROVISION_ROLES.includes(body?.role) ? body.role : 'analyst';
  if (role === 'executive' && provisioner?.role !== 'executive') {
    return { ok: false, status: 403, error: 'Only an executive can provision an executive' };
  }
  let tier = null;
  if (body?.tier != null && body.tier !== '') {
    tier = String(body.tier);
    const allowed = new Set(assignableTiers(provisioner));
    if (!isValidTier(tier) || !allowed.has(tier)) {
      return { ok: false, status: 403, error: 'You cannot assign that tier' };
    }
  }
  return { ok: true, role, tier };
}
