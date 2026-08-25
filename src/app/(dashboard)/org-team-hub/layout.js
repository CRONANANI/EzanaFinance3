import './org-design-system.css';
import { redirect } from 'next/navigation';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import OrgTeamHubShell from './OrgTeamHubShell';

/**
 * Server-side access gate for the ENTIRE org (Team Hub) experience.
 *
 * Layer 1 of defense-in-depth: this runs before any /org-team-hub/* page
 * renders, so a non-member is redirected to /home BEFORE any org chrome is sent
 * — the gate can't be bypassed by disabling JS. Layer 2 (RLS scoped to
 * auth_org_ids() on every org table) remains the data backstop.
 *
 * Access is determined by MEMBERSHIP, enforced here — not by which login form
 * was used. So an org login by a non-member, or a non-member visiting the URL
 * directly, both land back on /home. The interactive shell (rail + fade) stays a
 * client component in OrgTeamHubShell; only the gate is server-side.
 */
export default async function OrgTeamHubLayout({ children }) {
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);
  if (!member) {
    redirect('/home');
  }
  return <OrgTeamHubShell>{children}</OrgTeamHubShell>;
}
