'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

async function echoFetch(url, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return fetch(url, { ...options, headers });
}

/**
 * Likes + comments for an Echo article (slug = articleId).
 */
export function useEchoEngagement(articleId, { initialLikeCount } = {}) {
  const { user } = useAuth();

  const [likeCount, setLikeCount] = useState(
    typeof initialLikeCount === 'number' ? initialLikeCount : 0,
  );
  const [userHasLiked, setUserHasLiked] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!articleId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      echoFetch(`/api/echo/engagement?articleId=${encodeURIComponent(articleId)}`).then((r) =>
        r.ok ? r.json() : { like_count: 0, comment_count: 0, user_has_liked: false },
      ),
      echoFetch(`/api/echo/comments?articleId=${encodeURIComponent(articleId)}`).then((r) =>
        r.ok ? r.json() : { comments: [] },
      ),
    ])
      .then(([eng, comm]) => {
        if (cancelled) return;
        const list = comm.comments || [];
        setLikeCount(eng.like_count ?? 0);
        setUserHasLiked(Boolean(eng.user_has_liked));
        setCommentCount(eng.comment_count ?? list.length);
        setComments(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [articleId, user?.id]);

  const toggleLike = useCallback(async () => {
    if (!user) return { error: 'auth' };

    const prevLiked = userHasLiked;
    const prevCount = likeCount;

    setUserHasLiked(!prevLiked);
    setLikeCount(prevCount + (prevLiked ? -1 : 1));

    try {
      const res = await echoFetch('/api/echo/like', {
        method: 'POST',
        body: JSON.stringify({ articleId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUserHasLiked(prevLiked);
        setLikeCount(prevCount);
        return { error: data?.error || 'request_failed' };
      }
      setLikeCount(data.like_count ?? prevCount);
      setUserHasLiked(Boolean(data.user_has_liked ?? data.liked));
      return { ok: true };
    } catch (err) {
      setUserHasLiked(prevLiked);
      setLikeCount(prevCount);
      return { error: err.message };
    }
  }, [user, userHasLiked, likeCount, articleId]);

  const postComment = useCallback(
    async (content) => {
      if (!user) return { error: 'auth' };
      const text = String(content || '').trim();
      if (!text) return { error: 'empty' };

      setIsPosting(true);
      try {
        const res = await echoFetch('/api/echo/comments', {
          method: 'POST',
          body: JSON.stringify({ articleId, content: text }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to post comment');
        }
        const { comment } = data;
        if (comment) {
          setComments((prev) => [...prev, comment]);
          setCommentCount((n) => n + 1);
        }
        return { ok: true };
      } catch (err) {
        return { error: err.message };
      } finally {
        setIsPosting(false);
      }
    },
    [user, articleId],
  );

  const deleteComment = useCallback(async (commentId) => {
    if (!user) return { error: 'auth' };

    const prevComments = comments;
    const prevCount = commentCount;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setCommentCount((n) => Math.max(0, n - 1));

    try {
      const res = await echoFetch(`/api/echo/comments/${commentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      return { ok: true };
    } catch (err) {
      setComments(prevComments);
      setCommentCount(prevCount);
      return { error: err.message };
    }
  }, [user, comments, commentCount]);

  return {
    likeCount,
    userHasLiked,
    comments,
    commentCount,
    isLoading,
    isPosting,
    error,
    toggleLike,
    postComment,
    deleteComment,
  };
}
