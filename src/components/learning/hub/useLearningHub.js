'use client';

/**
 * Data for the Learning Center hub (Nov 2026). Every request reads the
 * signed-in user's own rows; nothing here is sample data.
 *   /api/learning/courses       catalogue + progress + badges + viewer
 *   /api/learning/rating        LearningELO, history, network position
 *   /api/learning/quests/daily  today's quest (server-evaluated)
 *   /api/learning/streak        current and best streak
 *   /api/learning/bookmarks     saved courses
 *   /api/profile/main-track     the track the quest and resume follow
 */
import { useCallback, useEffect, useState } from 'react';

const getJson = (url) =>
  fetch(url, { credentials: 'include' })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

export function useLearningHub() {
  const [state, setState] = useState({
    status: 'loading',
    courses: null,
    rating: null,
    quest: null,
    streak: null,
    bookmarks: [],
    mainTrack: null,
  });

  const load = useCallback(async () => {
    const [courses, rating, quest, streak, bookmarks, main] = await Promise.all([
      getJson('/api/learning/courses'),
      getJson('/api/learning/rating'),
      getJson('/api/learning/quests/daily'),
      getJson('/api/learning/streak'),
      getJson('/api/learning/bookmarks'),
      getJson('/api/profile/main-track'),
    ]);
    setState({
      status: courses ? 'ready' : 'error',
      courses,
      rating,
      quest,
      streak,
      bookmarks: bookmarks?.bookmarks || [],
      mainTrack: main?.main_track || null,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* Refresh the quest when the tab comes back: a lesson finished in another
     tab may have completed a task. */
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      Promise.all([getJson('/api/learning/quests/daily'), getJson('/api/learning/rating')]).then(
        ([quest, rating]) =>
          setState((s) => ({ ...s, quest: quest || s.quest, rating: rating || s.rating })),
      );
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const setMainTrack = useCallback(async (track) => {
    setState((s) => ({ ...s, mainTrack: track }));
    await fetch('/api/profile/main-track', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track }),
    }).catch(() => {});
  }, []);

  /** Optimistic; rolls back if the server refuses. */
  const toggleBookmark = useCallback(async (courseId, on) => {
    const apply = (add) =>
      setState((s) => ({
        ...s,
        bookmarks: add
          ? [...s.bookmarks.filter((b) => b.course_id !== courseId), { course_id: courseId }]
          : s.bookmarks.filter((b) => b.course_id !== courseId),
      }));
    apply(on);
    const r = await fetch('/api/learning/bookmarks', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, action: on ? 'add' : 'remove' }),
    }).catch(() => null);
    if (!r?.ok) {
      apply(!on);
      return false;
    }
    return true;
  }, []);

  return { ...state, reload: load, setMainTrack, toggleBookmark };
}
