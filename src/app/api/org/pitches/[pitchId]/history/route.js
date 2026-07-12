import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getPitchContext } from '@/lib/org-pitch-api-helpers';
import { designStageLabel } from '@/lib/org-pitch-state-machine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, orgId } = await getPitchContext();
    if (!orgId) return NextResponse.json({ history: [] });

    const { data: members } = await supabase
      .from('org_members')
      .select('id, display_name')
      .eq('org_id', orgId);
    const nameMap = new Map((members || []).map((m) => [m.id, m.display_name]));

    const { data } = await supabase
      .from('org_pitch_stage_history')
      .select('*')
      .eq('pitch_id', params.pitchId)
      .order('created_at');
    const history = (data || []).map((h) => ({
      ...h,
      actor_name: h.actor_member_id ? nameMap.get(h.actor_member_id) || 'Member' : 'System',
      to_stage_label: designStageLabel(h.to_stage),
      from_stage_label: h.from_stage ? designStageLabel(h.from_stage) : null,
    }));
    return NextResponse.json({ history });
  },
  { requireAuth: true },
);
