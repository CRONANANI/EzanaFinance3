/**
 * PATCH  /api/watchlists/smart/:ruleId   edit { rule?, enabled?, notify?, label? }; re-runs when the rule changed
 * DELETE /api/watchlists/smart/:ruleId   stop the list being smart (its items stay)
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, getAuthContext } from '@/lib/supabase';
import { exceptionResponse } from '@/lib/api-errors';
import { ServiceError, deleteSmart, updateSmart } from '@/lib/watchlist/smart-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const fail = (label, e) =>
  e instanceof ServiceError
    ? NextResponse.json({ error: e.message }, { status: e.status })
    : exceptionResponse(label, e);

export const PATCH = withApiGuard(
  async (request, user, context) => {
    try {
      const { supabase } = await getAuthContext(request);
      const body = await request.json().catch(() => ({}));
      const out = await updateSmart(
        supabase,
        getAdminClient(),
        user.id,
        context?.params?.ruleId,
        body,
      );
      return NextResponse.json(out);
    } catch (e) {
      return fail('smart watchlist PATCH', e);
    }
  },
  { requireAuth: true },
);

export const DELETE = withApiGuard(
  async (request, user, context) => {
    try {
      const { supabase } = await getAuthContext(request);
      return NextResponse.json(await deleteSmart(supabase, user.id, context?.params?.ruleId));
    } catch (e) {
      return fail('smart watchlist DELETE', e);
    }
  },
  { requireAuth: true },
);
