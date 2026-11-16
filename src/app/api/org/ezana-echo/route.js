/**
 * GET /api/org/ezana-echo   the council band of Ezana Echo (/ezana-echo)
 *
 * The parts of the council band that US Equities does not already load (the
 * book, sector teams, coverage and member directory come from
 * GET /api/org/company-research): the council's published research (for
 * Council reads), its pitches (for the Our names tab and Pitch prep reading)
 * and the member directory (for authors and pitch leads).
 *
 * Every read runs as the signed-in member through the RLS-scoped client and
 * is scoped to the member's own council; RLS stays the gate (documents the
 * member cannot read never arrive). Only published documents are read, so no
 * one's draft shows here. Pitches leave without ballots, tallies or theses.
 * No service-role client. Each part fails on its own: a part that cannot be
 * read arrives as null and the page shows that card's error.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PRIVATE = { 'Cache-Control': 'private, no-store' };

export const GET = withApiGuard(
  async () => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const orgId = member.org_id;

    const [notes, members, pitches] = await Promise.all([
      supabase
        .from('org_research_notes')
        .select(
          'id, title, doc_type, status, ticker, sector, author_id, is_exemplar, pinned, created_at, published_at',
        )
        .eq('org_id', orgId)
        .eq('status', 'published')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(200),
      supabase.from('org_members').select('id, user_id, display_name').eq('org_id', orgId),
      supabase
        .from('org_pitches')
        .select(
          'id, ticker, company_name, stage, status, decision, analyst_member_id, created_at, archived_at',
        )
        .eq('org_id', orgId)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    return NextResponse.json(
      {
        now: Date.now(),
        viewer: { role: member.role, userId: member.user_id },
        members: members.error ? [] : members.data || [],
        notes: notes.error ? null : notes.data || [],
        pitches: pitches.error ? null : pitches.data || [],
      },
      { headers: PRIVATE },
    );
  },
  { requireAuth: true },
);
