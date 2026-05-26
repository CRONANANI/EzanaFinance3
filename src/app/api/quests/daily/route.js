import { NextResponse } from 'next/server';
import { getUserClient } from '@/lib/supabase';
import { formatRefreshesIn, mapBonusQuestsToRedesign } from '@/lib/leaderboard-elo-enrich';

export const dynamic = 'force-dynamic';

const FALLBACK_QUESTS = [
  {
    id: 'q1',
    category: 'LEARN',
    title: 'Complete 3 lessons from any course',
    xp: 25,
    progress: { current: 0, target: 3 },
    done: false,
  },
  {
    id: 'q2',
    category: 'TRADE',
    title: 'Beat the S&P on 3 paper trades',
    xp: 40,
    progress: { current: 0, target: 3 },
    done: false,
  },
  {
    id: 'q3',
    category: 'ENGAGE',
    title: 'Comment on 2 research posts',
    xp: 15,
    progress: { current: 0, target: 2 },
    done: false,
  },
  {
    id: 'q4',
    category: 'PICK',
    title: 'Add 5 stocks to a watchlist',
    xp: 20,
    progress: { current: 0, target: 5 },
    done: false,
  },
];

/**
 * GET /api/quests/daily — daily quests in leaderboard redesign shape.
 * Delegates to user_daily_quests when available.
 */
export async function GET() {
  try {
    const supabase = getUserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const refreshesAt = new Date();
      refreshesAt.setUTCHours(24, 0, 0, 0);
      return NextResponse.json({
        quests: FALLBACK_QUESTS,
        refreshesAt: refreshesAt.toISOString(),
        refreshesIn: formatRefreshesIn(refreshesAt.toISOString()),
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from('user_daily_quests')
      .select('bonus_quests')
      .eq('user_id', user.id)
      .eq('quest_date', today)
      .maybeSingle();

    const bonus = existing?.bonus_quests;
    const quests = bonus && bonus.length > 0 ? mapBonusQuestsToRedesign(bonus) : FALLBACK_QUESTS;

    const refreshesAt = new Date();
    refreshesAt.setUTCHours(24, 0, 0, 0);

    return NextResponse.json({
      quests,
      refreshesAt: refreshesAt.toISOString(),
      refreshesIn: formatRefreshesIn(refreshesAt.toISOString()),
    });
  } catch (err) {
    console.error('[quests/daily]', err);
    return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 });
  }
}
