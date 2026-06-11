import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/digest — "This Week in the Fund": last-7-day activity for the org. */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const orgId = member.org_id;
    const since = new Date(Date.now() - 7 * 86400000).toISOString();

    // Org pitches (used for new-pitch list, vote lookup, and movers).
    const { data: pitches } = await supabase
      .from('org_pitches')
      .select('id, ticker, company_name, created_at, analyst_member_id, stage')
      .eq('org_id', orgId);
    const pitchById = new Map((pitches || []).map((p) => [p.id, p]));
    const pitchIds = (pitches || []).map((p) => p.id);

    const newPitches = (pitches || [])
      .filter((p) => p.created_at && p.created_at >= since)
      .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
      .slice(0, 8)
      .map((p) => ({ id: p.id, ticker: p.ticker, company_name: p.company_name, created_at: p.created_at }));

    // Votes cast this week (join via pitch_id).
    let votes = [];
    if (pitchIds.length > 0) {
      const { data: voteRows } = await supabase
        .from('org_pitch_votes')
        .select('id, pitch_id, vote, created_at')
        .in('pitch_id', pitchIds)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(40);
      votes = (voteRows || []).map((v) => ({
        id: v.id,
        vote: v.vote,
        created_at: v.created_at,
        ticker: pitchById.get(v.pitch_id)?.ticker || null,
      }));
    }

    // Positions opened this week (team portfolios → org via teams).
    const { data: teams } = await supabase.from('org_teams').select('id').eq('org_id', orgId);
    const teamIds = (teams || []).map((t) => t.id);
    let positions = [];
    if (teamIds.length > 0) {
      const { data: posRows } = await supabase
        .from('org_team_portfolios')
        .select('id, ticker_symbol, sector, shares, added_at')
        .in('team_id', teamIds)
        .gte('added_at', since)
        .order('added_at', { ascending: false })
        .limit(20);
      positions = posRows || [];
    }

    // New research notes (org-visible).
    const { data: noteRows } = await supabase
      .from('org_research_notes')
      .select('id, title, ticker, sector, created_at, author_id')
      .eq('org_id', orgId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(15);

    // Recognitions awarded.
    const { data: recRows } = await supabase
      .from('org_recognition')
      .select('id, title, badge_type, recipient_id, created_at')
      .eq('org_id', orgId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(15);

    // Top performance movers from hindsight (by alpha).
    let movers = [];
    if (pitchIds.length > 0) {
      const { data: hindsight } = await supabase
        .from('org_pitch_hindsight')
        .select('pitch_id, alpha_pct, return_pct')
        .in('pitch_id', pitchIds);
      movers = (hindsight || [])
        .map((h) => ({
          ticker: pitchById.get(h.pitch_id)?.ticker || null,
          company_name: pitchById.get(h.pitch_id)?.company_name || null,
          alpha_pct: h.alpha_pct == null ? null : Number(h.alpha_pct),
          return_pct: h.return_pct == null ? null : Number(h.return_pct),
        }))
        .filter((m) => m.alpha_pct != null)
        .sort((a, b) => Math.abs(b.alpha_pct) - Math.abs(a.alpha_pct))
        .slice(0, 5);
    }

    // Author / recipient names.
    const { data: members } = await supabase
      .from('org_members')
      .select('user_id, display_name')
      .eq('org_id', orgId);
    const nameByUser = new Map((members || []).map((m) => [m.user_id, m.display_name]));

    const notes = (noteRows || []).map((n) => ({ ...n, author_name: nameByUser.get(n.author_id) || 'Member' }));
    const recognitions = (recRows || []).map((r) => ({
      ...r,
      recipient_name: nameByUser.get(r.recipient_id) || 'Member',
    }));

    return NextResponse.json({
      since,
      newPitches,
      votes,
      positions,
      notes,
      recognitions,
      movers,
      counts: {
        pitches: newPitches.length,
        votes: votes.length,
        positions: positions.length,
        notes: notes.length,
        recognitions: recognitions.length,
      },
    });
  },
  { requireAuth: true },
);
