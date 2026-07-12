'use client';

import { OrgHubNav } from '@/components/org/OrgHubNav';

/**
 * Org shell — renders the shared OrgHubNav rail beside every org-team-hub page.
 * The dashboard shell (.dashboard-main-content) already provides the 1600px /
 * 2rem envelope, so .org-shell just lays out the rail + main inside it (no
 * double inset). See src/components/org/org-shell.css.
 */
export default function OrgTeamHubLayout({ children }) {
  return (
    <div className="org-shell">
      <OrgHubNav />
      <div className="org-shell-main">{children}</div>
    </div>
  );
}
