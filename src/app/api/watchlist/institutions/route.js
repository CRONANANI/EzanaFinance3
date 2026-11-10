/**
 * GET /api/watchlist/institutions?ticker=AAPL   top 13F holders, latest period
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { exceptionResponse } from '@/lib/api-errors';
import { topInstitutions } from '@/lib/watchlist/institutions';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request) => {
    try {
      const ticker = new URL(request.url).searchParams.get('ticker');
      return NextResponse.json(await topInstitutions(getAdminClient(), ticker), {
        headers: { 'Cache-Control': 'private, max-age=3600' },
      });
    } catch (e) {
      return exceptionResponse('watchlist institutions GET', e);
    }
  },
  { requireAuth: true },
);
