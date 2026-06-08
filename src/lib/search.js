/**
 * Search helpers backed by Postgres search infrastructure (see migration
 * 20260617000200_search_infrastructure.sql).
 *
 *   • escapeLikePattern  — for trigram-accelerated ILIKE '%q%' substring search
 *                          (names, message content). Escapes LIKE metacharacters
 *                          so user input can't inject wildcards.
 *   • cleanSearchQuery   — normalize free-text before handing it to Supabase
 *                          `.textSearch(col, q, { type: 'websearch' })`, which
 *                          maps to @@ websearch_to_tsquery for FTS.
 */

/** Escape `%`, `_`, and `\` so user input is treated literally in LIKE/ILIKE. */
export function escapeLikePattern(raw) {
  return String(raw ?? '').replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Build a `%q%` substring pattern with metacharacters escaped. */
export function likeContains(raw) {
  return `%${escapeLikePattern(raw)}%`;
}

/**
 * Normalize a free-text query for full-text search. Trims, collapses
 * whitespace, and caps length. `websearch_to_tsquery` tolerates arbitrary user
 * text (quotes, OR, -negation), so we don't need to strip operators — just
 * bound the input. Returns '' when there's nothing searchable.
 */
export function cleanSearchQuery(raw, { maxLen = 128 } = {}) {
  const s = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
  return s;
}
