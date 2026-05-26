import { MOCK_MEMBERS, MOCK_TEAMS, getMemberByEmail } from '@/lib/orgMockData';
import { PIPELINE_COLUMNS } from '@/lib/orgPitchMockData';
import {
  listPitches,
  getPitchRaw,
  getDeliverablesForPitch,
  getVotesForPitch,
  getDiscussionForPitch,
  getHistoryForPitch,
  getHindsight,
} from '@/lib/org-pitch-store';

export { PIPELINE_COLUMNS } from '@/lib/orgPitchMockData';

export const PITCH_PERMISSIONS = {
  'pitch.submit': ['analyst', 'portfolio_manager', 'executive'],
  'pitch.approve_research': ['portfolio_manager', 'executive'],
  'pitch.review_pm': ['portfolio_manager', 'executive'],
  'pitch.schedule_committee': ['executive'],
  'pitch.vote': ['executive', 'portfolio_manager'],
  'pitch.final_decision': ['executive'],
  'pitch.assign_monitor': ['portfolio_manager', 'executive'],
  'pitch.withdraw': ['analyst'],
};

function memberName(id) {
  return MOCK_MEMBERS.find((m) => m.id === id)?.name || 'Unknown';
}

function teamLabel(teamId) {
  return MOCK_TEAMS.find((t) => t.id === teamId)?.name || 'Council';
}

function teamSlug(teamId) {
  return MOCK_TEAMS.find((t) => t.id === teamId)?.slug || '';
}

function daysAgoLabel(iso) {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return 'Today';
  if (d === 1) return '1d ago';
  return `${d}d ago`;
}

function formatHorizon(h) {
  if (!h) return '';
  if (h === 'long-term') return 'long';
  return h;
}

export function resolveViewerMember(email, role) {
  const byEmail = getMemberByEmail(email);
  if (byEmail) return byEmail;
  return MOCK_MEMBERS.find((m) => m.role === role) || MOCK_MEMBERS[0];
}

export function hasPitchPermission(member, key) {
  if (!member) return false;
  const roles = PITCH_PERMISSIONS[key];
  if (!roles) return false;
  return roles.includes(member.role);
}

export function enrichPitch(pitch) {
  const analyst = MOCK_MEMBERS.find((m) => m.id === pitch.analyst_member_id);
  const pm = pitch.approving_pm_member_id
    ? MOCK_MEMBERS.find((m) => m.id === pitch.approving_pm_member_id)
    : null;
  const deliverables = getDeliverablesForPitch(pitch.id);
  const hindsight = getHindsight(pitch.id);

  return {
    ...pitch,
    analyst_name: analyst?.name || 'Unknown',
    analyst_initials: (analyst?.name || '?')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2),
    pm_name: pm?.name || null,
    team_name: teamLabel(pitch.team_id),
    team_slug: teamSlug(pitch.team_id),
    pitch_type_label: pitch.pitch_type?.charAt(0).toUpperCase() + pitch.pitch_type?.slice(1),
    horizon_label: formatHorizon(pitch.time_horizon),
    submitted_ago: daysAgoLabel(pitch.created_at),
    deliverable_count: deliverables.length,
    deliverables,
    hindsight,
    stage_label: stageLabel(pitch.stage),
    status_label: statusLabel(pitch.status),
  };
}

function stageLabel(stage) {
  const map = {
    idea: 'Idea submitted',
    research_approved: 'Research approved',
    research_in_progress: 'Research in progress',
    pm_review: 'PM review',
    committee_scheduled: 'Committee scheduled',
    committee_vote: 'Committee vote',
    decision: 'Decision',
  };
  return map[stage] || stage;
}

function statusLabel(status) {
  const map = {
    active: 'Active',
    accepted: 'Accepted',
    rejected: 'Rejected',
    watchlist: 'Watchlist',
    deferred: 'Deferred',
    withdrawn: 'Withdrawn',
  };
  return map[status] || status;
}

export function filterPitchesForViewer(pitches, viewer, { teamId, stage, status } = {}) {
  let list = [...pitches];

  if (viewer.role === 'analyst') {
    list = list.filter((p) => p.analyst_member_id === viewer.id || p.team_id === viewer.team_id);
  } else if (viewer.role === 'portfolio_manager') {
    list = list.filter((p) => !viewer.team_id || p.team_id === viewer.team_id);
  }

  if (teamId) list = list.filter((p) => p.team_id === teamId);
  if (stage) list = list.filter((p) => p.stage === stage);
  if (status) list = list.filter((p) => p.status === status);

  return list;
}

export function getActivePitches(filters = {}) {
  const viewer = filters.viewer;
  let list = listPitches().filter((p) => p.status === 'active');
  if (viewer) list = filterPitchesForViewer(list, viewer, filters);
  return list.map(enrichPitch);
}

export function getArchivedPitches(filters = {}) {
  const viewer = filters.viewer;
  let list = listPitches().filter((p) => p.status !== 'active');
  if (viewer) list = filterPitchesForViewer(list, viewer, filters);

  const q = (filters.search || '').trim().toLowerCase();
  if (q) {
    list = list.filter((p) => {
      const hay = [
        p.ticker,
        p.company_name,
        p.thesis_short,
        p.thesis_full,
        p.decision_rationale,
        memberName(p.analyst_member_id),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (hay.includes(q)) return true;
      if (q.startsWith('decision:')) return p.decision === q.replace('decision:', '').trim();
      if (q.startsWith('analyst:')) {
        const name = q.replace('analyst:', '').trim();
        return memberName(p.analyst_member_id).toLowerCase().includes(name);
      }
      if (q.startsWith('year:')) {
        const year = q.replace('year:', '').trim();
        return (p.decision_at || '').startsWith(year);
      }
      if (q.startsWith('outperformed:')) {
        const min = parseFloat(q.replace('outperformed:', '').replace('>', '').trim());
        const h = getHindsight(p.id);
        return h && h.alpha_pct >= min;
      }
      return false;
    });
  }

  if (filters.decision) list = list.filter((p) => p.decision === filters.decision);
  if (filters.team_id) list = list.filter((p) => p.team_id === filters.team_id);
  if (filters.analyst_id) list = list.filter((p) => p.analyst_member_id === filters.analyst_id);

  const sort = filters.sort || 'recent';
  list.sort((a, b) => {
    const da = new Date(b.decision_at || b.updated_at).getTime();
    const db = new Date(a.decision_at || a.updated_at).getTime();
    return sort === 'oldest' ? db - da : da - db;
  });

  return list.map(enrichPitch);
}

export function getPitchBoard(filters = {}) {
  const active = getActivePitches(filters);
  const columns = PIPELINE_COLUMNS.map((col) => ({
    ...col,
    pitches: active.filter((p) => col.stages.includes(p.stage)),
  }));
  return { columns, total_active: active.length };
}

export function getPitchById(pitchId) {
  const pitch = getPitchRaw(pitchId);
  if (!pitch) return null;
  const enriched = enrichPitch(pitch);
  const votes = getVotesForPitch(pitchId).map((v) => ({
    ...v,
    voter_name: memberName(v.voter_member_id),
    voter_role: MOCK_MEMBERS.find((m) => m.id === v.voter_member_id)?.role,
  }));
  const discussion = getDiscussionForPitch(pitchId).map((d) => ({
    ...d,
    author_name: memberName(d.author_member_id),
  }));
  const history = getHistoryForPitch(pitchId).map((h) => ({
    ...h,
    actor_name: h.actor_member_id ? memberName(h.actor_member_id) : 'System',
  }));
  return {
    ...enriched,
    votes,
    discussion,
    history,
    is_archived: pitch.status !== 'active',
    permissions: buildPitchPermissions(pitch),
  };
}

export function buildPitchPermissions(pitch) {
  return {
    can_edit_thesis:
      pitch.status === 'active' &&
      ['idea', 'research_approved', 'research_in_progress'].includes(pitch.stage),
    can_upload_deliverable:
      pitch.status === 'active' &&
      ['research_in_progress', 'research_approved', 'pm_review'].includes(pitch.stage),
    can_discuss: pitch.status === 'active',
    can_vote: pitch.stage === 'committee_vote',
    can_decide: pitch.stage === 'committee_vote' || pitch.stage === 'decision',
  };
}

export function getPriorsForTicker(ticker) {
  const t = (ticker || '').toUpperCase();
  return listPitches()
    .filter((p) => p.ticker.toUpperCase() === t && p.status !== 'active')
    .map(enrichPitch);
}

export function getArchiveAnalytics() {
  const archived = listPitches().filter((p) => p.status !== 'active' && p.decision);
  const accepted = archived.filter((p) => p.decision === 'accepted');
  const rejected = archived.filter((p) => p.decision === 'rejected');

  const withHindsight = archived
    .map((p) => ({ pitch: p, h: getHindsight(p.id) }))
    .filter((x) => x.h);

  const hitRate =
    accepted.length > 0
      ? (withHindsight.filter((x) => x.pitch.decision === 'accepted' && x.h.alpha_pct > 0).length /
          accepted.length) *
        100
      : 0;

  const missRate =
    rejected.length > 0
      ? (withHindsight.filter((x) => x.pitch.decision === 'rejected' && x.h.alpha_pct > 5).length /
          rejected.length) *
        100
      : 0;

  return {
    total_decided: archived.length,
    accepted_count: accepted.length,
    rejected_count: rejected.length,
    watchlist_count: archived.filter((p) => p.decision === 'watchlist').length,
    hit_rate_pct: Math.round(hitRate * 10) / 10,
    miss_rate_pct: Math.round(missRate * 10) / 10,
    by_team: MOCK_TEAMS.map((t) => ({
      team_id: t.id,
      team_name: t.name,
      count: archived.filter((p) => p.team_id === t.id).length,
    })),
  };
}
