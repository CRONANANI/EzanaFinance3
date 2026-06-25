import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAwardDetail } from '@/lib/usaspending';

/**
 * GET /api/usaspending/award/<awardId>
 *
 * Server-side wrapper around the USAspending award-profile endpoint
 * (GET /api/v2/awards/<awardId>/) plus a best-effort modification history
 * (POST /api/v2/transactions/). No API key — public hosted API. Same hardening
 * as the list route: 8s timeout + 1h memo in the data layer, and a clean
 * { detail: null, error, usaspendingUrl } shape on failure returned with a
 * NON-500 status so the detail UI shows a graceful empty state (never a 500,
 * never an infinite spinner).
 *
 * `awardId` is the generated_unique_award_id (e.g. "CONT_AWD_…").
 */
export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, _user, context) => {
    const raw = context?.params?.awardId || '';
    const awardId = decodeURIComponent(String(raw));
    const data = await getAwardDetail(awardId);
    return NextResponse.json(data, { status: 200 });
  },
  { requireAuth: false },
);
