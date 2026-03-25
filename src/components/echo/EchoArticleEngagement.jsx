'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import '@/app/(dashboard)/community/community.css';

function formatRelativeTime(iso) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h || 1}h ago`;
  const d = Math.floor(diff / 86400000);
  return `${d}d ago`;
}

/**
 * Mirrors community post comment UI (comm-* classes) — wire to API later.
 */
export function EchoArticleEngagement({ articleId, initialLikes, seedComments = [] }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(true);
  const [comments, setComments] = useState(seedComments);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const onLike = () => {
    setLiked((v) => {
      setLikes((n) => (v ? n - 1 : n + 1));
      return !v;
    });
  };

  const submitComment = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !user) return;
    setPosting(true);
    const initials = user.email?.slice(0, 2).toUpperCase() || 'ME';
    setComments((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        author: { name: user.email?.split('@')[0] || 'You', initials, id: user.id },
        content: text,
        createdAt: new Date().toISOString(),
      },
    ]);
    setDraft('');
    setPosting(false);
  };

  return (
    <div className="echo-engage-block">
      <div className="comm-engage" style={{ marginBottom: '0.75rem' }}>
        <button type="button" className="comm-engage-btn" aria-label="Like" onClick={onLike}>
          <span aria-hidden>❤️</span> {likes}
        </button>
        <button type="button" className="comm-engage-btn" aria-label="Comments" onClick={() => setCommentsOpen((o) => !o)}>
          <span aria-hidden>💬</span> {comments.length}
        </button>
      </div>

      {commentsOpen && (
        <div className="comm-comment-thread" role="region" aria-label="Comments">
          <div className="comm-comment-thread-head">
            <span>Comments</span>
            <button type="button" className="comm-comment-collapse" onClick={() => setCommentsOpen(false)}>
              Collapse <i className="bi bi-chevron-up" aria-hidden />
            </button>
          </div>
          {comments.map((c) => (
            <div key={c.id} className="comm-comment-row">
              <div className="comm-avatar comm-avatar-sm" aria-hidden>
                {c.author.initials}
              </div>
              <div className="comm-comment-body">
                <div className="comm-comment-meta">
                  {c.author.id ? (
                    <Link href={`/community/profile/${c.author.id}`} className="comm-name-link">
                      {c.author.name}
                    </Link>
                  ) : (
                    <span className="comm-post-name">{c.author.name}</span>
                  )}
                  <span className="comm-post-time"> · {formatRelativeTime(c.createdAt)}</span>
                </div>
                <p className="comm-comment-text">{c.content}</p>
              </div>
            </div>
          ))}
          {user ? (
            <div className="comm-comment-compose">
              <input
                className="comm-compose-input"
                placeholder="Write a comment..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitComment(e);
                  }
                }}
              />
              <button type="button" className="comm-btn-sm" onClick={submitComment} disabled={posting || !draft.trim()}>
                {posting ? 'Posting…' : 'Post'}
              </button>
            </div>
          ) : (
            <p className="comm-empty" style={{ fontSize: '0.8125rem' }}>
              <Link href={`/auth/signin?redirect=/ezana-echo/${articleId}`}>Sign in</Link> to comment.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
