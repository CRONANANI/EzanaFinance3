import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { FmpAPI } from '@/lib/services/fmp';
import { getPitchContext, fetchPitchRaw, fetchPitchDetail } from '@/lib/org-pitch-api-helpers';
import { computeHindsight } from '@/lib/org-hindsight';

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
      /* Benchmark: SPY over the same window, from its close on decision_at (ORG-17). */
      const [quote, spy, tickerHistory, spyHistory] = await Promise.all([
        FmpAPI.getQuote(pitch.ticker).catch(() => null),
        FmpAPI.getQuote('SPY').catch(() => null),
        FmpAPI.getHistoricalPrice(pitch.ticker).catch(() => []),
        FmpAPI.getHistoricalPrice('SPY').catch(() => []),
      ]);
      const snapshot = {
        pitch_id: pitch.id,
        computed_at: new Date().toISOString(),
        ...computeHindsight({
          pitch,
          tickerHistory,
          spyHistory,
          tickerQuote: quote?.price ?? null,
          spyQuote: spy?.price ?? null,
        }),
        max_drawdown_pct: null,
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
