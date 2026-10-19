/**
 * GET /api/prediction-markets/history?id=<market_id>&range=1d|1w|1m|all[&outcomes=1]
 *
 * Price history for the Price Chart, drawn by Ezana (no third-party iframe).
 * Response: { market, points: [{ t, p }], volume: [{ t, v }], series? }.
 *   Polymarket: CLOB prices-history on the stored YES token; volume per
 *     period from the snapshot history (empty until it accrues).
 *   Kalshi: market candlesticks; volume in contracts per period.
 * outcomes=1 adds `series`: up to four outcomes of the same event, most likely
 * first, the requested market always included.
 * Public, CDN-cached for a minute. An unreachable venue returns 502 so the
 * card shows its error state rather than an empty chart.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import {
  getEventSiblings,
  getMarketForChart,
  getSnapshotVolume,
} from '@/lib/prediction-markets/page-store';
import { RANGES, kalshiHistory, polymarketHistory } from '@/lib/prediction-markets/providers';

export const dynamic = 'force-dynamic';

const CACHE = 'public, max-age=30, s-maxage=60, stale-while-revalidate=120';
const ID_RE = /^(kalshi:[A-Z0-9._-]{1,80}|[0-9]{1,20})$/i;
const VOLUME_BARS = { '1d': 24, '1w': 28, '1m': 30, all: 24 };

const n = (v) => {
  if (v == null || v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

async function seriesFor(market, range, now) {
  if (market.platform === 'kalshi') return kalshiHistory(market.market_id, range, now);
  const points = await polymarketHistory(market.yes_token_id, range);
  return points == null ? null : { points, volume: null };
}

export const GET = withApiGuard(
  async (request) => {
    const sp = new URL(request.url).searchParams;
    const id = String(sp.get('id') || '').trim();
    const range = RANGES[sp.get('range')] ? sp.get('range') : '1w';
    if (!ID_RE.test(id)) return NextResponse.json({ error: 'Invalid market id' }, { status: 400 });

    const market = await getMarketForChart(id);
    if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 });

    const now = Date.now();
    const main = await seriesFor(market, range, now);
    if (main == null) {
      return NextResponse.json(
        { error: 'Price history unavailable' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    let volume = main.volume;
    if (!volume) {
      const sinceMs = main.points.length ? main.points[0].t : now - RANGES[range].ms;
      volume = await getSnapshotVolume(market.market_id, sinceMs, now, VOLUME_BARS[range]);
    }

    const body = {
      market: {
        id: market.market_id,
        venue: market.platform,
        question: market.question,
        p: n(market.probability),
        vol: n(market.volume),
        vol24h: n(market.volume_24h),
        volUnit: market.volume_unit || (market.platform === 'kalshi' ? 'contracts' : 'usd'),
        bid: n(market.best_bid),
        ask: n(market.best_ask),
        spread: n(market.spread),
        closes: market.end_date,
        url: market.link,
        updatedAt: market.indexed_at,
      },
      range,
      points: main.points,
      volume,
    };

    if (sp.get('outcomes') === '1') {
      const siblings = await getEventSiblings(market, 4);
      if (siblings.length > 1) {
        const lists = await Promise.all(
          siblings.map((s) =>
            s.market_id === market.market_id
              ? Promise.resolve(main)
              : seriesFor(s, range, now).catch(() => null),
          ),
        );
        body.series = siblings
          .map((s, i) => ({
            id: s.market_id,
            question: s.question,
            p: n(s.probability),
            points: lists[i]?.points || [],
          }))
          .filter((s) => s.points.length > 1);
      }
    }

    return NextResponse.json(body, { headers: { 'Cache-Control': CACHE } });
  },
  { requireAuth: false },
);
