import { NextResponse } from 'next/server';
import { findMatchingMarket } from '@/lib/polymarket/match';

/**
 * Batch Polymarket matcher. Accepts an array of ISR events and returns a map
 * of { [eventId]: PolymarketMatch } for those with a confident active market.
 * Events without a match are simply omitted — the UI treats absence as "no
 * badge", which is the intended behaviour (no speculative matches).
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const events = Array.isArray(body) ? body : Array.isArray(body?.events) ? body.events : [];
    if (events.length === 0) return NextResponse.json({});

    // Cap concurrency implicitly by the event list size; Polymarket's public
    // Gamma API handles modest bursts fine for our expected ~20-event batches.
    const entries = await Promise.all(
      events.map(async (e) => {
        if (!e || !e.id) return null;
        const match = await findMatchingMarket(e);
        return match ? [e.id, match] : null;
      })
    );
    const map = Object.fromEntries(entries.filter(Boolean));
    return NextResponse.json(map);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[isr/polymarket-matches]', err);
    return NextResponse.json({}, { status: 500 });
  }
}
