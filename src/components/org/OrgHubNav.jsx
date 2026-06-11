'use client';

/**
 * Consolidated Team Hub navigation — the single place org nav links live.
 *
 * `roles: null` = visible to every active member; otherwise visible only to the
 * listed roles (faculty advisors are role 'executive', so they see exec items).
 * This filtering is a UI hint only — every server route independently enforces
 * permission via getCurrentOrgMember + assertOrgRole (see org-role-matrix.js).
 */
const NAV_ITEMS = [
  { href: '/org-team-hub/org-chart', label: 'Org Chart', icon: 'bi-diagram-3', roles: null },
  { href: '/org-team-hub/pitches', label: 'Pitch Pipeline', icon: 'bi-kanban', roles: null },
  { href: '/org-team-hub/pitch-archive', label: 'Archive', icon: 'bi-archive', roles: null },
  { href: '/org-trading', label: 'Trading Desk', icon: 'bi-bank2', roles: null },
  { href: '/org-team-hub/research-library', label: 'Research Library', icon: 'bi-journal-text', roles: null },
  { href: '/org-team-hub/fund-analytics', label: 'Fund Analytics', icon: 'bi-graph-up', roles: null },
  { href: '/org-team-hub/recognition', label: 'Recognition', icon: 'bi-award', roles: null },
  { href: '/org-team-hub/meetings', label: 'Meetings', icon: 'bi-camera-video', roles: null },
  { href: '/org-team-hub/assignments', label: 'Assignments', icon: 'bi-clipboard-check', roles: null },
  { href: '/org-team-hub/grades', label: 'Grades', icon: 'bi-card-checklist', roles: null },
  { href: '/org-team-hub/competitions', label: 'Competitions', icon: 'bi-trophy', roles: null },
  { href: '/org-team-hub/cohorts', label: 'Cohorts', icon: 'bi-mortarboard', roles: ['executive'] },
  {
    href: '/org-team-hub/compliance',
    label: 'Compliance',
    icon: 'bi-shield-check',
    roles: ['executive', 'portfolio_manager'],
  },
  {
    href: '/org-team-hub/reports',
    label: 'Reports',
    icon: 'bi-file-earmark-bar-graph',
    roles: ['executive', 'portfolio_manager'],
  },
];

export function OrgHubNav({ orgRole }) {
  const visible = NAV_ITEMS.filter((it) => !it.roles || it.roles.includes(orgRole));
  return (
    <>
      {visible.map((it) => (
        <a key={it.href} href={it.href} className="th-upload-btn" style={{ textDecoration: 'none' }}>
          <i className={`bi ${it.icon}`} /> {it.label}
        </a>
      ))}
    </>
  );
}
