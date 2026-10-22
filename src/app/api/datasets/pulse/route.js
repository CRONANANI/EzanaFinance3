/**
 * GET /api/datasets/pulse
 * The /datasets overview's live signals: the freshest rows from every live
 * dataset, mapped to belt cards plus the brief each card opens (findings,
 * stats, chart). Public data; rate-limited per address; cached at the edge
 * for five minutes, which is the client's refresh interval.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { readPulse } from '@/lib/datasets/pulse/read';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request) {
  const rl = await checkRateLimit(`datasets-pulse:${getClientIp(request)}`, {
    limit: 30,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);
  const pulse = await readPulse({ budgetMs: 8000 });
  return NextResponse.json(pulse, {
    headers: {
      /* A partial read (a reader still warming) is cached briefly so the
         next refresh picks up the rest. */
      'Cache-Control': pulse.partial
        ? 'public, s-maxage=30, stale-while-revalidate=120'
        : 'public, s-maxage=300, stale-while-revalidate=900',
    },
  });
}
