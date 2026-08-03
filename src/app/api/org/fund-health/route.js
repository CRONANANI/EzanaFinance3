import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { getOrgPositionBook } from '@/lib/org-position-book';
import { getBenchmarkSymbol } from '@/lib/org-benchmark';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HOUR = 3600000;
const DAY = 86400000;

/**
 * GET /api/org/fund-health — the "are these numbers trustworthy?" signal for a
 * faculty advisor. EXECUTIVE ONLY (403 otherwise). Reads only real data:
 * price freshness, snapshot recency, unpriced/unclassified positions, and
 * benchmark provenance. Brokerage sync is null (no per-org sync record exists
 * in the schema — the card omits that row rather than inventing one).
 */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, ['executive'])) {
      return NextResponse.json({ error: 'Executive access required' }, { status: 403 });
    }
    const orgId = member.org_id;

    const [book, { data: snaps }, benchmarkSymbol] = await Promise.all([
      getOrgPositionBook(supabase, orgId),
      supabase
        .from('org_fund_snapshots')
        .select('snapshot_date, benchmark_symbol, benchmark_source')
        .eq('org_id', orgId)
        .order('snapshot_date', { ascending: false })
        .limit(60),
      getBenchmarkSymbol(supabase, orgId),
    ]);

    const total = book.length;
    const priced = book.filter((p) => p.priced).length;
    const unpriced = total - priced;
    const missingSector = book.filter((p) => !p.sector).length;
    const missingTeam = book.filter((p) => !p.team_id).length;

    const lastPricedAt = book
      .map((p) => p.last_priced_at)
      .filter(Boolean)
      .sort()
      .pop() || null;
    const now = Date.now();
    const staleHours = lastPricedAt ? Math.floor((now - Date.parse(lastPricedAt)) / HOUR) : null;

    const snapRows = snaps || [];
    const lastSnap = snapRows[0] || null;
    const lastDate = lastSnap?.snapshot_date || null;
    const daysSince = lastDate ? Math.floor((now - Date.parse(`${lastDate}T00:00:00Z`)) / DAY) : null;
    const cutoff30 = new Date(now - 30 * DAY).toISOString().slice(0, 10);
    const count30d = snapRows.filter((s) => s.snapshot_date >= cutoff30).length;

    // Benchmark provenance from the latest snapshot, falling back to config.
    const benchmark = {
      symbol: lastSnap?.benchmark_symbol || benchmarkSymbol,
      source: lastSnap?.benchmark_source || null,
    };

    // Status (single source of truth, server-side).
    let status = 'ok';
    if (total > 0) {
      const snapshotStale = daysSince == null || daysSince >= 3;
      const priceStale = staleHours == null || staleHours >= 72;
      if (snapshotStale || priceStale) status = 'stale';
      else if (unpriced > 0 || missingSector > 0 || missingTeam > 0) status = 'attention';
    }

    return NextResponse.json({
      positions: { total, priced, unpriced, missing_sector: missingSector, missing_team: missingTeam },
      pricing: { last_priced_at: lastPricedAt, stale_hours: staleHours },
      snapshot: { last_date: lastDate, days_since: daysSince, count_30d: count30d },
      benchmark,
      brokerage: null,
      status,
    });
  },
  { requireAuth: true },
);
