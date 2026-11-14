import { NextResponse } from 'next/server';
import { completeChecklistTask } from '@/lib/onboarding/completeTask';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient, getUserClient } from '@/lib/supabase';
import { listMockTrades } from '@/lib/trading/mock-trades';
import { executeMockTrade } from '@/lib/trading/mock-portfolio';
import { getServerQuote } from '@/lib/trading/server-quote';
import { getActiveThesisId } from '@/lib/trading/mock-theses-server';

export const dynamic = 'force-dynamic';

/* GET reads as the signed-in user (RLS: own rows only).
   POST (QA RET-10): the client sends ticker, side and size only. The server
   quotes the price, executes against the stored cash and writes both the
   portfolio and the trade log with the service role, every query scoped to
   the authenticated user's id. The response carries the new portfolio.
   An optional thesis_note rides along; the server stamps the caller's active
   thesis (Nov 14 2026), never a thesis id from the client. */

export const GET = withApiGuard(
  async (request, user) => {
    try {
      // ?limit= lets the CSV export read the whole log (clamped server-side).
      const limit = new URL(request.url).searchParams.get('limit');
      const { status, body } = await listMockTrades(getUserClient(), user.id, { limit });
      return NextResponse.json(body, { status });
    } catch (e) {
      return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
    }
  },
  { requireAuth: true },
);

export const POST = withApiGuard(
  async (request, user) => {
    try {
      const payload = await request.json().catch(() => null);
      let admin;
      try {
        admin = getAdminClient();
      } catch {
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
      }
      const { status, body } = await executeMockTrade(admin, user.id, payload, {
        getQuote: getServerQuote,
        getActiveThesisId,
      });
      if (status >= 200 && status < 300) {
        await completeChecklistTask(user.id, 'mock.first_trade');
      }
      return NextResponse.json(body, { status });
    } catch (e) {
      return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
