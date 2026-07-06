/**
 * Embeddings helper (SERVER ONLY). Wraps OpenAI text-embedding-3-small (1536-dim)
 * for semantic Polymarket matching — one place so the model/dimension stay
 * consistent between the market index (cron) and the per-article query. Swap the
 * provider here and the whole pipeline follows, as long as EMBED_DIM matches the
 * pgvector column. Never imported client-side.
 */

export const EMBED_MODEL = 'text-embedding-3-small';
export const EMBED_DIM = 1536;
const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';

export function getEmbeddingKey() {
  return process.env.OPENAI_API_KEY || process.env.OPENAI_EMBEDDING_KEY || '';
}

export function hasEmbeddingKey() {
  return !!getEmbeddingKey();
}

/** Truncate to a safe token-ish budget (embeddings cap ~8k tokens; be generous). */
function clip(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);
}

/**
 * Embed a batch of strings → array of Float vectors (same order). Empty inputs
 * are embedded as-is (OpenAI accepts them); callers should filter blanks first.
 * Returns null on failure so callers can fall back gracefully.
 * @param {string[]} inputs
 * @returns {Promise<number[][]|null>}
 */
export async function embedTexts(inputs) {
  const key = getEmbeddingKey();
  if (!key) return null;
  const arr = (Array.isArray(inputs) ? inputs : [inputs]).map(clip);
  if (!arr.length) return [];
  try {
    const res = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: arr }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = Array.isArray(json?.data) ? json.data : null;
    if (!data || data.length !== arr.length) return null;
    // OpenAI returns items with an `index`; sort defensively before mapping.
    return [...data]
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((d) => (Array.isArray(d.embedding) ? d.embedding : null));
  } catch {
    return null;
  }
}

/** Embed a single string → one vector, or null on failure/no-key. */
export async function embedText(text) {
  const out = await embedTexts([text]);
  return out && out[0] ? out[0] : null;
}
