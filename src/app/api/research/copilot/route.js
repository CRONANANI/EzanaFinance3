import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { orchestrate } from '@/lib/research-copilot/orchestrate';
import { CORPUS_LABELS } from '@/lib/research-copilot/retrievers';

/**
 * POST /api/research/copilot — cross-corpus research copilot (auth required).
 *
 * Retrieves across research notes (org-private, RLS-scoped), Echo articles,
 * prediction markets, congressional trades, and government contracts, then
 * synthesizes a grounded, cited answer. Provenance per claim; honest empty-state;
 * no financial advice. Degrades to source list if the LLM key is absent.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ANTHROPIC_MODEL = 'claude-sonnet-4-5';
const DISCLAIMER =
  'This is sourced research information, not financial advice or a recommendation to buy or sell any security.';

const SYSTEM_PROMPT = `You are Ezana's research copilot. Answer the analyst's question using ONLY the provided sources. Rules:
- Ground every claim in the provided sources and CITE each claim inline with its source marker, e.g. [S1], and name the corpus (research note, Echo, market, trade, contract) in prose.
- Synthesize across corpora; when sources disagree or point in different directions, say so explicitly.
- If the provided sources do not cover the question, say plainly that Ezana's corpora don't cover it — do not fabricate or fill gaps from outside knowledge.
- Present findings only. Do NOT give financial or investment advice, price targets, or buy/sell/hold recommendations.
- Be concise and analytical. End with a one-line note of which corpora informed the answer.`;

function buildContext(items) {
  return items
    .map((it, i) => {
      const label = CORPUS_LABELS[it.corpus] || it.corpus;
      const tags = [];
      if (it.meta?.ticker) tags.push(it.meta.ticker);
      if (it.meta?.sector) tags.push(it.meta.sector);
      if (it.date) tags.push(String(it.date).slice(0, 10));
      const tagStr = tags.length ? ` (${tags.join(', ')})` : '';
      return `[S${i + 1} · ${label}] "${it.title}"${tagStr}\n${it.snippet || ''}`;
    })
    .join('\n\n');
}

async function synthesize(query, items) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { answer: null, degraded: 'no LLM key' };

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Sources:\n\n${buildContext(items)}\n\n---\nQuestion: ${query}\n\nAnswer using only the sources above. Cite each claim with its [S#] marker and name the corpus.`,
          },
        ],
      }),
    });
    if (!res.ok) return { answer: null, degraded: `llm ${res.status}` };
    const data = await res.json();
    const answer = data?.content?.[0]?.text?.trim();
    return answer ? { answer } : { answer: null, degraded: 'empty llm reply' };
  } catch (err) {
    return { answer: null, degraded: err?.message || 'llm error' };
  }
}

/** Post-check: flag advice-like phrasing so the UI can surface the boundary. */
function looksLikeAdvice(text) {
  return /\b(you should (buy|sell)|i recommend|we recommend|strong buy|price target|go long|go short)\b/i.test(
    String(text || ''),
  );
}

export async function POST(request) {
  const rl = await checkRateLimit(`research-copilot:${getClientIp(request)}`, {
    limit: 12,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);

  // Auth required. Org membership is optional (public corpora still answer);
  // research notes only join in when the user is an active org member.
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = await getCurrentOrgMember(supabase).catch(() => null);

  const body = await request.json().catch(() => ({}));
  const query = String(body?.query || '').trim().slice(0, 800);
  if (!query) return NextResponse.json({ error: 'A question is required.' }, { status: 400 });

  const { items, corporaSearched, corporaUsed } = await orchestrate(query, {
    admin: getAdminClient(),
    supabaseUser: supabase,
    member,
  });

  // Honest empty-state — never fabricate an answer with no retrieved sources.
  if (!items.length) {
    return NextResponse.json({
      answer: null,
      empty: true,
      sources: [],
      corpora_searched: corporaSearched,
      corpora_used: [],
      disclaimer: DISCLAIMER,
    });
  }

  const { answer, degraded } = await synthesize(query, items);

  return NextResponse.json({
    answer: answer || null,
    grounded: Boolean(answer),
    advice_flagged: answer ? looksLikeAdvice(answer) : false,
    degraded: degraded || undefined,
    corpora_searched: corporaSearched,
    corpora_used: corporaUsed,
    sources: items.map((it, i) => ({
      marker: `S${i + 1}`,
      corpus: it.corpus,
      corpus_label: CORPUS_LABELS[it.corpus] || it.corpus,
      title: it.title,
      url: it.url || null,
      date: it.date || null,
      similarity: it.similarity != null ? Number(it.similarity.toFixed(3)) : null,
    })),
    disclaimer: DISCLAIMER,
  });
}
