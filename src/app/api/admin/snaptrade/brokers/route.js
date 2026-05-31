import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase';
import { getSnapTradeClient } from '@/lib/snaptrade';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/snaptrade/brokers
 *
 * Dumps SnapTrade's canonical broker list with their slug values. Use this
 * once to identify which slugs in BROKERAGES are wrong and update the
 * registry. Admin-only.
 */
export async function GET(request) {
  try {
    await requireUser(request);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const snaptrade = getSnapTradeClient();
  try {
    const res = await snaptrade.referenceData.listAllBrokerages();
    const brokers = (res.data || []).map((b) => ({
      slug: b.slug,
      name: b.name,
      display_name: b.display_name,
      enabled: b.enabled,
      maintenance_mode: b.maintenance_mode,
      url: b.url,
    }));
    return NextResponse.json({ count: brokers.length, brokers });
  } catch (err) {
    console.error('[admin/snaptrade/brokers]', err);
    return NextResponse.json({ error: 'Failed to list brokerages' }, { status: 502 });
  }
}
