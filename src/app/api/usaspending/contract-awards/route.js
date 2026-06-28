import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getContractAwards } from '@/lib/usaspending';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

/**
 * GET /api/usaspending/contract-awards?recipient=&agency=&limit=
 *
 * Server-side wrapper around USAspending.gov `spending_by_award` (POST
 * upstream — see src/lib/usaspending.js). No API key — public hosted API.
 * Mirrors the external-fetch route style of src/app/api/fmp/senate/route.js.
 *
 * On error / slow / rate-limit it returns `{ error, rows: [], topRecipients: [] }`
 * with a NON-500 status (200) so callers fall back to the static sample
 * instead of crashing.
 *
 * Caching ~1h: USAspending updates daily at most. This route is dynamic (the
 * rate-limit guard reads request headers), so caching lives in the data layer
 * instead — src/lib/usaspending memoizes upstream calls for 1h, so the public
 * API is hit at most ~once/hour per distinct query.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request) => {
    // Moderate per-IP limit on this external-API proxy (USAspending.gov).
    const rl = await checkRateLimit(`ext:usaspending-awards:${getClientIp(request)}`, {
      limit: 30,
      window: '60 s',
    });
    if (!rl.success) return rateLimitResponse(rl);

    const { searchParams } = new URL(request.url);
    const recipient = searchParams.get('recipient') || '';
    const agency = searchParams.get('agency') || '';
    const limit = searchParams.get('limit') || '';

    const data = await getContractAwards({ recipient, agency, limit });

    // Always 200, even when `data.error` is set: the page-side fallback is a
    // clean `error || !rows.length` check rather than exception handling.
    return NextResponse.json(data, { status: 200 });
  },
  { requireAuth: false },
);
