/**
 * GET /api/org/watchlist   Council watch on the Watchlist (/watchlist)
 *
 * The parts of Council watch that US Equities does not already load (the
 * book, sector teams, member directory, sector coverage, coverage handoffs,
 * research dates and stored policy rules come from
 * GET /api/org/company-research):
 *   pitches      the council's open pitches: ticker, company, desk, stage,
 *                analyst and committee session (no theses, ballots or tallies)
 *   assignments  open assignments of type Coverage that the Assignments page
 *                shows this viewer, from its loader
 *   meetings     council meetings in the next 45 days (title, category,
 *                status, time)
 *   sessions     committee sessions in the next 45 days (time and status only)
 *
 * Every read runs as the signed-in member through the RLS-scoped client and
 * is scoped to the member's own council; RLS stays the gate. No service-role
 * client. Each part fails on its own: a part that cannot be read arrives as
 * null and the page shows that card's error. Personal watchlists are never
 * read here.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadAssignments } from '@/app/api/org/assignments/_loader';
import { CLOSED_STAGES } from '@/lib/org-watchlist-model';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PRIVATE = { 'Cache-Control': 'private, no-store' };
const DAY = 86400000;

async function pitchesPart(supabase, orgId) {
  const { data, error } = await supabase
    .from('org_pitches')
    .select(
      'id, ticker, company_name, team_id, sector, stage, status, analyst_member_id, ic_meeting_id, created_at, archived_at',
    )
    .eq('org_id', orgId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return null;
  return (data || []).filter((p) => p.ticker && !CLOSED_STAGES.includes(p.stage));
}

async function assignmentsPart(supabase, member) {
  try {
    const { error, payload } = await loadAssignments(supabase, member);
    if (error) return null;
    return (payload.assignments || [])
      .filter((a) => (a.type || a.assignment_type) === 'coverage' && !a.archived)
      .map((a) => ({
        id: a.id,
        title: a.title,
        status: a.status,
        due_date: a.due_date || null,
        overdue: Boolean(a.overdue),
        archived: false,
        mine: Boolean(a.mine),
        assignees: (a.assignees || []).map((x) => x.name).filter(Boolean),
      }));
  } catch {
    return null;
  }
}

async function meetingsPart(supabase, orgId, now) {
  const from = new Date(now - DAY).toISOString();
  const to = new Date(now + 45 * DAY).toISOString();
  const [meetings, sessions] = await Promise.all([
    supabase
      .from('org_meetings')
      .select('id, title, category, status, scheduled_at')
      .eq('org_id', orgId)
      .gte('scheduled_at', from)
      .lte('scheduled_at', to)
      .order('scheduled_at', { ascending: true })
      .limit(50),
    supabase
      .from('org_ic_meetings')
      .select('id, meets_at, status')
      .eq('org_id', orgId)
      .gte('meets_at', from)
      .lte('meets_at', to)
      .order('meets_at', { ascending: true })
      .limit(20),
  ]);
  return {
    meetings: meetings.error ? null : meetings.data || [],
    sessions: sessions.error ? null : sessions.data || [],
  };
}

export const GET = withApiGuard(
  async () => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const now = Date.now();
    const [pitches, assignments, cal] = await Promise.all([
      pitchesPart(supabase, member.org_id),
      assignmentsPart(supabase, member),
      meetingsPart(supabase, member.org_id, now),
    ]);
    return NextResponse.json(
      {
        now,
        viewer: { role: member.role, memberId: member.id },
        pitches,
        assignments,
        meetings: cal.meetings,
        sessions: cal.sessions,
      },
      { headers: PRIVATE },
    );
  },
  { requireAuth: true },
);
