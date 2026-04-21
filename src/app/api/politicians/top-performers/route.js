/**
 * Read-only API for the Inside the Capitol "Top Performing Politicians" card.
 *
 * Query params:
 *   - year     (required) — 4-digit year like "2024" or the literal "all".
 *   - limit    (optional) — default 10, capped at 50.
 *   - chamber  (optional) — 'senate' | 'house' to restrict results.
 *
 * Returns the top N politicians by estimated P&L from the precomputed
 * `politician_annual_performance` table. Never computes on-demand — heavy
 * lifting happens in the weekly cron.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-service-role';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const yearParam = sp.get('year') ?? String(new Date().getFullYear());
  const limitRaw = Number.parseInt(sp.get('limit') ?? '10', 10);
  const limit = Math.min(
    Math.max(Number.isFinite(limitRaw) ? limitRaw : 10, 1),
    50
  );
  const chamber = sp.get('chamber');
  if (chamber && chamber !== 'senate' && chamber !== 'house') {
    return NextResponse.json(
      { error: 'chamber must be "senate" or "house"' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  if (yearParam === 'all') {
    let q = supabase
      .from('politician_annual_performance')
      .select(
        'politician_id, politician_name, chamber, party, estimated_pnl, total_volume_estimated, num_trades, biggest_winner_symbol, biggest_winner_pnl'
      );
    if (chamber) q = q.eq('chamber', chamber);

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rollup = new Map();
    for (const r of data ?? []) {
      const key = r.politician_id;
      const cur = rollup.get(key) ?? {
        politician_id: r.politician_id,
        politician_name: r.politician_name,
        chamber: r.chamber,
        party: r.party,
        estimated_pnl: 0,
        total_volume_estimated: 0,
        num_trades: 0,
        biggest_winner_symbol: null,
        biggest_winner_pnl: 0,
      };
      cur.estimated_pnl += Number(r.estimated_pnl || 0);
      cur.total_volume_estimated += Number(r.total_volume_estimated || 0);
      cur.num_trades += Number(r.num_trades || 0);
      const winnerPnl = Number(r.biggest_winner_pnl || 0);
      if (winnerPnl > cur.biggest_winner_pnl) {
        cur.biggest_winner_pnl = winnerPnl;
        cur.biggest_winner_symbol = r.biggest_winner_symbol;
      }
      rollup.set(key, cur);
    }

    const performers = Array.from(rollup.values())
      .map((r) => ({
        ...r,
        estimated_return_pct:
          r.total_volume_estimated > 0
            ? (r.estimated_pnl / r.total_volume_estimated) * 100
            : 0,
      }))
      .sort((a, b) => b.estimated_pnl - a.estimated_pnl)
      .slice(0, limit);

    return NextResponse.json({ year: 'all', performers });
  }

  const year = Number.parseInt(yearParam, 10);
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return NextResponse.json(
      { error: 'year must be a 4-digit year or "all"' },
      { status: 400 }
    );
  }

  let q = supabase
    .from('politician_annual_performance')
    .select('*')
    .eq('year', year)
    .order('estimated_pnl', { ascending: false })
    .limit(limit);

  if (chamber) q = q.eq('chamber', chamber);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ year, performers: data ?? [] });
}
