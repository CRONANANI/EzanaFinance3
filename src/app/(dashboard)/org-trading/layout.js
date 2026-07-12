'use client';

import { OrgHubNav } from '@/components/org/OrgHubNav';

/**
 * Trading Desk lives outside the org-team-hub route group but is an org page, so
 * it renders the SAME shared OrgHubNav rail — identical sidebar everywhere. The
 * rail's "Trading Desk" item is route-matched active here.
 */
export default function OrgTradingLayout({ children }) {
  return (
    <div className="org-shell">
      <OrgHubNav />
      <div className="org-shell-main">{children}</div>
    </div>
  );
}
