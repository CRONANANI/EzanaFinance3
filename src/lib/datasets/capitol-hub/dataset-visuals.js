/**
 * Capitol Watch: the small visuals on the five dataset cards, from one
 * precomputed row (mv_capitol_dataset_visuals, migration 20261008000900,
 * refreshed with the other Capitol read models). SERVER ONLY.
 * Missing or failing: { error } and the cards render without their visual.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { configured, timed } from '@/lib/datasets/hub-data';

async function loadOrThrow() {
  if (!configured()) throw new Error('not configured');
  const { data, error } = await timed(
    getAdminClient()
      .from('mv_capitol_dataset_visuals')
      .select('payload, built_at')
      .eq('id', 1)
      .maybeSingle(),
  );
  if (error) throw new Error(error.message);
  if (!data?.payload) throw new Error('empty');
  return { ...data.payload, builtAt: data.built_at };
}
const cached = unstable_cache(loadOrThrow, ['capitol-dataset-visuals-v1'], {
  revalidate: 900,
  tags: ['hubs'],
});

/** { trades, contracts, lobbying, finance, committees, builtAt } | { error }. */
export async function getDatasetVisuals() {
  try {
    return await cached();
  } catch (e) {
    if (e?.message !== 'empty') console.warn('[capitol-hub] dataset visuals:', e?.message || e);
    return { error: true };
  }
}
