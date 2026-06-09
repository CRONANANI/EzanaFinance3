import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';
import { buildSyntheticValuePoints } from '@/lib/portfolio-value-series-synth';
import { HERO_DATA } from '@/lib/dashboard-hero-data';

export const dynamic = 'force-dynamic';

const RANGES = new Set(['1D', '7D', '1M', '3M', '6M', '1Y', 'ALL']);

/**
 * @param {import('next/server').NextRequest} req
 */
export const GET = withApiGuard(
  async (request, user, context) => {
    try {
      const range = RANGES.has(request.nextUrl.searchParams.get('range'))
        ? /** @type {'1D'|'7D'|'1M'|'3M'|'6M'|'1Y'|'ALL'} */ (
            request.nextUrl.searchParams.get('range')
          )
        : '1M';

      const endValue = await getPortfolioEndValue(user.id);
      if (endValue <= 0) {
        return NextResponse.json({ range, points: [], source: 'empty' });
      }

      if (range === '1D') {
        const points = buildSyntheticValuePoints(endValue, '1D', HERO_DATA['1D'].change);
        return NextResponse.json({ range, points, source: 'synthetic' });
      }

      const fromDate = (() => {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        if (range === '7D') t.setDate(t.getDate() - 7);
        else if (range === '1M') t.setDate(t.getDate() - 30);
        else if (range === '3M') t.setDate(t.getDate() - 90);
        else if (range === '6M') t.setMonth(t.getMonth() - 6);
        else if (range === 'ALL') t.setFullYear(t.getFullYear() - 10);
        else t.setDate(t.getDate() - 365);
        return t.toISOString().slice(0, 10);
      })();

      const { data: balanceRows } = await supabaseAdmin
        .from('portfolio_balance_snapshots')
        .select('snapshot_date, total_value')
        .eq('user_id', user.id)
        .gte('snapshot_date', fromDate)
        .order('snapshot_date', { ascending: true });

      if (balanceRows?.length) {
        const byDate = new Map();
        for (const r of balanceRows) {
          const k = r.snapshot_date;
          byDate.set(k, (byDate.get(k) || 0) + Number(r.total_value || 0));
        }
        const points = Array.from(byDate.entries())
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([date, value]) => ({ at: `${date}T00:00:00.000Z`, value }));
        if (points.length) {
          const last = { ...points[points.length - 1], value: endValue };
          points[points.length - 1] = last;
          return NextResponse.json({ range, points, source: 'snaptrade_snapshots' });
        }
      }

      const { data: rows, error: dbError } = await supabaseAdmin
        .from('portfolio_daily_returns')
        .select('date, total_value, cum_return_pct')
        .eq('user_id', user.id)
        .gte('date', fromDate)
        .order('date', { ascending: true });

      if (dbError) {
        const code = /** @type {any} */ (dbError).code;
        if (
          code === 'PGRST205' ||
          code === '42P01' ||
          /relation.*does not exist/i.test(String(dbError.message || ''))
        ) {
          const points = buildSyntheticValuePoints(endValue, range, HERO_DATA[range].change);
          return NextResponse.json({ range, points, source: 'synthetic' });
        }
        console.error('[value-series] DB', dbError);
        return NextResponse.json(
          { range, points: [], error: dbError.message, source: 'error' },
          { status: 500 },
        );
      }

      const list = Array.isArray(rows) ? rows : [];
      if (list.length < 2) {
        const points = buildSyntheticValuePoints(endValue, range, HERO_DATA[range].change);
        return NextResponse.json({ range, points, source: 'synthetic' });
      }

      const hasTotal = list.some(
        (r) => r.total_value != null && Number.isFinite(Number(r.total_value)),
      );
      const hasCum = list.some(
        (r) => r.cum_return_pct != null && Number.isFinite(Number(r.cum_return_pct)),
      );

      /** @type {{ at: string, value: number }[]} */
      let points;
      if (hasTotal) {
        points = list.map((r) => ({
          at: `${r.date}T16:00:00.000Z`,
          value: Math.max(0, Number(r.total_value)),
        }));
      } else if (hasCum) {
        const cums = list.map((r) => Number(r.cum_return_pct) || 0);
        const cumEnd = cums[cums.length - 1] ?? 0;
        const denom = 1 + cumEnd / 100;
        points = list.map((r, i) => ({
          at: `${r.date}T16:00:00.000Z`,
          value: denom > 0 ? (endValue * (1 + cums[i] / 100)) / denom : endValue,
        }));
      } else {
        const points0 = buildSyntheticValuePoints(endValue, range, HERO_DATA[range].change);
        return NextResponse.json({ range, points: points0, source: 'synthetic' });
      }

      if (points.length) {
        const last = { ...points[points.length - 1], value: endValue };
        points[points.length - 1] = last;
      }

      return NextResponse.json({ range, points, source: 'db' });
    } catch (e) {
      console.error('[value-series] failed', e);
      return NextResponse.json(
        { error: /** @type {any} */ (e)?.message ?? 'Unknown' },
        { status: 500 },
      );
    }
  },
  { requireAuth: true },
);

/**
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getPortfolioEndValue(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: balanceToday } = await supabaseAdmin
    .from('portfolio_balance_snapshots')
    .select('total_value')
    .eq('user_id', userId)
    .eq('snapshot_date', today);
  if (balanceToday?.length) {
    const sum = balanceToday.reduce((s, r) => s + (Number(r.total_value) || 0), 0);
    if (sum > 0) return sum;
  }

  const { data: snapAccounts } = await supabaseAdmin
    .from('snaptrade_accounts')
    .select('balance_total')
    .eq('user_id', userId);
  if (snapAccounts?.length) {
    const sum = snapAccounts.reduce((s, a) => s + (Number(a.balance_total) || 0), 0);
    if (sum > 0) return sum;
  }

  const { data: holdings, error: hErr } = await supabaseAdmin
    .from('plaid_holdings')
    .select('value, institution_value')
    .eq('user_id', userId);
  if (!hErr && Array.isArray(holdings) && holdings.length > 0) {
    return holdings.reduce((s, h) => {
      const v = Number(h.value ?? h.institution_value ?? 0) || 0;
      return s + v;
    }, 0);
  }

  const { data: row } = await supabaseAdmin
    .from('mock_portfolios')
    .select('portfolio')
    .eq('user_id', userId)
    .maybeSingle();

  const portfolio = row?.portfolio;
  if (!portfolio || typeof portfolio !== 'object') {
    return 0;
  }

  const cash = Number(portfolio.cash) || 0;
  const positions = portfolio.positions;
  if (!positions || typeof positions !== 'object') {
    return Math.max(0, cash);
  }

  if (Array.isArray(positions)) {
    const sum = positions.reduce((s, p) => {
      const q = Number(p?.shares ?? p?.qty ?? 0) || 0;
      const pr = Number(p?.currentPrice ?? p?.price ?? 0) || 0;
      return s + q * pr;
    }, 0);
    return Math.max(0, cash + sum);
  }

  let sum = 0;
  for (const p of Object.values(positions)) {
    const q = Number(/** @type {any} */ (p)?.shares ?? /** @type {any} */ (p)?.qty ?? 0) || 0;
    const pr =
      Number(/** @type {any} */ (p)?.currentPrice ?? /** @type {any} */ (p)?.price ?? 0) || 0;
    sum += q * pr;
  }
  return Math.max(0, cash + sum);
}
