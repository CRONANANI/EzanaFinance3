'use client';

import { usePathname } from 'next/navigation';
import { OrgHubNav } from '@/components/org/OrgHubNav';

/**
 * Org shell — renders the shared OrgHubNav rail beside every org-team-hub page.
 * The dashboard shell (.dashboard-main-content) already provides the 1600px /
 * 2rem envelope, so .org-shell just lays out the rail + main inside it (no
 * double inset). See src/components/org/org-shell.css.
 *
 * The content region is keyed by pathname so each new segment remounts and
 * replays a subtle fade-in (org-shell.css). Keying by pathname — not by the
 * skeleton→content swap — means the fade plays ONCE per navigation, and the
 * persistent rail (OrgHubNav, outside the keyed node) never animates.
 */
export default function OrgTeamHubLayout({ children }) {
  const pathname = usePathname();
  return (
    <div className="org-shell">
      <OrgHubNav />
      <div className="org-shell-main">
        <div key={pathname} className="org-shell-fade">
          {children}
        </div>
      </div>
    </div>
  );
}
