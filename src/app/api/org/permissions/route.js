import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { logOrgAction } from '@/lib/org-audit';
import {
  loadPermissionsMatrix,
  canGrantTo,
  ASSIGNABLE_PERMISSIONS,
} from '@/lib/org-permissions-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/permissions — the viewer, their direct reports, and each
   report's effective + overridable permissions. */
export const GET = withApiGuard(async () => {
  const supabase = createServerSupabase();
  const viewer = await getCurrentOrgMember(supabase);
  if (!viewer) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

  const payload = await loadPermissionsMatrix(supabase, viewer);
  return NextResponse.json(payload);
});

/* POST /api/org/permissions — grant or revoke ONE permission on ONE direct
   report. Body: { memberId, permissionKey, action: 'grant' | 'revoke' }. */
export const POST = withApiGuard(async (request) => {
  const supabase = createServerSupabase();
  const viewer = await getCurrentOrgMember(supabase);
  if (!viewer) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const { memberId, permissionKey, action } = body || {};

  if (!memberId || !permissionKey || !['grant', 'revoke'].includes(action)) {
    return NextResponse.json(
      { error: 'memberId, permissionKey and a valid action are required.' },
      { status: 400 },
    );
  }
  if (!ASSIGNABLE_PERMISSIONS.includes(permissionKey)) {
    return NextResponse.json({ error: 'Unknown or non-assignable permission.' }, { status: 400 });
  }

  // Authorization: viewer must have grant_permissions AND memberId must be a
  // direct report of viewer. Re-checked here regardless of what the UI showed.
  const allowed = await canGrantTo(supabase, viewer, memberId);
  if (!allowed) {
    return NextResponse.json(
      { error: 'You cannot modify this member’s permissions.' },
      { status: 403 },
    );
  }

  if (action === 'grant') {
    const { error } = await supabase
      .from('org_member_permissions')
      .upsert(
        { org_member_id: memberId, permission_key: permissionKey, granted_by: viewer.id },
        { onConflict: 'org_member_id,permission_key' },
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from('org_member_permissions')
      .delete()
      .eq('org_member_id', memberId)
      .eq('permission_key', permissionKey);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit the change (best-effort; never blocks the write). org_audit_log has no
  // client-insert RLS policy, so this goes through the service-role client.
  if (isServerSupabaseConfigured()) {
    await logOrgAction(createServerSupabaseClient(), {
      orgId: viewer.org_id,
      actorId: viewer.user_id,
      action: `permission_${action}`,
      targetType: 'member',
      targetId: memberId,
      detail: { permissionKey },
    });
  }

  return NextResponse.json({ ok: true });
});
