/**
 * Sonar for organizations: server helpers shared by the org Sonar routes.
 *
 * Reads go through the caller's client, so RLS decides what is visible
 * (org_sonar_report_visible); the helpers here only shape rows and resolve
 * the viewer's review permission. Never import from client code.
 */
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { memberHasPermission } from '@/lib/org-permissions-server';
import { isManager } from './reports';

/** The calling member with `canApprove`, or null. */
export async function loadOrgViewer(supabase) {
  const member = await getCurrentOrgMember(supabase).catch(() => null);
  if (!member || member.is_active === false) return null;
  const canApprove =
    isManager(member) ||
    (await memberHasPermission(supabase, member, 'approve_deliverables').catch(() => false));
  return { ...member, canApprove };
}

export const REPORT_COLUMNS =
  'id, org_id, author_id, author_member_id, team_id, kind, title, question, ticker, sector, ' +
  'visibility, shared_with, status, current_version, approved_version, summary, pitch_id, ' +
  'challenge_of, submitted_at, reviewed_by, reviewed_at, review_note, approved_at, created_at, updated_at';

/** Display names for the authors and reviewers of `rows`. */
export async function attachNames(supabase, orgId, rows) {
  const list = Array.isArray(rows) ? rows : [];
  const ids = [...new Set(list.flatMap((r) => [r.author_id, r.reviewed_by]).filter(Boolean))];
  if (!ids.length) return list;
  const { data } = await supabase
    .from('org_members')
    .select('user_id, display_name, role, team_id')
    .eq('org_id', orgId)
    .in('user_id', ids);
  const by = new Map((data || []).map((m) => [m.user_id, m]));
  return list.map((r) => ({
    ...r,
    author_name: by.get(r.author_id)?.display_name || 'Member',
    author_role: by.get(r.author_id)?.role || null,
    reviewer_name: r.reviewed_by ? by.get(r.reviewed_by)?.display_name || 'Member' : null,
  }));
}

/** Keep only user ids that are active members of the org. */
export async function orgUserIds(supabase, orgId, ids) {
  const want = [...new Set((ids || []).filter(Boolean))];
  if (!want.length) return [];
  const { data } = await supabase
    .from('org_members')
    .select('user_id')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .in('user_id', want);
  return (data || []).map((m) => m.user_id);
}

/** The viewer-facing shape of the viewer's rights on one report. */
export function viewerRights(report, viewer) {
  const author = report.author_id === viewer.user_id;
  const reviewer = viewer.canApprove || isManager(viewer);
  return {
    isAuthor: author,
    canEdit: author || isManager(viewer),
    canSubmit: author && report.status === 'draft',
    canWithdraw: author && report.status === 'under_review',
    canApprove: reviewer && !author && report.status === 'under_review',
    canReturn: reviewer && !author && report.status === 'under_review',
    canSupersede: (author || reviewer) && report.status === 'approved',
    canChallenge: report.kind !== 'challenge' && report.status !== 'superseded',
    canDelete: author && report.status === 'draft',
  };
}
