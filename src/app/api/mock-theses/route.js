import { NextResponse } from 'next/server';
import { safeErrorResponse, withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { CANONICAL_SECTORS } from '@/lib/fmp/sector-performance';
import { createThesis, listTheses } from '@/lib/trading/mock-theses-server';

export const dynamic = 'force-dynamic';

/* Mock Trading investment theses (Nov 14 2026). Thin: the logic and the
   validation live in src/lib/trading/mock-theses-server.js; every query runs
   on the service role filtered by the authenticated user's id. */

export const GET = withApiGuard(
  async (request, user) => {
    try {
      const { status, body } = await listTheses(getAdminClient(), user.id);
      return NextResponse.json(body, { status });
    } catch (e) {
      return safeErrorResponse(e, {
        message: 'Could not load your theses.',
        context: 'mock-theses:list',
      });
    }
  },
  { requireAuth: true },
);

export const POST = withApiGuard(
  async (request, user) => {
    try {
      const payload = await request.json().catch(() => null);
      const { status, body } = await createThesis(getAdminClient(), user.id, payload, {
        sectors: CANONICAL_SECTORS,
      });
      return NextResponse.json(body, { status });
    } catch (e) {
      return safeErrorResponse(e, {
        message: 'Could not save the thesis.',
        context: 'mock-theses:create',
      });
    }
  },
  { requireAuth: true },
);
