/**
 * Server-only embedding via the Supabase `embed` edge function (built-in
 * gte-small model, 384-dim). No external key — Supabase hosts the model. Both
 * the prediction-market index cron and /api/market-data/related-markets embed
 * through here so market questions and article text share one vector space.
 */

export const GTE_DIM = 384;

export function supaEmbedConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Embed a string → 384-dim vector (or null on failure/misconfig). The edge
 * function is JWT-gated; we call it server-side with the service-role key.
 * @param {string} input
 * @returns {Promise<number[]|null>}
 */
export async function embedViaSupabase(input) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const text = String(input || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
  if (!text) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ input: text }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    const emb = Array.isArray(json?.embedding) ? json.embedding : null;
    return emb && emb.length === GTE_DIM ? emb : null;
  } catch {
    return null;
  }
}
