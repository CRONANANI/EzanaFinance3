'use client';

import '../org-team-hub/org-design-system.css';
import { OrgHubNav } from '@/components/org/OrgHubNav';

/**
 * Council Rankings lives outside the org-team-hub route group but is an org
 * page, so it renders the SAME shared OrgHubNav rail (mirrors the Trading
 * Desk layout) — sidebar, user card, active state, and content-region sizing
 * all come from the one shared shell. The rail's "Council Rankings" item is
 * route-matched active here.
 */
export default function CouncilRankingsLayout({ children }) {
  return (
    <div className="org-shell">
      <OrgHubNav />
      <div className="org-shell-main">{children}</div>
    </div>
  );
}
