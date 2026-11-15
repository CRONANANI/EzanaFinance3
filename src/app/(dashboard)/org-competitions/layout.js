'use client';

import '../org-team-hub/org-design-system.css';
import { TeamHubShell } from '@/components/org/TeamHubShell';

/**
 * Competitions lives outside the org-team-hub route group but is an org page, so
 * it renders inside the same shared TeamHubShell for one consistent sidebar.
 */
export default function OrgCompetitionsLayout({ children }) {
  return <TeamHubShell fade={false}>{children}</TeamHubShell>;
}
