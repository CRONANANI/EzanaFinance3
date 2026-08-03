import { isValidUuid } from '@/lib/uuid';

/**
 * Resolve the caller's active org membership. A user can be an active member of
 * MORE THAN ONE org (a student in their home council who also judges/joins
 * elsewhere; staff across programs), so this must NOT use `.maybeSingle()` — that
 * returns null when several rows match, silently locking multi-org users out of
 * every org page. Instead it fetches all active memberships (earliest join first)
 * and deterministically picks one: an explicitly requested `preferredOrgId` if the
 * user belongs to it, else the earliest-joined membership (a stable default).
 *
 * Returns the chosen membership plus `email` and `memberships` (all active rows,
 * for a future org switcher), or null when the user has no active membership.
 *
 * @param supabase a Supabase client bound to the caller
 * @param {string|null} preferredOrgId prefer the membership in this org when present
 */
export async function getCurrentOrgMember(supabase, preferredOrgId = null) {
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return null;
  const { data: rows, error } = await supabase
    .from('org_members')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('joined_at', { ascending: true }); // stable: earliest membership first
  if (error || !rows || rows.length === 0) return null;

  const member = (preferredOrgId && rows.find((r) => r.org_id === preferredOrgId)) || rows[0];
  return { ...member, email: user.email || null, memberships: rows };
}

/**
 * Server-side role gate for org write paths. Returns true only when the
 * resolved member is an active member with one of the allowed roles. Hiding a
 * button in the UI is never enough — every write route must call this before
 * mutating, so an analyst hitting the endpoint directly is rejected.
 *
 * @param {{ role?: string, is_active?: boolean } | null | undefined} member
 * @param {string[]} allowedRoles
 */
export function assertOrgRole(member, allowedRoles) {
  if (!member || member.is_active === false) return false;
  return allowedRoles.includes(member.role);
}

/**
 * Resolve BOTH flag recipients from the REAL org chart — no mock data.
 * The client never sets these; routing is decided server-side so a raiser
 * cannot re-point a flag at a friendlier reviewer.
 *
 * Covering analyst, in priority order:
 *   1. analyst_member_id on the most recent org_pitch for this ticker
 *   2. org_sector_coverage primary (then any) active analyst for the sector
 *   3. any active analyst on the position's team
 * Sector head: the team's active portfolio_manager.
 * Coverage thesis: thesis_short from that most recent pitch.
 *
 * Callers should fall back to an active executive when both seats resolve
 * null (see routeFallbackExecutive) — a real org must never fail to route.
 *
 * @returns {Promise<{coveringAnalystOrgId: string|null, sectorHeadOrgId: string|null, coverage: {sector: string|null, thesis: string|null, pitch_id: string|null}|null}>}
 */
export async function resolveFlagRoutingDb(supabase, orgId, { ticker, teamDbId, sector }) {
  const sym = String(ticker || '').toUpperCase().trim();

  // 1) Most recent pitch on the ticker → covering analyst + thesis.
  const { data: pitch } = await supabase
    .from('org_pitches')
    .select('id, analyst_member_id, thesis_short, team_id')
    .eq('org_id', orgId)
    .eq('ticker', sym)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let coveringAnalystOrgId = null;
  if (pitch?.analyst_member_id) {
    const { data: m } = await supabase
      .from('org_members')
      .select('id')
      .eq('id', pitch.analyst_member_id)
      .eq('org_id', orgId)
      .eq('is_active', true)
      .maybeSingle();
    coveringAnalystOrgId = m?.id ?? null;
  }

  // 2) Sector coverage → active analyst covering this sector (primary first).
  if (!coveringAnalystOrgId && sector) {
    const { data: cov } = await supabase
      .from('org_sector_coverage')
      .select('is_primary, member:org_members(id, role, is_active)')
      .eq('org_id', orgId)
      .eq('sector', sector);
    const analysts = (cov || []).filter((c) => c.member?.is_active && c.member.role === 'analyst');
    const pick = analysts.find((c) => c.is_primary) || analysts[0];
    coveringAnalystOrgId = pick?.member?.id ?? null;
  }

  // 3) Any active analyst on the team.
  const effectiveTeamId = teamDbId || pitch?.team_id || null;
  if (!coveringAnalystOrgId && effectiveTeamId) {
    const { data: ta } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('team_id', effectiveTeamId)
      .eq('role', 'analyst')
      .eq('is_active', true)
      .order('created_at')
      .limit(1)
      .maybeSingle();
    coveringAnalystOrgId = ta?.id ?? null;
  }

  // Sector head: the team's PM.
  let sectorHeadOrgId = null;
  if (effectiveTeamId) {
    const { data: pm } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('team_id', effectiveTeamId)
      .eq('role', 'portfolio_manager')
      .eq('is_active', true)
      .order('created_at')
      .limit(1)
      .maybeSingle();
    sectorHeadOrgId = pm?.id ?? null;
  }

  return {
    coveringAnalystOrgId,
    sectorHeadOrgId,
    coverage: pitch
      ? { sector: sector ?? null, thesis: pitch.thesis_short ?? null, pitch_id: pitch.id }
      : sector
        ? { sector, thesis: null, pitch_id: null }
        : null,
  };
}

/** Last-resort recipient: the org's first active executive. */
export async function routeFallbackExecutive(supabase, orgId) {
  const { data } = await supabase
    .from('org_members')
    .select('id')
    .eq('org_id', orgId)
    .eq('role', 'executive')
    .eq('is_active', true)
    .order('created_at')
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/** Resolve request team id: prefer UUID; ignore mock keys. */
export function normalizeTeamDbId(teamId) {
  if (!teamId) return null;
  if (isValidUuid(teamId)) return teamId;
  return null;
}
