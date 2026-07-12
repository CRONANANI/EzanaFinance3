import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { attachAuthors, stripEmbedding } from '../../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/*
 * GET /api/org/research-notes/dossier/[symbol] — the 1b ticker dossier.
 * Every doc for the ticker (chronological), coverage stats (N analysts since
 * YEAR), and pitch context from org_pitches. No fabricated performance — we
 * surface the earliest pitch, expected return, and decision as they exist.
 */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { symbol } = await resolveParams(context);
    const ticker = String(symbol || '')
      .toUpperCase()
      .trim();
    if (!ticker) return NextResponse.json({ error: 'Ticker required' }, { status: 400 });

    // All readable docs for this ticker (RLS handles visibility), newest first.
    const { data: rawDocs, error } = await supabase
      .from('org_research_notes')
      .select(
        'id, author_id, title, abstract, ticker, sector, tags, doc_type, status, version, ' +
          'is_alum_authored, is_exemplar, author_role_at_time, view_count, download_count, ' +
          'superseded_by, term, created_at, published_at',
      )
      .eq('org_id', member.org_id)
      .ilike('ticker', ticker)
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const docs = await attachAuthors(supabase, member.org_id, (rawDocs || []).map(stripEmbedding));

    // Coverage stats.
    const analystIds = new Set(docs.map((d) => d.author_id).filter(Boolean));
    const firstDoc = docs.length ? docs[docs.length - 1] : null;
    const coveredSinceYear = firstDoc ? new Date(firstDoc.created_at).getUTCFullYear() : null;

    // Docs-by-type breakdown for the header.
    const byType = {};
    for (const d of docs) byType[d.doc_type] = (byType[d.doc_type] || 0) + 1;
    const sector = docs.find((d) => d.sector)?.sector || null;

    // Pitch context (earliest pitch = "since first pitch").
    const { data: pitches } = await supabase
      .from('org_pitches')
      .select(
        'id, analyst_member_id, expected_return_pct, target_price, current_price_at_submission, status, decision, stage, created_at',
      )
      .eq('org_id', member.org_id)
      .ilike('ticker', ticker)
      .order('created_at', { ascending: true });
    const firstPitch = pitches && pitches[0] ? pitches[0] : null;

    return NextResponse.json({
      ticker,
      sector,
      docs,
      stats: {
        docCount: docs.length,
        analystCount: analystIds.size,
        coveredSinceYear,
        byType,
        firstPitch: firstPitch
          ? {
              id: firstPitch.id,
              at: firstPitch.created_at,
              expected_return_pct: firstPitch.expected_return_pct,
              target_price: firstPitch.target_price,
              price_at_submission: firstPitch.current_price_at_submission,
              status: firstPitch.status,
              decision: firstPitch.decision,
              stage: firstPitch.stage,
            }
          : null,
        pitchCount: (pitches || []).length,
      },
      viewer: { userId: member.user_id, role: member.role },
    });
  },
  { requireAuth: true },
);
