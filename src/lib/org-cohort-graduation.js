/**
 * Graduation of one cohort: who graduates, and whether each sector they cover
 * has a published handoff document.
 *
 * Shared by the readiness preview (GET /api/org/cohorts/:id/graduation) and
 * the graduation itself (POST /api/org/cohorts/:id/archive), so the list the
 * confirmation dialog shows is the list the server graduates.
 *
 * A member graduates with a cohort only when they belong to THAT cohort
 * (org_members.cohort_id) and are flagged: the flag the Org Chart sets
 * (is_graduating) or the lifecycle status "graduating" set here. Members of
 * other cohorts are never swept in, whatever their flag.
 *
 * Pure helpers plus one loader that takes the caller's Supabase client (RLS
 * stays the gate). No server imports.
 */

/** A research note counts as a published coverage handoff when it is
 *  published and typed or tagged as a handoff. */
export function isPublishedHandoff(note) {
  if (!note) return false;
  const published = !!note.published_at || note.status === 'published';
  const dt = String(note.doc_type || '').toLowerCase();
  const tags = Array.isArray(note.tags) ? note.tags.map((t) => String(t).toLowerCase()) : [];
  return published && (dt.includes('handoff') || tags.includes('handoff'));
}

/** True when a member is flagged to graduate (Org Chart flag or lifecycle). */
export function isFlaggedToGraduate(m) {
  return !!m && (m.is_graduating === true || m.lifecycle_status === 'graduating');
}

/** The members who graduate with `cohortId`: active, in that cohort, flagged. */
export function graduatesOf(members, cohortId) {
  if (!cohortId) return [];
  return (members || []).filter(
    (m) => m && m.cohort_id === cohortId && m.is_active !== false && isFlaggedToGraduate(m),
  );
}

/**
 * The handoff check for a set of graduates.
 * @param {{ grads: object[], coverage: {member_id:string, sector:string}[],
 *           notes: object[], showHandoffs?: boolean }} input
 * @returns {{ required:number, published:number,
 *   missing:{member_id:string, member_name:string|null, sector:string}[],
 *   members:{member_id:string, display_name:string|null, role:string|null,
 *            title:string|null, sectors:{sector:string, published:boolean|null}[]}[] }}
 */
export function handoffStatus({ grads, coverage, notes, showHandoffs = true }) {
  const list = grads || [];
  const ids = new Set(list.map((m) => m.id));
  const userOf = new Map(list.map((m) => [m.id, m.user_id || null]));
  const published = new Set(
    (notes || [])
      .filter(isPublishedHandoff)
      .map((n) => `${n.author_id}:${String(n.sector || '').toLowerCase()}`),
  );
  const required = (coverage || []).filter((c) => ids.has(c.member_id));
  const isDone = (c) => {
    const uid = userOf.get(c.member_id);
    return !!uid && published.has(`${uid}:${String(c.sector || '').toLowerCase()}`);
  };
  const missing = required.filter((c) => !isDone(c));
  const nameOf = new Map(list.map((m) => [m.id, m.display_name || null]));
  return {
    required: required.length,
    published: required.length - missing.length,
    missing: missing.map((c) => ({
      member_id: c.member_id,
      member_name: nameOf.get(c.member_id) || null,
      sector: c.sector,
    })),
    members: list.map((m) => ({
      member_id: m.id,
      display_name: m.display_name || null,
      role: m.role || null,
      title: m.title || null,
      sectors: required
        .filter((c) => c.member_id === m.id)
        .map((c) => ({ sector: c.sector, published: showHandoffs ? isDone(c) : null })),
    })),
  };
}

/** Same ids, in any order. */
export function sameMemberSet(a, b) {
  const x = new Set((a || []).map(String));
  const y = new Set((b || []).map(String));
  if (x.size !== y.size) return false;
  for (const v of x) if (!y.has(v)) return false;
  return true;
}

export const GRAD_MEMBER_COLUMNS =
  'id, user_id, display_name, role, sub_role, title, is_graduating, lifecycle_status, is_active, cohort_id, team_id';

/**
 * Load the graduates of one cohort and their handoff check, as the caller.
 * @returns {Promise<{ roster: object[], grads: object[], gate: ReturnType<typeof handoffStatus> }>}
 */
export async function loadGraduation(supabase, orgId, cohortId, { showHandoffs = true } = {}) {
  const { data: members } = await supabase
    .from('org_members')
    .select(GRAD_MEMBER_COLUMNS)
    .eq('org_id', orgId)
    .eq('cohort_id', cohortId)
    .eq('is_active', true);
  const roster = members || [];
  const grads = graduatesOf(roster, cohortId);
  let coverage = [];
  let notes = [];
  if (grads.length > 0) {
    const gradIds = grads.map((m) => m.id);
    const gradUserIds = grads.map((m) => m.user_id).filter(Boolean);
    const { data: cov } = await supabase
      .from('org_sector_coverage')
      .select('member_id, sector')
      .eq('org_id', orgId)
      .in('member_id', gradIds);
    coverage = cov || [];
    if (gradUserIds.length > 0 && showHandoffs) {
      const { data: n } = await supabase
        .from('org_research_notes')
        .select('author_id, sector, doc_type, tags, status, published_at')
        .eq('org_id', orgId)
        .in('author_id', gradUserIds);
      notes = n || [];
    }
  }
  return { roster, grads, gate: handoffStatus({ grads, coverage, notes, showHandoffs }) };
}
