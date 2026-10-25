import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { FmpAPI } from '@/lib/services/fmp';
import { cronRoute } from '@/lib/cron/with-cron-lock';
import { computeHindsight } from '@/lib/org-hindsight';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

async function run(request) {
  let supabase;
  try {
    supabase = getAdminClient();
  } catch {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: targets, error } = await supabase
    .from('org_pitches')
    .select('id, ticker, current_price_at_submission, decision, decision_at')
    .not('decision', 'is', null)
    .not('decision_at', 'is', null)
    .lt('decision_at', thirtyDaysAgo);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let updated = 0;
  const errors = [];

  /* Benchmark: SPY over each pitch's own window, from its close on
     decision_at (ORG-17). One history read serves every pitch. */
  const [spyHistory, spyQuote] = await Promise.all([
    FmpAPI.getHistoricalPrice('SPY').catch(() => []),
    FmpAPI.getQuote('SPY').catch(() => null),
  ]);

  for (const pitch of targets || []) {
    try {
      const [quote, tickerHistory] = await Promise.all([
        FmpAPI.getQuote(pitch.ticker).catch(() => null),
        FmpAPI.getHistoricalPrice(pitch.ticker).catch(() => []),
      ]);
      const h = computeHindsight({
        pitch,
        tickerHistory,
        spyHistory,
        tickerQuote: quote?.price ?? null,
        spyQuote: spyQuote?.price ?? null,
      });
      if (!h.price_at_decision || h.current_price == null) continue;
      const { error: upsertError } = await supabase
        .from('org_pitch_hindsight')
        .upsert(
          { pitch_id: pitch.id, computed_at: new Date().toISOString(), ...h },
          { onConflict: 'pitch_id' },
        );
      if (upsertError) {
        errors.push({ pitch_id: pitch.id, error: upsertError.message });
        continue;
      }
      updated += 1;
    } catch (e) {
      errors.push({ pitch_id: pitch.id, error: e.message });
    }
  }

  return NextResponse.json({ updated, total: (targets || []).length, errors });
}

export const GET = cronRoute('org-pitch-hindsight', run, { ttlSeconds: 180 });
