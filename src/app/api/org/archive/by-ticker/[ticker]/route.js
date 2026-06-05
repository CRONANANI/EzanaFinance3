import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getPriorsForTicker } from '@/lib/org-pitches';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user, context) => {
    const ticker = params?.ticker;
    const priors = getPriorsForTicker(ticker);
    return NextResponse.json({ ticker: (ticker || '').toUpperCase(), priors });
  },
  { requireAuth: true },
);
