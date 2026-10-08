/**
 * GET /api/datasets/capitol/lobbying-ratio?years=1|2
 * Lobbying and contracts: lobbying spend and contract award value per
 * company, for the ratio ranking and the correlation. Public; rate-limited.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getLobbyingRatio } from '@/lib/datasets/capitol-hub/data';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const rl = await checkRateLimit(`capitol-lobbying-ratio:${getClientIp(request)}`, {
    limit: 60,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);
  const years = new URL(request.url).searchParams.get('years') === '2' ? 2 : 1;
  const out = await getLobbyingRatio(years);
  if (out?.error) {
    return NextResponse.json(
      { ok: false, error: 'This signal could not be loaded just now.' },
      { status: 503 },
    );
  }
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
