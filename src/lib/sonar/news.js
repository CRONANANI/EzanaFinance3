/**
 * News for any cluster (sonar-ezanaql-coverage-prompt.md Step 6): the query
 * is built from the cluster's top entity labels (must) and the datasets'
 * context keywords (any); the read runs against the cached news table with a
 * 2.5s cap, deduped by title, ranked by recency and entity hits. Both
 * sources dry -> the caller hides the block and adds a coverage note.
 */
import { getAdminClient } from '@/lib/supabase';
import { getDatasetDef } from '@/lib/sonar/catalog';
import { fetchIndustryNews } from '@/lib/sonar/industry-news';

const PRIORITY = ['company', 'person_politician', 'fund', 'industry', 'country', 'theme', 'agency'];

export function buildNewsQuery(cluster) {
  const must = [];
  for (const kind of PRIORITY) {
    const e = cluster.entities.find((x) => x.kind === kind);
    for (const label of e?.labels || []) {
      if (must.length < 2 && label.length > 2 && !/^\d+$/.test(label)) must.push(label);
    }
    if (must.length >= 2) break;
  }
  const any = [
    ...new Set(cluster.datasets.flatMap((d) => getDatasetDef(d)?.newsKeywords || [])),
  ].slice(0, 6);
  const tickers = (cluster.entities.find((e) => e.kind === 'company')?.ids || [])
    .filter((t) => /^[A-Z.]{1,6}$/.test(t))
    .slice(0, 6);
  const countries = (cluster.entities.find((e) => e.kind === 'country')?.ids || []).slice(0, 3);
  return { must, any, tickers, countries };
}

export async function fetchClusterNews(cluster, { limit = 5, timeoutMs = 2500 } = {}) {
  const q = buildNewsQuery(cluster);
  const terms = [...q.must, ...q.tickers.slice(0, 2)];
  if (!terms.length) return { query: q, items: [] };
  try {
    const admin = getAdminClient();
    const read = fetchIndustryNews(admin, { terms }, { days: 14, limit });
    const items = await Promise.race([
      read,
      new Promise((resolve) => {
        setTimeout(() => resolve([]), timeoutMs);
      }),
    ]);
    const seen = new Set();
    const deduped = [];
    for (const n of items || []) {
      const k = String(n.title || '').toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      deduped.push(n);
    }
    return { query: q, items: deduped.slice(0, limit) };
  } catch {
    return { query: q, items: [] };
  }
}
