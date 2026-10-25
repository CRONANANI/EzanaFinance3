import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { listMockTrades, recordMockTrade } from '@/lib/trading/mock-trades';

export const dynamic = 'force-dynamic';

/* Both handlers read and write as the signed-in user (RLS: own rows only). */

export const GET = withApiGuard(
  async (_request, user) => {
    try {
      const { status, body } = await listMockTrades(getUserClient(), user.id);
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
      const { status, body } = await recordMockTrade(getUserClient(), user.id, payload);
      return NextResponse.json(body, { status });
    } catch (e) {
      return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
