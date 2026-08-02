/**
 * Flag-gated query rewrite (RAG_SYSTEM.md §3 P4). One Haiku call normalizes an
 * ambiguous query into a keyword-rich reformulation and extracts entities +
 * soft corpus hints. Strict JSON; 5s timeout; ANY failure returns the original
 * query unchanged (rewrite is an optimizer, never a point of failure). The local
 * classification (generalized from sonar/retrieval.js classifyQuery) is included
 * as a cheap, zero-LLM hint even when the LLM rewrite is off or fails.
 */
import { classifyQuery } from '@/lib/sonar/retrieval';

const REWRITE_MODEL = 'claude-haiku-4-5-20251001';
const VALID_CORPORA = new Set(['echo', 'markets', 'congress', 'contracts', 'research_notes']);

export function rewriteEnabled() {
  return process.env.RAG_REWRITE === '1' && !!process.env.ANTHROPIC_API_KEY;
}

function strArray(v) {
  return Array.isArray(v) ? v.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 8) : [];
}

export async function rewriteQuery(query, { timeoutMs = 5000 } = {}) {
  const original = String(query || '').trim();
  const fallback = {
    rewritten: original,
    entities: { tickers: [], names: [] },
    corpusHints: [],
    classification: classifyQuery(original),
    used: false,
  };
  if (!rewriteEnabled() || !original) return fallback;

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
        model: REWRITE_MODEL,
        max_tokens: 300,
        system:
          'Normalize a user search query for retrieval over financial datasets (editorial articles, prediction markets, congressional trades, government contracts). Reply ONLY with strict JSON, no prose: {"rewritten": "<clear keyword-rich reformulation>", "entities": {"tickers": [], "names": []}, "corpusHints": []}. corpusHints is zero or more of: echo, markets, congress, contracts, research_notes.',
        messages: [{ role: 'user', content: original }],
      }),
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const text = String(data?.content?.[0]?.text || '')
      .replace(/```json|```/g, '')
      .trim();
    const parsed = JSON.parse(text);
    const rewritten = String(parsed?.rewritten || '').trim() || original;
    const corpusHints = strArray(parsed?.corpusHints).filter((c) => VALID_CORPORA.has(c));
    return {
      rewritten,
      entities: {
        tickers: strArray(parsed?.entities?.tickers).map((t) => t.toUpperCase()),
        names: strArray(parsed?.entities?.names),
      },
      corpusHints,
      classification: classifyQuery(original),
      used: rewritten !== original || corpusHints.length > 0,
    };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
