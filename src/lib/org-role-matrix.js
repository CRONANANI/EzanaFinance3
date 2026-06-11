/**
 * Canonical role requirements — the single source of truth for org route
 * authorization across Phases 1–4.
 *
 * Every privileged route enforces these server-side via
 *   getCurrentOrgMember(supabase)  → the caller's active org_members row
 *   assertOrgRole(member, roles)   → boolean role gate (→ 403 when false)
 * and scopes all data to the caller's own `member.org_id` (never a
 * client-supplied org_id). Faculty advisors are role 'executive' with
 * sub_role 'Faculty Advisor', so 'executive' grants advisor powers.
 *
 * Routes not listed here are readable/writable by ANY active org member
 * (e.g. GET dashboards, posting one's own note/comment/reaction, toggling a
 * reaction, the IPS check engine). A few routes additionally apply per-row
 * "own data" rules that are NOT pure role gates — see OWN_DATA_RULES below.
 */
export const ORG_ROUTE_ROLES = {
  // ── Phase 1 — Org chart ────────────────────────────────────────────────
  'PATCH /api/org/chart': ['executive', 'portfolio_manager'],

  // ── Phase 2 — Social & team hub ────────────────────────────────────────
  // research-notes [id] PATCH/DELETE = author OR manager (see OWN_DATA_RULES)
  'POST /api/org/recognition': ['executive', 'portfolio_manager'],
  'POST /api/org/recognition/auto': ['executive', 'portfolio_manager'],
  'POST /api/org/meetings': ['executive', 'portfolio_manager'],
  'PATCH /api/org/meetings/[id]': ['executive', 'portfolio_manager'],

  // ── Phase 3 — Academic / SMIF ──────────────────────────────────────────
  'POST /api/org/cohorts': ['executive'],
  'PATCH /api/org/cohorts': ['executive'],
  'POST /api/org/cohorts/[id]/archive': ['executive'],
  'POST /api/org/grades': ['executive'], // executives incl. faculty advisors
  'PATCH /api/org/grades': ['executive'],
  'POST /api/org/assignments': ['executive', 'portfolio_manager'],
  // assignments PATCH = assignee may set 'submitted'; managers set 'graded'
  'POST /api/org/competitions': ['executive', 'portfolio_manager'],
  'POST /api/org/ips/rules': ['executive'],
  'DELETE /api/org/ips/rules': ['executive'],
  'PATCH /api/org/ips/violations': ['executive', 'portfolio_manager'],

  // ── Phase 4 — Analytics & reporting ────────────────────────────────────
  'POST /api/org/reports': ['executive', 'portfolio_manager'],
  'GET /api/org/reports/[id]/pdf': ['executive', 'portfolio_manager'],
  // scorecard GET = own / PM-of-team / executive (see OWN_DATA_RULES)
};

/**
 * Routes whose authorization is NOT a pure role gate — they mix a role check
 * with a per-row "own data" or "own team" exception. The route enforces these
 * inline; this is the documented contract.
 */
export const OWN_DATA_RULES = {
  'PATCH /api/org/research-notes/[id]': 'author OR executive/portfolio_manager',
  'DELETE /api/org/research-notes/[id]': 'author OR executive/portfolio_manager',
  'PATCH /api/org/assignments': "assignee may set 'submitted'; manager sets 'graded'",
  'GET /api/org/analytics/scorecard/[memberId]':
    'self OR portfolio_manager of that member’s team OR executive; analyst→403 for peers',
  'GET /api/org/grades': 'student reads only own rows; executive reads all',
  'GET /api/org/research-notes': "'private' visibility hidden from non-authors (RLS)",
  'GET /api/org/mentions': 'only mentions where mentioned_user_id = caller',
};

/** Convenience: roles required for a "METHOD /path" key, or null if open. */
export function rolesForRoute(method, path) {
  return ORG_ROUTE_ROLES[`${method.toUpperCase()} ${path}`] ?? null;
}
