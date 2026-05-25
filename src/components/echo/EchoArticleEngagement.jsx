'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useEchoEngagement } from '@/hooks/useEchoEngagement';

const SAVED_KEY = 'echo_saved_articles';

function formatRelativeTime(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(diff / 86400000);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function readSavedIds() {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function EchoArticleEngagement({ articleId, articleTitle, articleTracker }) {
  const { user } = useAuth();
  const {
    likeCount,
    userHasLiked,
    comments,
    commentCount,
    isLoading,
    isPosting,
    toggleLike,
    postComment,
    deleteComment,
  } = useEchoEngagement(articleId);

  const [draft, setDraft] = useState('');
  const [actionMessage, setActionMessage] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setIsSaved(readSavedIds().has(articleId));
  }, [articleId]);

  const handleSave = useCallback(() => {
    if (!user) {
      setActionMessage({ type: 'auth', text: 'Sign in to save articles' });
      return;
    }
    const ids = readSavedIds();
    if (ids.has(articleId)) {
      ids.delete(articleId);
      setIsSaved(false);
    } else {
      ids.add(articleId);
      setIsSaved(true);
      articleTracker?.recordSave?.();
    }
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify([...ids]));
    } catch {
      /* ignore */
    }
    setActionMessage(null);
  }, [user, articleId, articleTracker]);

  const handleShare = useCallback(async () => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/ezana-echo/${articleId}`
        : `/ezana-echo/${articleId}`;
    const title = articleTitle || 'Ezana Echo';
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, url });
        articleTracker?.recordShare?.('native');
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setActionMessage({ type: 'info', text: 'Link copied to clipboard' });
        articleTracker?.recordShare?.('link');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setActionMessage({ type: 'error', text: 'Could not share. Try copying the URL.' });
      }
    }
  }, [articleId, articleTitle, articleTracker]);

  const onLikeClick = async () => {
    if (!user) {
      setActionMessage({ type: 'auth', text: 'Sign in to like articles' });
      return;
    }
    setActionMessage(null);
    const result = await toggleLike();
    if (result.error && result.error !== 'auth') {
      setActionMessage({ type: 'error', text: 'Could not save your like. Try again.' });
    }
  };

  const onSubmitComment = async (e) => {
    e.preventDefault();
    if (!user) {
      setActionMessage({ type: 'auth', text: 'Sign in to comment' });
      return;
    }
    const result = await postComment(draft);
    if (result.ok) {
      setDraft('');
      setActionMessage(null);
    } else if (result.error === 'empty') {
      // Silent fail
    } else {
      setActionMessage({ type: 'error', text: 'Could not post comment. Try again.' });
    }
  };

  return (
    <div className="echo-engage-block">
      <div className="echo-engage-actions">
        <button
          type="button"
          className={`echo-engage-btn ${userHasLiked ? 'echo-engage-btn--liked' : ''}`}
          onClick={onLikeClick}
          disabled={isLoading}
          aria-label={userHasLiked ? 'Unlike this article' : 'Like this article'}
          aria-pressed={userHasLiked}
        >
          <i className={`bi ${userHasLiked ? 'bi-heart-fill' : 'bi-heart'}`} aria-hidden />
          <span>{likeCount}</span>
          <span className="echo-engage-btn-label">{likeCount === 1 ? 'Like' : 'Likes'}</span>
        </button>

        <button
          type="button"
          className={`echo-engage-btn ${isSaved ? 'echo-engage-btn--saved' : ''}`}
          onClick={handleSave}
          aria-label={isSaved ? 'Remove from saved' : 'Save article'}
          aria-pressed={isSaved}
        >
          <i className={`bi ${isSaved ? 'bi-bookmark-fill' : 'bi-bookmark'}`} aria-hidden />
          <span className="echo-engage-btn-label">{isSaved ? 'Saved' : 'Save'}</span>
        </button>

        <button
          type="button"
          className="echo-engage-btn"
          onClick={handleShare}
          aria-label="Share article"
        >
          <i className="bi bi-share" aria-hidden />
          <span className="echo-engage-btn-label">Share</span>
        </button>

        <button
          type="button"
          className="echo-engage-btn"
          onClick={() => {
            const el = document.getElementById('echo-comments-section');
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(() => {
              document.getElementById('echo-comment-textarea')?.focus();
            }, 400);
          }}
          aria-label="Jump to comments"
        >
          <i className="bi bi-chat-text" aria-hidden />
          <span>{commentCount}</span>
          <span className="echo-engage-btn-label">
            {commentCount === 1 ? 'Comment' : 'Comments'}
          </span>
        </button>
      </div>

      {actionMessage && (
        <div className={`echo-engage-message echo-engage-message--${actionMessage.type}`}>
          {actionMessage.text}
          {actionMessage.type === 'auth' && (
            <>
              {' '}
              <Link href={`/auth/signin?redirect=/ezana-echo/${articleId}`}>Sign in →</Link>
            </>
          )}
        </div>
      )}

      <section id="echo-comments-section" className="echo-comments">
        <h2 className="echo-comments-title">
          {commentCount === 0
            ? 'No comments yet'
            : `${commentCount} ${commentCount === 1 ? 'Comment' : 'Comments'}`}
        </h2>

        {user ? (
          <form className="echo-comment-form" onSubmit={onSubmitComment}>
            <div className="echo-comment-form-avatar" aria-hidden>
              {(user.email?.[0] || 'U').toUpperCase()}
            </div>
            <div className="echo-comment-form-body">
              <textarea
                id="echo-comment-textarea"
                className="echo-comment-textarea"
                placeholder="Share your thoughts on this article..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                maxLength={4000}
                disabled={isPosting}
              />
              <div className="echo-comment-form-actions">
                <span className="echo-comment-form-counter">
                  {draft.length > 3500 && `${4000 - draft.length} characters remaining`}
                </span>
                <button
                  type="submit"
                  className="echo-comment-submit"
                  disabled={!draft.trim() || isPosting}
                >
                  {isPosting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="echo-comment-signin">
            <Link href={`/auth/signin?redirect=/ezana-echo/${articleId}`}>
              Sign in to leave a comment →
            </Link>
          </div>
        )}

        {!isLoading && commentCount > 0 && (
          <ul className="echo-comment-list">
            {comments.map((c) => (
              <li key={c.id} className="echo-comment-item">
                <div className="echo-comment-avatar" aria-hidden>
                  {c.author?.avatarUrl || c.author?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.author.avatarUrl || c.author.avatar_url} alt="" />
                  ) : (
                    c.author?.initials || 'U'
                  )}
                </div>
                <div className="echo-comment-body">
                  <div className="echo-comment-meta">
                    <span className="echo-comment-author">{c.author?.name || 'User'}</span>
                    <span className="echo-comment-time">{formatRelativeTime(c.createdAt)}</span>
                    {user?.id === c.userId && (
                      <button
                        type="button"
                        className="echo-comment-delete"
                        onClick={() => {
                          if (
                            typeof window !== 'undefined' &&
                            window.confirm('Delete this comment?')
                          ) {
                            deleteComment(c.id);
                          }
                        }}
                        aria-label="Delete comment"
                      >
                        <i className="bi bi-trash" aria-hidden />
                      </button>
                    )}
                  </div>
                  <p className="echo-comment-text">{c.content}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default EchoArticleEngagement;
