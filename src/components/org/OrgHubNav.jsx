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

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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

// `badge` keys map 1:1 to /api/org/nav-counts response keys. Command Center,
// Fund Analytics, Reports and Team Permissions intentionally carry no badge.
const COMMAND = [
  { href: '/org-team-hub', label: 'Command Center', Icon: LayoutDashboard, exact: true },
  { href: '/org-trading', label: 'Trading Desk', Icon: Landmark, badge: 'tradingDesk' },
  { href: '/org-team-hub/fund-analytics', label: 'Fund Analytics', Icon: LineChart },
  {
    href: '/org-team-hub/assignments',
    label: 'Assignments',
    Icon: ClipboardCheck,
    badge: 'assignments',
  },
];

const TOOLS = [
  { href: '/org-team-hub/org-chart', label: 'Org Chart', Icon: Network, badge: 'orgChart' },
  {
    href: '/org-team-hub/pitches',
    label: 'Pitch Pipeline',
    Icon: KanbanSquare,
    match: '/org-team-hub/pitch',
    badge: 'pitchPipeline',
  },
  {
    href: '/org-team-hub/research-library',
    label: 'Research Library',
    Icon: Library,
    badge: 'researchLibrary',
  },
  { href: '/org-team-hub/meetings', label: 'Meetings', Icon: Video, badge: 'meetings' },
  { href: '/org-team-hub/recognition', label: 'Recognition', Icon: Award, badge: 'recognition' },
  { href: '/org-team-hub/grades', label: 'Grades', Icon: ClipboardList, badge: 'grades' },
  {
    href: '/org-team-hub/competitions',
    label: 'Competitions',
    Icon: Trophy,
    badge: 'competitions',
  },
  {
    href: '/org-team-hub/cohorts',
    label: 'Cohorts',
    Icon: GraduationCap,
    roles: ['executive'],
    badge: 'cohorts',
  },
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

// "Noah Raymond-Leigh" → "Noah R-Leigh". Keeps the given name intact and
// initialises each part of a long surname so the ~210px rail never has to
// ellipsis a real person's name. Short names (≤16 chars) are left untouched.
function compactName(name) {
  const full = (name || '').trim();
  if (!full) return 'Member';
  if (full.length <= 16) return full;
  const parts = full.split(/\s+/);
  if (parts.length < 2) return full;
  const given = parts[0];
  const surname = parts.slice(1).join(' ');
  const segs = surname.split('-');
  if (segs.length > 1) {
    const abbrev = segs.map((s, i) => (i === segs.length - 1 ? s : `${s[0]}.`)).join('-');
    return `${given} ${abbrev}`.replace(/\.-/g, '-'); // "Noah R-Leigh"
  }
  return `${given} ${surname[0]}.`; // "Noah R."
}

function itemActive(pathname, item) {
  if (!pathname) return false;
  if (item.exact) return pathname === item.href;
  const base = item.match || item.href;
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function OrgHubNav() {
  const pathname = usePathname();
  const { orgData, orgRole, isLoading } = useOrg();
  const member = orgData?.member || null;
  const [counts, setCounts] = useState(null);
  // Optimistic active nav: highlight the clicked item immediately, before the
  // new segment resolves, so navigation acknowledges the click instantly.
  const [optimisticHref, setOptimisticHref] = useState(null);

  // ONE batched, count-only round trip for every badge (server decides tone).
  // Absent/null keys render no badge — never a 0.
  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/org/nav-counts');
      if (!res.ok) return;
      setCounts(await res.json());
    } catch {
      /* honest-empty: no badges when counts are unavailable */
    }
  }, []);

  // Fetch ONCE on mount — the sidebar lives in the layout and persists across
  // navigations, so this must not re-run per route (that fired an uncached
  // request every hop). Refresh instead on a 60s poll and whenever a mutation
  // dispatches 'ezana:org-nav-counts-refresh' (e.g. after submitting an
  // assignment or resolving a breach), so a count still drops when you act.
  useEffect(() => {
    fetchCounts();
    const poll = setInterval(fetchCounts, 60000);
    const onRefresh = () => fetchCounts();
    window.addEventListener('ezana:org-nav-counts-refresh', onRefresh);
    return () => {
      clearInterval(poll);
      window.removeEventListener('ezana:org-nav-counts-refresh', onRefresh);
    };
  }, [fetchCounts]);

  // Once the real route resolves, drop the optimistic override.
  useEffect(() => {
    setOptimisticHref(null);
  }, [pathname]);

  const renderItem = (item) => {
    if (item.roles && !item.roles.includes(orgRole)) return null;
    const { Icon } = item;
    // While an optimistic click is pending, ONLY the clicked item reads active
    // (single highlight); otherwise fall back to the route-matched state.
    const active = optimisticHref ? optimisticHref === item.href : itemActive(pathname, item);
    const cls = ['ohn-nav-item', active ? 'active' : '', item.highlight ? 'highlight' : '']
      .filter(Boolean)
      .join(' ');
    const badge = item.badge ? counts?.[item.badge] : null;
    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch
        className={cls}
        aria-current={active ? 'page' : undefined}
        onClick={() => setOptimisticHref(item.href)}
      >
        <Icon size={15} strokeWidth={1.8} />
        <span>{item.label}</span>
        {badge && <span className={`ohn-badge ohn-badge--${badge.tone}`}>{badge.value}</span>}
      </Link>
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
            <div className="ohn-vp-name" title={member?.display_name || undefined}>
              {compactName(member?.display_name)}
            </div>
            <div className="ohn-vp-eyebrow">{roleEyebrow(member?.title, orgRole)}</div>
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
