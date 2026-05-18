import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import { scoreEventForUser } from '@/lib/notifications/matching-engine';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let user;
  try {
    const auth = await requireUser(request);
    user = auth.user;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  if (items.length === 0) {
    return NextResponse.json({ ranked: [] });
  }

  const { data: profile } = await admin
    .from('user_interest_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({
      ranked: items.map((item) => ({ id: item.id, relevance_score: 50 })),
    });
  }

  const { data: segment } = await admin
    .from('user_segments')
    .select('persona, persona_confidence')
    .eq('user_id', user.id)
    .maybeSingle();

  const ranked = items.map((item) => {
    const classified = {
      tickers: item.tickers || [],
      eventType: item.topic || item.type || 'macro',
      severity: item.severity || 'routine',
      sentiment: item.sentiment || 'neutral',
    };
    const { score } = scoreEventForUser(classified, profile, segment);
    return { id: item.id, relevance_score: score };
  });

  ranked.sort((a, b) => b.relevance_score - a.relevance_score);
  return NextResponse.json({ ranked });
}
