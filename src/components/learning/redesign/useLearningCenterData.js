'use client';

import { useEffect, useState, useCallback } from 'react';

export function useLearningCenterData() {
  const [data, setData] = useState({
    courses: null,
    streak: null,
    quests: null,
    leaderboard: null,
    bookmarks: [],
    mainTrack: 'stocks',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('weekly');

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetch('/api/learning/courses').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/learning/streak').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/learning/quests/daily').then((r) => (r.ok ? r.json() : null)),
      fetch(
        `/api/learning/leaderboard?scope=friends&period=${encodeURIComponent(leaderboardPeriod)}`,
      ).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/learning/bookmarks').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/profile/main-track').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([courses, streak, quests, leaderboard, bookmarks, mainTrack]) => {
        if (cancelled) return;
        setData({
          courses,
          streak,
          quests,
          leaderboard,
          bookmarks: bookmarks?.bookmarks || [],
          mainTrack: mainTrack?.main_track || 'stocks',
        });
        setError(courses ? null : 'Unable to load learning data');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey, leaderboardPeriod]);

  const setMainTrack = useCallback(async (track) => {
    setData((d) => ({ ...d, mainTrack: track }));
    await fetch('/api/profile/main-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track }),
    });
  }, []);

  const toggleBookmark = useCallback(
    async (courseId) => {
      const isBookmarked = data.bookmarks.some((b) => b.course_id === courseId);
      const action = isBookmarked ? 'remove' : 'add';
      setData((d) => ({
        ...d,
        bookmarks: isBookmarked
          ? d.bookmarks.filter((b) => b.course_id !== courseId)
          : [...d.bookmarks, { course_id: courseId }],
      }));
      await fetch('/api/learning/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, action }),
      });
      refetch();
    },
    [data.bookmarks, refetch],
  );

  return {
    data,
    loading,
    error,
    refetch,
    setMainTrack,
    toggleBookmark,
    leaderboardPeriod,
    setLeaderboardPeriod,
  };
}
