/**
 * POST /api/watchlists/smart/preview   { rule } -> what it would add right now (nothing is saved)
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { exceptionResponse } from '@/lib/api-errors';
import { ServiceError, previewSmart } from '@/lib/watchlist/smart-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const POST = withApiGuard(
  async (request) => {
    try {
      const body = await request.json().catch(() => ({}));
      return NextResponse.json(await previewSmart(getAdminClient(), body), {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    } catch (e) {
      return e instanceof ServiceError
        ? NextResponse.json({ error: e.message }, { status: e.status })
        : exceptionResponse('smart watchlist preview', e);
    }
  },
  { requireAuth: true },
);
