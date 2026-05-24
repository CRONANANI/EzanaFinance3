'use client';

import { useEffect, useState, useCallback } from 'react';
import { normalizePost } from './normalizePost';

function tabToApiParam(feedTab, feedSort, hasUser) {
  if (feedTab === 'Friends') return 'friends';
  if (feedTab === 'Following') return 'following';
  if (feedTab === 'Discussions') {
    return feedSort === 'Popular' ? 'trending' : 'recent';
  }
  if (feedTab === 'Feed') {
    if (feedSort === 'Popular') return 'trending';
    if (feedSort === 'Following' && hasUser) return 'following';
    return 'recent';
  }
  return 'recent';
}

/**
 * Centralized data fetching for the redesigned community page.
 */
export function useCommunityData({ feedTab = 'Feed', feedSort = 'Latest', hasUser = false } = {}) {
  const [posts, setPosts] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [trendingDiscussions, setTrendingDiscussions] = useState([]);
  const [friendsActivity, setFriendsActivity] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const apiTab = tabToApiParam(feedTab, feedSort, hasUser);

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

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const skipPosts = feedTab === 'Badges';
      const [postsRes, topicsRes, discRes, friendsRes, leaderRes] = await Promise.all([
        skipPosts
          ? Promise.resolve({ ok: true, json: async () => ({ posts: [] }) })
          : fetch(`/api/community/posts?tab=${encodeURIComponent(apiTab)}`),
        fetch('/api/community/trending-topics'),
        fetch('/api/community/trending-discussions'),
        fetch('/api/community/friends-activity'),
        fetch('/api/community/leaderboard'),
      ]);

      const [postsData, topicsData, discData, friendsData, leaderData] = await Promise.all([
        postsRes.ok ? postsRes.json() : { posts: [] },
        topicsRes.ok ? topicsRes.json() : { topics: [] },
        discRes.ok ? discRes.json() : { discussions: [] },
        friendsRes.ok ? friendsRes.json() : { activity: [] },
        leaderRes.ok ? leaderRes.json() : { rankings: [] },
      ]);

      let rawPosts = postsData.posts || [];
      if (feedTab === 'Discussions') {
        rawPosts = rawPosts.filter((p) => {
          const normalized = normalizePost(p);
          return normalized.isDiscussion;
        });
      }

      const withConvictions = await fetchConvictionsFor(rawPosts);
      setPosts(withConvictions.map(normalizePost));
      setTrendingTopics(topicsData.topics || []);
      setTrendingDiscussions(discData.discussions || []);
      setFriendsActivity(friendsData.activity || []);
      setSuggestedUsers(leaderData.rankings || leaderData.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiTab, feedTab, fetchConvictionsFor]);

  useEffect(() => {
    refetch();
  }, [refetch]);

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

  return {
    posts,
    trendingTopics,
    trendingDiscussions,
    friendsActivity,
    suggestedUsers,
    loading,
    error,
    updatePostConviction,
    refetch,
  };
}
