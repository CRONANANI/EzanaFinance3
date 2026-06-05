import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { FmpAPI } from '@/lib/services/fmp';
import { getPitchRaw, setHindsight } from '@/lib/org-pitch-store';
import { getPitchById } from '@/lib/org-pitches';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const pitch = getPitchRaw(params.pitchId);
    if (!pitch || !pitch.decision_at) {
      return NextResponse.json({ error: 'Pitch not decided' }, { status: 400 });
    }

    try {
      const quote = await FmpAPI.getQuote(pitch.ticker);
      const spy = await FmpAPI.getQuote('SPY');
      const priceAt = pitch.current_price_at_submission || quote?.price;
      const current = quote?.price ?? priceAt;
      const returnPct = priceAt ? ((current - priceAt) / priceAt) * 100 : 0;
      const benchPct = spy?.changesPercentage ?? 12.1;
      const alpha = returnPct - benchPct;

      const hindsight = setHindsight(pitch.id, {
        current_price: current,
        price_at_decision: priceAt,
        return_pct: Math.round(returnPct * 10) / 10,
        benchmark_return_pct: benchPct,
        alpha_pct: Math.round(alpha * 10) / 10,
        max_drawdown_pct: null,
        current_state:
          alpha > 5 ? 'outperforming' : alpha < -5 ? 'underperforming' : 'roughly_inline',
      });

      return NextResponse.json({ hindsight, pitch: getPitchById(pitch.id) });
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
  },
  { requireAuth: true },
);
