import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user, context) => {
    try {
      const supabase = getUserClient();
      const { data: row } = await supabase
        .from('user_learning_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!row) {
        return NextResponse.json({
          current_streak: 0,
          longest_streak: 0,
          days_this_week: [false, false, false, false, false, false, false],
          last_activity_date: null,
        });
      }

      return NextResponse.json({
        current_streak: row.current_streak,
        longest_streak: row.longest_streak,
        days_this_week: row.days_this_week,
        last_activity_date: row.last_activity_date,
      });
    } catch (err) {
      console.error('[learning/streak]', err);
      return NextResponse.json({ error: 'Failed to fetch streak' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
