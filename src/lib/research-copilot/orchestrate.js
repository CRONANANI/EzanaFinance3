import { getAdminClient } from '@/lib/supabase';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';
import { RETRIEVERS } from './retrievers';
import { extractEntities } from './entities';
import { recencyScore } from './retrievers/shared';

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
  } = options;

  const q = String(query || '').trim();
  if (!q) return { items: [], corporaSearched: [], corporaUsed: [], entities: null };

  // Build the shared context ONCE: embed the query (semantic corpora reuse it)
  // and extract entities (structured corpora use them).
  const queryEmbedding = supaEmbedConfigured() ? await embedViaSupabase(q) : null;
  const entities = extractEntities(q);
  const ctx = { admin, supabaseUser, member, entities, queryEmbedding };

  // Only run org-scoped retrievers when we have an org member.
  const allowed = RETRIEVERS.filter((r) => r.scope !== 'org' || Boolean(member));
  const corporaSearched = allowed.map((r) => r.corpus);

  // Fan out concurrently; a retriever that throws contributes nothing.
  const settled = await Promise.all(
    allowed.map(async (r) => {
      try {
        const rows = await r.retrieve(q, ctx, { limit: perRetriever });
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
      const scored = { ...item, score: scoreOf(item) };
      const prev = byKey.get(key);
      if (!prev || scored.score > prev.score) byKey.set(key, scored);
    }
  }

  // Rank by score, then select with a per-corpus cap (visible mix).
  const ranked = [...byKey.values()].sort((a, b) => b.score - a.score);
  const perCorpus = new Map();
  const selected = [];
  for (const item of ranked) {
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
  return { items: budgeted, corporaSearched, corporaUsed, entities };
}
