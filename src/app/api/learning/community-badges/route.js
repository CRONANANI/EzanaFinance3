import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { buildLearningCommunityBadgeState } from '@/lib/learning-community-badges';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: rows, error } = await supabase
      .from('user_learning_badges')
      .select('badge_key, earned_at')
      .eq('user_id', user.id);

    if (error) {
      console.error('community-badges:', error);
      return NextResponse.json({ error: 'Failed to load badges' }, { status: 500 });
    }

    const state = buildLearningCommunityBadgeState(rows || []);
    return NextResponse.json(state);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
