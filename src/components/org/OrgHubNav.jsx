'use client';

/**
 * OrgHubNav — the single, shared org sidebar rendered by the org-team-hub and
 * org-trading route-group layouts, so every org page shows an identical rail.
 *
 * - User card from the real org member (useOrg) — never fabricated; skeleton
 *   while the membership resolves.
 * - Two labelled groups (COMMAND / TOOLS), ordered per the design.
 * - Lucide icons only. Emerald active state (route-matched via usePathname).
 * - Badges are REAL: Assignments shows {completed}/{total} from
 *   /api/org/assignments; Compliance shows an open-breach count from
 *   /api/org/ips/violations. If a count can't be fetched, NO badge renders.
 * - `roles` is a UI hint only — every server route independently enforces
 *   permission via getCurrentOrgMember + assertOrgRole.
 *
 * Design note: the standalone "Archive" link was folded into Pitch Pipeline
 * (the pitch page already links to its archive), matching the mockups which
 * show no separate Archive item in the rail.
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useOrg } from '@/contexts/OrgContext';
import {
  LayoutDashboard,
  Landmark,
  LineChart,
  ClipboardCheck,
  Network,
  KanbanSquare,
  Library,
  Video,
  Award,
  ClipboardList,
  Trophy,
  GraduationCap,
  ShieldCheck,
  FileBarChart2,
  KeyRound,
} from 'lucide-react';
import './org-shell.css';

const ROLE_LABEL = {
  executive: 'Executive',
  portfolio_manager: 'Portfolio Manager',
  analyst: 'Analyst',
};

const COMMAND = [
  { href: '/org-team-hub', label: 'Command Center', Icon: LayoutDashboard, exact: true },
  { href: '/org-trading', label: 'Trading Desk', Icon: Landmark },
  { href: '/org-team-hub/fund-analytics', label: 'Fund Analytics', Icon: LineChart },
  {
    href: '/org-team-hub/assignments',
    label: 'Assignments',
    Icon: ClipboardCheck,
    badge: 'assignments',
  },
];

const TOOLS = [
  { href: '/org-team-hub/org-chart', label: 'Org Chart', Icon: Network },
  {
    href: '/org-team-hub/pitches',
    label: 'Pitch Pipeline',
    Icon: KanbanSquare,
    match: '/org-team-hub/pitch',
  },
  { href: '/org-team-hub/research-library', label: 'Research Library', Icon: Library },
  { href: '/org-team-hub/meetings', label: 'Meetings', Icon: Video },
  { href: '/org-team-hub/recognition', label: 'Recognition', Icon: Award },
  { href: '/org-team-hub/grades', label: 'Grades', Icon: ClipboardList },
  { href: '/org-team-hub/competitions', label: 'Competitions', Icon: Trophy },
  { href: '/org-team-hub/cohorts', label: 'Cohorts', Icon: GraduationCap, roles: ['executive'] },
  {
    href: '/org-team-hub/compliance',
    label: 'Compliance',
    Icon: ShieldCheck,
    roles: ['executive', 'portfolio_manager'],
    badge: 'compliance',
  },
  {
    href: '/org-team-hub/reports',
    label: 'Reports',
    Icon: FileBarChart2,
    roles: ['executive', 'portfolio_manager'],
  },
  { href: '/org-team-hub/permissions', label: 'Team Permissions', Icon: KeyRound, highlight: true },
];

function initials(name) {
  return (name || '')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// "VP of Operations" → "VP · OPERATIONS"; falls back to the role label.
function roleEyebrow(title, role) {
  const base = title || ROLE_LABEL[role] || 'Member';
  return base.toUpperCase().replace(/\s+OF\s+/g, ' · ');
}

function itemActive(pathname, item) {
  if (!pathname) return false;
  if (item.exact) return pathname === item.href;
  const base = item.match || item.href;
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function OrgHubNav() {
  const pathname = usePathname();
  const { orgData, orgRole, canManage, isLoading } = useOrg();
  const member = orgData?.member || null;
  const [badges, setBadges] = useState({ assignments: null, compliance: null });

  // Assignments {completed}/{total} — real, from the existing endpoint.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/org/assignments', { cache: 'no-store' });
        if (!res.ok || !alive) return;
        const data = await res.json();
        const list = Array.isArray(data.assignments) ? data.assignments : [];
        const total = data.tab_counts?.all ?? list.length;
        if (total > 0) {
          const done = list.filter((a) => a.status === 'complete' || a.status === 'graded').length;
          setBadges((b) => ({ ...b, assignments: `${done}/${total}` }));
        }
      } catch {
        /* honest-empty: no badge when the count is unavailable */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Compliance open-breach count — managers only (they're the only ones who see the item).
  useEffect(() => {
    if (!canManage) return undefined;
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/org/ips/violations', { cache: 'no-store' });
        if (!res.ok || !alive) return;
        const data = await res.json();
        const open = Array.isArray(data.violations) ? data.violations.length : 0;
        if (open > 0) setBadges((b) => ({ ...b, compliance: open }));
      } catch {
        /* no badge on failure */
      }
    })();
    return () => {
      alive = false;
    };
  }, [canManage]);

  const renderItem = (item) => {
    if (item.roles && !item.roles.includes(orgRole)) return null;
    const { Icon } = item;
    const active = itemActive(pathname, item);
    const cls = ['ohn-nav-item', active ? 'active' : '', item.highlight ? 'highlight' : '']
      .filter(Boolean)
      .join(' ');
    const badgeVal = item.badge ? badges[item.badge] : null;
    return (
      <a
        key={item.href}
        href={item.href}
        className={cls}
        aria-current={active ? 'page' : undefined}
      >
        <Icon size={15} strokeWidth={1.8} />
        <span>{item.label}</span>
        {badgeVal != null && (
          <span className={`ohn-badge${item.badge === 'compliance' ? ' ohn-badge--danger' : ''}`}>
            {badgeVal}
          </span>
        )}
      </a>
    );
  };

  return (
    <aside className="ohn-sidebar" aria-label="Team Hub navigation">
      {isLoading ? (
        <div className="ohn-skel ohn-skel-vp" aria-hidden="true" />
      ) : (
        <div className="ohn-vp">
          <div className="ohn-vp-avatar">{initials(member?.display_name) || 'EZ'}</div>
          <div className="ohn-vp-meta">
            <div className="ohn-vp-eyebrow">{roleEyebrow(member?.title, orgRole)}</div>
            <div className="ohn-vp-name">{member?.display_name || 'Member'}</div>
          </div>
        </div>
      )}

      <nav className="ohn-nav-group" aria-label="Command">
        <div className="ohn-nav-label">Command</div>
        {COMMAND.map(renderItem)}
      </nav>

      <nav className="ohn-nav-group" aria-label="Tools">
        <div className="ohn-nav-label">Tools</div>
        {TOOLS.map(renderItem)}
      </nav>
    </aside>
  );
}
