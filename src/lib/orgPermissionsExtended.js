// src/lib/orgPermissionsExtended.js
//
// Layers a single new permission — `manage_positions` — on top of the existing
// PERMISSION_TIERS in orgMockData WITHOUT mutating that source file. Adding a
// position to a team's portfolio (manual entry, CSV upload, or brokerage sync)
// is gated behind this permission.
import { getMemberPermissions } from './orgMockData';

/**
 * manage_positions: allowed by default for executives and portfolio managers.
 * Analysts only get it via an explicit DB override (org_member_permissions).
 */
const ROLE_DEFAULTS_MANAGE_POSITIONS = new Set(['executive', 'portfolio_manager']);

export function canManagePositions(member, overridePerms = []) {
  if (!member) return false;
  if (overridePerms.includes('manage_positions')) return true;
  return ROLE_DEFAULTS_MANAGE_POSITIONS.has(member.role);
}

/**
 * Returns the full effective permission list with manage_positions appended
 * when applicable. Use this anywhere effectivePermissions is needed.
 */
export function getExtendedPermissions(member, overridePerms = []) {
  const base = getMemberPermissions(member, overridePerms);
  if (canManagePositions(member, overridePerms) && !base.includes('manage_positions')) {
    return [...base, 'manage_positions'];
  }
  return base;
}
