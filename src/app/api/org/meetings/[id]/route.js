import { NextResponse } from 'next/server';
import { httpUrlOrNull } from '@/lib/sanitize';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { confirmsQuorum, isVoterRole, meetingBallotView } from '@/lib/org-meetings-model';
import { countMeetingBallots, loadRoster } from '../_loader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];
const CATEGORIES = ['ic', 'sector', 'general', 'exec', 'education'];
const RECORDING_SOURCES = ['zoom', 'otter', 'fireflies', 'read_ai', 'upload'];

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* GET /api/org/meetings/:id: full detail. Meeting, attendees (with names and
   roles), documents discussed, the committee vote as the viewer may see it,
   the roster (for the attendee picker), the linked pitch and what the viewer
   may do.

   Committee vote: until the meeting is completed only the number of ballots
   received, quorum and the viewer's own vote leave the server; no running
   Buy, Pass or Abstain count and no other member's ballot. Quorum counts
   voting members (executives and portfolio managers) who replied yes or were
   marked as attended. */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const canManage = assertOrgRole(member, MANAGER_ROLES);
    const { id } = await resolveParams(context);

    const { data: meeting, error } = await supabase
      .from('org_meetings')
      .select('*')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const roster = await loadRoster(supabase, member.org_id);
    const byMemberId = new Map(roster.map((m) => [m.id, m]));
    const completed = meeting.status === 'closed';

    const [attendeesRes, deliverablesRes, votesRes, counts] = await Promise.all([
      supabase
        .from('org_meeting_attendees')
        .select('*')
        .eq('meeting_id', id)
        .eq('org_id', member.org_id),
      supabase
        .from('org_meeting_deliverables')
        .select('*')
        .eq('meeting_id', id)
        .eq('org_id', member.org_id)
        .order('created_at'),
      meeting.category === 'ic'
        ? supabase
            .from('org_meeting_votes')
            .select('voter_member_id, vote')
            .eq('meeting_id', id)
            .eq('org_id', member.org_id)
        : { data: [] },
      meeting.category === 'ic' && !completed
        ? countMeetingBallots(supabase, member.org_id, [id])
        : null,
    ]);

    const attendees = (attendeesRes.data || []).map((a) => {
      const m = byMemberId.get(a.member_id);
      return {
        id: a.id,
        member_id: a.member_id,
        display_name: m?.display_name || 'Member',
        role: m?.role || null,
        sub_role: m?.sub_role || null,
        rsvp: a.rsvp,
        attended: a.attended,
      };
    });

    const votes =
      meeting.category === 'ic'
        ? meetingBallotView({
            votes: votesRes.data || [],
            completed,
            viewerMemberId: member.id,
            eligible: roster.filter((m) => isVoterRole(m.role)).length,
            confirmed: attendees.filter(confirmsQuorum).length,
            quorumPct: meeting.quorum_pct,
            received: counts ? counts[id] : null,
          })
        : null;

    // Auto-bundled pre-read: the linked pitch (IC meetings) + its library docs.
    let preRead = [];
    if (meeting.pitch_id) {
      const { data: pitch } = await supabase
        .from('org_pitches')
        .select('id, ticker, company_name, thesis_short')
        .eq('id', meeting.pitch_id)
        .eq('org_id', member.org_id)
        .maybeSingle();
      if (pitch) {
        preRead.push({
          kind: 'pitch',
          id: pitch.id,
          label: `${pitch.ticker}${pitch.company_name ? `: ${pitch.company_name}` : ''}`,
          note: pitch.thesis_short || null,
        });
      }
    }

    const isICVoter = meeting.category === 'ic' && isVoterRole(member.role);

    return NextResponse.json({
      meeting,
      attendees,
      deliverables: deliverablesRes.data || [],
      votes,
      preRead,
      roster: roster.map((m) => ({
        id: m.id,
        display_name: m.display_name,
        role: m.role,
        sub_role: m.sub_role || null,
      })),
      viewer: {
        userId: member.user_id,
        memberId: member.id,
        role: member.role,
        canManage,
        isICVoter,
      },
    });
  },
  { requireAuth: true },
);

/* PATCH /api/org/meetings/:id — manager edits. No hosting: the live/start
   action is gone. Supported actions: set_agenda (full ordered array — covers
   add/edit/reorder/remove), complete, set_recording, update (field edits). */
export const PATCH = withApiGuard(
  async (request, user, context) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }
    const { id } = await resolveParams(context);

    const { data: meeting } = await supabase
      .from('org_meetings')
      .select('id')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!meeting) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const update = {};
    const action = body?.action;

    if (action === 'set_agenda') {
      const items = Array.isArray(body?.agenda) ? body.agenda : [];
      update.agenda = items.slice(0, 100).map((it, i) => ({
        id: it.id || crypto.randomUUID(),
        n: i + 1,
        label: String(it.label || '').slice(0, 240),
        minutes: Number.isFinite(Number(it.minutes))
          ? Math.max(0, Math.round(Number(it.minutes)))
          : null,
        owner: it.owner ? String(it.owner).slice(0, 120) : null,
        kind: it.kind ? String(it.kind).slice(0, 40) : null,
        pitch_id: it.pitch_id || null,
      }));
    } else if (action === 'complete') {
      update.status = 'closed';
      update.ended_at = new Date().toISOString();
      update.closed_at = new Date().toISOString();
    } else if (action === 'set_recording') {
      const url = httpUrlOrNull(body?.recording_url);
      if (!url)
        return NextResponse.json(
          { error: 'recording_url must be an http(s) URL' },
          { status: 400 },
        );
      update.recording_url = url;
      update.recording_source = RECORDING_SOURCES.includes(body?.recording_source)
        ? body.recording_source
        : 'upload';
    } else if (action === 'update') {
      if ('title' in body) update.title = String(body.title).slice(0, 160);
      if ('location' in body)
        update.location = body.location ? String(body.location).slice(0, 200) : null;
      if ('scheduled_at' in body) update.scheduled_at = body.scheduled_at || null;
      if ('category' in body && CATEGORIES.includes(body.category)) update.category = body.category;
      if ('quorum_pct' in body) {
        update.quorum_pct =
          body.quorum_pct === null || body.quorum_pct === ''
            ? null
            : Math.max(0, Math.min(100, Math.round(Number(body.quorum_pct))));
      }
      if ('pitch_id' in body) update.pitch_id = body.pitch_id || null;
    } else {
      return NextResponse.json({ error: 'No recognized action' }, { status: 400 });
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('org_meetings')
      .update(update)
      .eq('id', id)
      .eq('org_id', member.org_id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ meeting: data });
  },
  { requireAuth: true },
);
