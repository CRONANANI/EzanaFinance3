import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];
// The Investment Committee votes: executives + portfolio managers. Eligibility
// is derived from org-chart roles, never a hardcoded member list.
const IC_VOTER_ROLES = ['executive', 'portfolio_manager'];
const CATEGORIES = ['ic', 'sector', 'general', 'exec', 'education'];
const RECORDING_SOURCES = ['zoom', 'otter', 'fireflies', 'read_ai', 'upload'];

async function resolveParams(context) {
  return (await context?.params) || {};
}

/** Build the vote tally + quorum picture for a meeting from live rows. */
function buildVoteState(meeting, votes, eligibleCount, presentCount, myMemberId) {
  const tally = { buy: 0, pass: 0, abstain: 0 };
  let myVote = null;
  for (const v of votes) {
    if (tally[v.vote] !== undefined) tally[v.vote] += 1;
    if (v.voter_member_id === myMemberId) myVote = v.vote;
  }
  const total = tally.buy + tally.pass + tally.abstain;
  const quorumPct = Number.isFinite(meeting.quorum_pct) ? meeting.quorum_pct : 50;
  const quorumMet = eligibleCount > 0 && (presentCount / eligibleCount) * 100 >= quorumPct;
  return {
    tally,
    total,
    myVote,
    eligibleCount,
    presentCount,
    quorumPct,
    quorumMet,
  };
}

/* GET /api/org/meetings/:id — full detail: meeting + attendees (with member
   names/roles), deliverables, per-tier sentiment, IC vote state, roster (for
   the attendee picker), linked-pitch pre-read, and viewer capabilities. */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
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

    // Org roster (org chart) — used both for the attendee picker and to
    // resolve attendee/vote member names + IC eligibility counts.
    const { data: roster } = await supabase
      .from('org_members')
      .select('id, user_id, display_name, role')
      .eq('org_id', member.org_id)
      .eq('is_active', true);
    const byMemberId = new Map((roster || []).map((m) => [m.id, m]));

    const [attendeesRes, deliverablesRes, sentimentRes, votesRes] = await Promise.all([
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
      supabase
        .from('org_meeting_sentiment')
        .select('*')
        .eq('meeting_id', id)
        .eq('org_id', member.org_id),
      supabase
        .from('org_meeting_votes')
        .select('*')
        .eq('meeting_id', id)
        .eq('org_id', member.org_id),
    ]);

    const attendees = (attendeesRes.data || []).map((a) => {
      const m = byMemberId.get(a.member_id);
      return {
        id: a.id,
        member_id: a.member_id,
        display_name: m?.display_name || 'Member',
        role: m?.role || null,
        rsvp: a.rsvp,
        attended: a.attended,
      };
    });

    // Present = RSVP'd yes OR marked attended. Used for quorum.
    const presentCount = attendees.filter((a) => a.attended || a.rsvp === 'yes').length;
    const eligibleCount = (roster || []).filter((m) => IC_VOTER_ROLES.includes(m.role)).length;
    const voteState = buildVoteState(
      meeting,
      votesRes.data || [],
      eligibleCount,
      presentCount,
      member.id,
    );

    const sentiment = (sentimentRes.data || []).map((s) => ({
      tier: s.tier,
      score: Number(s.score),
    }));

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
          label: `${pitch.ticker}${pitch.company_name ? ` — ${pitch.company_name}` : ''}`,
          note: pitch.thesis_short || null,
        });
      }
    }

    const isICVoter = meeting.category === 'ic' && IC_VOTER_ROLES.includes(member.role);

    return NextResponse.json({
      meeting,
      attendees,
      deliverables: deliverablesRes.data || [],
      sentiment,
      votes: voteState,
      preRead,
      roster: (roster || []).map((m) => ({ id: m.id, display_name: m.display_name, role: m.role })),
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
    const supabase = createServerSupabase();
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
      const url = (body?.recording_url || '').trim();
      if (!url) return NextResponse.json({ error: 'recording_url required' }, { status: 400 });
      update.recording_url = url.slice(0, 2000);
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
