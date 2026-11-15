import { CommandCenter } from '@/components/org/command-center/CommandCenter';

/**
 * /org-team-hub: the Command Center, the Team Hub home. Membership is checked
 * on the server in layout.js, which also provides the shared sidebar
 * (TeamHubShell). The page body lives in components/org/command-center.
 */
export default function OrgTeamHubPage() {
  return <CommandCenter />;
}
