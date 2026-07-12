import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

/* GET /api/org/recognition — all recognitions for the org, recipient names attached. */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { data, error } = await supabase
      .from('org_recognition')
      .select('*')
      .eq('org_id', member.org_id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: members } = await supabase
      .from('org_members')
      .select('user_id, display_name, role')
      .eq('org_id', member.org_id);
    const byUser = new Map((members || []).map((m) => [m.user_id, m]));

    const recognitions = (data || []).map((r) => ({
      ...r,
      recipient_name: byUser.get(r.recipient_id)?.display_name || 'Member',
      recipient_role: byUser.get(r.recipient_id)?.role || null,
      awarded_by_name: r.awarded_by ? byUser.get(r.awarded_by)?.display_name || null : null,
    }));

    return NextResponse.json({
      recognitions,
      members: (members || []).map((m) => ({
        user_id: m.user_id,
        display_name: m.display_name,
        role: m.role,
      })),
      viewer: {
        userId: member.user_id,
        memberId: member.id,
        canAward: assertOrgRole(member, MANAGER_ROLES),
      },
    });
  },
  { requireAuth: true },
);

/* POST /api/org/recognition — award a badge (executive / portfolio_manager only). */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    // Server-side role gate — the RLS insert policy enforces this too.
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json(
        { error: 'Only executives and portfolio managers can award recognition' },
        { status: 403 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const recipientId = body?.recipient_id;
    const title = (body?.title || '').trim();
    const badgeType = (body?.badge_type || '').trim();
    if (!recipientId || !title || !badgeType) {
      return NextResponse.json(
        { error: 'recipient_id, badge_type and title are required' },
        { status: 400 },
      );
    }

    // Recipient must be a member of the same org.
    const { data: recipient } = await supabase
      .from('org_members')
      .select('user_id')
      .eq('org_id', member.org_id)
      .eq('user_id', recipientId)
      .eq('is_active', true)
      .maybeSingle();
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient is not an active member' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('org_recognition')
      .insert({
        org_id: member.org_id,
        recipient_id: recipientId,
        awarded_by: member.user_id,
        badge_type: badgeType.slice(0, 40),
        title: title.slice(0, 120),
        reason: body?.reason ? String(body.reason).slice(0, 600) : null,
        period: body?.period ? String(body.period).slice(0, 40) : null,
        is_award: !!body?.is_award, // gold award vs. standard badge
        pitch_id: body?.pitch_id || null,
        auto_generated: false,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ recognition: data });
  },
  { requireAuth: true },
);
