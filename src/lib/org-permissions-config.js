/**
 * Org permission configuration — REAL shared config, not mock data.
 * The tier table and effective-permission math used by server-side gates
 * (`withApiGuard` routes, org-permissions-server) and by client gating.
 * (Formerly lived in the now-deleted orgMockData.js.)
 */

export const PERMISSION_TIERS = {
  executive: {
    label: 'Executive',
    sub_roles: ['President', 'VP of Research', 'VP of Operations', 'Treasurer', 'Secretary'],
    permissions: [
      'manage_members',
      'manage_events',
      'manage_permissions',
      'view_all_teams',
      'create_events',
      'upload_deliverables',
      'manage_tasks',
      'view_analytics',
      'manage_org_settings',
      'flag_positions',
      'grant_permissions',
      'send_to_team',
      'manage_subordinate_notifications',
    ],
  },
  portfolio_manager: {
    label: 'Portfolio Manager',
    sub_roles: ['Senior PM', 'PM', 'Junior PM'],
    permissions: {
      'Senior PM': [
        'manage_team_tasks',
        'upload_deliverables',
        'create_events',
        'view_team_analytics',
        'manage_analysts',
        'approve_deliverables',
        'flag_positions',
        'grant_permissions',
        'send_to_team',
        'manage_subordinate_notifications',
      ],
      PM: [
        'manage_team_tasks',
        'upload_deliverables',
        'view_team_analytics',
        'manage_analysts',
        'flag_positions',
        'grant_permissions',
        'send_to_team',
        'manage_subordinate_notifications',
      ],
      'Junior PM': [
        'manage_team_tasks',
        'upload_deliverables',
        'view_team_analytics',
        'flag_positions',
        'send_to_team',
      ],
    },
  },
  analyst: {
    label: 'Analyst',
    sub_roles: ['Senior Analyst', 'Analyst', 'Junior Analyst', 'Quantitative Analyst'],
    permissions: {
      'Senior Analyst': [
        'upload_deliverables',
        'view_team_analytics',
        'create_posts',
        'mentor_juniors',
        'flag_positions',
        'send_to_team',
      ],
      Analyst: ['upload_deliverables', 'view_team_analytics', 'create_posts', 'send_to_team'],
      'Junior Analyst': ['upload_deliverables', 'create_posts'],
      'Quantitative Analyst': [
        'upload_deliverables',
        'view_team_analytics',
        'create_posts',
        'run_models',
        'send_to_team',
      ],
    },
  },
};

/**
 * Default PM / analyst sub-role, derived from the fine-grained org-chart tier
 * (src/lib/org-hierarchy.js) and falling back to the middle sub-role of the
 * coarse role. Executives have flat permissions and a free-text title, so they
 * get null.
 */
const DEFAULT_SUB_ROLE_BY_TIER = {
  senior_portfolio_manager: 'Senior PM',
  portfolio_manager: 'PM',
  junior_portfolio_manager: 'Junior PM',
  senior_analyst: 'Senior Analyst',
  analyst: 'Analyst',
  junior_analyst: 'Junior Analyst',
  quant_analyst: 'Quantitative Analyst',
};
const DEFAULT_SUB_ROLE_BY_ROLE = { portfolio_manager: 'PM', analyst: 'Analyst' };

export function defaultSubRole(role, tier = null) {
  const def = PERMISSION_TIERS[role];
  if (!def || Array.isArray(def.permissions)) return null;
  const byTier = DEFAULT_SUB_ROLE_BY_TIER[tier];
  if (byTier && def.sub_roles.includes(byTier)) return byTier;
  return DEFAULT_SUB_ROLE_BY_ROLE[role] || null;
}

/**
 * Canonical sub_role for a write.
 *  - executive: optional free-text title, trimmed, max 80 chars.
 *  - portfolio_manager / analyst: must be one of PERMISSION_TIERS[role].sub_roles
 *    (case-insensitive); empty means "use the tier default".
 * @returns {{ ok: true, value: string|null } | { ok: false, error: string }}
 */
export function normalizeSubRole(role, subRole, tier = null) {
  const def = PERMISSION_TIERS[role];
  if (!def) return { ok: false, error: 'Invalid role' };
  const raw = typeof subRole === 'string' ? subRole.trim() : '';
  if (Array.isArray(def.permissions)) {
    if (raw.length > 80) return { ok: false, error: 'Sub-role must be 80 characters or fewer' };
    return { ok: true, value: raw || null };
  }
  if (!raw) return { ok: true, value: defaultSubRole(role, tier) };
  const match = def.sub_roles.find((s) => s.toLowerCase() === raw.toLowerCase());
  if (!match) {
    return { ok: false, error: `Sub-role must be one of: ${def.sub_roles.join(', ')}` };
  }
  return { ok: true, value: match };
}

/**
 * Who a supervisor can manage, using real `org_members` rows (UUID ids):
 * exec → PMs; PM → analysts on their team. Excludes the supervisor themselves.
 * @param {{ id: string, role: string, team_id: string | null } | null} supervisor
 * @param {Array<{ id: string, role: string, team_id: string | null }>} orgPeers
 */
export function getManageableOrgPeers(supervisor, orgPeers) {
  if (!supervisor || !orgPeers?.length) return [];
  if (supervisor.role === 'executive') {
    return orgPeers.filter((m) => m.role === 'portfolio_manager' && m.id !== supervisor.id);
  }
  if (supervisor.role === 'portfolio_manager') {
    return orgPeers.filter(
      (m) => m.role === 'analyst' && m.team_id === supervisor.team_id && m.id !== supervisor.id,
    );
  }
  return [];
}

/**
 * Effective permissions: PERMISSION_TIERS defaults plus optional DB overrides
 * (org_member_permissions).
 */
export function getMemberPermissions(member, overridePerms = []) {
  if (!member) return [];
  const tier = PERMISSION_TIERS[member.role];
  if (!tier) return [];

  let basePerms = [];
  if (Array.isArray(tier.permissions)) {
    basePerms = [...tier.permissions];
  } else if (tier.permissions) {
    // Unknown or missing sub_role falls back to the tier default so a PM or
    // analyst is never left with zero permissions.
    const sub = tier.permissions[member.sub_role]
      ? member.sub_role
      : defaultSubRole(member.role, member.tier);
    basePerms = [...(tier.permissions[sub] || [])];
  }

  const all = new Set([...basePerms, ...overridePerms]);
  return [...all];
}

export function canFlagPositions(member, overridePerms = []) {
  return getMemberPermissions(member, overridePerms).includes('flag_positions');
}
