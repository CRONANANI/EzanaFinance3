import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { FmpAPI } from '@/lib/services/fmp';
import { getPitchContext, fetchPitchRaw, fetchPitchDetail } from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, orgId } = await getPitchContext();
    if (!orgId) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
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

      const snapshot = {
        pitch_id: pitch.id,
        computed_at: new Date().toISOString(),
        current_price: current,
        price_at_decision: priceAt,
        return_pct: Math.round(returnPct * 10) / 10,
        benchmark_return_pct: benchPct,
        alpha_pct: Math.round(alpha * 10) / 10,
        max_drawdown_pct: null,
        current_state:
          alpha > 5 ? 'outperforming' : alpha < -5 ? 'underperforming' : 'roughly_inline',
      };

      // Hindsight is a system-computed snapshot; persist with the service-role
      // client (no member write policy on org_pitch_hindsight). Access was
      // already authorized via the org-scoped read above.
      const admin = getAdminClient();
      const { data: hindsight, error } = await admin
        .from('org_pitch_hindsight')
        .upsert(snapshot, { onConflict: 'pitch_id' })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const detail = await fetchPitchDetail(supabase, orgId, pitch.id);
      return NextResponse.json({ hindsight, pitch: detail });
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
  },
  { requireAuth: true },
);
