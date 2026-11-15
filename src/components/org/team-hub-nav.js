/**
 * Team Hub navigation model: the one ordered list of destinations the shared
 * sidebar renders, with the role rule for each. Pure (no React, no I/O) so the
 * sidebar, the tests and any page that needs the list read the same source.
 *
 * `key` matches the keys of GET /api/org/nav-counts, which is where a count
 * comes from. `roles` is a display hint only: every page and route checks
 * permission again on the server.
 */
export const TEAM_HUB_NAV = [
  {
    key: 'commandCenter',
    href: '/org-team-hub',
    label: 'Command Center',
    icon: 'bi-speedometer2',
    exact: true,
  },
  { key: 'tradingDesk', href: '/org-trading', label: 'Trading Desk', icon: 'bi-bank' },
  {
    key: 'fundAnalytics',
    href: '/org-team-hub/fund-analytics',
    label: 'Fund Analytics',
    icon: 'bi-graph-up',
  },
  {
    key: 'assignments',
    href: '/org-team-hub/assignments',
    label: 'Assignments',
    icon: 'bi-clipboard-check',
    countLabel: (v) => {
      const [open, total] = String(v).split('/');
      return `${open} open of ${total} assignments`;
    },
  },
  { key: 'orgChart', href: '/org-team-hub/org-chart', label: 'Org Chart', icon: 'bi-diagram-3' },
  {
    key: 'pitchPipeline',
    href: '/org-team-hub/pitches',
    label: 'Pitch Pipeline',
    icon: 'bi-easel2',
    match: '/org-team-hub/pitch',
    countLabel: (v) => `${v} active pitches`,
  },
  {
    key: 'researchLibrary',
    href: '/org-team-hub/research-library',
    label: 'Research Library',
    icon: 'bi-archive',
    countLabel: (v) => `${v} published notes`,
  },
  { key: 'sonar', href: '/org-team-hub/sonar', label: 'Sonar Research', icon: 'bi-broadcast' },
  {
    key: 'meetings',
    href: '/org-team-hub/meetings',
    label: 'Meetings',
    icon: 'bi-camera-video',
    countLabel: (v) => `${v} scheduled meetings`,
  },
  {
    key: 'recognition',
    href: '/org-team-hub/recognition',
    label: 'Recognition',
    icon: 'bi-award',
    countLabel: (v) => `${v} awards in the last 7 days`,
  },
  {
    key: 'grades',
    href: '/org-team-hub/grades',
    label: 'Grades',
    icon: 'bi-clipboard-data',
    countLabel: (v) => `${v} submissions awaiting review`,
  },
  { key: 'competitions', href: '/org-competitions', label: 'Competitions', icon: 'bi-trophy' },
  {
    key: 'councilRankings',
    href: '/council-rankings',
    label: 'Council Rankings',
    icon: 'bi-bar-chart-steps',
  },
  {
    key: 'cohorts',
    href: '/org-team-hub/cohorts',
    label: 'Cohorts',
    icon: 'bi-people',
    roles: ['executive'],
    countLabel: (v) => `${v} applicants awaiting a decision`,
  },
  {
    key: 'compliance',
    href: '/org-team-hub/compliance',
    label: 'Compliance',
    icon: 'bi-shield-check',
    roles: ['executive', 'portfolio_manager'],
    countLabel: (v) => `${v} open policy breaches`,
  },
  {
    key: 'reports',
    href: '/org-team-hub/reports',
    label: 'Reports',
    icon: 'bi-file-earmark-text',
    roles: ['executive', 'portfolio_manager'],
  },
  {
    key: 'teamPermissions',
    href: '/org-team-hub/permissions',
    label: 'Team Permissions',
    icon: 'bi-key',
    accent: true,
  },
];

export const TEAM_HUB_ROLE_LABEL = {
  executive: 'Executive',
  portfolio_manager: 'Portfolio manager',
  analyst: 'Analyst',
};

/** The items a role sees, in order. An unknown or missing role sees only the
 *  items open to everyone. */
export function teamHubNavFor(role) {
  return TEAM_HUB_NAV.filter((item) => !item.roles || item.roles.includes(role));
}

/** Is `item` the current page for `pathname`? */
export function isTeamHubNavActive(pathname, item) {
  if (!pathname || !item) return false;
  if (item.exact) return pathname === item.href;
  // `match` is a path prefix (Pitch Pipeline owns /pitches and /pitch-archive).
  if (item.match) return pathname.startsWith(item.match);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Resolve a `selected` override (a key, an href or a label) to an item key. */
export function resolveTeamHubSelected(selected) {
  if (!selected) return null;
  const s = String(selected).toLowerCase();
  const hit = TEAM_HUB_NAV.find(
    (i) => i.key.toLowerCase() === s || i.href === selected || i.label.toLowerCase() === s,
  );
  return hit ? hit.key : null;
}

/**
 * A count as the sidebar shows it, or null when nothing should show.
 * The server sends `{ value, tone }` or null. Zero never shows, and the
 * Assignments "open/total" pair hides when nothing is open.
 */
export function teamHubCount(item, counts) {
  const raw = counts?.[item.key];
  if (!raw) return null;
  const value = typeof raw === 'object' ? raw.value : raw;
  if (value == null || value === 0 || value === '0') return null;
  if (typeof value === 'string' && value.includes('/') && value.split('/')[0].trim() === '0') {
    return null;
  }
  const text = String(value);
  return {
    text,
    negative: typeof raw === 'object' && raw.tone === 'danger',
    label: item.countLabel ? item.countLabel(text) : text,
  };
}

export function teamHubInitials(name) {
  return (name || '')
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** The line under the member's name: their title first ("VP of Operations"
 *  reads "VP · Operations"), the role where there is no title. */
export function teamHubMemberLine(title, role) {
  const base = (title || '').trim() || TEAM_HUB_ROLE_LABEL[role] || 'Member';
  return base.replace(/\s+of\s+/gi, ' · ');
}

/** "Noah Raymond-Leigh" reads "Noah R-Leigh" so a long surname fits the
 *  200px column. Names of 18 characters or fewer are left alone. */
export function teamHubCompactName(name) {
  const full = (name || '').trim();
  if (!full) return 'Member';
  if (full.length <= 18) return full;
  const parts = full.split(/\s+/);
  if (parts.length < 2) return full;
  const given = parts[0];
  const surname = parts.slice(1).join(' ');
  const segs = surname.split('-');
  if (segs.length > 1) {
    return `${given} ${segs.map((s, i) => (i === segs.length - 1 ? s : s[0])).join('-')}`;
  }
  return `${given} ${surname[0]}.`;
}
