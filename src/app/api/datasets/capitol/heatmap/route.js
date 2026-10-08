/**
 * GET /api/datasets/capitol/heatmap?chamber=house|senate
 * Where oversight and ownership overlap: the share of each full committee's
 * members holding stocks in each sector (inferred holdings). The hub renders
 * the House on the server and loads the Senate from here on demand; the card
 * also retries here when a chamber failed or came back empty. Public;
 * rate-limited.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getHeatmap } from '@/lib/datasets/capitol-hub/data';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const rl = await checkRateLimit(`capitol-heatmap:${getClientIp(request)}`, {
    limit: 60,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);
  const chamber =
    new URL(request.url).searchParams.get('chamber') === 'senate' ? 'senate' : 'house';
  const out = await getHeatmap(chamber);
  if (out?.error) {
    return NextResponse.json(
      { ok: false, error: 'This signal could not be loaded just now.' },
      { status: 503 },
    );
  }
  /* An empty answer is not cached at the edge either: it is retried. */
  return NextResponse.json(
    { ok: true, ...out },
    {
      headers: {
        'Cache-Control': out?.empty
          ? 'no-store'
          : 'public, s-maxage=900, stale-while-revalidate=300',
      },
    },
  );
}
