/**
 * Org permission configuration — REAL shared config, not mock data.
 * The tier table and effective-permission math used by server-side gates
 * (`withApiGuard` routes, org-permissions-server) and by client gating.
 * Moved out of orgMockData.js so "mock" means mock.
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
  } else if (tier.permissions && member.sub_role) {
    basePerms = [...(tier.permissions[member.sub_role] || [])];
  }

  const all = new Set([...basePerms, ...overridePerms]);
  return [...all];
}

export function canFlagPositions(member, overridePerms = []) {
  return getMemberPermissions(member, overridePerms).includes('flag_positions');
}
