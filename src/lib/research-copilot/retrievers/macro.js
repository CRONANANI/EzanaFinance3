/**
 * Macro indicators retriever — structured. Wraps the macro-indicators core source
 * (@/lib/sonar/sources/macro-indicators), which reads the macro catalogue's series from
 * public.macro_series_latest, so the orchestrator reaches IMF, World Bank, BIS, central-bank,
 * energy, commodity and risk-index series for countries, themes, commodities and rankings,
 * the same way it reaches sanctions or contracts. Public statistics, read server-side.
 */
import macroAdapter from '@/lib/sonar/sources/macro-indicators';
import { resolveQuery } from '@/lib/sonar/resolveQuery';

export const corpus = 'macro';
export const kind = 'structured';
export const scope = 'public';

export async function retrieve(query, ctx = {}, opts = {}) {
  const { limit = 12 } = opts;
  const q = resolveQuery(ctx.rawQuery || query);
  if (!macroAdapter.isRelevant(q)) return [];
  let findings = [];
  try {
    findings = await macroAdapter.search(q, { limit });
  } catch {
    return [];
  }
  return findings.map((f, i) => ({
    corpus,
    id: `${f.meta.iso3 || f.meta.scope || 'world'}:${f.meta.source}:${f.meta.seriesKey || f.meta.family}:${f.meta.period || i}`,
    title: f.title,
    snippet: f.summary,
    url: f.citation?.href || '/datasets/world-bank',
    similarity: typeof f.relevance === 'number' ? f.relevance : null,
    matchType: 'structured',
    date: f.date || null,
    meta: f.meta || {},
  }));
}
