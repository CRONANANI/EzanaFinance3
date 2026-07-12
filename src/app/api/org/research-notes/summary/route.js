import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { callCentaur } from '../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/*
 * POST /api/org/research-notes/summary — AI overview across a FILTERED SET.
 * Body: { note_ids: uuid[], label?: string }. Summarizes the current library
 * view (the client passes the ids it is showing). Reuses Centaur.
 */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const ids = Array.isArray(body?.note_ids) ? body.note_ids.filter(Boolean).slice(0, 40) : [];
    if (!ids.length)
      return NextResponse.json({ error: 'No documents in view to summarize.' }, { status: 400 });

    // RLS-scoped read — only docs the caller may see come back.
    const { data: notes } = await supabase
      .from('org_research_notes')
      .select('title, abstract, ticker, sector, doc_type, created_at')
      .eq('org_id', member.org_id)
      .in('id', ids);
    if (!notes || !notes.length)
      return NextResponse.json({ error: 'No readable documents.' }, { status: 404 });

    const lines = notes.map(
      (n, i) =>
        `${i + 1}. [${n.doc_type}] ${n.ticker ? n.ticker + ' — ' : ''}${n.title}${n.abstract ? ` — ${String(n.abstract).slice(0, 200)}` : ''}`,
    );
    const prompt = [
      `Give a short synthesis across these ${notes.length} internal research documents${body?.label ? ` (${String(body.label).slice(0, 80)})` : ''}.`,
      'Identify the common themes, notable disagreements, and any coverage gaps. 4–6 bullets. Do not invent facts.',
      '',
      ...lines,
    ].join('\n');

    try {
      const summary = await callCentaur(request, prompt);
      return NextResponse.json({ summary, count: notes.length });
    } catch (e) {
      return NextResponse.json({ error: e.message || 'AI summary unavailable' }, { status: 502 });
    }
  },
  { requireAuth: true },
);
