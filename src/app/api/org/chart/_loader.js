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

/* The 11 GICS sectors — the single source of truth for what may be assigned. */
const GICS_SECTORS = [
  'Energy',
  'Materials',
  'Industrials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Health Care',
  'Financials',
  'Information Technology',
  'Communication Services',
  'Utilities',
  'Real Estate',
];

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

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

  const [{ data: members, error: membersErr }, { data: coverage }, { data: org }] =
    await Promise.all([
      supabase.from('org_members').select(MEMBER_FIELDS).eq('org_id', orgId).eq('is_active', true),
      supabase
        .from('org_sector_coverage')
        .select('member_id, sector, is_primary')
        .eq('org_id', orgId),
      supabase.from('organizations').select('university_name, name').eq('id', orgId).maybeSingle(),
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
  };

  return { payload };
}
