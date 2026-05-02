import {
  MOCK_MEMBERS,
  MOCK_TEAMS,
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

export async function resolveRecipientOrgMemberId(supabase, orgId, routingProfile, ticker, mockTeamId) {
  const recipientMockId = resolveFlagRecipient(routingProfile, ticker, mockTeamId);
  if (!recipientMockId) return null;
  return mockMemberIdToOrgMemberId(supabase, orgId, recipientMockId);
}

/** Resolve request team id: prefer UUID; ignore mock keys. */
export function normalizeTeamDbId(teamId) {
  if (!teamId) return null;
  if (isValidUuid(teamId)) return teamId;
  return null;
}

export { dbTeamIdFromMockTeamId, mockTeamIdFromDbTeams } from '@/lib/orgMockData';
