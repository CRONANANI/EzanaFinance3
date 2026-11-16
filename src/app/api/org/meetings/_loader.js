/**
 * Meetings: the server side of `GET /api/org/meetings` and of the page's
 * first render, plus the ballot count the detail and vote routes share.
 *
 * Every read runs as the signed-in member (the user client); the row
 * policies stay the gate. The list payload keeps the shape other pages read
 * (`meetings[]` with id, title, category, status, scheduled_at, team_id), and
 * adds what the page needs: reply counts per meeting, agenda size, the
 * number of voting members, the Pitch Pipeline's committee sessions (read
 * only, with no ballot data) and the pitches a meeting can be linked to.
 */
import { assertOrgRole } from '@/lib/org-trading-server';
import { memberHasPermission } from '@/lib/org-permissions-server';
import { VOTER_ROLES, agendaMinutes, replySummary } from '@/lib/org-meetings-model';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

const LIST_COLUMNS =
  'id, title, category, status, scheduled_at, ended_at, location, team_id, ' +
  'quorum_pct, recording_url, recording_source, analysis_status, pitch_id, created_at, agenda';

/* The counting function may not exist yet (the owner creates it from sql.md).
   Remember that for ten minutes so a page load does not ask again. */
let rpcMissingUntil = 0;

/**
 * Ballots received per meeting, as { meetingId: count }. Uses the counting
 * function when the database has it, which keeps the count right once
 * members can no longer read each other's ballots before a meeting is
 * completed. Otherwise counts the rows this member can read.
 */
export async function countMeetingBallots(supabase, orgId, meetingIds) {
  const ids = [...new Set((meetingIds || []).filter(Boolean))];
  const out = Object.fromEntries(ids.map((id) => [id, 0]));
  if (!ids.length) return out;
  if (typeof supabase.rpc === 'function' && Date.now() >= rpcMissingUntil) {
    try {
      const { data, error } = await supabase.rpc('org_meeting_ballot_counts', {
        p_meeting_ids: ids,
      });
      if (!error && Array.isArray(data)) {
        for (const row of data) out[row.meeting_id] = Number(row.received) || 0;
        return out;
      }
      rpcMissingUntil = Date.now() + 10 * 60 * 1000;
    } catch {
      rpcMissingUntil = Date.now() + 10 * 60 * 1000;
    }
  }
  const { data } = await supabase
    .from('org_meeting_votes')
    .select('meeting_id')
    .eq('org_id', orgId)
    .in('meeting_id', ids);
  for (const v of data || []) out[v.meeting_id] = (out[v.meeting_id] || 0) + 1;
  return out;
}

/** Active members of the council: id, name, role, title. */
export async function loadRoster(supabase, orgId) {
  const { data } = await supabase
    .from('org_members')
    .select('id, user_id, display_name, role, sub_role')
    .eq('org_id', orgId)
    .eq('is_active', true);
  return data || [];
}

/**
 * The list payload. Returns { payload } or { error } when the meetings
 * themselves cannot be read (the extra reads fail soft to empty).
 */
export async function loadMeetingsList(supabase, member) {
  const orgId = member.org_id;
  const canManage = assertOrgRole(member, MANAGER_ROLES);

  const [meetingsRes, roster, canCreateEvents, canRecordDocuments, recorders] = await Promise.all([
    supabase
      .from('org_meetings')
      .select(LIST_COLUMNS)
      .eq('org_id', orgId)
      .order('scheduled_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(200),
    loadRoster(supabase, orgId),
    canManage ? memberHasPermission(supabase, member, 'create_events') : false,
    canManage ? memberHasPermission(supabase, member, 'upload_deliverables') : false,
    canManage
      ? supabase
          .from('org_recorder_integrations')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('enabled', true)
      : null,
  ]);
  if (meetingsRes.error) return { error: meetingsRes.error.message };
  const rows = meetingsRes.data || [];
  const ids = rows.map((m) => m.id);
  const roleOf = new Map(roster.map((r) => [r.id, r.role]));

  const [attendeesRes, sessionsRes, pitchesRes] = await Promise.all([
    ids.length
      ? supabase
          .from('org_meeting_attendees')
          .select('meeting_id, member_id, rsvp, attended')
          .eq('org_id', orgId)
          .in('meeting_id', ids)
      : { data: [] },
    supabase
      .from('org_ic_meetings')
      .select('id, meets_at, ballot_type, threshold, quorum_pct, status')
      .eq('org_id', orgId)
      .order('meets_at', { ascending: true, nullsFirst: false })
      .limit(50),
    supabase
      .from('org_pitches')
      .select('id, ticker, company_name, stage, status, ic_meeting_id')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(300),
  ]);

  const byMeeting = new Map();
  for (const a of attendeesRes.data || []) {
    const list = byMeeting.get(a.meeting_id) || [];
    list.push({ ...a, role: roleOf.get(a.member_id) || null });
    byMeeting.set(a.meeting_id, list);
  }

  const meetings = rows.map(({ agenda, ...m }) => {
    const items = Array.isArray(agenda) ? agenda : [];
    return {
      ...m,
      agenda_items: items.length,
      agenda_minutes: agendaMinutes(items),
      replies: replySummary(byMeeting.get(m.id) || [], member.id),
    };
  });

  const pitchRows = pitchesRes.data || [];
  const sessions = (sessionsRes.data || []).map((s) => ({
    ...s,
    pitches: pitchRows
      .filter((p) => p.ic_meeting_id === s.id)
      .map((p) => ({ id: p.id, ticker: p.ticker, company_name: p.company_name, stage: p.stage })),
  }));
  const linked = new Set(meetings.map((m) => m.pitch_id).filter(Boolean));
  const pitches = pitchRows
    .filter((p) => p.status === 'active' || linked.has(p.id))
    .map((p) => ({ id: p.id, ticker: p.ticker, company_name: p.company_name, stage: p.stage }));

  return {
    payload: {
      meetings,
      eligible_voters: roster.filter((r) => VOTER_ROLES.includes(r.role)).length,
      sessions,
      pitches,
      recordersConnected: Boolean(recorders && (recorders.count || 0) > 0),
      viewer: {
        userId: member.user_id,
        memberId: member.id,
        role: member.role,
        displayName: member.display_name || null,
        subRole: member.sub_role || null,
        canManage,
        canCreateEvents: Boolean(canCreateEvents),
        canRecordDocuments: Boolean(canRecordDocuments),
      },
    },
  };
}
