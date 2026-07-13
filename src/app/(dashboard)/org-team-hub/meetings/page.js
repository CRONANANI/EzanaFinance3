import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { MeetingMode } from '@/components/org/social2/MeetingMode';

export const dynamic = 'force-dynamic';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

// Mirrors the lean column set + payload shape of GET /api/org/meetings so the
// client can seed its `payload` state and skip the mount fetch.
const LIST_COLUMNS =
  'id, title, category, status, scheduled_at, ended_at, location, team_id, ' +
  'quorum_pct, recording_url, recording_source, analysis_status, pitch_id, created_at';

async function loadMeetings(supabase, member) {
  const canManage = assertOrgRole(member, MANAGER_ROLES);

  const { data, error } = await supabase
    .from('org_meetings')
    .select(LIST_COLUMNS)
    .eq('org_id', member.org_id)
    .order('scheduled_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return null;
  const meetings = data || [];

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

  let recordersConnected = false;
  if (canManage) {
    const { count } = await supabase
      .from('org_recorder_integrations')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', member.org_id)
      .eq('enabled', true);
    recordersConnected = (count || 0) > 0;
  }

  return {
    meetings,
    sentimentTrend,
    recordersConnected,
    viewer: {
      userId: member.user_id,
      memberId: member.id,
      role: member.role,
      canManage,
    },
  };
}

export default async function MeetingsPage() {
  const supabase = createServerSupabase();
  const member = await getCurrentOrgMember(supabase);
  const initialData = member ? await loadMeetings(supabase, member) : null;

  return (
    <div className="dashboard-page-inset">
      <MeetingMode initialData={initialData} />
    </div>
  );
}
