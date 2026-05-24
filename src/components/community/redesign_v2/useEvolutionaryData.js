'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { normalizePost } from './normalizePost';

const LENS_TO_TAB = {
  Signal: 'signal',
  Latest: 'recent',
  Friends: 'friends',
  Discussions: 'discussions',
  Legendary: 'legendary',
};

const SKILL_FILTER_PARAM = {
  All: '',
  'Apprentice+': '&skill_min=Apprentice',
  'Journeyman+': '&skill_min=Journeyman',
  'Master+': '&skill_min=Master',
  'Oracle only': '&skill_min=Oracle',
};

const DEFAULT_PULSE = {
  netSentiment: 0,
  postsLastHour: 0,
  activeInvestors: 0,
  discussionsCount: 0,
  hottest: null,
  sectors: [],
};

const DEFAULT_CONVICTION_MAP = { tickers: [] };

export function useEvolutionaryData({
  activeLens = 'Latest',
  skillFilter = 'All',
  activeTicker = null,
  hasUser = false,
} = {}) {
  const [posts, setPosts] = useState([]);
  const [pulse, setPulse] = useState(DEFAULT_PULSE);
  const [convictionMap, setConvictionMap] = useState(DEFAULT_CONVICTION_MAP);
  const [bullBear, setBullBear] = useState(null);
  const [legendaryTakes, setLegendaryTakes] = useState([]);
  const [narratives, setNarratives] = useState([]);
  const [events, setEvents] = useState([]);
  const [copyRequests, setCopyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const postsApiTab = LENS_TO_TAB[activeLens] || 'recent';
  const skillParam = SKILL_FILTER_PARAM[skillFilter] || '';

  const fetchConvictionsFor = useCallback(async (postList) => {
    if (!postList?.length) return postList;
    const ids = postList.map((p) => p.id).filter(Boolean);
    if (!ids.length) return postList;

    try {
      const res = await fetch(`/api/community/posts/conviction?postIds=${ids.join(',')}`);
      if (!res.ok) return postList;
      const { stats } = await res.json();
      return postList.map((p) => ({
        ...p,
        my_conviction: stats[p.id]?.my_conviction ?? null,
        avg_conviction: stats[p.id]?.avg_conviction ?? null,
        conviction_count: stats[p.id]?.conviction_count ?? 0,
      }));
    } catch {
      return postList;
    }
  }, []);

  const fetchPulse = useCallback(async () => {
    try {
      const res = await fetch('/api/community/pulse');
      if (!res.ok) return;
      const data = await res.json();
      setPulse({
        netSentiment: data.netSentiment ?? data.net_sentiment ?? 0,
        postsLastHour: data.postsLastHour ?? data.posts_last_hour ?? 0,
        activeInvestors: data.activeInvestors ?? data.active_investors ?? 0,
        discussionsCount: data.discussionsCount ?? data.discussions_count ?? 0,
        hottest: data.hottest ?? data.hottest_ticker ?? null,
        sectors: data.sectors ?? [],
      });
    } catch {
      /* keep previous pulse */
    }
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const postsUrl = `/api/community/posts?tab=${encodeURIComponent(postsApiTab)}${skillParam}`;
      const fetches = [
        fetch(postsUrl),
        fetch('/api/community/conviction-map'),
        fetch('/api/community/legendary-takes'),
        fetch('/api/community/narratives'),
        fetch('/api/community/events'),
      ];

      if (hasUser) {
        fetches.push(fetch('/api/community/copy-request'));
      }

      if (activeTicker) {
        fetches.push(fetch(`/api/community/bull-bear?ticker=${encodeURIComponent(activeTicker)}`));
      }

      const results = await Promise.all(fetches);
      let idx = 0;
      const postsRes = results[idx++];
      const mapRes = results[idx++];
      const legendaryRes = results[idx++];
      const narrativesRes = results[idx++];
      const eventsRes = results[idx++];

      let copyRes = null;
      if (hasUser) {
        copyRes = results[idx++];
      }
      let bullBearRes = null;
      if (activeTicker) {
        bullBearRes = results[idx++];
      }

      const postsData = postsRes.ok ? await postsRes.json() : { posts: [] };
      const mapData = mapRes.ok ? await mapRes.json() : DEFAULT_CONVICTION_MAP;
      const legendaryData = legendaryRes.ok ? await legendaryRes.json() : { takes: [] };
      const narrativesData = narrativesRes.ok ? await narrativesRes.json() : { narratives: [] };
      const eventsData = eventsRes.ok ? await eventsRes.json() : { events: [] };

      let rawPosts = postsData.posts || [];
      if (activeLens === 'Discussions') {
        rawPosts = rawPosts.filter((p) => normalizePost(p).isDiscussion);
      }

      const withConvictions = await fetchConvictionsFor(rawPosts);
      setPosts(withConvictions.map(normalizePost));
      setConvictionMap({
        tickers: mapData.tickers || mapData.items || [],
      });
      setLegendaryTakes(legendaryData.takes || legendaryData.items || []);
      setNarratives(narrativesData.narratives || narrativesData.items || []);
      setEvents(eventsData.events || eventsData.items || []);

      if (copyRes?.ok) {
        const copyData = await copyRes.json();
        setCopyRequests((copyData.incoming || []).filter((r) => r.status === 'pending'));
      } else if (!hasUser) {
        setCopyRequests([]);
      }

      if (bullBearRes) {
        if (bullBearRes.ok) {
          const bb = await bullBearRes.json();
          setBullBear(bb);
        } else {
          setBullBear(null);
        }
      } else {
        setBullBear(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load community data');
    } finally {
      setLoading(false);
    }
  }, [activeLens, activeTicker, fetchConvictionsFor, hasUser, postsApiTab, skillParam]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    fetchPulse();
    const id = setInterval(fetchPulse, 30000);
    return () => clearInterval(id);
  }, [fetchPulse]);

  const updatePostConviction = useCallback(
    (postId, { myConviction, avgConviction, convictionCount }) => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                my_conviction: myConviction,
                avg_conviction: avgConviction,
                conviction_count: convictionCount,
              }
            : p,
        ),
      );
    },
    [],
  );

  const removePost = useCallback((postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const convictionTickers = useMemo(
    () => (convictionMap.tickers || []).slice(0, 6),
    [convictionMap.tickers],
  );

  return {
    posts,
    pulse,
    convictionTickers,
    bullBear,
    legendaryTakes,
    narratives,
    events,
    copyRequests,
    loading,
    error,
    updatePostConviction,
    removePost,
    refetch,
    setEvents,
    setCopyRequests,
  };
}
