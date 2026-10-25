import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { resetMockPortfolio } from '@/lib/trading/mock-portfolio';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user) => {
    try {
      let admin;
      try {
        admin = getAdminClient();
      } catch {
        console.error('[mock-portfolio GET] missing SUPABASE_SERVICE_ROLE_KEY');
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
      }
      const { data, error } = await admin
        .from('mock_portfolios')
        .select('portfolio, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[mock-portfolio GET]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        portfolio: data?.portfolio ?? null,
        updated_at: data?.updated_at ?? null,
      });
    } catch (e) {
      console.error('[mock-portfolio GET] exception:', e?.message);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
  },
  { requireAuth: true },
);

/* QA RET-10: the only write is a reset. Arbitrary portfolio JSON is rejected
   with 400; trades go through POST /api/mock-trades, which prices them on the
   server. The write uses the service role, scoped to the caller's user id. */
export const POST = withApiGuard(
  async (request, user) => {
    try {
      const body = await request.json().catch(() => null);
      let admin;
      try {
        admin = getAdminClient();
      } catch {
        console.error('[mock-portfolio POST] missing SUPABASE_SERVICE_ROLE_KEY');
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
      }
      const { status, body: out } = await resetMockPortfolio(admin, user.id, body);
      return NextResponse.json(out, { status });
    } catch (e) {
      console.error('[mock-portfolio POST] exception:', e?.message);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
