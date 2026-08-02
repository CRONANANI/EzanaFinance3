/**
 * LLM rerank (RAG_SYSTEM.md §3 P3). One batched Haiku call scores candidate
 * relevance 0–10; strict-JSON reply; any failure returns the input order
 * (rerank is an optimizer, never a point of failure).
 */
const RERANK_MODEL = 'claude-haiku-4-5-20251001';

export function rerankEnabled() {
  return process.env.RAG_RERANK === '1' && !!process.env.ANTHROPIC_API_KEY;
}

export async function rerank(query, items, { keep = 6, timeoutMs = 6000 } = {}) {
  if (!rerankEnabled() || !Array.isArray(items) || items.length <= keep) {
    return { items: items.slice(0, keep), reranked: false };
  }
  const listing = items
    .map((it, i) => `[${i}] (${it.corpus}) ${it.title}\n${(it.snippet || '').slice(0, 280)}`)
    .join('\n\n');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: RERANK_MODEL,
        max_tokens: 400,
        system:
          'Score each candidate 0-10 for relevance to the query. Reply ONLY with a JSON array of {"i":<index>,"s":<score>} objects, nothing else.',
        messages: [{ role: 'user', content: `Query: ${query}\n\nCandidates:\n\n${listing}` }],
      }),
    });
    if (!res.ok) return { items: items.slice(0, keep), reranked: false };
    const data = await res.json();
    const text = String(data?.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
    const scores = JSON.parse(text);
    if (!Array.isArray(scores)) throw new Error('bad shape');
    const byIndex = new Map(scores.map((r) => [Number(r.i), Number(r.s)]));
    const ranked = items
      .map((it, i) => ({ it, s: byIndex.has(i) ? byIndex.get(i) : -1 }))
      .sort((a, b) => b.s - a.s)
      .map((r) => r.it);
    return { items: ranked.slice(0, keep), reranked: true };
  } catch {
    return { items: items.slice(0, keep), reranked: false };
  } finally {
    clearTimeout(timer);
  }
}
