/**
 * GET  /api/watchlists/smart   the caller's smart watchlists and their latest auto-adds
 * POST /api/watchlists/smart   create a smart watchlist { label, rule } and run it once
 *
 * Rule language: src/lib/watchlist/smart-rules.js. Logic: smart-service.js.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, getAuthContext } from '@/lib/supabase';
import { exceptionResponse } from '@/lib/api-errors';
import { ServiceError, createSmart, listSmart } from '@/lib/watchlist/smart-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const fail = (label, e) =>
  e instanceof ServiceError
    ? NextResponse.json({ error: e.message }, { status: e.status })
    : exceptionResponse(label, e);

export const GET = withApiGuard(
  async (request, user) => {
    try {
      const { supabase } = await getAuthContext(request);
      return NextResponse.json(await listSmart(supabase, user.id), {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    } catch (e) {
      return fail('smart watchlists GET', e);
    }
  },
  { requireAuth: true },
);

export const POST = withApiGuard(
  async (request, user) => {
    try {
      const { supabase } = await getAuthContext(request);
      const body = await request.json().catch(() => ({}));
      const out = await createSmart(supabase, getAdminClient(), user.id, body);
      return NextResponse.json(out, { status: 201 });
    } catch (e) {
      return fail('smart watchlists POST', e);
    }
  },
  { requireAuth: true },
);
