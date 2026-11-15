'use client';

/**
 * TeamHubSidebar: the one sidebar every Team Hub page shares (the Team Hub
 * routes plus Trading Desk, Competitions and Council Rankings). Rendered by
 * TeamHubShell; pages never render it themselves.
 *
 * Everything it shows is real: the member comes from the org context, the
 * current item from the route, and the counts from one batched request that
 * refreshes every minute and whenever a page dispatches
 * 'ezana:org-nav-counts-refresh'. A count that is zero or unavailable is not
 * drawn.
 *
 * Props are all optional overrides (previews and tests pass them; the app
 * passes none):
 *   selected  item key, href or label to mark as the current page
 *   role      'executive' | 'portfolio_manager' | 'analyst'
 *   member    { name, title }
 *   loading   show the member skeleton
 *   counts    the nav-counts payload; when given, nothing is fetched
 *
 * Hiding an item by role is a convenience. Each page and route checks
 * permission again on the server.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOrg } from '@/contexts/OrgContext';
import {
  isTeamHubNavActive,
  resolveTeamHubSelected,
  teamHubCompactName,
  teamHubCount,
  teamHubInitials,
  teamHubMemberLine,
  teamHubNavFor,
} from './team-hub-nav';
import './team-hub-shell.css';

const COUNTS_URL = '/api/org/nav-counts';
const REFRESH_EVENT = 'ezana:org-nav-counts-refresh';

export function TeamHubSidebar({ selected, role, member, loading, counts: countsProp }) {
  const pathname = usePathname();
  const org = useOrg();
  const activeRole = role || org.orgRole;
  const ctxMember = org.orgData?.member || null;
  const name = member?.name ?? ctxMember?.display_name ?? '';
  const title = member?.title ?? ctxMember?.title ?? '';
  const isLoading = loading ?? org.isLoading;

  const [fetched, setFetched] = useState(null);
  const counts = countsProp ?? fetched;
  const controlled = countsProp !== undefined;

  /* The clicked item reads as current straight away, before the next page
     resolves, so the click is acknowledged at once. */
  const [pendingKey, setPendingKey] = useState(null);
  useEffect(() => {
    setPendingKey(null);
  }, [pathname]);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch(COUNTS_URL);
      if (res.ok) setFetched(await res.json());
    } catch {
      /* No counts when they cannot be loaded. */
    }
  }, []);

  /* Once on mount: the sidebar lives in the layout and survives navigation. */
  useEffect(() => {
    if (controlled) return undefined;
    fetchCounts();
    const poll = setInterval(fetchCounts, 60000);
    window.addEventListener(REFRESH_EVENT, fetchCounts);
    return () => {
      clearInterval(poll);
      window.removeEventListener(REFRESH_EVENT, fetchCounts);
    };
  }, [controlled, fetchCounts]);

  const selectedKey = resolveTeamHubSelected(selected);
  const items = teamHubNavFor(activeRole);

  return (
    <aside className="thub-side" aria-label="Team Hub">
      {isLoading ? (
        <div className="thub-member" aria-hidden="true">
          <span className="thub-skel thub-skel--avatar" />
          <span className="thub-member__text">
            <span className="thub-skel thub-skel--name" />
            <span className="thub-skel thub-skel--line" />
          </span>
        </div>
      ) : (
        <div className="thub-member">
          <span className="thub-avatar" aria-hidden="true">
            {teamHubInitials(name) || 'EZ'}
          </span>
          <span className="thub-member__text">
            <span className="thub-member__name" title={name || undefined}>
              {teamHubCompactName(name)}
            </span>
            <span className="thub-member__line">{teamHubMemberLine(title, activeRole)}</span>
          </span>
        </div>
      )}

      <nav className="thub-nav" aria-label="Team Hub pages">
        {items.map((item) => {
          const active = pendingKey
            ? pendingKey === item.key
            : selectedKey
              ? selectedKey === item.key
              : isTeamHubNavActive(pathname, item);
          const count = teamHubCount(item, counts);
          return (
            <Link
              key={item.key}
              href={item.href}
              prefetch
              className={`thub-item${active ? ' is-current' : ''}${item.accent ? ' thub-item--accent' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => setPendingKey(item.key)}
            >
              <i className={`bi ${item.icon} thub-item__icon`} aria-hidden="true" />
              <span className="thub-item__label">{item.label}</span>
              {count && (
                <span
                  className={`thub-item__count${count.negative ? ' is-negative' : ''}`}
                  title={count.label}
                >
                  <span aria-hidden="true">{count.text}</span>
                  <span className="thub-sr">{count.label}</span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default TeamHubSidebar;
