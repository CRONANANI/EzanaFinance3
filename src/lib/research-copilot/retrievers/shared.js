/**
 * Common retriever contract for the research copilot.
 *
 * Every corpus (semantic or structured) exposes the same interface so the
 * orchestrator can treat them uniformly:
 *
 *   module.corpus  : string            — stable corpus id ('echo', 'markets', …)
 *   module.kind    : 'semantic'|'structured'
 *   module.scope   : 'public'|'org'    — 'org' retrievers need an org member
 *   module.retrieve(query, ctx, opts) : Promise<Result[]>
 *
 * ctx (built once by the orchestrator, shared across retrievers):
 *   { admin, supabaseUser, member, entities, queryEmbedding }
 *   - admin          : service-role client (public corpora)
 *   - supabaseUser   : user cookie client (org corpora, RLS-scoped) | null
 *   - member         : { org_id, user_id, role } | null
 *   - entities       : extracted { tickers, names, sectors, keywords } (structured corpora)
 *   - queryEmbedding : the query embedded once (384-dim) | null (semantic corpora)
 *
 * Result (vectors stripped before return):
 *   { corpus, id, title, snippet, url, similarity, matchType, date, meta }
 *   - similarity : 0..1 cosine for semantic rows; null for lexical/structured rows
 *   - matchType  : 'semantic' | 'lexical' | 'both' | 'structured' — which branch
 *                  produced the row (semantic corpora run BOTH vector + lexical
 *                  passes and merge; structured corpora are SQL-filtered)
 *   - date       : ISO/timestamp used for recency ranking of structured rows
 */

/**
 * Merge a semantic pass and a lexical pass for ONE corpus, deduping by id and
 * tagging matchType. A row found by both branches → 'both' (and keeps the
 * semantic similarity). This is why every semantic retriever runs both: exact
 * identifiers (tickers, award IDs, names) hit lexically where vectors miss.
 */
export function mergeBranches(semantic = [], lexical = []) {
  const byId = new Map();
  for (const r of semantic) byId.set(String(r.id), { ...r, matchType: 'semantic' });
  for (const r of lexical) {
    const key = String(r.id);
    const prev = byId.get(key);
    if (prev) {
      prev.matchType = 'both';
      if (prev.similarity == null && r.similarity != null) prev.similarity = r.similarity;
    } else {
      byId.set(key, { ...r, matchType: 'lexical' });
    }
  }
  return [...byId.values()];
}

/** Collapse whitespace and cap a snippet length for context budgeting. */
export function snippet(text, max = 320) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Recency score in 0..1 — newer is higher, ~2-year half-life. Null date → 0.4. */
export function recencyScore(date) {
  if (!date) return 0.4;
  const t = new Date(date).getTime();
  if (!Number.isFinite(t)) return 0.4;
  const ageDays = Math.max(0, (Date.now() - t) / 86400000);
  return Math.max(0.15, Math.min(1, Math.exp(-ageDays / 730)));
}

/** Compact USD formatting for structured-row snippets ("$1.2M", "$450K"). */
export function usd(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return null;
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}
