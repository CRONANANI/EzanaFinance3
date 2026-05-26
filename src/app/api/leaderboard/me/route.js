import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import { tierForRating } from '@/lib/elo-tier-colors';
import {
  computeDeltasAndSparkline,
  humanizeLastActive,
  initialsFromName,
  profileTitle,
} from '@/lib/leaderboard-elo-enrich';

export const dynamic = 'force-dynamic';

const TIER_KEYS = ['novice', 'apprentice', 'strategist', 'tactician', 'master', 'grandmaster'];

export async function GET(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = getAdminClient();

  const { data: eloRow } = await supabase
    .from('user_elo')
    .select('current_rating, peak_rating, tier, last_activity_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!eloRow) {
    return NextResponse.json({ error: 'No ELO record' }, { status: 404 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: higherCount }, { data: profile }, { data: txs }, { data: streakRow }] =
    await Promise.all([
      supabase
        .from('user_elo')
        .select('user_id', { count: 'exact', head: true })
        .gt('current_rating', eloRow.current_rating),
      supabase
        .from('profiles')
        .select('full_name, username, user_settings, avatar_url')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('elo_transactions')
        .select('user_id, delta, created_at, rating_after')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: true }),
      supabase
        .from('user_learning_streaks')
        .select('current_streak')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

  const globalRank = (higherCount ?? 0) + 1;
  const displayName = (profile?.full_name || profile?.username || 'Member').trim();
  const { delta7d, delta30d, sparkline } = computeDeltasAndSparkline(
    txs || [],
    eloRow.current_rating,
  );

  const currentTier = tierForRating(eloRow.current_rating);
  const currentIdx = TIER_KEYS.indexOf(currentTier.key);
  const nextTier =
    currentIdx >= 0 && currentIdx < TIER_KEYS.length - 1 ? TIER_KEYS[currentIdx + 1] : null;
  let progressToNext = 1;
  if (nextTier) {
    const span = currentTier.max - currentTier.min + 1;
    const within = eloRow.current_rating - currentTier.min;
    progressToNext = Math.max(0, Math.min(1, within / span));
  }

  return NextResponse.json({
    id: user.id,
    username: profile?.username,
    rank: globalRank,
    globalRank,
    name: displayName,
    initials: initialsFromName(displayName),
    title: profileTitle(profile),
    tier: eloRow.tier,
    rating: eloRow.current_rating,
    peak: eloRow.peak_rating,
    delta7d,
    delta30d,
    sparkline,
    active: humanizeLastActive(eloRow.last_activity_at),
    nextTier,
    progressToNext,
    streakDays: streakRow?.current_streak ?? 0,
  });
}
