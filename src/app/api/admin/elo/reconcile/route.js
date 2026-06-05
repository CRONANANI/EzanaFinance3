import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { withApiGuard } from '@/lib/api-guard';
import { requireAdminAccess } from '@/lib/admin-auth';
import { reconcileLearningElo, getUserEloState } from '@/lib/elo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_SECRET = process.env.ADMIN_LOCK_SECRET;

/**
 * POST /api/admin/elo/reconcile
 * Body: { email?: string, userId?: string }
 * Auth: Bearer ADMIN_LOCK_SECRET
 */
export const POST = withApiGuard(
  async (request, user) => {
    const forbidden = requireAdminAccess(request, user);
    if (forbidden) return forbidden;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { email, userId } = body || {};
    const supabase = getAdminClient();

    let targetId = userId;
    if (!targetId && email) {
      const normalized = String(email).trim().toLowerCase();
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', normalized)
        .maybeSingle();
      targetId = prof?.id;
    }
    if (!targetId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const before = await getUserEloState(targetId, 1);
    const result = await reconcileLearningElo(targetId);
    const after = await getUserEloState(targetId, 1);

    return NextResponse.json({
      userId: targetId,
      credited: result.credited,
      totalDelta: result.totalDelta,
      ratingBefore: before?.elo?.current_rating ?? 0,
      ratingAfter: after?.elo?.current_rating ?? 0,
    });
  },
  { requireAuth: true, strict: true },
);
