/**
 * POST /api/watchlists/smart/:ruleId/run   run a smart watchlist now (once per two minutes)
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, getAuthContext } from '@/lib/supabase';
import { exceptionResponse } from '@/lib/api-errors';
import { ServiceError, runSmartNow } from '@/lib/watchlist/smart-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const POST = withApiGuard(
  async (request, user, context) => {
    try {
      const { supabase } = await getAuthContext(request);
      return NextResponse.json(
        await runSmartNow(supabase, getAdminClient(), user.id, context?.params?.ruleId),
      );
    } catch (e) {
      return e instanceof ServiceError
        ? NextResponse.json({ error: e.message }, { status: e.status })
        : exceptionResponse('smart watchlist run', e);
    }
  },
  { requireAuth: true },
);
