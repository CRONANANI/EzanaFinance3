/**
 * Sonar for organizations: read and write the org research methodology
 * (server). The route resolves the caller's org membership from the session
 * (getCurrentOrgMember) and hands it here; this module decides who may read
 * and write, validates, and writes with the service role scoped to the
 * member's own org. Returns { status, body } so the route stays thin and the
 * rules are testable (scripts/check-org-research-methodology.mjs).
 */
import { assertOrgRole } from '@/lib/org-trading-server';
import { memberHasPermission } from '@/lib/org-permissions-server';
import { logOrgAction } from '@/lib/org-audit';
import {
  METHODOLOGY_COLUMNS,
  defaultMethodology,
  normalizeMethodology,
  validateMethodology,
} from './research-methodology';

const isMember = (m) => Boolean(m && m.org_id && m.is_active !== false);

/**
 * Executives holding manage_org_settings edit the methodology. The role comes
 * from the org membership row; the permission from the tier table plus
 * overrides (manage_org_settings is not assignable, so no override widens it).
 */
export async function canManageMethodology(supabase, member) {
  if (!isMember(member) || !assertOrgRole(member, ['executive'])) return false;
  return memberHasPermission(supabase, member, 'manage_org_settings').catch(() => false);
}

/**
 * GET: the member's own org methodology, read through the caller's client
 * (RLS org_research_methodology_read) and filtered by the member's org id.
 */
export async function readMethodologyForMember(supabase, member) {
  if (!isMember(member)) return { status: 403, body: { error: 'Not an org member' } };
  const { data, error } = await supabase
    .from('org_research_methodology')
    .select(METHODOLOGY_COLUMNS)
    .eq('org_id', member.org_id)
    .maybeSingle();
  const methodology =
    !error && data && data.org_id === member.org_id
      ? normalizeMethodology(data)
      : defaultMethodology(member.org_id);
  return {
    status: 200,
    body: {
      methodology,
      available: !error,
      viewer: { canManage: await canManageMethodology(supabase, member) },
    },
  };
}

/**
 * PUT: replace the methodology. Order matters: membership, then the
 * executive check, then the body, so a non-executive learns nothing from
 * validation. `readBody` parses the request; `getService` returns the
 * service-role client (or null when the server is not configured).
 */
export async function writeMethodologyForMember({ supabase, member, readBody, getService }) {
  if (!isMember(member)) return { status: 403, body: { error: 'Not an org member' } };
  if (!(await canManageMethodology(supabase, member))) {
    return { status: 403, body: { error: 'Executive role required' } };
  }

  let body;
  try {
    body = await readBody();
  } catch {
    return { status: 400, body: { error: 'Invalid JSON' } };
  }
  const v = validateMethodology(body);
  if (!v.ok) {
    return { status: 400, body: { error: 'Some fields need attention.', fields: v.errors } };
  }

  const service = getService();
  if (!service) return { status: 503, body: { error: 'Server not configured' } };

  /* org_id always comes from the membership row, never from the body. */
  const row = {
    ...v.value,
    org_id: member.org_id,
    updated_by: member.user_id || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await service
    .from('org_research_methodology')
    .upsert(row, { onConflict: 'org_id' })
    .select(METHODOLOGY_COLUMNS)
    .single();
  if (error || !data) {
    return {
      status: 500,
      body: { error: 'The research methodology could not be saved. Please try again.' },
    };
  }

  await logOrgAction(service, {
    orgId: member.org_id,
    actorId: member.user_id,
    action: 'research_methodology_updated',
    targetType: 'org',
    targetId: member.org_id,
    detail: { fields: Object.keys(v.value) },
  });

  return {
    status: 200,
    body: { methodology: normalizeMethodology({ ...data, org_id: member.org_id }) },
  };
}
