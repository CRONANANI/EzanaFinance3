/**
 * Query-embedding cache (RAG_SYSTEM.md §3 P5). Help-center + Sonar queries repeat
 * heavily; cache the gte-small vector keyed by the sha256 of the normalized query
 * so repeats skip the edge-function round trip. Query-time ONLY — indexer crons
 * keep the raw embedViaSupabase (document text ≠ repeat queries). Any cache error
 * degrades silently to the uncached path; the cache is never a point of failure.
 */
import { createHash } from 'node:crypto';
import { getAdminClient } from '@/lib/supabase';
import { embedViaSupabase, GTE_DIM } from '@/lib/embeddings-gte';

// Normalize EXACTLY as embeddings-gte.js does before it embeds, so the hash keys
// the same text the model would see.
function normalize(input) {
  return String(input || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
}

function hashOf(text) {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * Embed a query string → 384-dim vector (or null), reading through the cache.
 * @param {string} input
 * @returns {Promise<number[]|null>}
 */
export async function embedViaSupabaseCached(input) {
  const text = normalize(input);
  if (!text) return null;

  let admin = null;
  let queryHash = null;
  try {
    admin = getAdminClient();
    queryHash = hashOf(text);
    const { data, error } = await admin
      .from('query_embedding_cache')
      .select('embedding')
      .eq('query_hash', queryHash)
      .maybeSingle();
    if (!error && data?.embedding) {
      const vec =
        typeof data.embedding === 'string' ? JSON.parse(data.embedding) : data.embedding;
      if (Array.isArray(vec) && vec.length === GTE_DIM) {
        // Fire-and-forget atomic bump (hit_count + last_hit_at); never block on it.
        admin.rpc('increment_query_cache_hit', { p_hash: queryHash }).then(
          () => {},
          () => {},
        );
        return vec.map(Number);
      }
    }
  } catch {
    // fall through to uncached embed
  }

  const vec = await embedViaSupabase(text);
  if (Array.isArray(vec) && vec.length === GTE_DIM && admin && queryHash) {
    // Insert on miss; ignore conflict (a concurrent request may have inserted it).
    admin
      .from('query_embedding_cache')
      .upsert(
        { query_hash: queryHash, embedding: JSON.stringify(vec) },
        { onConflict: 'query_hash', ignoreDuplicates: true },
      )
      .then(() => {}, () => {});
  }
  return vec;
}
