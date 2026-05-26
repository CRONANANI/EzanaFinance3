'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { SaveAuthPrompt } from '@/components/echo/EchoSaveButton';

function formatCommentDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function EchoFooterComments({ articleId }) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const textareaRef = useRef(null);

  const redirectParam = encodeURIComponent(pathname || `/ezana-echo/${articleId}`);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/echo/comments?articleId=${encodeURIComponent(articleId)}`, {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setComments(data.comments || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(80, textareaRef.current.scrollHeight)}px`;
    }
  }, [body]);

  const handleSubmit = async () => {
    if (!body.trim()) return;
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/echo/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ articleId, content: body.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        const next = data.comment || data;
        setComments((prev) => [...prev, next]);
        setBody('');
      }
    } catch {
      /* ignore */
    }
    setSubmitting(false);
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const userLabel = isAuthenticated
    ? user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You'
    : 'Guest';

  return (
    <section className="echo-footer-comments">
      <h3 className="echo-comments-heading">Comments</h3>
      {comments.length === 0 ? (
        <p className="echo-comments-subhead">
          No one&apos;s written in yet. The first thought is always the loudest.
        </p>
      ) : (
        <p className="echo-comments-subhead">
          {comments.length} {comments.length === 1 ? 'reader has' : 'readers have'} weighed in.
        </p>
      )}

      <div className="echo-comments-composer">
        <textarea
          ref={textareaRef}
          className="echo-comments-textarea"
          placeholder="Write a thoughtful response…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
        />
        <div className="echo-comments-composer-footer">
          <div className="echo-comments-composer-meta">
            Posting as <b>{userLabel}</b> · Markdown supported
          </div>
          <button
            type="button"
            className="echo-comments-post-btn"
            onClick={handleSubmit}
            disabled={!body.trim() || submitting}
          >
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>

      {comments.length > 0 && (
        <div className="echo-comments-list">
          {comments.map((c) => (
            <div key={c.id} className="echo-comments-item">
              <div className="echo-comments-item-meta">
                <b>{c.author?.name || 'Reader'}</b>
                {c.createdAt && ` · ${formatCommentDate(c.createdAt)}`}
              </div>
              <div className="echo-comments-item-body">{c.content}</div>
            </div>
          ))}
        </div>
      )}

      {showAuthPrompt && (
        <SaveAuthPrompt
          icon="bi-chat-text"
          headline="Sign in to comment"
          body="Create a free account to share your thoughts on this article and join the discussion with other readers."
          onClose={() => setShowAuthPrompt(false)}
          onSignUp={() => router.push(`/auth/signup?redirect=${redirectParam}`)}
          onSignIn={() => router.push(`/auth/signin?redirect=${redirectParam}`)}
        />
      )}
    </section>
  );
}
