/** DELETE /api/moderation/block/<userId>: unblock a member. */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { isUuid } from '@/lib/moderation/core';

export const dynamic = 'force-dynamic';

export const DELETE = withApiGuard(
  async (request, user, context) => {
    const rl = await checkRateLimit(`moderation:unblock:${user.id}`, {
      interval: 60 * 60 * 1000,
      limit: 60,
    });
    if (!rl.success) return rateLimitResponse(rl);
    const blockedId =
      context?.params?.userId || new URL(request.url).pathname.split('/').filter(Boolean).pop();
    if (!isUuid(blockedId)) return NextResponse.json({ error: 'Unknown member.' }, { status: 400 });
    const admin = getAdminClient();
    await admin.from('user_blocks').delete().eq('blocker_id', user.id).eq('blocked_id', blockedId);
    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);
