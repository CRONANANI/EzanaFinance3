'use client';

import '../org-team-hub/org-design-system.css';
import { TeamHubShell } from '@/components/org/TeamHubShell';

/**
 * Council Rankings lives outside the org-team-hub route group but is an org
 * page, so it renders inside the same shared TeamHubShell. The sidebar marks
 * "Council Rankings" as the current page from the route.
 */
export default function CouncilRankingsLayout({ children }) {
  return <TeamHubShell fade={false}>{children}</TeamHubShell>;
}
