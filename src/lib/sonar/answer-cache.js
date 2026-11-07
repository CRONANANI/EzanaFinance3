/**
 * Sonar quick-answer cache (Nov 2026): the finished /api/sonar/query result, 15 minutes,
 * in the shared cache (src/lib/cache.js: in-process plus Redis when configured). Pure
 * helpers so the key and the never-cache rules are testable.
 *
 * Never cached: a ping that searched an org's own research notes (per-org data), a
 * degraded or empty answer, or one flagged for advice language.
 */
import { createHash } from 'node:crypto';

export const SONAR_ANSWER_TTL_SECONDS = 15 * 60;

/* Corpora that hold one org's own data. */
export const ORG_CORPORA = new Set(['research_notes']);

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Cache key: sonar:qa:v1:<sha256 of the normalized query, context, depth, sorted entitled
 * dataset ids and whether web search is on>.
 */
export function sonarAnswerCacheKey({
  query,
  context = '',
  depth,
  datasets = [],
  webSearch = false,
}) {
  const parts = [
    norm(query),
    norm(context),
    String(depth || ''),
    [...(datasets || [])].map(String).sort().join(','),
    webSearch ? 'web' : 'noweb',
  ];
  return `sonar:qa:v1:${createHash('sha256').update(parts.join('\u0001')).digest('hex')}`;
}

/** True when this ping may read or write the cache: it searches no org corpus. */
export const cacheableSearch = (corpora = []) => !(corpora || []).some((c) => ORG_CORPORA.has(c));

/** True when a finished payload may be stored. */
export function shouldCacheSonarAnswer(payload, { corporaSearched = [], corporaUsed = [] } = {}) {
  if (!payload?.briefing || !payload.grounded) return false;
  if (payload.degraded || payload.empty || payload.advice_flagged) return false;
  return cacheableSearch(corporaSearched) && cacheableSearch(corporaUsed);
}
