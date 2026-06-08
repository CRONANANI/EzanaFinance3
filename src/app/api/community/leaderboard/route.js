import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { computeReturnPct } from '@/lib/elo-portfolio-perf';
import { cacheGetOrSet } from '@/lib/cache';

export const dynamic = 'force-dynamic';

// The leaderboard is identical for every viewer of a given period+limit and is
// expensive to compute (scans profiles + portfolios + snapshots), so cache the
// computed result. 90s keeps it fresh-enough while collapsing bursts of reads
// into a single DB pass. (Phase 2 will back this with a materialized view.)
const LEADERBOARD_TTL_SECONDS = 90;

function periodToDays(period) {
  return { daily: 1, weekly: 7, monthly: 30, yearly: 365 }[period] || 7;
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Approximate return from mock_portfolios JSONB (cost basis vs current value). */
function returnFromMockPortfolio(portfolio) {
  if (!portfolio || typeof portfolio !== 'object') return null;

  const cash = Number(portfolio.cash) || 0;
  let costBasis = 0;
  let currentValue = cash;
  const positions = portfolio.positions;

  const addPosition = (ticker, p) => {
    const shares = Number(p?.shares ?? p?.qty ?? 0);
    if (shares <= 0) return;
    const avgCost = Number(p?.avgCost ?? p?.costBasis ?? 0);
    const price = Number(p?.currentPrice ?? p?.price ?? p?.lastPrice ?? avgCost) || 0;
    costBasis += shares * avgCost;
    currentValue += shares * price;
  };

  if (positions && typeof positions === 'object' && !Array.isArray(positions)) {
    for (const [ticker, p] of Object.entries(positions)) {
      addPosition(ticker, p);
    }
  } else if (Array.isArray(positions)) {
    for (const p of positions) {
      const ticker = p?.ticker ?? p?.symbol ?? '';
      addPosition(ticker, p);
    }
  }

  if (costBasis <= 0) return null;
  return computeReturnPct(costBasis, currentValue);
}

/**
 * GET /api/community/leaderboard?period=weekly&limit=50
 *
 * Returns top-performing investors using portfolio_value_snapshots when
 * available, otherwise mock_portfolios cost-basis return.
 */
export const GET = withApiGuard(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url);
      const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '50', 10)));
      const period = searchParams.get('period') || 'weekly';

      const payload = await cacheGetOrSet(
        `community:leaderboard:${period}:${limit}`,
        LEADERBOARD_TTL_SECONDS,
        async () => {
          const days = periodToDays(period);
          const fromDate = isoDaysAgo(days + 2);

          const admin = getAdminClient();

          // Read model first: precomputed snapshot returns from the materialized
          // view. If it isn't present yet (migration not applied), fall back to a
          // live snapshot scan so behaviour is identical either way.
          let mvReturns = null;
          try {
            const { data: mvRows, error: mvErr } = await admin
              .from('mv_portfolio_leaderboard')
              .select('user_id, return_pct')
              .eq('period', period);
            if (!mvErr && Array.isArray(mvRows)) {
              mvReturns = new Map(
                mvRows
                  .filter((r) => r.return_pct != null)
                  .map((r) => [r.user_id, Number(r.return_pct)]),
              );
            }
          } catch {
            mvReturns = null;
          }

          const queries = [
            admin
              .from('profiles')
              .select('id, username, full_name, user_settings')
              .order('created_at', { ascending: false })
              .limit(800),
            admin.from('mock_portfolios').select('user_id, portfolio'),
          ];
          // Only pull raw snapshots when the read model wasn't available.
          if (!mvReturns) {
            queries.push(
              admin
                .from('portfolio_value_snapshots')
                .select('user_id, snapshot_date, total_value')
                .gte('snapshot_date', fromDate)
                .order('snapshot_date', { ascending: true }),
            );
          }

          const results = await Promise.all(queries);
          const { data: profiles, error: profErr } = results[0];
          const { data: mockRows } = results[1];

          // Don't cache a failed read — surface the error so the outer handler
          // returns an (uncached) empty result and we retry next request.
          if (profErr) throw new Error(`profile fetch: ${profErr.message}`);

          const mockByUser = new Map((mockRows || []).map((r) => [r.user_id, r.portfolio]));

          // Resolve a user's snapshot-based return: from the read model when
          // present, else computed from the raw snapshot rows.
          let snapshotReturn;
          if (mvReturns) {
            snapshotReturn = (uid) => (mvReturns.has(uid) ? mvReturns.get(uid) : null);
          } else {
            const snapsByUser = new Map();
            for (const row of results[2]?.data || []) {
              const uid = row.user_id;
              if (!snapsByUser.has(uid)) snapsByUser.set(uid, []);
              snapsByUser.get(uid).push(row);
            }
            snapshotReturn = (uid) => {
              const userSnaps = snapsByUser.get(uid);
              if (userSnaps && userSnaps.length >= 2) {
                const startVal = Number(userSnaps[0].total_value);
                const endVal = Number(userSnaps[userSnaps.length - 1].total_value);
                if (startVal > 0 && endVal > 0) return computeReturnPct(startVal, endVal);
              }
              return null;
            };
          }

          const ranked = (profiles || [])
            .map((row) => {
              const s = row.user_settings || {};
              if (s.privacy_show_on_leaderboard === false) return null;

              let returnPct = snapshotReturn(row.id);
              if (returnPct == null) {
                returnPct = returnFromMockPortfolio(mockByUser.get(row.id));
              }

              if (returnPct == null) return null;

              const name = (row.full_name || s.display_name || '').trim() || 'Member';
              return {
                id: row.id,
                username: row.username || '',
                name,
                return: Math.round(returnPct * 100) / 100,
              };
            })
            .filter(Boolean)
            .sort((a, b) => (b.return ?? 0) - (a.return ?? 0))
            .slice(0, limit)
            .map((row, i) => ({ ...row, rank: i + 1 }));

          return { period, users: ranked };
        },
      );

      return NextResponse.json(payload);
    } catch (err) {
      console.error('[leaderboard] unexpected error:', err);
      return NextResponse.json({ period: 'weekly', users: [] }, { status: 500 });
    }
  },
  { requireAuth: false },
);
