import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';
import { buildSyntheticValuePoints } from '@/lib/portfolio-value-series-synth';
import { HERO_DATA } from '@/lib/dashboard-hero-data';

export const dynamic = 'force-dynamic';

const RANGES = new Set(['1M', '6M', '1Y']);
// 1D excluded — mock portfolio doesn't have intraday tracking; daily snapshots
// (Sprint 4a cron at 22:00 UTC) are the finest granularity available.

/**
 * GET /api/portfolio/mock-value-series?range=1M|6M|1Y
 *
 * Returns the user's mock portfolio total value over time, sourced from
 * portfolio_value_snapshots.mock_value (provisioned by Sprint 4a's
 * portfolio-snapshot cron). Falls back to synthetic series if insufficient
 * history (e.g., new user with <2 daily snapshots).
 *
 * Response shape matches /api/portfolio/value-series:
 *   { range, points: [{ at, value }], source: 'db' | 'synthetic' | 'empty' }
 *
 * @param {import('next/server').NextRequest} req
 */
export async function GET(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const range = RANGES.has(req.nextUrl.searchParams.get('range'))
      ? /** @type {'1M'|'6M'|'1Y'} */ (req.nextUrl.searchParams.get('range'))
      : '1M';

    // Compute current mock portfolio value (cash + positions) from mock_portfolios JSONB.
    // Used as the "endValue" anchor for synthetic fallback.
    const mockEndValue = await getMockPortfolioEndValue(user.id);
    if (mockEndValue <= 0) {
      return NextResponse.json({ range, points: [], source: 'empty' });
    }

    // Date range for query
    const fromDate = (() => {
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      if (range === '1M') t.setDate(t.getDate() - 30);
      else if (range === '6M') t.setMonth(t.getMonth() - 6);
      else t.setDate(t.getDate() - 365);
      return t.toISOString().slice(0, 10);
    })();

    // Pull mock_value column from portfolio_value_snapshots
    const { data: rows, error: dbError } = await supabaseAdmin
      .from('portfolio_value_snapshots')
      .select('snapshot_date, mock_value')
      .eq('user_id', user.id)
      .gte('snapshot_date', fromDate)
      .order('snapshot_date', { ascending: true });

    if (dbError) {
      const code = /** @type {any} */ (dbError).code;
      // Table not provisioned (Sprint 4a not deployed yet) → synthetic
      if (code === 'PGRST205' || code === '42P01' || /relation.*does not exist/i.test(String(dbError.message || ''))) {
        const points = buildSyntheticValuePoints(mockEndValue, range, HERO_DATA[range]?.change ?? 0);
        return NextResponse.json({ range, points, source: 'synthetic' });
      }
      console.error('[mock-value-series] DB error', dbError);
      return NextResponse.json(
        { range, points: [], error: dbError.message, source: 'error' },
        { status: 500 },
      );
    }

    const list = Array.isArray(rows) ? rows : [];

    // Insufficient history → synthetic (anchored to current value)
    if (list.length < 2) {
      const points = buildSyntheticValuePoints(mockEndValue, range, HERO_DATA[range]?.change ?? 0);
      return NextResponse.json({ range, points, source: 'synthetic' });
    }

    // Build points from real snapshots
    const points = list
      .filter((r) => r.mock_value != null && Number.isFinite(Number(r.mock_value)))
      .map((r) => ({
        at: `${r.snapshot_date}T22:00:00.000Z`, // snapshot taken at 22:00 UTC (Sprint 4a schedule)
        value: Math.max(0, Number(r.mock_value)),
      }));

    if (points.length < 2) {
      const points0 = buildSyntheticValuePoints(mockEndValue, range, HERO_DATA[range]?.change ?? 0);
      return NextResponse.json({ range, points: points0, source: 'synthetic' });
    }

    return NextResponse.json({ range, points, source: 'db' });
  } catch (e) {
    console.error('[mock-value-series] failed', e);
    return NextResponse.json(
      { error: /** @type {any} */ (e)?.message ?? 'Unknown' },
      { status: 500 },
    );
  }
}

/**
 * Compute current mock portfolio value: cash + sum(qty × lastPrice).
 * Identical logic to Sprint 4a's portfolio-snapshot cron's fetchMockValue.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getMockPortfolioEndValue(userId) {
  const { data: row } = await supabaseAdmin
    .from('mock_portfolios')
    .select('portfolio')
    .eq('user_id', userId)
    .maybeSingle();

  const portfolio = row?.portfolio;
  if (!portfolio || typeof portfolio !== 'object') return 0;

  const cash = Number(portfolio.cash) || 0;
  const positions = portfolio.positions;
  if (!positions || typeof positions !== 'object') return Math.max(0, cash);

  let positionsValue = 0;
  if (Array.isArray(positions)) {
    positionsValue = positions.reduce((s, p) => {
      const q = Number(p?.shares ?? p?.qty ?? 0) || 0;
      const pr = Number(p?.currentPrice ?? p?.lastPrice ?? p?.avgCost ?? 0) || 0;
      return s + q * pr;
    }, 0);
  } else {
    for (const p of Object.values(positions)) {
      const q = Number(/** @type {any} */ (p)?.shares ?? /** @type {any} */ (p)?.qty ?? 0) || 0;
      const pr =
        Number(
          /** @type {any} */ (p)?.currentPrice ??
            /** @type {any} */ (p)?.lastPrice ??
            /** @type {any} */ (p)?.avgCost ??
            0,
        ) || 0;
      positionsValue += q * pr;
    }
  }

  return Math.max(0, cash + positionsValue);
}
