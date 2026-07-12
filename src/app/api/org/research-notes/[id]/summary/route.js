import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { callCentaur } from '../../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

// In-process cache keyed by note id + version — a doc's summary only changes
// when its content does. Bounded, best-effort (fine for a serverless instance).
const CACHE = new Map();
const CACHE_MAX = 200;

function cacheGet(key) {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > 1000 * 60 * 60) {
    CACHE.delete(key);
    return null;
  }
  return hit.text;
}
function cacheSet(key, text) {
  if (CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
  CACHE.set(key, { text, at: Date.now() });
}

/* POST /api/org/research-notes/[id]/summary — AI TL;DR for one doc (cached). */
export const POST = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data: note } = await supabase
      .from('org_research_notes')
      .select('id, title, abstract, body, ticker, sector, version')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const cacheKey = `${note.id}:${note.version || 1}`;
    const cached = cacheGet(cacheKey);
    if (cached) return NextResponse.json({ summary: cached, cached: true });

    const prompt = [
      'Summarize this internal research document for a busy investment analyst.',
      'Give 3–5 tight bullet points: the core thesis, the key drivers/catalysts, and the main risks.',
      'Do not invent facts not present in the text. Be concise.',
      '',
      `Title: ${note.title}`,
      note.ticker ? `Ticker: ${note.ticker}` : '',
      note.sector ? `Sector: ${note.sector}` : '',
      note.abstract ? `Abstract: ${note.abstract}` : '',
      '',
      'Body:',
      String(note.body || '').slice(0, 8000),
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const summary = await callCentaur(request, prompt);
      if (summary) cacheSet(cacheKey, summary);
      return NextResponse.json({ summary, cached: false });
    } catch (e) {
      return NextResponse.json({ error: e.message || 'AI summary unavailable' }, { status: 502 });
    }
  },
  { requireAuth: true },
);
