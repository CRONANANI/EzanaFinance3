/**
 * Team Permissions: the one set of rules the page, the change route and the
 * sample content share. Pure: no React, no fetch, no database.
 *
 * Who may change what (checked again on the server for every change, see
 * decideChange):
 *   - only members whose ROLE DEFAULTS include grant_permissions (executive,
 *     Senior PM, PM). A stored extra never makes someone a grantor.
 *   - only for an active member whose manager in the org chart is the viewer,
 *     in the same council, and never for themselves.
 *   - only the rights in ASSIGNABLE_PERMISSIONS.
 *   - a grant only for a right the grantor holds themselves (executives hold
 *     all eight), that is not already the member's role default, and that
 *     does something at the member's role.
 *   - a revoke of any stored extra on a direct report, whoever granted it.
 */
import { getMemberPermissions } from './org-permissions-config.js';
import { getExtendedPermissions } from './orgPermissionsExtended.js';

/* Kept in step with ASSIGNABLE_PERMISSIONS in org-permissions-server.js (the
   test asserts it). Order is the order on the page. */
export const RIGHTS = [
  {
    key: 'flag_positions',
    label: 'Flag positions',
    description: 'Raise a flag on a holding for the team to review.',
    usedIn: 'Trading Desk: Raise flag, the row menu and the Flag inbox.',
  },
  {
    key: 'manage_positions',
    label: 'Manage positions',
    description: 'Add holdings by hand, spreadsheet or brokerage link, and remove them.',
    usedIn: 'Trading Desk: Add position and Remove position.',
  },
  {
    key: 'upload_deliverables',
    label: 'Upload deliverables',
    description: 'Attach files to research notes and meetings.',
    usedIn: 'Research Library attachments. Meeting files also need a manager role.',
  },
  {
    key: 'view_team_analytics',
    label: 'View team analytics',
    description: 'See the attention map and scorecards for their own team.',
    usedIn: 'Fund Analytics, only together with a manager role.',
  },
  {
    key: 'view_analytics',
    label: 'View fund analytics',
    description: 'See fund data health, the council attention map and any scorecard.',
    usedIn: 'Command Center and Fund Analytics: data health, attention map, scorecards.',
  },
  {
    key: 'create_events',
    label: 'Create events',
    description: 'Schedule council meetings.',
    usedIn: 'Meetings: scheduling, only together with a manager role.',
  },
  {
    key: 'approve_deliverables',
    label: 'Approve deliverables',
    description: "Publish other members' research notes and review Sonar reports.",
    usedIn: 'Research Library publishing (with a manager role) and Sonar Research reviews.',
  },
  {
    key: 'send_to_team',
    label: 'Send to team',
    description: 'Send items to the team from research and market pages.',
    usedIn: 'Send to team on Watchlist, Market analysis, Company research and articles.',
  },
];

export const RIGHT_KEYS = RIGHTS.map((r) => r.key);
const LABELS = Object.fromEntries(RIGHTS.map((r) => [r.key, r.label]));
export const rightLabel = (key) => LABELS[key] || 'Unknown right';

/* Every role has it, so it is a line under the matrix, not a row. */
export const UNIVERSAL_RIGHT = 'upload_deliverables';
export const MATRIX_RIGHTS = RIGHTS.filter((r) => r.key !== UNIVERSAL_RIGHT);

/* Grants that open fund-wide data or the holdings book: confirmed first. */
export const CONFIRM_RIGHTS = new Set(['manage_positions', 'view_analytics']);

/* The server reads these two only together with a manager role (executive or
   portfolio manager), so for an analyst a grant would do nothing. */
const MANAGER_ONLY = new Set(['view_team_analytics', 'create_events']);
const MANAGER_ROLES = new Set(['executive', 'portfolio_manager']);

export const NA = 'N/A';

const SUB_ROLE_LABEL = {
  'Senior PM': 'Senior portfolio manager',
  PM: 'Portfolio manager',
  'Junior PM': 'Junior portfolio manager',
  'Senior Analyst': 'Senior analyst',
  Analyst: 'Analyst',
  'Junior Analyst': 'Junior analyst',
  'Quantitative Analyst': 'Quant analyst',
};
const ROLE_LABEL = {
  executive: 'Executive',
  portfolio_manager: 'Portfolio manager',
  analyst: 'Analyst',
};

/** A readable role: the title, else the sub-role, else the role. Never a raw key. */
export function roleLabel(m) {
  if (!m) return NA;
  const title = typeof m.title === 'string' ? m.title.trim() : '';
  if (title) return title;
  if (m.sub_role && SUB_ROLE_LABEL[m.sub_role]) return SUB_ROLE_LABEL[m.sub_role];
  return ROLE_LABEL[m.role] || 'Member';
}

/** Role defaults among the eight rights (manage positions comes with the
 *  executive and portfolio manager roles, as the holdings routes read it). */
export function roleDefaults(member) {
  if (!member) return [];
  const all = getExtendedPermissions(member, []);
  return RIGHT_KEYS.filter((k) => all.includes(k));
}

/** Can this member grant at all? Role defaults only, never a stored extra. */
export function isGrantor(member) {
  if (!member || member.is_active === false) return false;
  return getMemberPermissions(member, []).includes('grant_permissions');
}

/** Does the grantor hold `key` themselves? Executives hold all eight. */
export function grantorHolds(viewer, viewerExtras, key) {
  if (!viewer || !RIGHT_KEYS.includes(key)) return false;
  if (viewer.role === 'executive') return true;
  return getExtendedPermissions(viewer, viewerExtras || []).includes(key);
}

/** The rights this grantor may hand on (the seven matrix rights only). */
export function grantableRights(viewer, viewerExtras) {
  if (!isGrantor(viewer)) return [];
  return MATRIX_RIGHTS.map((r) => r.key).filter((k) => grantorHolds(viewer, viewerExtras, k));
}

export function needsManagerRole(member, key) {
  return MANAGER_ONLY.has(key) && !MANAGER_ROLES.has(member?.role);
}

/**
 * The one decision for a change. Every argument is what the server read
 * itself; the page's view of the matrix is never trusted.
 * @returns {{ ok: true } | { ok: false, status: number, error: string }}
 */
export function decideChange({ viewer, viewerExtras = [], target, key, action }) {
  const no = (status, error) => ({ ok: false, status, error });
  if (!viewer || viewer.is_active === false) return no(403, 'Only council members can do this.');
  if (action !== 'grant' && action !== 'revoke') return no(400, 'Choose grant or revoke.');
  if (!RIGHT_KEYS.includes(key)) return no(400, 'That right cannot be changed here.');
  if (!isGrantor(viewer)) return no(403, 'Your role cannot change permissions.');
  if (!target) return no(404, 'That member was not found.');
  if (target.id === viewer.id || (target.user_id && target.user_id === viewer.user_id)) {
    return no(403, 'You cannot change your own permissions.');
  }
  if (target.org_id !== viewer.org_id) return no(403, 'That member is not in your council.');
  if (target.reports_to !== viewer.id) {
    return no(403, 'You can change permissions only for people who report to you.');
  }
  if (target.is_active === false) return no(403, 'That member is not active.');
  if (action === 'revoke') return { ok: true };
  if (roleDefaults(target).includes(key)) {
    return no(400, `${rightLabel(key)} is already a role default for this member.`);
  }
  if (!grantorHolds(viewer, viewerExtras, key)) {
    return no(403, `You can grant only rights you hold. You do not hold ${rightLabel(key)}.`);
  }
  if (needsManagerRole(target, key)) {
    return no(400, `${rightLabel(key)} needs a manager role and would do nothing for this member.`);
  }
  return { ok: true };
}

/**
 * The state of one matrix cell.
 *   default        role default, locked
 *   extra          stored extra (a grantor can revoke it)
 *   grant          the grantor can give it
 *   needs_manager  would do nothing at the member's role
 *   cannot         the grantor does not hold it
 *   none           not granted (view-only viewers)
 */
export function cellState({ member, key, canGrant, grantable }) {
  if ((member.defaults || []).includes(key)) return 'default';
  if ((member.extras || []).some((e) => e.key === key)) return 'extra';
  if (!canGrant) return 'none';
  if (!grantable.includes(key)) return 'cannot';
  if (needsManagerRole(member, key)) return 'needs_manager';
  return 'grant';
}

export const CELL_TEXT = {
  default: 'Role default',
  extra: 'Granted extra',
  grant: 'Grant',
  needs_manager: 'Needs a manager role',
  cannot: 'Cannot grant',
  none: 'Not granted',
};
export const CELL_ICON = {
  default: 'bi-lock',
  extra: 'bi-check2-circle',
  grant: 'bi-plus-circle',
  needs_manager: 'bi-slash-circle',
  cannot: 'bi-dash-circle',
  none: 'bi-dash',
};

/**
 * Stored extras worth a second look, all read from data the page already has:
 *   covered    the right is now a role default, so the extra does nothing
 *   no_effect  the right needs a manager role the member does not have
 *   other      granted by someone other than the member's current manager
 */
export function reviewItems(reports, viewerId) {
  const out = [];
  for (const m of reports || []) {
    for (const e of m.extras || []) {
      const reasons = [];
      if ((m.defaults || []).includes(e.key)) reasons.push('covered');
      if (needsManagerRole(m, e.key)) reasons.push('no_effect');
      if (e.grantedBy && e.grantedBy !== viewerId) reasons.push('other');
      if (reasons.length) out.push({ member: m, extra: e, reasons });
    }
  }
  return out;
}

export function reviewText(item) {
  const parts = [];
  if (item.reasons.includes('covered'))
    parts.push('Now a role default, so this extra does nothing.');
  if (item.reasons.includes('no_effect')) parts.push('Needs a manager role, so it does nothing.');
  if (item.reasons.includes('other')) {
    parts.push(`Granted by ${item.extra.grantedByName || 'a former manager'}, not by you.`);
  }
  return parts.join(' ');
}

/** YYYY-MM-DD, or N/A. */
export function fmtDay(iso) {
  if (!iso) return NA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NA;
  return d.toISOString().slice(0, 10);
}

/** Counts for the figures strip. */
export function summarize(payload) {
  const v = payload?.viewer || {};
  const reports = payload?.reports || [];
  const grantable = v.grantable || [];
  return {
    reports: reports.length,
    extras: reports.reduce((n, m) => n + (m.extras || []).length, 0),
    grantable: grantable.length,
    restricted: v.canGrant ? MATRIX_RIGHTS.length - grantable.length : null,
    review: v.canGrant ? reviewItems(reports, v.id).length : null,
  };
}

/**
 * Apply a change to a payload on the page (sample content, and the
 * optimistic step for live data). Returns a new payload.
 */
export function applyChange(payload, { memberId, key, action, by, byName, at }) {
  return {
    ...payload,
    reports: payload.reports.map((m) => {
      if (m.id !== memberId) return m;
      const extras = (m.extras || []).filter((e) => e.key !== key);
      if (action === 'grant') {
        extras.push({ key, grantedBy: by, grantedByName: byName, grantedAt: at, pending: true });
      }
      return { ...m, extras };
    }),
  };
}

/**
 * Build the page payload from rows the server (or the sample) read.
 * @param {object} viewer org_members row of the viewer
 * @param {string[]} viewerExtraRows stored extras of the viewer [{ permission_key, granted_by, granted_at }]
 * @param {object[]} reports active direct reports (org_members rows)
 * @param {object[]} extraRows stored extras of those reports [{ org_member_id, permission_key, granted_by, granted_at }]
 * @param {Map<string,string>} names member id to display name
 */
export function buildPayload({
  viewer,
  viewerExtraRows = [],
  reports = [],
  extraRows = [],
  names,
}) {
  const nameOf = (id) => (id && names?.get(id)) || null;
  const extraOf = (r) => ({
    key: r.permission_key,
    grantedBy: r.granted_by || null,
    grantedByName: nameOf(r.granted_by),
    grantedAt: r.granted_at || null,
  });
  const viewerExtras = viewerExtraRows
    .filter((r) => RIGHT_KEYS.includes(r.permission_key))
    .map(extraOf);
  const viewerExtraKeys = viewerExtraRows.map((r) => r.permission_key);
  const canGrant = isGrantor(viewer);
  const myDefaults = roleDefaults(viewer);

  const byMember = new Map();
  for (const r of extraRows) {
    if (!RIGHT_KEYS.includes(r.permission_key)) continue;
    const list = byMember.get(r.org_member_id) || [];
    list.push(extraOf(r));
    byMember.set(r.org_member_id, list);
  }

  return {
    viewer: {
      id: viewer.id,
      name: viewer.display_name || NA,
      role: viewer.role,
      roleLabel: roleLabel(viewer),
      canGrant,
      isExecutive: viewer.role === 'executive',
      grantable: grantableRights(viewer, viewerExtraKeys),
      rights: RIGHT_KEYS.map((key) => {
        if (myDefaults.includes(key)) return { key, state: 'default' };
        const e = viewerExtras.find((x) => x.key === key);
        return e ? { key, state: 'extra', ...e } : { key, state: 'none' };
      }),
    },
    reports: reports
      .filter((m) => m.is_active !== false && m.id !== viewer.id)
      .map((m) => ({
        id: m.id,
        name: m.display_name || NA,
        role: m.role,
        subRole: m.sub_role || null,
        roleLabel: roleLabel(m),
        defaults: roleDefaults(m),
        extras: byMember.get(m.id) || [],
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}
