import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { BADGE_TYPES } from '@/lib/org-recognition-model';
import { loadRecognitionBase } from './_loader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

/* GET /api/org/recognition: roster, sector teams, the latest 200 badges and
   awards (recipient, giver, linked pitch ticker) and the viewer's rights. */
export const GET = withApiGuard(
  async () => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { payload, error } = await loadRecognitionBase(supabase, member);
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, no-store' } });
  },
  { requireAuth: true },
);

/* POST /api/org/recognition: award a badge (executive / portfolio_manager only). */
export const POST = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    // Server-side role gate: the RLS insert policy enforces this too.
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
    if (!BADGE_TYPES.some((b) => b.key === badgeType)) {
      return NextResponse.json({ error: 'Unknown badge type' }, { status: 400 });
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
