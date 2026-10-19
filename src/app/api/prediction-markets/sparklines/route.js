/**
 * GET /api/prediction-markets/sparklines?ids=<id>,<id>...&range=1d|1w
 *
 * Batch sparklines for the Movers rows and the Pulse biggest-mover tile: up
 * to ten markets, each downsampled to 24 points. One call per list so the
 * Movers card makes one request, not eight.
 * Response: { series: { [id]: [{ t, p }] } }. A market whose history is
 * unavailable is simply absent; the row renders without a line.
 * Public, CDN-cached for five minutes.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getMarketForChart } from '@/lib/prediction-markets/page-store';
import { downsample } from '@/lib/prediction-markets/page-model';
import { kalshiHistory, polymarketHistory } from '@/lib/prediction-markets/providers';

export const dynamic = 'force-dynamic';

const CACHE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';
const ID_RE = /^(kalshi:[A-Z0-9._-]{1,80}|[0-9]{1,20})$/i;
const MAX_IDS = 10;

export const GET = withApiGuard(
  async (request) => {
    const sp = new URL(request.url).searchParams;
    const range = sp.get('range') === '1w' ? '1w' : '1d';
    const ids = String(sp.get('ids') || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => ID_RE.test(s))
      .slice(0, MAX_IDS);
    const now = Date.now();
    const entries = await Promise.all(
      ids.map(async (id) => {
        const m = await getMarketForChart(id);
        if (!m) return null;
        const pts =
          m.platform === 'kalshi'
            ? (await kalshiHistory(m.market_id, range, now))?.points
            : await polymarketHistory(m.yes_token_id, range);
        return pts && pts.length > 1 ? [id, downsample(pts, 24)] : null;
      }),
    );
    const series = Object.fromEntries(entries.filter(Boolean));
    return NextResponse.json({ series }, { headers: { 'Cache-Control': CACHE } });
  },
  { requireAuth: false },
);
