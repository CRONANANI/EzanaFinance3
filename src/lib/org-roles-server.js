import { getMemberPermissions } from '@/lib/orgMockData';

/**
 * Effective permissions = UNION of:
 *   - every org_role the member holds (their permissions arrays), and
 *   - per-member overrides in org_member_permissions.
 *
 * Shopify-style: holding several roles grants the union, never the intersection.
 * Falls back to the legacy PERMISSION_TIERS path when a member has no org_roles
 * assigned yet, so orgs that haven't been migrated keep working unchanged.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase RLS-scoped client
 * @param {{ id: string, role?: string, sub_role?: string }} member
 */
export async function getEffectivePermissions(supabase, member) {
  const [{ data: roleRows }, { data: overrideRows }] = await Promise.all([
    supabase
      .from('org_member_roles')
      .select(
        'org_role_id, is_primary, team_id, org_roles(name, slug, permissions, permission_tier, rank, category)',
      )
      .eq('org_member_id', member.id),
    supabase
      .from('org_member_permissions')
      .select('permission_key')
      .eq('org_member_id', member.id),
  ]);

  const overrides = (overrideRows || []).map((r) => r.permission_key);
  const roles = (roleRows || []).filter((r) => r.org_roles);

  // No org_roles yet → legacy tier defaults, so nothing regresses mid-migration.
  if (roles.length === 0) {
    return {
      permissions: getMemberPermissions(member, overrides),
      roles: [],
      primaryRole: null,
      legacy: true,
    };
  }

  const set = new Set(overrides);
  for (const r of roles) for (const p of r.org_roles.permissions || []) set.add(p);

  const sorted = [...roles].sort((a, b) => (a.org_roles.rank ?? 100) - (b.org_roles.rank ?? 100));
  const primary = sorted.find((r) => r.is_primary) || sorted[0];

  return {
    permissions: [...set],
    roles: sorted.map((r) => ({
      name: r.org_roles.name,
      slug: r.org_roles.slug,
      category: r.org_roles.category,
      teamId: r.team_id,
      isPrimary: !!r.is_primary,
    })),
    primaryRole: primary ? primary.org_roles.name : null,
    legacy: false,
  };
}
