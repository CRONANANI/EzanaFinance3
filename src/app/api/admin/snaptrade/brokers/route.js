import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase';
import { getSnapTradeClient, readSnapTradeError } from '@/lib/snaptrade';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/snaptrade/brokers
 *
 * Dumps SnapTrade's canonical broker list with the slug values we should use
 * in BROKERAGES. Hit this once after deploying and copy the real slugs into
 * src/components/home/AddPortfolioModal.jsx.
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
    const brokerages = (res.data || []).map((b) => ({
      slug: b.slug,
      name: b.name,
      display_name: b.display_name,
      enabled: b.enabled,
      maintenance_mode: b.maintenance_mode,
      url: b.url,
      allows_trading: b.allows_trading,
    }));
    brokerages.sort((a, b) => {
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      return (a.display_name || a.name || a.slug).localeCompare(b.display_name || b.name || b.slug);
    });
    return NextResponse.json({ count: brokerages.length, brokerages });
  } catch (err) {
    const info = readSnapTradeError(err);
    console.error('[admin/snaptrade/brokers]', info);
    return NextResponse.json({ error: 'Failed to list brokerages' }, { status: 502 });
  }
}
