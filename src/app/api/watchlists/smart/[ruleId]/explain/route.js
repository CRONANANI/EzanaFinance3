/**
 * GET /api/watchlists/smart/:ruleId/explain?type=&ticker=
 * Re-test one of the caller's smart rules against one item, right now:
 * { matchesNow: true | false | null, evaluatedAt, conditions: [{ description, met, observed }] }.
 * matchesNow is null when the data needed to judge an unmet condition is missing.
 * States rule facts only. Nothing is written.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, getAuthContext } from '@/lib/supabase';
import { exceptionResponse } from '@/lib/api-errors';
import { ServiceError, explainSmart } from '@/lib/watchlist/smart-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export const GET = withApiGuard(
  async (request, user, context) => {
    try {
      const { supabase } = await getAuthContext(request);
      const sp = new URL(request.url).searchParams;
      const out = await explainSmart(supabase, getAdminClient(), user.id, context?.params?.ruleId, {
        type: sp.get('type'),
        ticker: sp.get('ticker'),
      });
      /* A selected row is re-checked at most every two minutes per browser. */
      return NextResponse.json(out, { headers: { 'Cache-Control': 'private, max-age=120' } });
    } catch (e) {
      return e instanceof ServiceError
        ? NextResponse.json({ error: e.message }, { status: e.status })
        : exceptionResponse('smart watchlist explain', e);
    }
  },
  { requireAuth: true },
);
