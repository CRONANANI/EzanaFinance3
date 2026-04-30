import { NextResponse } from 'next/server';
import { createServerSupabaseClient, isServerSupabaseConfigured } from '@/lib/supabase-service-role';
import { alpacaRequest } from '@/lib/alpaca';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

async function fetchAlpacaValue(supabase, userId) {
  const { data: br } = await supabase
    .from('brokerage_accounts')
    .select('alpaca_account_id')
    .eq('user_id', userId)
    .maybeSingle();

  let alpacaAccountId = br?.alpaca_account_id;
  if (!alpacaAccountId) {
    const { data: leg } = await supabase
      .from('alpaca_accounts')
      .select('alpaca_account_id')
      .eq('user_id', userId)
      .maybeSingle();
    alpacaAccountId = leg?.alpaca_account_id;
  }
  if (!alpacaAccountId) return 0;

  try {
    const account = await alpacaRequest(`/v1/accounts/${alpacaAccountId}`);
    const v = Number(account?.portfolio_value ?? account?.equity ?? 0);
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}

async function fetchPlaidValue(supabase, userId) {
  const { data: holdings } = await supabase
    .from('plaid_holdings')
    .select('value, institution_value')
    .eq('user_id', userId);

  if (!holdings?.length) return 0;
  return holdings.reduce((sum, h) => sum + (Number(h.value ?? h.institution_value) || 0), 0);
}

async function fetchMockValue(supabase, userId) {
  const { data: row } = await supabase
    .from('mock_portfolios')
    .select('portfolio')
    .eq('user_id', userId)
    .maybeSingle();

  if (!row?.portfolio || typeof row.portfolio !== 'object') return 0;
  const cash = Number(row.portfolio.cash) || 0;
  const positions = row.portfolio.positions;
  if (!positions || typeof positions !== 'object') return Math.max(0, cash);

  let positionsValue = 0;
  if (Array.isArray(positions)) {
    positionsValue = positions.reduce((s, p) => {
      const qty = Number(p?.shares ?? p?.qty ?? 0) || 0;
      const price =
        Number(p?.currentPrice ?? p?.price ?? p?.lastPrice ?? p?.avgCost ?? 0) || 0;
      return s + qty * price;
    }, 0);
  } else {
    for (const p of Object.values(positions)) {
      const qty = Number(p?.shares ?? p?.qty ?? 0) || 0;
      const price =
        Number(p?.currentPrice ?? p?.price ?? p?.lastPrice ?? p?.avgCost ?? 0) || 0;
      positionsValue += qty * price;
    }
  }
  return Math.max(0, cash + positionsValue);
}

async function run(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }

  const supabase = createServerSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: users, error: userErr } = await supabase.from('user_elo').select('user_id');
  if (userErr || !users) {
    return NextResponse.json({ error: userErr?.message || 'Failed to list users' }, { status: 500 });
  }

  let processed = 0;
  const errors = [];

  for (const u of users) {
    const userId = u.user_id;
    try {
      const [alpacaVal, plaidVal, mockVal] = await Promise.all([
        fetchAlpacaValue(supabase, userId),
        fetchPlaidValue(supabase, userId),
        fetchMockValue(supabase, userId),
      ]);

      const realValue = alpacaVal + plaidVal;
      const hasReal = realValue > 0;
      const hasMock = mockVal > 0;

      if (!hasReal && !hasMock) continue;

      const { error: upErr } = await supabase.from('portfolio_value_snapshots').upsert(
        {
          user_id: userId,
          snapshot_date: today,
          real_value: realValue,
          mock_value: mockVal,
          has_real_brokerage: hasReal,
          has_mock_portfolio: hasMock,
          source_metadata: {
            alpaca: alpacaVal,
            plaid: plaidVal,
            mock: mockVal,
          },
        },
        { onConflict: 'user_id,snapshot_date' }
      );

      if (upErr) {
        errors.push({ userId, error: upErr.message });
        continue;
      }
      processed++;
    } catch (e) {
      errors.push({ userId, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({
    success: true,
    date: today,
    processed,
    totalUsers: users.length,
    errors: errors.slice(0, 10),
  });
}

export async function GET(request) {
  return run(request);
}

export async function POST(request) {
  return run(request);
}
