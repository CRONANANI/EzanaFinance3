'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';

/**
 * Manages all engagement state for an Ezana Echo article:
 *   - Like count + whether the current user has liked
 *   - Comment count + the comments themselves
 *   - Loading + error states for both
 *   - Optimistic updates: like button feels instant; reverts on error
 *
 * Designed to be the single source of truth for the article's engagement —
 * the component just renders what this returns.
 */
export function useEchoEngagement(articleId) {
  const { user } = useAuth();

  const [likeCount, setLikeCount] = useState(0);
  const [userHasLiked, setUserHasLiked] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState(null);

  // Initial load: fetch counts + comments in parallel
  useEffect(() => {
    if (!articleId) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/echo/engagement?article_id=${encodeURIComponent(articleId)}`).then((r) =>
        r.ok ? r.json() : { like_count: 0, comment_count: 0, user_has_liked: false }
      ),
      fetch(`/api/echo/comments?article_id=${encodeURIComponent(articleId)}`).then((r) =>
        r.ok ? r.json() : { comments: [] }
      ),
    ])
      .then(([eng, comm]) => {
        if (cancelled) return;
        const list = comm.comments || [];
        setLikeCount(eng.like_count || 0);
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

  // Toggle like — optimistic, with rollback on error
  const toggleLike = useCallback(async () => {
    if (!user) return { error: 'auth' };

    const prevLiked = userHasLiked;
    const prevCount = likeCount;

    setUserHasLiked(!prevLiked);
    setLikeCount(prevCount + (prevLiked ? -1 : 1));

    try {
      const res = await fetch('/api/echo/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: articleId,
          action: prevLiked ? 'unlike' : 'like',
        }),
      });
      if (!res.ok) throw new Error('Failed to update like');
      const data = await res.json();

      setLikeCount(data.like_count || 0);
      setUserHasLiked(Boolean(data.user_has_liked));
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
        const res = await fetch('/api/echo/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ article_id: articleId, content: text }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || 'Failed to post comment');
        }
        const { comment } = await res.json();
        setComments((prev) => [...prev, comment]);
        setCommentCount((n) => n + 1);
        return { ok: true };
      } catch (err) {
        return { error: err.message };
      } finally {
        setIsPosting(false);
      }
    },
    [user, articleId]
  );

  const deleteComment = useCallback(
    async (commentId) => {
      if (!user) return { error: 'auth' };

      const prevComments = comments;
      const prevCount = commentCount;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentCount((n) => Math.max(0, n - 1));

      try {
        const res = await fetch(`/api/echo/comments/${commentId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        return { ok: true };
      } catch (err) {
        setComments(prevComments);
        setCommentCount(prevCount);
        return { error: err.message };
      }
    },
    [user, comments, commentCount]
  );

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
