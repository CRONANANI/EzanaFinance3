import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];
const CATEGORIES = ['ic', 'sector', 'general', 'exec', 'education'];

// Lean columns for the library list. The detail route hydrates the rest
// (attendees, deliverables, sentiment, votes, transcript, ai_summary).
const LIST_COLUMNS =
  'id, title, category, status, scheduled_at, ended_at, location, team_id, ' +
  'quorum_pct, recording_url, recording_source, analysis_status, pitch_id, created_at';

/* GET /api/org/meetings — the whole library in one fetch.
   Returns every meeting (lean) so the rail can compute REAL mode/category
   counts client-side, plus the sentiment trend and (managers only) whether
   any recorder is actually connected. No mock rows — honest-empty throughout. */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const canManage = assertOrgRole(member, MANAGER_ROLES);

    const { data, error } = await supabase
      .from('org_meetings')
      .select(LIST_COLUMNS)
      .eq('org_id', member.org_id)
      .order('scheduled_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const meetings = data || [];

    // Sentiment trend — average tone of the last completed sessions that
    // actually have sentiment rows. Never padded: fewer than 6 → return fewer.
    let sentimentTrend = [];
    const closedIds = meetings.filter((m) => m.status === 'closed').map((m) => m.id);
    if (closedIds.length > 0) {
      const { data: sRows } = await supabase
        .from('org_meeting_sentiment')
        .select('meeting_id, score')
        .eq('org_id', member.org_id)
        .in('meeting_id', closedIds);
      if (sRows && sRows.length > 0) {
        const byMeeting = new Map();
        for (const r of sRows) {
          const acc = byMeeting.get(r.meeting_id) || { sum: 0, n: 0 };
          acc.sum += Number(r.score);
          acc.n += 1;
          byMeeting.set(r.meeting_id, acc);
        }
        const titleFor = new Map(meetings.map((m) => [m.id, m]));
        sentimentTrend = meetings
          .filter((m) => m.status === 'closed' && byMeeting.has(m.id))
          .slice(0, 6)
          .map((m) => {
            const acc = byMeeting.get(m.id);
            return {
              meetingId: m.id,
              title: titleFor.get(m.id)?.title || 'Session',
              at: m.ended_at || m.scheduled_at || m.created_at,
              avg: acc.n ? Number((acc.sum / acc.n).toFixed(2)) : 0,
            };
          })
          .reverse(); // chronological, latest last (latest highlighted in UI)
      }
    }

    // Recorder connectivity — managers only, and NEVER the credentials.
    let recordersConnected = false;
    if (canManage) {
      const { count } = await supabase
        .from('org_recorder_integrations')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', member.org_id)
        .eq('enabled', true);
      recordersConnected = (count || 0) > 0;
    }

    return NextResponse.json({
      meetings,
      sentimentTrend,
      recordersConnected,
      viewer: {
        userId: member.user_id,
        memberId: member.id,
        role: member.role,
        canManage,
      },
    });
  },
  { requireAuth: true },
);

/* POST /api/org/meetings — create a scheduled meeting (manager only).
   Optionally seeds the attendee roster (RSVP pending). */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const title = (body?.title || '').trim();
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    const category = CATEGORIES.includes(body?.category) ? body.category : 'general';
    const agenda = Array.isArray(body?.agenda) ? body.agenda : [];

    const insert = {
      org_id: member.org_id,
      title: title.slice(0, 160),
      status: 'scheduled',
      category,
      started_by: member.user_id,
      agenda,
      minutes: [],
      scheduled_at: body?.scheduled_at || null,
      location: body?.location ? String(body.location).slice(0, 200) : null,
      team_id: body?.team_id || null,
      quorum_pct:
        Number.isFinite(Number(body?.quorum_pct)) && body.quorum_pct !== null
          ? Math.max(0, Math.min(100, Math.round(Number(body.quorum_pct))))
          : null,
      pitch_id: body?.pitch_id || null,
    };

    const { data, error } = await supabase.from('org_meetings').insert(insert).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Seed attendees if provided (member_ids from the org chart).
    const memberIds = Array.isArray(body?.attendee_member_ids)
      ? [...new Set(body.attendee_member_ids.filter(Boolean))]
      : [];
    if (memberIds.length > 0) {
      await supabase.from('org_meeting_attendees').insert(
        memberIds.map((mid) => ({
          meeting_id: data.id,
          org_id: member.org_id,
          member_id: mid,
          rsvp: 'pending',
        })),
      );
    }

    return NextResponse.json({ meeting: data });
  },
  { requireAuth: true },
);
