import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getHistoryForPitch } from '@/lib/org-pitch-store';
import { MOCK_MEMBERS } from '@/lib/orgMockData';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const history = getHistoryForPitch(params.pitchId).map((h) => ({
      ...h,
      actor_name: h.actor_member_id
        ? MOCK_MEMBERS.find((m) => m.id === h.actor_member_id)?.name
        : 'System',
    }));
    return NextResponse.json({ history });
  },
  { requireAuth: true },
);
