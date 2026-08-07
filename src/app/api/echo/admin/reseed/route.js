import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { isAdminUser } from '@/lib/admin-helpers';
import { ensureCuratedSeeded, resetCuratedSeedCache } from '@/lib/echo/curated-seed';

export const dynamic = 'force-dynamic';

/**
 * POST /api/echo/admin/reseed
 * Admin-only. Clears the per-process seed cache and re-runs the curated
 * reconcile, forcing content/metadata/globe_rail backfills into echo_articles
 * without waiting for a cold serverless boot. Idempotent and metric-safe (the
 * reconcile payload omits view_count/like_count/article_status).
 */
export const POST = withApiGuard(
  async (_request, user) => {
    if (!isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = getAdminClient();
    resetCuratedSeedCache();
    await ensureCuratedSeeded(admin);

    // Report how many curated rows now carry a non-null globe_rail so the caller
    // can confirm the backfill landed.
    const { data, error } = await admin.from('echo_articles').select('article_slug, globe_rail');

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const withRail = (data || []).filter((r) => r.globe_rail).length;
    return NextResponse.json({ ok: true, total: data?.length ?? 0, withRail });
  },
  { requireAuth: true },
);
