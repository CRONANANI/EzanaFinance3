import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/recognition/recent — fund-wide "Recently earned" badge feed. */
export const GET = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const url = new URL(request.url);
    const limit = Math.min(20, Math.max(1, Number(url.searchParams.get('limit')) || 8));

    const { data, error } = await supabase
      .from('org_recognition')
      .select(
        'id, recipient_id, badge_type, title, reason, period, is_award, auto_generated, pitch_id, created_at',
      )
      .eq('org_id', member.org_id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: members } = await supabase
      .from('org_members')
      .select('id, user_id, display_name, role')
      .eq('org_id', member.org_id);
    const byUser = new Map((members || []).map((m) => [m.user_id, m]));

    const recent = (data || []).map((r) => ({
      ...r,
      recipient_name: byUser.get(r.recipient_id)?.display_name || 'Member',
      recipient_member_id: byUser.get(r.recipient_id)?.id || null,
      recipient_role: byUser.get(r.recipient_id)?.role || null,
    }));

    return NextResponse.json({ recent });
  },
  { requireAuth: true },
);
