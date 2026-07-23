import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getEffectivePermissions } from '@/lib/org-roles-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/org/status — resolve the caller's org membership SERVER-SIDE.
 *
 * This exists to take the org lookup out of the browser Supabase client's
 * auth-lock blast radius. supabase-browser.js documents a history of GoTrue
 * Web-Locks/processLock deadlocks that hang client-side `supabase.from(...)`
 * calls indefinitely; OrgContext used to run three such queries with no
 * timeout, so one wedged lock froze Team Hub on an infinite "Loading…".
 *
 * Here the caller is authenticated from cookies and every query runs through
 * the SERVER client — no browser GoTrueClient, no Web-Locks, no session-refresh
 * race — mirroring how the page's own data endpoints already work. Returns the
 * same shapes OrgContext maps into its state today.
 */
const NON_ORG = {
  isOrgUser: false,
  orgRole: null,
  orgData: null,
  permissionOverrides: [],
};

export const GET = withApiGuard(
  async () => {
    const supabase = getUserClient();

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json(NON_ORG);

    // 1) active membership + the organization embed
    const { data: member, error } = await supabase
      .from('org_members')
      .select(
        `
        *,
        organizations (*)
      `,
      )
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error || !member) return NextResponse.json(NON_ORG);

    // 2) the member's own team (if assigned)
    let team = null;
    if (member.team_id) {
      const { data: teamRow } = await supabase
        .from('org_teams')
        .select('*')
        .eq('id', member.team_id)
        .maybeSingle();
      team = teamRow;
    }

    // 3) all teams for the org
    const { data: teams } = await supabase
      .from('org_teams')
      .select('*')
      .eq('org_id', member.org_id)
      .order('name');

    // 4) per-member permission overrides
    const { data: permRows } = await supabase
      .from('org_member_permissions')
      .select('permission_key')
      .eq('org_member_id', member.id);

    // 5) per-university roles + union-of-permissions (Shopify-style). Additive:
    //    orgRole (the tier) below is untouched. When the org hasn't been migrated
    //    or the member holds no org_roles, getEffectivePermissions returns the
    //    legacy tier path (roles: [], primaryRole: null), so nothing regresses.
    //    Wrapped so a missing org_roles table can never break status resolution.
    let orgRoles = [];
    let primaryRoleName = null;
    try {
      const resolved = await getEffectivePermissions(supabase, member);
      orgRoles = resolved.roles;
      primaryRoleName = resolved.primaryRole;
    } catch {
      /* pre-migration / no roles → keep legacy tier behaviour */
    }

    return NextResponse.json({
      isOrgUser: true,
      orgRole: member.role,
      orgData: {
        org: member.organizations,
        member: { ...member, email: user.email },
        team,
        teams: teams || [],
      },
      permissionOverrides: (permRows || []).map((p) => p.permission_key),
      orgRoles,
      primaryRoleName,
    });
  },
  { requireAuth: false },
);
