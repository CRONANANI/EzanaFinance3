/**
 * Sample content for Council watch on the Watchlist (/watchlist).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/watchlist/sample, so the section can be presented from a
 * council with little activity. Real councils never receive it, the page
 * labels it "Sample content" while it shows, and nothing done to it is saved
 * (adding a sample name to a personal list is refused on the page).
 *
 * It is the same sample council every rebuilt Team Hub page shows, assembled
 * from those bundles rather than typed in again (the book, sector teams,
 * coverage, handoffs, research dates and policy rules come from the US
 * Equities sample, which the page loads through the same fund loader):
 *   - the open pitches from the Pitch Pipeline sample,
 *   - the Coverage assignments from the Assignments sample, filtered the way
 *     the live route filters,
 *   - the meetings and committee sessions from the Meetings sample,
 *   - the holdings filed under their sector team from the Compliance sample,
 *     which is what the policy engine reads.
 * Every name is invented.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { buildPitchPipelineSample } from './org-pitch-pipeline-sample.js';
import { buildAssignmentsSample } from './org-assignments-sample.js';
import { buildMeetingsSample } from './org-meetings-sample.js';
import { buildComplianceSample } from './org-compliance-sample.js';
import { CLOSED_STAGES } from './org-watchlist-model.js';

/**
 * @param {{ userId: string, memberId?: string, role: string, displayName?: string,
 *           title?: string, subRole?: string, now?: number }} viewer
 */
export function buildWatchlistSample({
  userId,
  memberId,
  role,
  displayName,
  title,
  subRole,
  now = Date.now(),
}) {
  const v = { userId, memberId, role, displayName, title, subRole, now };
  const pipeline = buildPitchPipelineSample(v).raw;
  const work = buildAssignmentsSample(v);
  const meet = buildMeetingsSample(v).list;
  const compliance = buildComplianceSample({ role, displayName, userId, now });

  const pitches = pipeline.pitches
    .filter((p) => p.ticker && !p.archived_at && !CLOSED_STAGES.includes(p.stage))
    .map((p) => ({
      id: p.id,
      ticker: p.ticker,
      company_name: p.company_name,
      team_id: p.team_id,
      sector: p.sector || null,
      stage: p.stage,
      status: p.status,
      analyst_member_id: p.analyst_member_id,
      ic_meeting_id: p.ic_meeting_id || null,
      created_at: p.created_at,
      archived_at: null,
      is_demo: true,
    }));

  const assignments = (work.board.assignments || [])
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
      is_demo: true,
    }));

  return {
    is_demo: true,
    now,
    viewer: { role, memberId: pipeline.viewer?.id || memberId || null },
    members: (pipeline.members || []).map((m) => ({
      id: m.id,
      user_id: m.user_id,
      display_name: m.display_name,
      is_demo: true,
    })),
    pitches,
    assignments,
    meetings: (meet.meetings || []).map((m) => ({
      id: m.id,
      title: m.title,
      category: m.category,
      status: m.status,
      scheduled_at: m.scheduled_at,
      is_demo: true,
    })),
    sessions: (meet.sessions || []).map((s) => ({
      id: s.id,
      meets_at: s.meets_at,
      status: s.status,
      pitches: (s.pitches || []).map((p) => ({ id: p.id, ticker: p.ticker })),
      is_demo: true,
    })),
    /* What the policy engine reads: holdings under their sector team. */
    policyPositions: compliance.positions,
  };
}
