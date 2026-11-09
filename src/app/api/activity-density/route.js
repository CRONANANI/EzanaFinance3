import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import {
  activityWindow,
  clampWindow,
  fetchActivityBreakdown,
  fetchActivityDays,
  fetchActivityPercentiles,
  resolveActivitySubject,
  summarizeActivity,
} from '@/lib/activity-summary';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/activity-density?days=371[&userId=<uuid>][&include=breakdown]
 *
 * A member's activity for the home activity card and the profile Activity
 * section: one entry per UTC day they logged in or did something,
 * `{ date, actions, login }`, plus `end` (today, UTC). Days with neither are
 * omitted; the card fills them in as empty.
 *
 * Also returns:
 *   percentiles  where each of the four card stats sits on the platform
 *                (0 to 100, null = not ranked yet), or null until the daily
 *                distribution exists. See src/lib/activity-summary.js.
 *   profileSlug  the member's profile path segment (username, else id), so
 *                each home stat can link to /profile/<slug>#activity-...
 *   isOwn        whether the viewer is looking at their own activity.
 *   breakdown    with include=breakdown: actions by source.
 *
 * userId: another member's activity, only when their privacy_show_activity
 * is not off (403 activity_private otherwise).
 *
 * Source: public.user_activity_days. Until that migration is applied the
 * route falls back to login days only (`partial: true`).
 */
export const GET = withApiGuard(
  async (request, user) => {
    const { searchParams } = new URL(request.url);
    const days = clampWindow(searchParams.get('days'));
    const include = new Set((searchParams.get('include') || '').split(',').filter(Boolean));
    const { end, since } = activityWindow(days);
    const headers = { 'Cache-Control': 'private, no-store' };

    try {
      const admin = getAdminClient();
      const subject = await resolveActivitySubject(admin, user.id, searchParams.get('userId'));
      if (!subject.ok) {
        return NextResponse.json({ error: subject.error }, { status: subject.status, headers });
      }

      const activity = await fetchActivityDays(admin, subject.userId, since);
      const stats = summarizeActivity(activity.days, end);

      const [percentiles, breakdown] = await Promise.all([
        fetchActivityPercentiles(admin, stats).catch((err) => {
          console.error('[activity-density percentiles]', err?.message || err);
          return null;
        }),
        include.has('breakdown')
          ? fetchActivityBreakdown(admin, subject.userId, since).catch((err) => {
              console.error('[activity-density breakdown]', err?.message || err);
              return [];
            })
          : Promise.resolve(undefined),
      ]);

      const body = {
        end,
        days: activity.days,
        percentiles,
        profileSlug: subject.slug,
        isOwn: subject.isOwn,
      };
      if (activity.partial) body.partial = true;
      if (breakdown !== undefined) body.breakdown = breakdown;
      return NextResponse.json(body, { headers });
    } catch (err) {
      console.error('[activity-density GET]', err?.message || err);
      return NextResponse.json({ error: 'activity_unavailable' }, { status: 500, headers });
    }
  },
  { requireAuth: true },
);
