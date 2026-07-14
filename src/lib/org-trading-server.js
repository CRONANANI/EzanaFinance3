import {
  MOCK_MEMBERS,
  MOCK_TEAMS,
  MOCK_TMT_RESEARCH_PIPELINE,
  dbTeamIdFromMockTeamId,
  getMemberByEmail,
  mockTeamIdFromDbTeams,
  resolveFlagRecipient,
} from '@/lib/orgMockData';
import { isValidUuid } from '@/lib/uuid';

export async function getCurrentOrgMember(supabase) {
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return null;
  const { data: member, error } = await supabase
    .from('org_members')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !member) return null;
  return { ...member, email: user.email || null };
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
 * Map mock council member id (e.g. m3) to real org_members.id in this org (display_name match).
 */
export async function mockMemberIdToOrgMemberId(supabase, orgId, mockMemberId) {
  const mock = MOCK_MEMBERS.find((m) => m.id === mockMemberId);
  if (!mock) return null;
  const { data } = await supabase
    .from('org_members')
    .select('id')
    .eq('org_id', orgId)
    .eq('display_name', mock.name)
    .eq('is_active', true)
    .maybeSingle();
  return data?.id ?? null;
}

/** Build PERMISSION_TIERS-shaped profile for routing (mock team id + role from DB). */
export async function buildRoutingProfile(member, supabase) {
  const mockSelf = getMemberByEmail(member.email);
  let mockTeamId = mockSelf?.team_id ?? null;
  if (!mockTeamId && member.team_id) {
    const { data: tr } = await supabase
      .from('org_teams')
      .select('slug')
      .eq('id', member.team_id)
      .maybeSingle();
    mockTeamId = MOCK_TEAMS.find((t) => t.slug === tr?.slug)?.id ?? null;
  }
  return {
    role: member.role,
    sub_role: member.sub_role,
    team_id: mockTeamId,
  };
}

export async function resolveRecipientOrgMemberId(
  supabase,
  orgId,
  routingProfile,
  ticker,
  mockTeamId,
) {
  const recipientMockId = resolveFlagRecipient(routingProfile, ticker, mockTeamId);
  if (!recipientMockId) return null;
  return mockMemberIdToOrgMemberId(supabase, orgId, recipientMockId);
}

/** Coverage pipeline entry for a ticker (carries the covering analyst + thesis). */
export function findFlagCoverage(ticker) {
  return MOCK_TMT_RESEARCH_PIPELINE.find((r) => r.ticker === ticker) || null;
}

/**
 * Auto-derive BOTH flag recipients from the org chart — the covering analyst
 * (from the research coverage pipeline, falling back to any analyst on the
 * sector team) and the sector head (the team's portfolio manager). The client
 * never sets these; the routing is decided here so a raiser cannot re-point a
 * flag at a friendlier reviewer.
 *
 * @returns {Promise<{ coveringAnalystOrgId: string|null, sectorHeadOrgId: string|null, coverage: object|null }>}
 */
export async function resolveFlagRouting(supabase, orgId, ticker, mockTeamId) {
  const coverage = findFlagCoverage(ticker);

  let coveringAnalystOrgId = null;
  if (coverage?.analyst_id) {
    coveringAnalystOrgId = await mockMemberIdToOrgMemberId(supabase, orgId, coverage.analyst_id);
  }
  if (!coveringAnalystOrgId && mockTeamId) {
    const teamAnalyst = MOCK_MEMBERS.find((m) => m.role === 'analyst' && m.team_id === mockTeamId);
    if (teamAnalyst) {
      coveringAnalystOrgId = await mockMemberIdToOrgMemberId(supabase, orgId, teamAnalyst.id);
    }
  }

  let sectorHeadOrgId = null;
  if (mockTeamId) {
    const pm = MOCK_MEMBERS.find((m) => m.role === 'portfolio_manager' && m.team_id === mockTeamId);
    if (pm) sectorHeadOrgId = await mockMemberIdToOrgMemberId(supabase, orgId, pm.id);
  }

  return { coveringAnalystOrgId, sectorHeadOrgId, coverage };
}

/** Resolve request team id: prefer UUID; ignore mock keys. */
export function normalizeTeamDbId(teamId) {
  if (!teamId) return null;
  if (isValidUuid(teamId)) return teamId;
  return null;
}

export { dbTeamIdFromMockTeamId, mockTeamIdFromDbTeams } from '@/lib/orgMockData';
