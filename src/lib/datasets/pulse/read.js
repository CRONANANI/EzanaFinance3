/**
 * The /datasets pulse: one server read that asks every live dataset adapter
 * for its freshest signals, in parallel, and interleaves them for the belt.
 * SERVER ONLY (the adapters read with the service role).
 *
 * Each adapter is bounded by `budgetMs`. A slow reader is not cancelled: its
 * promise keeps running and fills that store's own unstable_cache, so the next
 * read (the client's refresh a few seconds later) gets it. A reader that
 * throws or returns nothing simply contributes no signals. The result never
 * throws.
 *
 * Shape:
 *   {
 *     items:    [{ key, datasetId, dimensionId, icon, headline, meta, at, detail }],
 *     datasets: { [datasetId]: { id, label, dimensionId, dimension, href, source,
 *                 asOf, findings, stats, chart, rows } },
 *     live:     number of live datasets that returned signals,
 *     expected: number of live datasets in the taxonomy,
 *     partial:  true when any adapter timed out or failed,
 *     generatedAt
 *   }
 */
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import { PULSE_ADAPTERS } from './adapters';

const PER_DATASET = 4;
const MAX_ITEMS = 60;

export const datasetSlug = (label) =>
  String(label)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/* label -> { dimension, item } from the taxonomy, the single source of the
   dimension, colour, icon and page href. */
const BY_LABEL = new Map();
for (const dim of DATASET_TAXONOMY) {
  for (const item of dim.items || []) BY_LABEL.set(item.label, { dim, item });
}

let warned = false;
function warnMissingOnce() {
  if (warned) return;
  warned = true;
  const covered = new Set(PULSE_ADAPTERS.map((a) => a.label));
  const missing = DATASET_TAXONOMY.flatMap((d) => d.items || [])
    .filter((it) => it.live && !covered.has(it.label))
    .map((it) => it.label);
  if (missing.length)
    console.warn('[datasets-pulse] live datasets with no adapter:', missing.join(', '));
}

function withBudget(promise, ms) {
  let t;
  const timeout = new Promise((resolve) => {
    t = setTimeout(() => resolve({ timedOut: true }), ms);
  });
  return Promise.race([
    Promise.resolve(promise).then(
      (value) => ({ value }),
      (error) => ({ error }),
    ),
    timeout,
  ]).finally(() => clearTimeout(t));
}

async function runAdapter(adapter, budgetMs) {
  const hit = BY_LABEL.get(adapter.label);
  if (!hit || !hit.item.live) return { skipped: true };
  const { dim, item } = hit;
  const id = datasetSlug(adapter.label);
  let res;
  try {
    res = await withBudget(adapter.read(), budgetMs);
  } catch (error) {
    res = { error };
  }
  if (res.timedOut) return { id, partial: true };
  if (res.error) {
    console.error(`[datasets-pulse] ${adapter.label}:`, res.error?.message || res.error);
    return { id, partial: true };
  }
  let mapped;
  try {
    mapped = adapter.map(res.value) || {};
  } catch (error) {
    console.error(`[datasets-pulse] map ${adapter.label}:`, error?.message || error);
    return { id, partial: true };
  }
  const items = (mapped.items || [])
    .filter((it) => it && it.headline && it.id != null)
    .slice(0, PER_DATASET)
    .map((it) => ({
      key: `${id}:${it.id}`,
      datasetId: id,
      dimensionId: dim.id,
      icon: dim.biIcon || 'bi-broadcast',
      headline: it.headline,
      meta: it.meta || null,
      at: it.at || null,
      detail: it.detail || null,
    }));
  if (!items.length) return { id };
  return {
    id,
    items,
    dataset: {
      id,
      label: adapter.label,
      dimensionId: dim.id,
      dimension: dim.label,
      href: item.href || '/datasets',
      source: adapter.source,
      asOf: mapped.dataset?.asOf || null,
      findings: mapped.dataset?.findings || [],
      stats: mapped.dataset?.stats || [],
      chart: mapped.dataset?.chart || null,
      rows: mapped.dataset?.rows || null,
    },
  };
}

/* Round-robin across datasets so neighbouring belt cards always differ, and
   dimensions are spread rather than clumped (taxonomy order within a lap). */
function interleave(groups) {
  const out = [];
  const queues = groups.map((g) => [...g]);
  while (out.length < MAX_ITEMS && queues.some((q) => q.length)) {
    for (const q of queues) {
      if (q.length) out.push(q.shift());
      if (out.length >= MAX_ITEMS) break;
    }
  }
  return out;
}

export async function readPulse({ budgetMs = 3500 } = {}) {
  warnMissingOnce();
  const results = await Promise.all(PULSE_ADAPTERS.map((a) => runAdapter(a, budgetMs)));
  const datasets = {};
  const groups = [];
  let partial = false;
  for (const r of results) {
    if (r.skipped) continue;
    if (r.partial) partial = true;
    if (r.items?.length) {
      datasets[r.id] = r.dataset;
      groups.push(r.items);
    }
  }
  const expected = DATASET_TAXONOMY.flatMap((d) => d.items || []).filter((it) => it.live).length;
  return {
    items: interleave(groups),
    datasets,
    live: groups.length,
    expected,
    partial,
    generatedAt: new Date().toISOString(),
  };
}
