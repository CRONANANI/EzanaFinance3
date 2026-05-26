import { NextResponse } from 'next/server';
import { getPriorsForTicker } from '@/lib/org-pitches';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const ticker = params?.ticker;
  const priors = getPriorsForTicker(ticker);
  return NextResponse.json({ ticker: (ticker || '').toUpperCase(), priors });
}
