/**
 * Shared loader for the IPS rules list.
 *
 * Underscore-prefixed, colocated module — ignored by the App Router for routing,
 * so it is safe to import from the sibling route handler AND from the Compliance
 * server page for first-paint SSR.
 *
 * Returns `{ error, payload }` so callers preserve the route's exact error
 * handling (route → 500; page → null initialData).
 */
export const RULE_TYPES = [
  'max_position_pct',
  'max_sector_pct',
  'min_positions',
  'max_positions',
  'prohibited_ticker',
  'prohibited_sector',
  'min_market_cap',
  'max_single_trade_pct',
  'cash_floor_pct',
];

/**
 * Build the IPS rules GET payload for a resolved org member.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase RLS-scoped client
 * @param {{ org_id: string, role: string }} member
 * @returns {Promise<{ error?: unknown, payload?: object }>}
 */
export async function loadIpsRules(supabase, member) {
  const { data, error } = await supabase
    .from('org_ips_rules')
    .select('*')
    .eq('org_id', member.org_id)
    .order('created_at', { ascending: true });
  if (error) return { error };

  return {
    payload: {
      rules: data || [],
      ruleTypes: RULE_TYPES,
      viewer: { canEdit: member.role === 'executive' },
    },
  };
}
