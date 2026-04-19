import { NextResponse } from 'next/server';
import { getSeedIsrEvents } from '@/lib/isr/seed-events';

// Reads query params → must be dynamic (can't be statically rendered).
export const dynamic = 'force-dynamic';

/**
 * ISR feed endpoint.
 *
 * Current implementation: curated seed events filtered server-side.
 * Production target: wire to GDELT / NewsData.io / Event Registry here — the
 * response shape (IsrEvent[]) stays identical so the client and Polymarket
 * matcher don't need to change.
 */
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const countriesRaw = url.searchParams.get('countries') || '';
    const countries = countriesRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const topic = url.searchParams.get('topic') || 'All';
    const minSeverity = url.searchParams.get('minSeverity') || 'Low';
    const window = url.searchParams.get('window') || '24h';

    const events = getSeedIsrEvents({ countries, topic, minSeverity, window });

    return NextResponse.json(
      { events },
      {
        headers: {
          // Short cache — feed should feel live but we don't need per-request freshness
          'Cache-Control': 'public, max-age=30, s-maxage=30',
        },
      }
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[isr/feed]', err);
    return NextResponse.json({ events: [] }, { status: 500 });
  }
}
