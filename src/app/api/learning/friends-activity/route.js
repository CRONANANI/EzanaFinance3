import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient, getAdminClient } from '@/lib/supabase';
import { ALL_COURSES, TRACKS } from '@/lib/learning-curriculum';
import {
  buildProgressMap,
  computeTrackSummary,
  getOrderedCoursesForTrack,
  isCourseFullyCompleted,
} from '@/lib/learning-progress-logic';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async () => {
    try {
      const supabase = getUserClient();
      const supabaseAdmin = getAdminClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ friends: [], authenticated: false });
      }

      const { data: follows } = await supabaseAdmin
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .limit(50);

      const ids = (follows || []).map((f) => f.following_id);
      if (ids.length === 0) {
        return NextResponse.json({ friends: [], authenticated: true });
      }

      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, user_settings')
        .in('id', ids);

      const profileById = new Map((profiles || []).map((p) => [p.id, p]));

      const { data: progressRows } = await supabaseAdmin
        .from('user_course_progress')
        .select('*')
        .in('user_id', ids);

      const { data: badgeRows } = await supabaseAdmin
        .from('user_learning_badges')
        .select('user_id, badge_key')
        .in('user_id', ids);

      const progressByUser = {};
      for (const r of progressRows || []) {
        if (!progressByUser[r.user_id]) progressByUser[r.user_id] = [];
        progressByUser[r.user_id].push(r);
      }

      const badgesByUser = {};
      for (const b of badgeRows || []) {
        if (!badgesByUser[b.user_id]) badgesByUser[b.user_id] = [];
        badgesByUser[b.user_id].push(b.badge_key);
      }

      const trackById = Object.fromEntries(TRACKS.map((t) => [t.id, t]));
      const friends = [];

      for (const friendId of ids) {
        const progressById = buildProgressMap(progressByUser[friendId] || []);
        let currentCourse = null;
        outer: for (const track of TRACKS) {
          for (const course of getOrderedCoursesForTrack(track.id)) {
            const row = progressById[course.id];
            if (!row || row.status === 'in_progress' || !isCourseFullyCompleted(row)) {
              currentCourse = course;
              break outer;
            }
          }
        }

        const trackId = currentCourse?.track || 'stocks';
        const row = currentCourse ? progressById[currentCourse.id] : null;
        const trackSummary = computeTrackSummary(trackId, progressById);
        let displayPct = trackSummary.pct;
        if (row && row.status === 'in_progress' && !isCourseFullyCompleted(row)) {
          displayPct = Math.min(100, Math.max(0, row.progress_pct ?? displayPct));
        }

        const prof = profileById.get(friendId);
        const displayName = (prof?.full_name || 'Learner').trim();

        friends.push({
          userId: friendId,
          displayName,
          trackId,
          trackLabel: trackById[trackId]?.shortLabel ?? trackId,
          progressPct: displayPct,
          currentCourseTitle: currentCourse?.title ?? 'Exploring learning paths',
          badgeKeys: badgesByUser[friendId] || [],
        });
      }

      return NextResponse.json({ friends, authenticated: true });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ friends: [], authenticated: false, error: true }, { status: 500 });
    }
  },
  { requireAuth: false },
);
