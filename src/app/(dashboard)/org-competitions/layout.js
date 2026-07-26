'use client';

import { OrgHubNav } from '@/components/org/OrgHubNav';

/**
 * Pitch Competition Command Center lives outside the org-team-hub route group but
 * is an org page, so it renders the SAME shared OrgHubNav rail for a consistent
 * sidebar. The --org-* theme tokens come from the root OrgThemeProvider.
 */
export default function OrgCompetitionsLayout({ children }) {
  return (
    <div className="org-shell">
      <OrgHubNav />
      <div className="org-shell-main">{children}</div>
    </div>
  );
}
