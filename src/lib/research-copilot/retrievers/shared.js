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
 *   { corpus, id, title, snippet, url, similarity, date, meta }
 *   - similarity : 0..1 cosine for semantic rows; null for structured rows
 *   - date       : ISO/timestamp used for recency ranking of structured rows
 */

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
