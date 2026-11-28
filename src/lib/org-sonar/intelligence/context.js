/**
 * Sonar for organizations: the council context plan (Nov 28 2026).
 *
 * Decides, for one parsed council intent, which council records the context provider
 * (intelligence-server.js, OrgSonarContextProvider) loads. Selective by design: a coverage
 * question never loads meeting notes, a concentration question never loads pitch theses.
 * The plan also yields the context indicators the reader sees ("Council portfolio",
 * "Investment policy", "Current pitch") and which of them the reader may remove.
 *
 * The organization itself is never part of the plan's input: it is the membership the
 * server resolved from the session (getCurrentOrgMember), so a browser-supplied org id can
 * only choose between the member's own memberships. The cache key carries the org, the
 * member, their role, desk and the plan, so two scopes can never share a cached answer.
 *
 * Pure and client-safe; unit-tested in scripts/check-org-sonar-intelligence.mjs.
 */

/* What each source is, its indicator label, and whether the reader may drop it. */
export const CONTEXT_SOURCES = {
  positions: { label: 'Council portfolio', optional: false },
  ips: { label: 'Investment policy', optional: true },
  coverage: { label: 'Sector coverage', optional: false },
  reports: { label: 'Council research', optional: true },
  notes: { label: 'Research Library', optional: true },
  pitches: { label: 'Pitch Pipeline', optional: true },
  pitch: { label: 'Current pitch', optional: false },
  meetings: { label: 'Meetings', optional: false },
  flags: { label: 'Position flags', optional: true },
  assignments: { label: 'Open assignments', optional: true },
  members: { label: 'Council members', optional: false },
  desk: { label: 'Your desk', optional: true },
};

const PLAN = {
  'org-portfolio-analysis': ['positions', 'ips', 'flags'],
  'org-policy-observations': ['positions', 'ips'],
  'org-research-coverage': [
    'positions',
    'reports',
    'notes',
    'pitches',
    'coverage',
    'members',
    'assignments',
  ],
  'org-thesis-red-team': ['pitch', 'reports', 'positions', 'ips'],
  'org-pitch-research': ['pitch', 'reports', 'notes'],
  'org-meeting-briefing': ['meetings', 'pitches', 'reports', 'flags', 'positions', 'ips'],
  'org-research-memory': ['reports', 'notes'],
  'org-thesis-monitoring': ['reports'],
};

/**
 * @param intent   parseOrgIntent() result
 * @param member   the server-resolved member { id, org_id, user_id, role, team_id }
 * @param removed  optional sources the reader removed
 */
export function contextPlan(intent, member, { removed = [] } = {}) {
  if (!intent?.orgScoped || !member?.org_id) return { sources: [], indicators: [], cacheKey: null };
  const drop = new Set(removed.filter((k) => CONTEXT_SOURCES[k]?.optional));
  const base = PLAN[intent.capability] || PLAN['org-portfolio-analysis'];
  const sources = base.filter((k) => !drop.has(k));
  if (
    member.team_id &&
    (intent.capability === 'org-research-coverage' || intent.capability === 'org-pitch-research')
  )
    sources.push('desk');
  const indicators = sources.map((k) => ({
    key: k,
    label: CONTEXT_SOURCES[k].label,
    removable: CONTEXT_SOURCES[k].optional,
  }));
  if (intent.tickers?.length)
    indicators.push({ key: 'tickers', label: intent.tickers.join(', '), removable: false });
  return {
    sources,
    indicators,
    removed: [...drop],
    cacheKey: authorizedCacheKey(member, intent.capability, sources, intent.tickers),
  };
}

/** A cache key scoped to the organization, member, role and desk. */
export function authorizedCacheKey(member, capability, sources = [], tickers = []) {
  return [
    'org-sonar',
    member.org_id,
    member.id || member.user_id,
    member.role || 'member',
    member.team_id || 'no-desk',
    capability,
    [...sources].sort().join('+'),
    [...(tickers || [])].sort().join('+'),
  ].join(':');
}

/**
 * Choose the active organization: a requested org id counts only when it is one of the
 * member's own active memberships; otherwise the server default stands.
 */
export function chooseOrg(memberships = [], requestedOrgId = null, defaultOrgId = null) {
  const active = memberships.filter((m) => m.is_active !== false);
  if (requestedOrgId && active.some((m) => m.org_id === requestedOrgId)) return requestedOrgId;
  return defaultOrgId && active.some((m) => m.org_id === defaultOrgId)
    ? defaultOrgId
    : active[0]?.org_id || null;
}
