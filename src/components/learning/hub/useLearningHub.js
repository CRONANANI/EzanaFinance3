'use client';

/**
 * Data for the Learning Center hub (Nov 2026 redesign). Every request reads
 * the signed-in user's own rows:
 *   /api/learning/courses       catalogue + progress + badges + viewer
 *   /api/learning/rating        LearningELO, history, network position
 *   /api/learning/quests/daily  today's quest (server-evaluated)
 *   /api/learning/streak        current and best streak, active days this week
 *   /api/learning/bookmarks     saved courses
 *   /api/profile/main-track     the track the quest and resume follow
 *
 * Each resource loads, fails and retries on its own, so one failure shows an
 * inline error with Retry in its section and never reads as "no progress".
 *
 *   /api/learning/sample        sample content, master admin and demo
 *                               accounts only (null for every member)
 * While sample content is showing, saves and the track choice stay local
 * and nothing is sent to the server.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const URLS = {
  courses: '/api/learning/courses',
  rating: '/api/learning/rating',
  quest: '/api/learning/quests/daily',
  streak: '/api/learning/streak',
  bookmarks: '/api/learning/bookmarks',
  main: '/api/profile/main-track',
};
const KEYS = Object.keys(URLS);
const SAMPLE_PREF = 'ezana.learning.sample';

async function getJson(url) {
  const r = await fetch(url, { credentials: 'include' });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.json();
}

const loading = { status: 'loading', data: null };

export function useLearningHub() {
  const [res, setRes] = useState(() => Object.fromEntries(KEYS.map((k) => [k, loading])));
  /* undefined while unknown, null for members, the bundle for demo viewers. */
  const [sample, setSample] = useState(undefined);
  const [sampleOff, setSampleOff] = useState(false);
  const [local, setLocal] = useState(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const loadOne = useCallback(async (key, { quiet = false } = {}) => {
    if (!quiet) setRes((s) => ({ ...s, [key]: { status: 'loading', data: s[key].data } }));
    try {
      const data = await getJson(URLS[key]);
      if (alive.current) setRes((s) => ({ ...s, [key]: { status: 'ready', data } }));
    } catch {
      /* A quiet refresh keeps what is on screen. */
      if (alive.current && !quiet)
        setRes((s) => ({ ...s, [key]: { status: 'error', data: null } }));
    }
  }, []);

  useEffect(() => {
    KEYS.forEach((k) => loadOne(k));
    try {
      setSampleOff(window.localStorage.getItem(SAMPLE_PREF) === 'off');
    } catch {
      /* Storage can be blocked; the default (sample on) stands. */
    }
    getJson('/api/learning/sample')
      .then((j) => alive.current && setSample(j?.sample || null))
      .catch(() => alive.current && setSample(null));
  }, [loadOne]);

  const sampleOn = !!sample && !sampleOff;

  /* Refresh the quest and rating when the tab comes back: a lesson finished
     in another tab may have completed a task. */
  useEffect(() => {
    if (sampleOn) return undefined;
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      loadOne('quest', { quiet: true });
      loadOne('rating', { quiet: true });
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [loadOne, sampleOn]);

  /* Sample content: local copies of the two things the member can change. */
  useEffect(() => {
    setLocal(sample ? { bookmarks: sample.bookmarks, mainTrack: sample.mainTrack } : null);
  }, [sample]);

  const setSampleShown = useCallback((on) => {
    setSampleOff(!on);
    try {
      window.localStorage.setItem(SAMPLE_PREF, on ? 'on' : 'off');
    } catch {
      /* Not remembered when storage is blocked. */
    }
  }, []);

  const setMainTrack = useCallback(
    async (track) => {
      if (sampleOn) {
        setLocal((l) => (l ? { ...l, mainTrack: track } : l));
        return;
      }
      setRes((s) => ({ ...s, main: { status: 'ready', data: { main_track: track } } }));
      await fetch(URLS.main, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track }),
      }).catch(() => {});
    },
    [sampleOn],
  );

  /** Optimistic; rolls back if the server refuses. Local only on sample content. */
  const toggleBookmark = useCallback(
    async (courseId, on) => {
      const edit = (list, add) =>
        add
          ? [{ course_id: courseId }, ...list.filter((b) => b.course_id !== courseId)]
          : list.filter((b) => b.course_id !== courseId);
      if (sampleOn) {
        setLocal((l) => (l ? { ...l, bookmarks: edit(l.bookmarks, on) } : l));
        return true;
      }
      const apply = (add) =>
        setRes((s) => ({
          ...s,
          bookmarks: {
            status: 'ready',
            data: { bookmarks: edit(s.bookmarks.data?.bookmarks || [], add) },
          },
        }));
      apply(on);
      const r = await fetch(URLS.bookmarks, {
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
    },
    [sampleOn],
  );

  return useMemo(() => {
    const ready = (data) => ({ status: 'ready', data });
    /* Until we know whether sample content applies, everything is loading,
       so a demo viewer never sees their empty account flash first. */
    const view =
      sample === undefined
        ? Object.fromEntries(KEYS.map((k) => [k, loading]))
        : sampleOn
          ? {
              courses: ready(sample.courses),
              rating: ready(sample.rating),
              quest: ready(sample.quest),
              streak: ready(sample.streak),
              bookmarks: ready({ bookmarks: local?.bookmarks || sample.bookmarks }),
              main: ready({ main_track: local?.mainTrack || sample.mainTrack }),
            }
          : res;
    return {
      courses: view.courses,
      rating: view.rating,
      quest: view.quest,
      streak: view.streak,
      bookmarks: view.bookmarks.data?.bookmarks || [],
      bookmarksStatus: view.bookmarks.status,
      mainTrack: view.main.data?.main_track || null,
      sampleAvailable: !!sample,
      sampleKnown: sample !== undefined,
      sampleOn,
      setSampleShown,
      retry: loadOne,
      setMainTrack,
      toggleBookmark,
    };
  }, [res, sample, sampleOn, local, setSampleShown, loadOne, setMainTrack, toggleBookmark]);
}
