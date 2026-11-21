import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { accessAllows, resolvePlanAccess } from '@/lib/billing/feature-access';
import { FEATURES, TIER_NAME, watchlistLimitFor } from '@/config/plan-features';

/**
 * GET /api/billing/entitlements (Nov 21, 2026)
 *
 * The caller's plan tier and which registry features it unlocks, so a
 * workspace can show its upgrade panel before calling a gated API. Display
 * only: every gated API checks again on the server (requireFeature).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiGuard(
  async (_request, user) => {
    const access = await resolvePlanAccess(user, getAdminClient());
    if (!access.ok) {
      return NextResponse.json({ error: 'Plan check unavailable.' }, { status: 503 });
    }
    const features = Object.fromEntries(
      Object.keys(FEATURES).map((id) => [id, accessAllows(access, id)]),
    );
    return NextResponse.json(
      {
        tier: access.tier,
        plan: TIER_NAME[access.tier],
        scope: access.scope,
        watchlistLimit: access.scope === 'retail' ? watchlistLimitFor(access.tier) : null,
        features,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  },
  { requireAuth: true },
);
