/**
 * Macro indicators retriever — structured. Wraps the macro-indicators core source
 * (@/lib/sonar/sources/macro-indicators), which reads public.macro_series_values, so the
 * orchestrator reaches IMF/World Bank/central-bank/risk-index series the same way it reaches
 * sanctions or contracts. Public statistics (authenticated read on the table).
 */
import macroAdapter from '@/lib/sonar/sources/macro-indicators';
import { resolveQuery } from '@/lib/sonar/resolveQuery';

export const corpus = 'macro';
export const kind = 'structured';
export const scope = 'public';

export async function retrieve(query, ctx = {}, opts = {}) {
  const { limit = 8 } = opts;
  const q = resolveQuery(ctx.rawQuery || query);
  if (!macroAdapter.isRelevant(q)) return [];
  let findings = [];
  try {
    findings = await macroAdapter.search(q, { limit });
  } catch {
    return [];
  }
  return findings.map((f) => ({
    corpus,
    id: `${f.meta.iso3}:${f.meta.source}:${f.meta.seriesKey}:${f.meta.period}`,
    title: f.title,
    snippet: f.summary,
    url: f.citation?.href || '/datasets/world-bank',
    similarity: typeof f.relevance === 'number' ? f.relevance : null,
    matchType: 'structured',
    date: f.date || null,
    meta: f.meta || {},
  }));
}
