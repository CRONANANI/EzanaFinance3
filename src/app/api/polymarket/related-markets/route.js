import { NextResponse } from 'next/server';
import { findMatchingMarkets } from '@/lib/polymarket/match';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/polymarket/related-markets
 *
 * Body: { headline, title, topic, summary, description, impactedKeywords, impactedSymbols, country, limit }
 * Returns: { markets: PolymarketMatch[], noHighConfidence?: boolean }
 *
 * Stateless — same payload always returns same result (modulo Polymarket's own
 * 60s cache). No auth required since we're surfacing public market data.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = Math.min(6, Math.max(1, Number(body?.limit) || 6));

    const { markets, noHighConfidence } = await findMatchingMarkets(
      {
        headline: body?.headline ?? body?.title ?? '',
        title: body?.title ?? body?.headline ?? '',
        topic: typeof body?.topic === 'string' ? body.topic : '',
        summary: body?.summary ?? '',
        description: body?.description ?? '',
        impactedKeywords: Array.isArray(body?.impactedKeywords) ? body.impactedKeywords : [],
        impactedSymbols: Array.isArray(body?.impactedSymbols) ? body.impactedSymbols : [],
        country: body?.country ?? '',
      },
      { limit }
    );

    return NextResponse.json({ markets, noHighConfidence: Boolean(noHighConfidence) });
  } catch (err) {
    console.error('[polymarket/related-markets]', err);
    return NextResponse.json({ markets: [], noHighConfidence: false, error: err?.message ?? 'Unknown' }, { status: 500 });
  }
}
