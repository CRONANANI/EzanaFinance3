import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { refreshBrokerageCache, readSnapTradeError } from '@/lib/snaptrade';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/snaptrade/brokerages
 *
 * Returns the cached list of SnapTrade-supported brokerages. If the cache
 * is empty (first hit ever) we refresh it from SnapTrade synchronously.
 */
export async function GET() {
  const supabase = getAdminClient();

  let { data: rows } = await supabase
    .from('snaptrade_brokerages_cache')
    .select('*')
    .order('display_name', { ascending: true });

  if (!rows || rows.length === 0) {
    try {
      await refreshBrokerageCache();
    } catch (err) {
      const info = readSnapTradeError(err);
      console.error('[snaptrade/brokerages] cache refresh failed', info);
      return NextResponse.json(
        { brokerages: [], error: 'Could not load brokerages.' },
        { status: 502 },
      );
    }
    const refreshed = await supabase
      .from('snaptrade_brokerages_cache')
      .select('*')
      .order('display_name', { ascending: true });
    rows = refreshed.data || [];
  }

  const usable = rows.filter((b) => b.enabled && !b.maintenance_mode && b.brokerage_type !== null);

  return NextResponse.json({ brokerages: usable, count: usable.length });
}
