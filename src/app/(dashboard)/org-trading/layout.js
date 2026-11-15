'use client';

import '../org-team-hub/org-design-system.css';
import { TeamHubShell } from '@/components/org/TeamHubShell';

/**
 * Trading Desk lives outside the org-team-hub route group but is an org page, so
 * it renders inside the same shared TeamHubShell: one sidebar everywhere. The
 * sidebar marks "Trading Desk" as the current page from the route.
 */
export default function OrgTradingLayout({ children }) {
  return <TeamHubShell fade={false}>{children}</TeamHubShell>;
}
