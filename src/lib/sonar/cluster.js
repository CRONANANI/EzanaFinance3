/**
 * Cluster: the normalised shape every EzanaQL result (and every template
 * sweep) reduces to, and its canonical signature
 * (sonar-ezanaql-coverage-prompt.md Step 2). The signature keys exemplars,
 * caching and the generated coverage tests:
 *
 *   "capitol.congress_trades+gov.contracts|company|category|t"
 *    datasets (sorted)                     entity kinds group  time?
 */
import { DATASET_DEFS, getDatasetDef } from '@/lib/sonar/catalog';

/**
 * @typedef {{
 *   datasets: string[],
 *   entities: { kind: string, ids: string[], labels: string[] }[],
 *   groupBy: { dim: string, kind: string } | null,
 *   timeWindow: { from: string|null, to: string|null } | null,
 *   rowsByDataset: Record<string, object[]>,
 *   ast: object | null,
 *   query: string | null,
 * }} Cluster
 */

export function signature(c) {
  const ds = [...c.datasets].sort().join('+');
  const ek = [...new Set((c.entities || []).map((e) => e.kind))].sort().join('+') || 'none';
  const gb = c.groupBy ? c.groupBy.kind : 'none';
  const tw = c.timeWindow ? 't' : 'nt';
  return `${ds}|${ek}|${gb}|${tw}`;
}

/** Entities present in the rows, read through the dataset's entity keys. */
export function extractEntities(rowsByDataset) {
  const byKind = new Map();
  for (const [datasetId, rows] of Object.entries(rowsByDataset)) {
    const def = getDatasetDef(datasetId);
    if (!def) continue;
    for (const [kind, field] of Object.entries(def.entityKeys)) {
      for (const row of rows || []) {
        const v = row?.[field];
        if (v == null || v === '') continue;
        const cur = byKind.get(kind) || { kind, ids: [], labels: [] };
        const id = String(v);
        if (!cur.ids.includes(id)) {
          cur.ids.push(id);
          cur.labels.push(id);
        }
        byKind.set(kind, cur);
      }
    }
  }
  return [...byKind.values()].map((e) => ({
    ...e,
    ids: e.ids.slice(0, 24),
    labels: e.labels.slice(0, 24),
  }));
}

const DOTTED = /^[a-z]+\.[a-z_]+$/;

/**
 * Map one executed EzanaQL query (parse() AST + executor result) to a
 * Cluster. `result` is the executor's table shape: { rows, columns, window }.
 */
export function fromEzanaQL({ ast, result, query = null }) {
  const datasets = [ast?.from, ast?.join?.dataset].filter((d) => d && DOTTED.test(d));
  const rows = result?.rows || [];
  /* A JOIN prefixes the joined dataset's fields with its short name; split
     each row's fields back to their dataset so adapters read native shapes. */
  const rowsByDataset = {};
  for (const d of datasets) rowsByDataset[d] = [];
  const joinShort = ast?.join?.dataset ? ast.join.dataset.split('.')[1] : null;
  for (const row of rows) {
    const base = {};
    const joined = {};
    for (const [k, v] of Object.entries(row || {})) {
      if (joinShort && k.startsWith(`${joinShort}.`)) joined[k.slice(joinShort.length + 1)] = v;
      else base[k] = v;
    }
    rowsByDataset[datasets[0]]?.push(base);
    if (datasets[1] && Object.keys(joined).length) rowsByDataset[datasets[1]].push(joined);
  }

  /* Group-by kind from the first grouped field's dim in the catalog. */
  let groupBy = null;
  const gbField = Array.isArray(ast?.groupBy) ? ast.groupBy[0] : null;
  if (gbField) {
    const name = String(gbField.name || gbField)
      .split('.')
      .pop();
    const def = getDatasetDef(datasets[0]);
    groupBy = { dim: name, kind: def?.dims?.[name] || 'category' };
  }

  const timeWindow = result?.window
    ? { from: result.window.since || null, to: result.window.until || null }
    : null;

  return {
    datasets,
    entities: extractEntities(rowsByDataset),
    groupBy,
    timeWindow,
    rowsByDataset,
    ast: ast || null,
    query,
  };
}

/** Build a Cluster directly from rows (the template sweeps use this). */
export function fromRows(rowsByDataset, { groupBy = null, timeWindow = null, query = null } = {}) {
  const datasets = Object.keys(rowsByDataset).filter((d) => DATASET_DEFS[d]);
  return {
    datasets,
    entities: extractEntities(rowsByDataset),
    groupBy,
    timeWindow,
    rowsByDataset,
    ast: null,
    query,
  };
}
