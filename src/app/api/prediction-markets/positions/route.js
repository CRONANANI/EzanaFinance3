/**
 * GET /api/prediction-markets/positions?wallet=0x...
 *
 * A Polymarket trader's top 3 open positions by current value, for the Top
 * Traders expansion. Signed-in only: withApiGuard returns 401 when signed out,
 * so the gate on the page is real, not cosmetic. Each position carries the
 * index market id when we track that market, so its row can load the chart.
 *
 * Cache-Control is private on purpose: a shared (s-maxage) cache would serve a
 * signed-in response to a signed-out request for the same URL.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { marketIdsForTokens } from '@/lib/prediction-markets/page-store';
import { polymarketPositions } from '@/lib/prediction-markets/providers';

export const dynamic = 'force-dynamic';

const WALLET_RE = /^0x[0-9a-fA-F]{40}$/;

export const GET = withApiGuard(async (request) => {
  const wallet = String(new URL(request.url).searchParams.get('wallet') || '');
  if (!WALLET_RE.test(wallet)) {
    return NextResponse.json({ error: 'Invalid wallet' }, { status: 400 });
  }
  const positions = await polymarketPositions(wallet.toLowerCase(), 3);
  if (positions == null) {
    return NextResponse.json(
      { error: 'Positions unavailable' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  /* The index stores the YES token. A YES position is its own asset; a NO
     position's opposite asset is the YES token. */
  const yesToken = (p) => (p.outcomeIndex === 1 ? p.oppositeAsset : p.asset);
  const ids = await marketIdsForTokens(positions.map(yesToken));
  const rows = positions.map((p) => ({
    title: p.title,
    side: p.side,
    size: p.size,
    avgPrice: p.avgPrice,
    curPrice: p.curPrice,
    value: p.value,
    marketId: ids.get(String(yesToken(p))) || null,
  }));
  return NextResponse.json(
    { wallet, positions: rows },
    { headers: { 'Cache-Control': 'private, max-age=300' } },
  );
});
