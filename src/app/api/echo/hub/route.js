/**
 * /api/echo/hub: public Echo hub payload (cards + featured + the Chart of the
 * Week). Served from the same five-minute data cache as the server-rendered
 * home (lib/echo/hub-cache.js), so it is cheap for every caller.
 */
import { NextResponse } from 'next/server';
import { getEchoHubCached } from '@/lib/echo/hub-cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const { articles, chart } = await getEchoHubCached();
    const featured = articles.find((a) => a.featured) || articles[0] || null;
    return NextResponse.json({ articles, featured, chart });
  } catch (e) {
    console.error('[echo] hub route:', e?.message || e);
    return NextResponse.json({ articles: [], featured: null, chart: null }, { status: 500 });
  }
}
