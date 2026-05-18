import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { assignPersona } from '@/lib/ml/persona-assignment';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const auth = request.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();

  const { data: profiles, error: profErr } = await admin
    .from('user_interest_profiles')
    .select(
      'user_id, ticker_scores, sector_scores, feature_scores, topic_scores, risk_score, risk_category, total_breadcrumbs',
    );

  if (profErr) {
    console.error('[assign-personas] profiles fetch error', profErr);
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  const userIds = (profiles || []).map((p) => p.user_id);
  let demoMap = {};
  if (userIds.length > 0) {
    const { data: demographics } = await admin
      .from('profiles')
      .select('id, experience_level, investor_profile, risk_category')
      .in('id', userIds);
    demoMap = Object.fromEntries((demographics || []).map((d) => [d.id, d]));
  }

  const distribution = {};
  const upserts = [];

  for (const profile of profiles || []) {
    const demo = demoMap[profile.user_id] || {};
    const { persona, confidence, all_scores } = assignPersona(profile, demo);
    distribution[persona] = (distribution[persona] || 0) + 1;
    upserts.push({
      user_id: profile.user_id,
      persona,
      persona_confidence: confidence,
      segment_features: all_scores,
      assigned_at: new Date().toISOString(),
      method: 'heuristic',
    });
  }

  if (upserts.length > 0) {
    const { error: upsertErr } = await admin.from('user_segments').upsert(upserts, {
      onConflict: 'user_id',
    });

    if (upsertErr) {
      console.error('[assign-personas] upsert error', upsertErr);
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }
  }

  console.log('[assign-personas]', { total_users: upserts.length, distribution });
  return NextResponse.json({ total_users: upserts.length, distribution });
}
