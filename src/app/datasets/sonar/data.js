/**
 * Datasets index (Sonar floor): server reads.
 *
 *   figuresFor(labels)  getDatasetSummary per live dataset (each cached 15
 *                       minutes under the `hubs` tag), reduced to
 *                       { records, freshest } or { error: true }.
 *   workedExample()     the console's pinned query, run for real through
 *                       runEzanaQL and cached 15 minutes, so the preview rows
 *                       are a real result and the page never waits on a model.
 *
 * Nothing is estimated. A failed read is { error: true } and the page shows a
 * middle dot; it is never replaced by a number.
 */
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { getDatasetSummary, SUMMARY_LABELS } from '@/lib/datasets/hub-data';
import { runEzanaQL } from '@/lib/ezanaql';
import { SAME_READ_AS } from './derive';
import { WORKED_EXAMPLE } from './worked-example';

/* One read per label per request, shared by the header, the panels and the cards. */
const summaryFor = cache(async (label) => {
  const key = SAME_READ_AS[label] || label;
  if (!SUMMARY_LABELS.includes(key)) return null;
  const s = await getDatasetSummary(key);
  if (!s || s.error) return { error: true };
  return {
    records: Number(s.records) || 0,
    freshest: s.freshest || null,
    empty: !!s.empty,
  };
});

/** label -> { records, freshest, empty } | { error: true } | null (no summary). */
export async function figuresFor(labels) {
  const entries = await Promise.all(labels.map(async (l) => [l, await summaryFor(l)]));
  return Object.fromEntries(entries);
}

async function runExampleOrThrow() {
  if (!isServerSupabaseConfigured()) throw new Error('not configured');
  const started = Date.now();
  const out = await runEzanaQL({
    query: WORKED_EXAMPLE.query,
    admin: getAdminClient(),
    dimension: WORKED_EXAMPLE.dimension,
    format: 'table',
  });
  if (!out?.ok) throw new Error(out?.error || 'run failed');
  return {
    dataset: out.dataset,
    joined: out.joined,
    result: out.result,
    ms: Date.now() - started,
    ranAt: new Date().toISOString(),
  };
}

/* Errors are thrown inside the cache and caught outside, so a failure is
   retried on the next request instead of being served for 15 minutes. */
const cachedExample = unstable_cache(runExampleOrThrow, ['datasets-sonar-example-v1'], {
  revalidate: 900,
  tags: ['hubs'],
});

export async function workedExample() {
  try {
    return await cachedExample();
  } catch (e) {
    console.error('[datasets sonar] worked example', e?.message || e);
    return { error: true };
  }
}
