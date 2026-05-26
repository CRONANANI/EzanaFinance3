import { NextResponse } from 'next/server';
import { FmpAPI } from '@/lib/services/fmp';
import { listPitches, setHindsight } from '@/lib/org-pitch-store';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') ?? '') === `Bearer ${secret}`;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  const targets = listPitches().filter(
    (p) => p.decision && p.decision_at && new Date(p.decision_at).getTime() < thirtyDaysAgo,
  );

  let updated = 0;
  const errors = [];

  let spyBench = 12.1;
  try {
    const spy = await FmpAPI.getQuote('SPY');
    if (spy?.changesPercentage != null) spyBench = spy.changesPercentage;
  } catch {
    /* use default */
  }

  for (const pitch of targets) {
    try {
      const quote = await FmpAPI.getQuote(pitch.ticker);
      const priceAt = pitch.current_price_at_submission || quote?.price;
      const current = quote?.price ?? priceAt;
      if (!priceAt) continue;
      const returnPct = ((current - priceAt) / priceAt) * 100;
      const alpha = returnPct - spyBench;
      setHindsight(pitch.id, {
        current_price: current,
        price_at_decision: priceAt,
        return_pct: Math.round(returnPct * 10) / 10,
        benchmark_return_pct: spyBench,
        alpha_pct: Math.round(alpha * 10) / 10,
        current_state:
          alpha > 5 ? 'outperforming' : alpha < -5 ? 'underperforming' : 'roughly_inline',
      });
      updated += 1;
    } catch (e) {
      errors.push({ pitch_id: pitch.id, error: e.message });
    }
  }

  return NextResponse.json({ updated, total: targets.length, errors });
}
