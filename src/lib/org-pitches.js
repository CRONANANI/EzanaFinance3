/**
 * Pitch pipeline permission map, kanban column definitions, and archive read
 * helpers — all backed by the real Supabase tables (org_pitches,
 * org_pitch_hindsight, org_pitch_deliverables, ...). RLS scopes every row to the
 * caller's org. This module no longer touches the in-memory mock store.
 */

import {
  fetchPitches,
  fetchDeliverablesMap,
  loadDirectory,
  enrichPitchRow,
  fetchPitchDetail,
} from '@/lib/org-pitch-api-helpers';

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

// Kanban column definitions (moved out of the mock module — a live constant the
// board uses to bucket the 7 active stages into visual columns).
export const PIPELINE_COLUMNS = [
  { id: 'ideas', label: 'Ideas', stages: ['idea'] },
  { id: 'research', label: 'Research', stages: ['research_approved', 'research_in_progress'] },
  { id: 'pm_review', label: 'PM Review', stages: ['pm_review'] },
  { id: 'committee', label: 'Committee', stages: ['committee_scheduled'] },
  { id: 'voting', label: 'Voting', stages: ['committee_vote'] },
  { id: 'decided', label: 'Decided', stages: ['decision'] },
];

export function hasPitchPermission(member, key) {
  if (!member) return false;
  const roles = PITCH_PERMISSIONS[key];
  if (!roles) return false;
  return roles.includes(member.role);
}

/** Build the lightweight viewer used for archive scoping from an org member. */
export function viewerFromMember(member) {
  if (!member) return null;
  return {
    id: member.id,
    role: member.role,
    team_id: member.team_id || null,
  };
}

function filterForViewer(list, viewer) {
  if (!viewer) return list;
  if (viewer.role === 'analyst') {
    return list.filter((p) => p.analyst_member_id === viewer.id || p.team_id === viewer.team_id);
  }
  if (viewer.role === 'portfolio_manager') {
    return list.filter((p) => !viewer.team_id || p.team_id === viewer.team_id);
  }
  return list;
}

/**
 * Enrich raw org_pitches rows and attach their persisted hindsight snapshot
 * (org_pitch_hindsight) so archive filters/analytics can read realized alpha.
 */
async function enrichWithHindsight(supabase, orgId, rows) {
  if (!rows.length) return [];
  const { memberMap, teamMap } = await loadDirectory(supabase, orgId);
  const pitchIds = rows.map((r) => r.id);
  const [delMap, hindRes] = await Promise.all([
    fetchDeliverablesMap(supabase, pitchIds),
    supabase.from('org_pitch_hindsight').select('*').in('pitch_id', pitchIds),
  ]);
  const hindMap = new Map((hindRes.data || []).map((h) => [h.pitch_id, h]));
  return rows.map((r) => ({
    ...enrichPitchRow(r, { memberMap, teamMap, deliverables: delMap.get(r.id) || [] }),
    hindsight: hindMap.get(r.id) || null,
  }));
}

/**
 * Archive lane = every non-active pitch (rejected / withdrawn / accepted /
 * watchlist / deferred / exited). Supports the same search operators + filters
 * the UI relied on, now against real rows.
 */
export async function getArchivedPitches(supabase, orgId, filters = {}) {
  if (!orgId) return [];
  const all = await fetchPitches(supabase, orgId, { teamId: filters.team_id });
  const rows = all.filter((p) => p.status !== 'active');
  let list = await enrichWithHindsight(supabase, orgId, rows);
  list = filterForViewer(list, filters.viewer);

  const q = (filters.search || '').trim().toLowerCase();
  if (q) {
    list = list.filter((p) => {
      const hay = [
        p.ticker,
        p.company_name,
        p.thesis_short,
        p.thesis_full,
        p.decision_rationale,
        p.analyst_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (hay.includes(q)) return true;
      if (q.startsWith('decision:')) return p.decision === q.replace('decision:', '').trim();
      if (q.startsWith('analyst:')) {
        const name = q.replace('analyst:', '').trim();
        return (p.analyst_name || '').toLowerCase().includes(name);
      }
      if (q.startsWith('year:')) {
        const year = q.replace('year:', '').trim();
        return (p.decision_at || '').startsWith(year);
      }
      if (q.startsWith('outperformed:')) {
        const min = parseFloat(q.replace('outperformed:', '').replace('>', '').trim());
        return p.hindsight && p.hindsight.alpha_pct >= min;
      }
      return false;
    });
  }

  if (filters.decision) list = list.filter((p) => p.decision === filters.decision);
  if (filters.analyst_id) list = list.filter((p) => p.analyst_member_id === filters.analyst_id);

  const sort = filters.sort || 'recent';
  list.sort((a, b) => {
    const da = new Date(b.decision_at || b.updated_at).getTime();
    const db = new Date(a.decision_at || a.updated_at).getTime();
    return sort === 'oldest' ? db - da : da - db;
  });

  return list;
}

/** Prior decided pitches for a ticker (archive "priors" rail). */
export async function getPriorsForTicker(supabase, orgId, ticker) {
  if (!orgId || !ticker) return [];
  const t = (ticker || '').toUpperCase();
  const all = await fetchPitches(supabase, orgId);
  const rows = all.filter((p) => (p.ticker || '').toUpperCase() === t && p.status !== 'active');
  return enrichWithHindsight(supabase, orgId, rows);
}

/** Full detail for a single pitch (thin wrapper over the shared helper). */
export async function getPitchById(supabase, orgId, pitchId) {
  return fetchPitchDetail(supabase, orgId, pitchId);
}

/** Aggregate archive analytics (hit/miss rate, per-team counts) from real rows. */
export async function getArchiveAnalytics(supabase, orgId) {
  const empty = {
    total_decided: 0,
    accepted_count: 0,
    rejected_count: 0,
    watchlist_count: 0,
    hit_rate_pct: 0,
    miss_rate_pct: 0,
    by_team: [],
  };
  if (!orgId) return empty;

  const all = await fetchPitches(supabase, orgId);
  const archivedRows = all.filter((p) => p.status !== 'active' && p.decision);
  const enriched = await enrichWithHindsight(supabase, orgId, archivedRows);
  const { teamMap } = await loadDirectory(supabase, orgId);

  const accepted = enriched.filter((p) => p.decision === 'accepted');
  const rejected = enriched.filter((p) => p.decision === 'rejected');
  const withHindsight = enriched.filter((p) => p.hindsight);

  const hitRate =
    accepted.length > 0
      ? (withHindsight.filter((p) => p.decision === 'accepted' && p.hindsight.alpha_pct > 0)
          .length /
          accepted.length) *
        100
      : 0;

  const missRate =
    rejected.length > 0
      ? (withHindsight.filter((p) => p.decision === 'rejected' && p.hindsight.alpha_pct > 5)
          .length /
          rejected.length) *
        100
      : 0;

  return {
    total_decided: enriched.length,
    accepted_count: accepted.length,
    rejected_count: rejected.length,
    watchlist_count: enriched.filter((p) => p.decision === 'watchlist').length,
    hit_rate_pct: Math.round(hitRate * 10) / 10,
    miss_rate_pct: Math.round(missRate * 10) / 10,
    by_team: [...teamMap.values()].map((t) => ({
      team_id: t.id,
      team_name: t.name,
      count: archivedRows.filter((p) => p.team_id === t.id).length,
    })),
  };
}
