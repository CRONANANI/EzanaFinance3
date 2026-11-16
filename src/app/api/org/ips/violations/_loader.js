/**
 * Shared loader for the IPS violations list.
 *
 * Underscore-prefixed, colocated module: ignored by the App Router for routing,
 * so it is safe to import from the sibling route handler AND from the Compliance
 * server page for first-paint SSR.
 *
 * Returns `{ error, payload }` so callers preserve the route's exact error
 * handling (route gives 500; page gives null initialData).
 *
 * Who resolved a breach, when and why are stored only once the optional
 * columns resolved_at, resolved_by and resolution_reason exist (see the
 * Compliance redesign's sql.md). Until then `viewer.resolutionStorage` is
 * false, those fields are never sent, and the page says "Not recorded".
 */
import { assertOrgRole } from '@/lib/org-trading-server';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

/** True when the optional resolution columns exist. A failed probe reads as false. */
export async function hasResolutionColumns(supabase) {
  try {
    const { error } = await supabase
      .from('org_ips_violations')
      .select('resolved_at, resolved_by, resolution_reason', { head: true, count: 'exact' })
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Build the IPS violations GET payload for a resolved org member.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase RLS-scoped client
 * @param {{ org_id: string, role: string }} member
 * @param {{ includeResolved?: boolean, state?: 'open'|'resolved'|'all' }} [opts]
 *   open only by default (matches the route and every count that reads it)
 * @returns {Promise<{ error?: unknown, payload?: object }>}
 */
export async function loadIpsViolations(supabase, member, { includeResolved = false, state } = {}) {
  const scope = state || (includeResolved ? 'all' : 'open');
  const [resolutionStorage, listed] = await Promise.all([
    hasResolutionColumns(supabase),
    (async () => {
      let query = supabase
        .from('org_ips_violations')
        .select('*')
        .eq('org_id', member.org_id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (scope === 'open') query = query.eq('resolved', false);
      if (scope === 'resolved') query = query.eq('resolved', true);
      return query;
    })(),
  ]);
  const { data, error } = listed;
  if (error) return { error };

  let violations = data || [];
  if (resolutionStorage && scope !== 'open') {
    const ids = [...new Set(violations.map((v) => v.resolved_by).filter(Boolean))];
    let names = new Map();
    if (ids.length) {
      const { data: members } = await supabase
        .from('org_members')
        .select('user_id, display_name')
        .eq('org_id', member.org_id)
        .in('user_id', ids);
      names = new Map((members || []).map((m) => [m.user_id, m.display_name]));
    }
    violations = violations.map((v) => ({
      ...v,
      resolved_by_name: v.resolved_by ? names.get(v.resolved_by) || 'Former member' : null,
    }));
  }

  return {
    payload: {
      violations,
      viewer: { canResolve: assertOrgRole(member, MANAGER_ROLES), resolutionStorage },
    },
  };
}
