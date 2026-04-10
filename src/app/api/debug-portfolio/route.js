import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request) {
  const report = {
    timestamp: new Date().toISOString(),
    env: {
      hasPublicUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    cookieAuth: { success: false, userId: null, email: null, error: null },
    bearerAuth: { tried: false, success: false, userId: null, error: null },
    adminClient: { available: false },
    mock_portfolios: {
      readable: false,
      rowExists: false,
      data: null,
      error: null,
    },
    mock_trades: { readable: false, count: 0, error: null },
    directWriteTest: { tried: false, success: false, error: null },
  };

  // 1. Cookie auth
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (user) {
      report.cookieAuth.success = true;
      report.cookieAuth.userId = user.id;
      report.cookieAuth.email = user.email;
    } else {
      report.cookieAuth.error = error?.message || 'no session cookie';
    }
  } catch (e) {
    report.cookieAuth.error = e?.message ?? String(e);
  }

  // 2. Bearer token auth
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const admin = getAdminClient();
  report.adminClient.available = !!admin;

  let resolvedUserId = report.cookieAuth.userId;

  if (token && admin) {
    report.bearerAuth.tried = true;
    try {
      const { data, error } = await admin.auth.getUser(token);
      if (data?.user) {
        report.bearerAuth.success = true;
        report.bearerAuth.userId = data.user.id;
        report.bearerAuth.email = data.user.email;
        resolvedUserId = resolvedUserId || data.user.id;
      } else {
        report.bearerAuth.error = error?.message || 'token invalid';
      }
    } catch (e) {
      report.bearerAuth.error = e?.message ?? String(e);
    }
  }

  // 3. Test tables using admin client (bypasses RLS - tells us if table exists)
  let portfolioSnapshot = null;
  let updatedAtSnapshot = null;

  if (admin && resolvedUserId) {
    // Test mock_portfolios read
    try {
      const { data, error } = await admin
        .from('mock_portfolios')
        .select('portfolio, updated_at')
        .eq('user_id', resolvedUserId)
        .maybeSingle();
      report.mock_portfolios.readable = !error;
      report.mock_portfolios.error = error?.message || null;
      if (data) {
        report.mock_portfolios.rowExists = true;
        report.mock_portfolios.updatedAt = data.updated_at;
        report.mock_portfolios.positionCount = Object.keys(data.portfolio?.positions || {}).length;
        report.mock_portfolios.cash = data.portfolio?.cash;
        portfolioSnapshot = data.portfolio;
        updatedAtSnapshot = data.updated_at;
      }
    } catch (e) {
      report.mock_portfolios.error = e?.message ?? String(e);
    }

    // Test mock_trades read
    try {
      const { count, error } = await admin
        .from('mock_trades')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', resolvedUserId);
      report.mock_trades.readable = !error;
      report.mock_trades.count = count ?? 0;
      report.mock_trades.error = error?.message || null;
    } catch (e) {
      report.mock_trades.error = e?.message ?? String(e);
    }

    // 4. Direct write test using admin (bypasses RLS)
    report.directWriteTest.tried = true;
    try {
      const testPortfolio = {
        cash: 99999,
        positions: {
          DIAG_TEST: { symbol: 'DIAG_TEST', qty: 1, avgCost: 1, currentPrice: 1 },
        },
        history: [],
        _meta: { updatedAt: Date.now(), diagnostic: true },
      };
      const { error } = await admin.from('mock_portfolios').upsert(
        {
          user_id: resolvedUserId,
          portfolio: testPortfolio,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
      report.directWriteTest.success = !error;
      report.directWriteTest.error = error?.message || null;

      // Immediately read it back to confirm it saved
      if (!error) {
        const { data: check } = await admin
          .from('mock_portfolios')
          .select('portfolio, updated_at')
          .eq('user_id', resolvedUserId)
          .maybeSingle();
        report.directWriteTest.readBack = {
          found: !!check,
          hasDiagPos: !!check?.portfolio?.positions?.DIAG_TEST,
          updatedAt: check?.updated_at,
        };
        // Restore real portfolio if there was one; otherwise delete test row
        if (portfolioSnapshot != null) {
          await admin.from('mock_portfolios').upsert(
            {
              user_id: resolvedUserId,
              portfolio: portfolioSnapshot,
              updated_at: updatedAtSnapshot || new Date().toISOString(),
            },
            { onConflict: 'user_id' },
          );
          report.directWriteTest.restoredPreviousPortfolio = true;
        } else {
          await admin.from('mock_portfolios').delete().eq('user_id', resolvedUserId);
          report.directWriteTest.cleanedUp = true;
        }
      }
    } catch (e) {
      report.directWriteTest.error = e?.message ?? String(e);
    }
  } else if (!resolvedUserId) {
    report.directWriteTest.error =
      'No user ID resolved from cookie or bearer token — visit this URL while logged in';
  }

  return NextResponse.json(report);
}
