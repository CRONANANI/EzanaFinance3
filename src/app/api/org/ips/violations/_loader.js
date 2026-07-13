/**
 * Shared loader for the IPS violations list.
 *
 * Underscore-prefixed, colocated module — ignored by the App Router for routing,
 * so it is safe to import from the sibling route handler AND from the Compliance
 * server page for first-paint SSR.
 *
 * Returns `{ error, payload }` so callers preserve the route's exact error
 * handling (route → 500; page → null initialData).
 */
import { assertOrgRole } from '@/lib/org-trading-server';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

/**
 * Build the IPS violations GET payload for a resolved org member.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase RLS-scoped client
 * @param {{ org_id: string, role: string }} member
 * @param {{ includeResolved?: boolean }} [opts] open-only by default (matches the route)
 * @returns {Promise<{ error?: unknown, payload?: object }>}
 */
export async function loadIpsViolations(supabase, member, { includeResolved = false } = {}) {
  let query = supabase
    .from('org_ips_violations')
    .select('*')
    .eq('org_id', member.org_id)
    .order('created_at', { ascending: false })
    .limit(200);
  if (!includeResolved) query = query.eq('resolved', false);

  const { data, error } = await query;
  if (error) return { error };

  return {
    payload: {
      violations: data || [],
      viewer: { canResolve: assertOrgRole(member, MANAGER_ROLES) },
    },
  };
}
