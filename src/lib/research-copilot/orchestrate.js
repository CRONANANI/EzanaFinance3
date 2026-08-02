import { getAdminClient } from '@/lib/supabase';
import { supaEmbedConfigured } from '@/lib/embeddings-gte';
import { embedViaSupabaseCached } from '@/lib/rag/embed-cached';
import { RETRIEVERS } from './retrievers';
import { extractEntities } from './entities';
import { recencyScore } from './retrievers/shared';
import { rerank, rerankEnabled } from '@/lib/rag/rerank';
import { rewriteQuery, rewriteEnabled } from '@/lib/rag/query-rewrite';

/**
 * Cross-corpus retrieval orchestrator.
 *
 * 1. Fan out to every retriever the caller is allowed to use (org corpora only
 *    when an org member is present — org-scoping/RLS is enforced inside those
 *    retrievers, this just gates whether they run at all).
 * 2. Merge results, dedupe by (corpus,id).
 * 3. Rank on one unified score (semantic → cosine similarity; structured →
 *    recency-weighted), then select with a per-corpus cap so no single corpus
 *    dominates — guaranteeing a visible mix.
 * 4. Budget the context (char/token cap), trimming lowest-ranked first.
 *
 * Returns { items, corporaSearched, corporaUsed, entities } — every item keeps
 * full provenance (corpus, title, url, date, similarity, meta).
 */

const DEFAULT_TOPK = 10;
const DEFAULT_PER_CORPUS_CAP = 4;
const DEFAULT_PER_RETRIEVER = 6;
// ~4 chars/token; budget the injected context so the prompt stays bounded.
const DEFAULT_CHAR_BUDGET = 9000;

/** Unified 0..1 score: semantic by similarity, structured by recency band. */
function scoreOf(item) {
  if (item.similarity != null && Number.isFinite(item.similarity)) {
    return Math.max(0, Math.min(1, Number(item.similarity)));
  }
  // Structured rows: keep them competitive but below strong semantic hits.
  return 0.15 + 0.5 * recencyScore(item.date);
}

export async function orchestrate(query, options = {}) {
  const {
    admin = getAdminClient(),
    supabaseUser = null,
    member = null,
    topK = DEFAULT_TOPK,
    perCorpusCap = DEFAULT_PER_CORPUS_CAP,
    perRetriever = DEFAULT_PER_RETRIEVER,
    charBudget = DEFAULT_CHAR_BUDGET,
    // Optional allow-list of corpus names. When provided, only those retrievers
    // run (still subject to the org-member gate below). Omit for all corpora —
    // so existing callers (the research copilot) are unchanged.
    allowCorpora = null,
    // Eval baseline: semantic-only (skip the lexical merge in hybrid retrievers).
    // Default false — existing callers unchanged. Used by the RAG eval harness's
    // naive mode (RAG_SYSTEM.md §3 Phase 2).
    semanticOnly = false,
  } = options;

  const q = String(query || '').trim();
  if (!q)
    return {
      items: [],
      corporaSearched: [],
      corporaUsed: [],
      entities: null,
      rerankUsed: false,
      rewriteUsed: false,
    };

  // Optional flag-gated query rewrite (RAG_SYSTEM.md §3 P4): normalize an ambiguous
  // query BEFORE retrieval; embed + extract entities from the rewritten form. Its
  // corpusHints are a SOFT ranking signal only (applied as a small score bonus
  // below) — they never widen allowCorpora, so Sonar's entitlement gate stays
  // authoritative. Any failure returns the original query (rewriteUsed:false).
  let effectiveQuery = q;
  let rewriteUsed = false;
  let corpusHints = [];
  if (rewriteEnabled()) {
    const rw = await rewriteQuery(q);
    if (rw.used) {
      effectiveQuery = rw.rewritten || q;
      corpusHints = rw.corpusHints || [];
      rewriteUsed = true;
    }
  }
  const hintSet = new Set(corpusHints);

  // Build the shared context ONCE: embed the query (semantic corpora reuse it)
  // and extract entities (structured corpora use them).
  const queryEmbedding = supaEmbedConfigured() ? await embedViaSupabaseCached(effectiveQuery) : null;
  const entities = extractEntities(effectiveQuery);
  const ctx = { admin, supabaseUser, member, entities, queryEmbedding };

  // Only run org-scoped retrievers when we have an org member; and, when an
  // allow-list is given (e.g. Sonar's entitlement gate), only those corpora.
  const allowSet = Array.isArray(allowCorpora) ? new Set(allowCorpora) : null;
  const allowed = RETRIEVERS.filter(
    (r) => (r.scope !== 'org' || Boolean(member)) && (!allowSet || allowSet.has(r.corpus)),
  );
  const corporaSearched = allowed.map((r) => r.corpus);

  // Fan out concurrently; a retriever that throws contributes nothing.
  const settled = await Promise.all(
    allowed.map(async (r) => {
      try {
        const rows = await r.retrieve(effectiveQuery, ctx, { limit: perRetriever, semanticOnly });
        return Array.isArray(rows) ? rows : [];
      } catch {
        return [];
      }
    }),
  );

  // Merge + dedupe by (corpus,id), keeping the higher-scored duplicate.
  const byKey = new Map();
  for (const rows of settled) {
    for (const item of rows) {
      if (!item || !item.corpus || item.id == null) continue;
      const key = `${item.corpus}:${item.id}`;
      // Soft corpus-hint bonus: gently prefer hinted corpora WITHIN the already-
      // allowed set — never widens scope (allowCorpora is unchanged above).
      const hintBonus = hintSet.has(item.corpus) ? 0.03 : 0;
      const scored = { ...item, score: Math.min(1, scoreOf(item) + hintBonus) };
      const prev = byKey.get(key);
      if (!prev || scored.score > prev.score) byKey.set(key, scored);
    }
  }

  // Rank by score. When reranking is enabled, retrieve wide (top-20 by score),
  // reorder with one batched Haiku cross-encoder call, and feed the reranked
  // top-K into the per-corpus cap below — the corpus-mix guarantee stays intact
  // because the cap runs AFTER. Rerank is an optimizer: on any failure it returns
  // the input order (reranked:false) and the flow is bit-for-bit the unranked path.
  const ranked = [...byKey.values()].sort((a, b) => b.score - a.score);
  let pool = ranked;
  let rerankUsed = false;
  if (rerankEnabled()) {
    const { items: rr, reranked } = await rerank(effectiveQuery, ranked.slice(0, 20), { keep: topK });
    if (reranked) {
      pool = rr;
      rerankUsed = true;
    }
  }

  // Select with a per-corpus cap (visible mix).
  const perCorpus = new Map();
  const selected = [];
  for (const item of pool) {
    if (selected.length >= topK) break;
    const used = perCorpus.get(item.corpus) || 0;
    if (used >= perCorpusCap) continue;
    perCorpus.set(item.corpus, used + 1);
    selected.push(item);
  }

  // Budget the context: trim lowest-ranked until under the char cap.
  const budgeted = [];
  let chars = 0;
  for (const item of selected) {
    const cost = (item.title || '').length + (item.snippet || '').length + 32;
    if (chars + cost > charBudget && budgeted.length > 0) break;
    chars += cost;
    budgeted.push(item);
  }

  const corporaUsed = [...new Set(budgeted.map((i) => i.corpus))];
  return { items: budgeted, corporaSearched, corporaUsed, entities, rerankUsed, rewriteUsed };
}
