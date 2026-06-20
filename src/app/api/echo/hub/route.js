/**
 * /api/echo/hub — public Echo hub payload (cards + featured), served from the
 * database. Replaces the mock catalog the hub used to render from.
 */
import { NextResponse } from 'next/server';
import { getHubData } from '@/lib/echo-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const { articles, featured } = await getHubData();
    return NextResponse.json({ articles, featured });
  } catch (e) {
    console.error('[echo] hub route:', e?.message || e);
    return NextResponse.json({ articles: [], featured: null });
  }
}
