/**
 * GET  /api/moderation/block            the members you have blocked
 * POST /api/moderation/block { userId } block a member: their posts, comments
 *      and messages are hidden from you and neither of you can message the other.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { isUuid } from '@/lib/moderation/core';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user) => {
    const admin = getAdminClient();
    const { data } = await admin
      .from('user_blocks')
      .select('blocked_id, created_at')
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false });
    const ids = (data || []).map((r) => r.blocked_id);
    const { data: profs } = ids.length
      ? await admin.from('profiles').select('id, full_name, username').in('id', ids)
      : { data: [] };
    const byId = new Map((profs || []).map((p) => [p.id, p]));
    return NextResponse.json({
      blocked: (data || []).map((r) => ({
        userId: r.blocked_id,
        name: byId.get(r.blocked_id)?.full_name || byId.get(r.blocked_id)?.username || 'Member',
        blockedAt: r.created_at,
      })),
    });
  },
  { requireAuth: true },
);

export const POST = withApiGuard(
  async (request, user) => {
    const rl = await checkRateLimit(`moderation:block:${user.id}`, {
      window: '1 h',
      limit: 60,
    });
    if (!rl.success) return rateLimitResponse(rl);
    const body = await request.json().catch(() => ({}));
    const blockedId = body?.userId;
    if (!isUuid(blockedId)) return NextResponse.json({ error: 'Unknown member.' }, { status: 400 });
    if (blockedId === user.id) {
      return NextResponse.json({ error: 'You cannot block yourself.' }, { status: 400 });
    }
    const admin = getAdminClient();
    const { error } = await admin
      .from('user_blocks')
      .insert({ blocker_id: user.id, blocked_id: blockedId });
    if (error && error.code !== '23505') {
      if (error.code === '23503') {
        return NextResponse.json({ error: 'Unknown member.' }, { status: 404 });
      }
      console.error('[moderation/block]', error.message);
      return NextResponse.json({ error: 'Could not block this member.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);
