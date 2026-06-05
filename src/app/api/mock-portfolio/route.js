import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';

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

export const POST = withApiGuard(
  async (request, user) => {
    try {
      const body = await request.json().catch(() => ({}));
      const portfolio = body?.portfolio;

      if (!portfolio || typeof portfolio !== 'object') {
        return NextResponse.json({ error: 'Invalid portfolio' }, { status: 400 });
      }

      let admin;
      try {
        admin = getAdminClient();
      } catch {
        console.error('[mock-portfolio POST] missing SUPABASE_SERVICE_ROLE_KEY');
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
      }
      const { data, error } = await admin
        .from('mock_portfolios')
        .upsert(
          { user_id: user.id, portfolio, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        )
        .select('updated_at')
        .single();

      if (error) {
        console.error('[mock-portfolio POST] upsert error:', error.message, 'user:', user.id);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, updated_at: data.updated_at });
    } catch (e) {
      console.error('[mock-portfolio POST] exception:', e?.message);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
