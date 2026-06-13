import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { createServerSupabaseClient, isServerSupabaseConfigured } from '@/lib/supabase-service-role';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import {
  tierOf,
  roleForTier,
  isValidTier,
  canEditMember,
  assignableTiers,
} from '@/lib/org-hierarchy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* PATCH /api/org/members/:memberId/role — change a member's council tier.
   Permission ladder (see lib/org-hierarchy.js): President edits anyone;
   everyone else edits only strictly-lower tiers inside their reporting
   subtree or on their own desk. The write goes through the service-role
   client because the rule is hierarchical, not expressible in the existing
   coarse RLS policy — authorization happens here, in code, every time. */
export const PATCH = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const editor = await getCurrentOrgMember(supabase);
    if (!editor) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { memberId } = await resolveParams(context);
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const newTier = body?.tier;
    if (!isValidTier(newTier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Load the full active roster once — needed for the subtree walk.
    const { data: members, error: memErr } = await supabase
      .from('org_members')
      .select('id, user_id, display_name, role, sub_role, tier, title, team_id, reports_to')
      .eq('org_id', editor.org_id)
      .eq('is_active', true);
    if (memErr) return NextResponse.json({ error: 'Failed to load members' }, { status: 500 });

    const membersById = new Map((members || []).map((m) => [m.id, m]));
    const editorRow = membersById.get(editor.id);
    const target = membersById.get(memberId);
    if (!target) {
      return NextResponse.json({ error: 'Member not found in your organization' }, { status: 404 });
    }

    if (!canEditMember(editorRow, target, membersById)) {
      return NextResponse.json(
        { error: 'You can only change roles for members below you in your reporting line or on your desk' },
        { status: 403 },
      );
    }
    if (!assignableTiers(editorRow).includes(newTier)) {
      return NextResponse.json(
        { error: 'You can only assign roles below your own rank' },
        { status: 403 },
      );
    }

    const oldTier = tierOf(target).id;
    const oldRole = target.role;
    const newRole = roleForTier(newTier);
    if (oldTier === newTier) {
      return NextResponse.json({ ok: true, member: target, unchanged: true });
    }

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({ error: 'Server is not configured for role management' }, { status: 503 });
    }
    const service = createServerSupabaseClient();

    // Keep custom titles ("Head of Research"); refresh default ones.
    const update = { tier: newTier, role: newRole };
    if (!target.title || target.title === tierOf(target).label) {
      update.title = tierOf({ tier: newTier }).label;
    }

    const { data: updated, error: updErr } = await service
      .from('org_members')
      .update(update)
      .eq('id', target.id)
      .eq('org_id', editor.org_id)
      .select('id, display_name, role, sub_role, tier, title, team_id, reports_to')
      .single();
    if (updErr) return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });

    await service.from('org_role_changes').insert({
      org_id: editor.org_id,
      target_member_id: target.id,
      changed_by_member_id: editor.id,
      old_tier: oldTier,
      new_tier: newTier,
      old_role: oldRole,
      new_role: newRole,
    });

    return NextResponse.json({ ok: true, member: updated });
  },
  { requireAuth: true },
);
