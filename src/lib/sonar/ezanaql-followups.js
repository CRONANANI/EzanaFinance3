/**
 * Follow-ups as EzanaQL mutations (sonar-ezanaql-coverage-prompt.md Step 8):
 * each chip is a fresh EzanaQL query derived from the cluster (add a joined
 * dataset, group by another dimension, rank by a metric), and every
 * candidate is run through the real parser AND validator before it is
 * offered, so a chip is guaranteed executable, never free text.
 */
import { parse } from '@/lib/ezanaql/parser';
import { validate } from '@/lib/ezanaql/validator';
import { CATALOG } from '@/lib/ezanaql/catalog';
import { getDatasetDef } from '@/lib/sonar/catalog';

function isValid(query) {
  try {
    validate(parse(query), {});
    return true;
  } catch {
    return false;
  }
}

export function suggestAstFollowups(cluster, { max = 4 } = {}) {
  const primary = cluster.datasets[0];
  const catalogEntry = CATALOG[primary];
  const def = getDatasetDef(primary);
  if (!catalogEntry || !def) return [];
  const out = [];
  const push = (label, query) => {
    if (out.length >= max || !isValid(query)) return;
    out.push({ label, query, kind: 'ezanaql' });
  };

  /* Rank by the primary metric; with no numeric metric, newest first by
     the dataset's time field instead. */
  const metric = Object.keys(def.metrics)[0];
  if (metric) {
    push(
      `Top 10 by ${metric.replace(/_/g, ' ')}`,
      `FROM ${primary} ORDER BY ${metric} DESC LIMIT 10`,
    );
  } else {
    const timeField = Object.entries(def.dims).find(([, kind]) => kind === 'time')?.[0];
    if (timeField) {
      push('Newest 10', `FROM ${primary} ORDER BY ${timeField} DESC LIMIT 10`);
    }
  }

  /* Add a joinable dataset the cluster does not have yet. */
  for (const other of catalogEntry.joinableWith || []) {
    if (cluster.datasets.includes(other)) continue;
    const key = (catalogEntry.joinKeys || [])[0];
    if (!key) break;
    const otherDef = getDatasetDef(other);
    if (!otherDef?.available) continue;
    push(`Join ${otherDef.label}`, `FROM ${primary} SEMI JOIN ${other} ON ${key} LIMIT 50`);
    if (out.length >= max) break;
  }

  /* Group by another category dimension. */
  const gbNow = cluster.groupBy?.dim || null;
  const catDim = Object.entries(def.dims).find(
    ([name, kind]) => kind === 'category' && name !== gbNow && def.metrics[metric],
  )?.[0];
  if (catDim && metric) {
    push(
      `By ${catDim.replace(/_/g, ' ')}`,
      `FROM ${primary} SELECT ${catDim}, SUM(${metric}) AS total GROUP BY ${catDim} ORDER BY total DESC LIMIT 15`,
    );
  }

  return out;
}
