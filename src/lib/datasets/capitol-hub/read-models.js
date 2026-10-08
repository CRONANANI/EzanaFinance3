/**
 * Rebuild the Capitol Watch hub's materialized read models (open positions
 * and the committee by sector heatmap). Called by the congress-trades and
 * committees crons after they write. Never throws: a failed refresh leaves
 * the previous models in place and is reported in the cron's response.
 * SERVER ONLY.
 */
import { getAdminClient } from '@/lib/supabase';

export async function refreshCapitolReadModels() {
  const started = Date.now();
  try {
    const { error } = await getAdminClient().rpc('refresh_capitol_hub_read_models');
    if (error) return { ok: false, error: error.message };
    return { ok: true, ms: Date.now() - started };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}
