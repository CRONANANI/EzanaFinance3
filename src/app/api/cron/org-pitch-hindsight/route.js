import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { FmpAPI } from '@/lib/services/fmp';

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

  let spyBench = 12.1;
  try {
    const spy = await FmpAPI.getQuote('SPY');
    if (spy?.changesPercentage != null) spyBench = spy.changesPercentage;
  } catch {
    /* use default */
  }

  for (const pitch of targets || []) {
    try {
      const quote = await FmpAPI.getQuote(pitch.ticker);
      const priceAt = pitch.current_price_at_submission || quote?.price;
      const current = quote?.price ?? priceAt;
      if (!priceAt) continue;
      const returnPct = ((current - priceAt) / priceAt) * 100;
      const alpha = returnPct - spyBench;
      const { error: upsertError } = await supabase.from('org_pitch_hindsight').upsert(
        {
          pitch_id: pitch.id,
          computed_at: new Date().toISOString(),
          current_price: current,
          price_at_decision: priceAt,
          return_pct: Math.round(returnPct * 10) / 10,
          benchmark_return_pct: spyBench,
          alpha_pct: Math.round(alpha * 10) / 10,
          current_state:
            alpha > 5 ? 'outperforming' : alpha < -5 ? 'underperforming' : 'roughly_inline',
        },
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
