/**
 * Shared loader for the Org Chart initial payload.
 *
 * Underscore-prefixed, colocated module — ignored by the App Router for routing,
 * so it is safe to import from the sibling route handler AND from the Org Chart
 * server page for first-paint SSR.
 *
 * Returns `{ error, payload }` so callers preserve the route's exact error
 * handling (route → 500; page → null initialData).
 */
import { ORG_TIERS, tierOf, canEditMember, assignableTiers } from '@/lib/org-hierarchy';
import { GICS_SECTORS, MANAGER_ROLES } from '@/lib/org-chart-model';

const MEMBER_FIELDS =
  'id, user_id, display_name, title, role, sub_role, tier, team_id, reports_to, term_start, term_end, is_graduating';

/**
 * Build the Org Chart GET payload for a resolved org member.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase RLS-scoped client
 * @param {{ org_id: string, id: string, role: string, sub_role?: string }} member
 * @returns {Promise<{ error?: unknown, payload?: object }>}
 */
export async function loadChart(supabase, member) {
  const orgId = member.org_id;

  const [
    { data: members, error: membersErr },
    { data: coverage },
    { data: org },
    { data: teams, error: teamsErr },
    { data: changes, error: changesErr },
  ] = await Promise.all([
    /* Earliest joined first. The page's flag routing lines read "first" in
       this order, as routing does. */
    supabase
      .from('org_members')
      .select(MEMBER_FIELDS)
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('joined_at', { ascending: true }),
    supabase
      .from('org_sector_coverage')
      .select('member_id, sector, is_primary')
      .eq('org_id', orgId),
    supabase.from('organizations').select('university_name, name').eq('id', orgId).maybeSingle(),
    supabase.from('org_teams').select('id, name').eq('org_id', orgId).order('name'),
    /* The rank change log. Every active member may read their council's rows
       (row policy "Org members read role changes"); the rank route writes them. */
    supabase
      .from('org_role_changes')
      .select('id, target_member_id, changed_by_member_id, old_tier, new_tier, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  if (membersErr) return { error: membersErr };

  // Group sector coverage by member so the client gets a `sectors` array.
  const sectorsByMember = new Map();
  for (const row of coverage || []) {
    if (!sectorsByMember.has(row.member_id)) sectorsByMember.set(row.member_id, []);
    sectorsByMember.get(row.member_id).push({ sector: row.sector, isPrimary: row.is_primary });
  }

  // Hierarchical edit rights: flag each member the viewer may re-role.
  const membersById = new Map((members || []).map((m) => [m.id, m]));
  const viewerRow = membersById.get(member.id) || member;
  const shaped = (members || []).map((m) => ({
    ...m,
    tier: tierOf(m).id,
    sectors: sectorsByMember.get(m.id) || [],
    editable: canEditMember(viewerRow, m, membersById),
  }));

  const payload = {
    universityName: org?.university_name || org?.name || 'Organization',
    orgId,
    sectors: GICS_SECTORS,
    tiers: ORG_TIERS,
    viewer: {
      memberId: member.id,
      role: member.role,
      subRole: member.sub_role,
      tier: tierOf(viewerRow).id,
      canManage: MANAGER_ROLES.includes(member.role),
      assignableTiers: assignableTiers(viewerRow),
    },
    members: shaped,
    /* null (not an empty list) when the read failed, so the page can say so. */
    teams: teamsErr ? null : teams || [],
    changes: changesErr ? null : changes || [],
  };

  return { payload };
}
