import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let user;
  try {
    const auth = await requireUser(request);
    user = auth.user;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();

  const { data: cached } = await admin
    .from('user_similarity_cache')
    .select('similar_user_id, similarity_score')
    .eq('user_id', user.id)
    .order('similarity_score', { ascending: false })
    .limit(10);

  if (cached && cached.length > 0) {
    const similarIds = cached.map((r) => r.similar_user_id);
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name, avatar_url, user_settings, privacy_show_activity')
      .in('id', similarIds);

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    const users = cached
      .map((r) => {
        const p = profileMap[r.similar_user_id];
        if (!p || p.privacy_show_activity === false) return null;
        const settings = p.user_settings || {};
        const displayName = (p.full_name || settings.display_name || '').trim() || 'Member';
        return {
          id: r.similar_user_id,
          display_name: displayName,
          avatar_url: settings.avatar_url || p.avatar_url || null,
          similarity_score: r.similarity_score,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ users });
  }

  const { data: myProfile } = await admin
    .from('user_interest_profiles')
    .select('ticker_scores')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!myProfile?.ticker_scores) {
    return NextResponse.json({ users: [] });
  }

  const myTickers = Object.keys(myProfile.ticker_scores);
  return NextResponse.json({ users: [], fallback: true, my_tickers: myTickers.length });
}
