import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient, getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { logOrgAction } from '@/lib/org-audit';
import { hasResolutionColumns, loadIpsViolations } from './_loader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

const MAX_REASON = 500;

/* GET /api/org/ips/violations?all=1 | ?state=resolved : violations (open by default).
   The read lives in `_loader.js` so the Compliance server page can seed the
   same payload for first paint without a client round-trip. */
export const GET = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const includeResolved = searchParams.get('all') === '1';
    const state = searchParams.get('state') === 'resolved' ? 'resolved' : undefined;

    const { error, payload } = await loadIpsViolations(supabase, member, {
      includeResolved,
      state,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(payload);
  },
  { requireAuth: true },
);

/* PATCH /api/org/ips/violations : resolve (or reopen) a violation (manager only).
   Body: { id, resolved?: boolean, reason?: string }.
   When the optional resolution columns exist, resolving needs a reason and
   stores it with who resolved and when (a trigger in sql.md stamps the
   resolver and time from the session as well). Without them only the
   resolved flag is stored, and the response says the reason was not stored.
   Either way the action is appended to the council activity log. */
export const PATCH = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const resolving = body?.resolved !== false;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (reason.length > MAX_REASON) {
      return NextResponse.json(
        { error: `Keep the reason to ${MAX_REASON} characters.` },
        { status: 400 },
      );
    }
    const storage = await hasResolutionColumns(supabase);
    if (storage && resolving && !reason) {
      return NextResponse.json({ error: 'A reason is required to resolve.' }, { status: 400 });
    }

    const update = { resolved: resolving };
    if (storage) {
      update.resolved_at = resolving ? new Date().toISOString() : null;
      update.resolved_by = resolving ? member.user_id : null;
      update.resolution_reason = resolving ? reason : null;
    }

    const { data, error } = await supabase
      .from('org_ips_violations')
      .update(update)
      .eq('id', body.id)
      .eq('org_id', member.org_id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Activity log (best-effort; never blocks the change). org_audit_log has
    // no client-insert policy, so this goes through the service-role client,
    // after the member's own RLS-scoped update has succeeded.
    if (isServerSupabaseConfigured()) {
      await logOrgAction(getAdminClient(), {
        orgId: member.org_id,
        actorId: member.user_id,
        action: resolving ? 'ips_breach_resolved' : 'ips_breach_reopened',
        targetType: 'ips_violation',
        targetId: data.id,
        detail: {
          ticker: data.ticker || null,
          severity: data.severity,
          ...(storage && resolving ? { reason } : {}),
        },
      });
    }

    return NextResponse.json({ violation: data, reasonStored: storage && resolving });
  },
  { requireAuth: true },
);
