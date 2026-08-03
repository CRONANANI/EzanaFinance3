import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { refreshOrgPositionPrices } from '@/lib/org-pricing';
import {
  computeFundPerformance,
  attributionByAnalyst,
  attributionBySector,
  attributionByPitch,
} from '@/lib/org-attribution';

/**
 * Daily (weekday) org fund pipeline: refresh every active position's
 * current_price, then upsert today's org_fund_snapshots row for EVERY org
 * with active positions — using the same math the Fund Analytics UI runs,
 * so the chart, headline, and snapshot history reconcile by construction.
 * Replaces the manager-must-visit `?snapshot=1` path as the primary writer
 * (that path remains as an on-demand refresh; same conflict key).
 *
 * Idempotent: safe to rerun — prices converge, snapshot upserts on
 * (org_id, snapshot_date). Auth: CRON_SECRET bearer (or ?key=).
 *   GET /api/cron/org-fund-snapshot
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if ((request.headers.get('authorization') || '') === `Bearer ${secret}`) return true;
  try {
    return new URL(request.url).searchParams.get('key') === secret;
  } catch {
    return false;
  }
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  try {
    const admin = getAdminClient();

    // 1) Prices — all orgs, deduped by ticker.
    const pricing = await refreshOrgPositionPrices(admin);

    // 2) Orgs holding anything active.
    const { data: orgRows, error: orgErr } = await admin
      .from('org_positions')
      .select('org_id')
      .eq('is_active', true);
    if (orgErr) throw new Error(`read orgs: ${orgErr.message}`);
    const orgIds = [...new Set((orgRows || []).map((r) => r.org_id))];

    // 3) Per-org snapshot — sequential keeps DB + provider load flat; SMIF
    //    scale (≤ dozens of orgs) finishes well inside maxDuration.
    const snapshotDate = new Date().toISOString().slice(0, 10);
    let snapshots = 0;
    const failures = [];
    for (const orgId of orgIds) {
      try {
        const [performance, byAnalyst, bySector, byPitch] = await Promise.all([
          computeFundPerformance(admin, orgId),
          attributionByAnalyst(admin, orgId),
          attributionBySector(admin, orgId),
          attributionByPitch(admin, orgId),
        ]);
        const { error } = await admin.from('org_fund_snapshots').upsert(
          {
            org_id: orgId,
            snapshot_date: snapshotDate,
            total_value: performance.total_value,
            total_cost: performance.total_cost,
            return_pct: performance.return_pct,
            benchmark_return_pct: performance.benchmark_return_pct,
            benchmark_symbol: performance.benchmark_symbol,
            benchmark_source: performance.benchmark_source,
            alpha_pct: performance.alpha_pct,
            attribution: { by_analyst: byAnalyst, by_sector: bySector, by_pitch: byPitch },
          },
          { onConflict: 'org_id,snapshot_date' },
        );
        if (error) failures.push({ orgId, error: error.message });
        else snapshots += 1;
      } catch (e) {
        failures.push({ orgId, error: e?.message || String(e) });
      }
    }

    return NextResponse.json({
      ok: failures.length === 0,
      pricing,
      orgs: orgIds.length,
      snapshots,
      failures,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
