import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';
import { buildSyntheticValuePoints } from '@/lib/portfolio-value-series-synth';
import { HERO_DATA } from '@/lib/dashboard-hero-data';

export const dynamic = 'force-dynamic';

const RANGES = new Set(['1D', '1M', '6M', '1Y']);

/**
 * @param {import('next/server').NextRequest} req
 */
export async function GET(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const range = RANGES.has(req.nextUrl.searchParams.get('range'))
      ? /** @type {'1D'|'1M'|'6M'|'1Y'} */ (req.nextUrl.searchParams.get('range'))
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
      if (range === '1M') t.setDate(t.getDate() - 30);
      else if (range === '6M') t.setMonth(t.getMonth() - 6);
      else t.setDate(t.getDate() - 365);
      return t.toISOString().slice(0, 10);
    })();

    const { data: rows, error: dbError } = await supabaseAdmin
      .from('portfolio_daily_returns')
      .select('date, total_value, cum_return_pct')
      .eq('user_id', user.id)
      .gte('date', fromDate)
      .order('date', { ascending: true });

    if (dbError) {
      const code = /** @type {any} */ (dbError).code;
      if (code === 'PGRST205' || code === '42P01' || /relation.*does not exist/i.test(String(dbError.message || ''))) {
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
}

/**
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getPortfolioEndValue(userId) {
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
    const pr = Number(/** @type {any} */ (p)?.currentPrice ?? /** @type {any} */ (p)?.price ?? 0) || 0;
    sum += q * pr;
  }
  return Math.max(0, cash + sum);
}
