import { TRACKS, getCourseById, getLevelLabel } from '@/lib/learning-curriculum';
import { getOrderedCoursesForTrack, isCourseFullyCompleted } from '@/lib/learning-progress-logic';

export function deriveEloHero(data, effectiveTrack, currentTierLevel) {
  const leaderboard = data.leaderboard || {};
  const me = (leaderboard.rankings || []).find((r) => r.is_me) || {};
  const elo = me.total_elo ?? me.elo ?? 0;
  const weekDelta = me.delta ?? me.weekly_delta ?? 0;
  const trackLabel = TRACKS.find((t) => t.id === effectiveTrack)?.label || 'Stocks & Investing';

  let eloHistory = me.history;
  if (!eloHistory || eloHistory.length < 2) {
    const n = 18;
    eloHistory = Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      const noise = Math.sin(i * 1.7) * (elo * 0.04);
      return Math.max(0, Math.round(elo * (0.3 + t * 0.7) + noise));
    });
    eloHistory[n - 1] = elo;
  }

  const rankPct = me.position_pct != null ? Math.round(me.position_pct) : null;
  const rank = rankPct != null ? `Top ${rankPct}%` : me.rank ? `#${me.rank}` : '—';
  const rankScope = 'in your network';

  return {
    elo,
    weekDelta,
    trackLabel,
    currentTierLevel,
    rank,
    rankScope,
    eloHistory,
  };
}

function getNextBadgeLabel(trackData) {
  if (!trackData?.summary?.levels) return 'Bronze';
  const order = ['basic', 'intermediate', 'advanced', 'expert'];
  const labels = { basic: 'Bronze', intermediate: 'Silver', advanced: 'Gold', expert: 'Platinum' };
  for (const lv of order) {
    const l = trackData.summary.levels[lv];
    if (!l) return labels[lv];
    if ((l.completed || 0) < (l.total || 0)) return labels[lv];
  }
  return 'Platinum';
}

export function deriveStats(data, effectiveTrack, computeNextBadgeRemaining) {
  const courses = data.courses || {};
  const overall = courses.overall || {};
  const tracks = courses.tracks || [];
  const mainTrackData = tracks.find((t) => t.id === effectiveTrack);
  const completed = (courses.progress || []).filter(
    (r) => r.status === 'completed' && r.quiz_passed,
  ).length;

  return {
    coursesDone: overall.completed ?? completed,
    coursesTotal: overall.total ?? 120,
    hoursThisWeek: null,
    quizzesPassed: completed,
    quizzesTotal: overall.total ?? 120,
    nextBadge: getNextBadgeLabel(mainTrackData),
    nextBadgeTrack: TRACKS.find((t) => t.id === effectiveTrack)?.shortLabel || 'Stocks',
    coursesToNext: computeNextBadgeRemaining(effectiveTrack),
  };
}

export function deriveDailyQuest(data) {
  const q = data.quests || {};
  let primary = null;

  if (q.primary?.course_id) {
    const course = getCourseById(q.primary.course_id);
    if (course) {
      primary = {
        name: course.title,
        track: TRACKS.find((t) => t.id === course.track)?.shortLabel || 'Stocks',
        level: getLevelLabel(course.level),
        durationMinutes: course.duration_minutes || 10,
        courseId: course.id,
      };
    }
  }

  const bonus = (q.bonus || []).map((b, i) => ({
    id: b.id || `b${i}`,
    text: b.label || b.text || b.title,
    elo: b.reward_elo || b.elo || b.reward || 0,
    done: b.done,
  }));

  return { primary, bonus };
}

export function deriveSessionMetrics(data) {
  const streak = data.streak || {};
  const days = streak.days_this_week || [];
  const daysThisWeek = Array.from({ length: 7 }, (_, i) => !!days[i]);
  const courses = data.courses || {};
  const activeTracks = (courses.tracks || []).filter((t) => (t.summary?.pct || 0) > 0).length;
  const totalTracks = (courses.tracks || []).length;

  return {
    streak: { current: streak.current_streak || 0, daysThisWeek },
    rows: [
      {
        label: 'Best streak',
        value: `${streak.longest_streak || streak.current_streak || 0}d`,
      },
      {
        label: 'Current streak',
        value: `${streak.current_streak || 0}d`,
        color: streak.current_streak > 0 ? 'green' : 'dim',
      },
      {
        label: 'Lessons today',
        value: '—',
        color: 'dim',
      },
      {
        label: 'Time studied today',
        value: '—',
        color: 'dim',
      },
      {
        label: 'Active tracks',
        value: `${activeTracks} / ${totalTracks}`,
      },
      {
        label: 'Badges earned',
        value: `${(courses.badges || []).length}`,
        color: 'bronze',
      },
    ],
  };
}

export function deriveUpNext(data, effectiveTrack, progressById) {
  const tracks = data.courses?.tracks || [];
  const lessons = [];

  const mainOrdered = getOrderedCoursesForTrack(effectiveTrack)
    .filter((c) => !isCourseFullyCompleted(progressById[c.id]))
    .slice(0, 3);

  for (const c of mainOrdered) {
    lessons.push({
      id: c.id,
      name: c.title,
      track: TRACKS.find((t) => t.id === effectiveTrack)?.label || 'Stocks & Investing',
      level: getLevelLabel(c.level),
      minutes: c.duration_minutes || 12,
      elo: (c.duration_minutes || 12) * 2,
    });
  }

  for (const t of tracks) {
    if (t.id === effectiveTrack) continue;
    const ordered = getOrderedCoursesForTrack(t.id).filter(
      (c) => !isCourseFullyCompleted(progressById[c.id]),
    );
    if (ordered.length === 0) continue;
    const c = ordered[0];
    lessons.push({
      id: c.id,
      name: c.title,
      track: TRACKS.find((tr) => tr.id === t.id)?.label || t.name,
      level: getLevelLabel(c.level),
      minutes: c.duration_minutes || 14,
      elo: (c.duration_minutes || 14) * 2,
    });
    if (lessons.length >= 5) break;
  }

  return lessons.slice(0, 5);
}
