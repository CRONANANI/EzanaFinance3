import { NextResponse } from 'next/server';
import { findMatchingMarkets } from '@/lib/polymarket/match';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/polymarket/related-markets
 *
 * Body: { headline, title, summary, description, impactedKeywords, country, limit }
 * Returns: { markets: PolymarketMatch[] }
 *
 * Stateless — same payload always returns same result (modulo Polymarket's own
 * 60s cache). No auth required since we're surfacing public market data.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = Math.min(20, Math.max(1, Number(body?.limit) || 8));

    const markets = await findMatchingMarkets(
      {
        headline: body?.headline ?? body?.title ?? '',
        title: body?.title ?? body?.headline ?? '',
        summary: body?.summary ?? '',
        description: body?.description ?? '',
        impactedKeywords: Array.isArray(body?.impactedKeywords) ? body.impactedKeywords : [],
        country: body?.country ?? '',
      },
      { limit }
    );

    return NextResponse.json({ markets });
  } catch (err) {
    console.error('[polymarket/related-markets]', err);
    return NextResponse.json({ markets: [], error: err?.message ?? 'Unknown' }, { status: 500 });
  }
}
