/**
 * US Sanctions retriever — structured. Wraps the taxonomy-driven sanctions
 * source adapter (@/lib/sonar/sources/sanctions) so the orchestrator reaches
 * OFAC SDN listings the same way it reaches congress trades or contracts. The
 * adapter owns the query (it reuses searchSanctions); this module only maps
 * the resolved ping into the adapter and the adapter's findings into the
 * shared retriever Result shape. Public corpus (RLS public-read on the table).
 *
 * corpus:'sanctions'; similarity carries the adapter's recency-weighted
 * relevance so recent designations rank with strong structured hits.
 */
import sanctionsAdapter from '@/lib/sonar/sources/sanctions';
import { resolveQuery } from '@/lib/sonar/resolveQuery';

export const corpus = 'sanctions';
export const kind = 'structured';
export const scope = 'public';

export async function retrieve(query, ctx = {}, opts = {}) {
  const { limit = 6 } = opts;
  const q = resolveQuery(query);
  if (!sanctionsAdapter.isRelevant(q)) return [];

  let findings = [];
  try {
    findings = await sanctionsAdapter.search(q, { limit });
  } catch {
    return [];
  }

  return findings.map((f, i) => ({
    corpus,
    id: f.meta?.entNum != null ? String(f.meta.entNum) : `${f.title}:${i}`,
    title: f.title,
    snippet: f.summary,
    url: f.citation?.href || '/datasets/sanctions',
    similarity: typeof f.relevance === 'number' ? f.relevance : null,
    matchType: 'structured',
    date: f.date || null,
    meta: f.meta || {},
  }));
}
