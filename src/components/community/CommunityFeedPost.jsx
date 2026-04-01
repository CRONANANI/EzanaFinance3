'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatRelativeTime, getInitials } from '@/lib/community-utils';
import { useAuth } from '@/components/AuthProvider';

function mapProfileToAuthor(prof) {
  if (!prof) return { id: null, username: '', name: 'Member', initials: '?' };
  const s = prof.user_settings || {};
  const name = (s.display_name || '').trim() || 'Member';
  return { id: prof.id, username: prof.username || '', name, initials: getInitials(name) };
}

export function CommunityFeedPost({
  post,
  expanded,
  onToggle,
  onLike,
  onSave,
  quote,
  onCommentPosted,
}) {
  const router = useRouter();
  const { user } = useAuth();
  const previewLen = 120;
  const text = post.text || '';
  const long = text.length > previewLen;
  const shown = expanded || !long ? text : `${text.slice(0, previewLen).trim()}…`;

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('community_posts')
        .select('id, content, created_at, user_id')
        .eq('parent_post_id', post.id)
        .order('created_at', { ascending: true });
      if (error) {
        setComments([]);
        return;
      }
      const ids = [...new Set((rows || []).map((r) => r.user_id))];
      let profMap = {};
      if (ids.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, username, user_settings').in('id', ids);
        profMap = Object.fromEntries((profs || []).map((p) => [p.id, p]));
      }
      setComments(
        (rows || []).map((r) => ({
          ...r,
          author: mapProfileToAuthor(profMap[r.user_id]),
        }))
      );
    } finally {
      setCommentsLoading(false);
    }
  }, [post.id]);

  useEffect(() => {
    if (!commentsOpen) return;
    loadComments();
  }, [commentsOpen, loadComments]);

  const toggleComments = (e) => {
    e.stopPropagation();
    setCommentsOpen((o) => !o);
  };

  const submitComment = async (e) => {
    e.stopPropagation();
    const t = commentDraft.trim();
    if (!user || !t || postingComment) return;
    setPostingComment(true);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: t, parent_post_id: post.id }),
      });
      if (res.ok) {
        setCommentDraft('');
        await loadComments();
        onCommentPosted?.(post.id);
      }
    } finally {
      setPostingComment(false);
    }
  };

  const returnStr = post.returnBadge;
  const retNum = returnStr ? parseFloat(String(returnStr).replace(/[^0-9.-]/g, '')) : null;
  const retPositive = retNum == null || retNum >= 0;

  return (
    <div className="db-card comm-feed-post-card">
      <div className="comm-post-block comm-post-block--card">
        <div
          className="comm-post comm-post--card"
          role="button"
          tabIndex={0}
          onClick={() => onToggle(post.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle(post.id);
            }
          }}
        >
          <div className="comm-post-head comm-post-head--card">
            <div className="comm-post-meta comm-post-meta--card">
              <div className="comm-avatar comm-avatar--feed" aria-hidden>
                {post.initials}
              </div>
              <div className="comm-post-author-block">
                <div className="comm-post-title-row">
                  {post.userId ? (
                    <span
                      role="link"
                      tabIndex={0}
                      className="comm-name-link comm-post-name"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/profile/${post.username || post.userId}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.stopPropagation();
                          router.push(`/profile/${post.username || post.userId}`);
                        }
                      }}
                    >
                      {post.name}
                    </span>
                  ) : (
                    <span className="comm-post-name">{post.name}</span>
                  )}
                  {post.isPartner && <span className="comm-post-partner-pill">Partner</span>}
                  {returnStr && (
                    <span className={`comm-post-return-badge ${retPositive ? 'is-pos' : 'is-neg'}`}>{returnStr}</span>
                  )}
                  <button type="button" className="comm-post-menu-btn" aria-label="Post menu" onClick={(e) => e.stopPropagation()}>
                    ···
                  </button>
                </div>
                <div className="comm-post-subrow">
                  <span className="comm-post-handle">@{post.username || (post.userId ? post.userId.slice(0, 8) : 'member')}</span>
                  <span className="comm-post-time"> · {post.time}</span>
                </div>
              </div>
            </div>
            {post.badge && <span className="comm-post-badge">{post.badge}</span>}
          </div>
          <p className="comm-post-text comm-post-text--card">
            {shown}
            {long && !expanded && <span className="comm-post-expand"> read more</span>}
          </p>
          {post.tickerSym && (
            <div className="comm-ticker-embed comm-ticker-embed--card">
              <span className="comm-ticker-sym">${post.tickerSym}</span>
              {quote ? (
                <>
                  <span className="comm-ticker-price">${quote.price?.toFixed(2) ?? '—'}</span>
                  <span className={`comm-ticker-chg ${(quote.changePercent ?? 0) >= 0 ? 'up' : 'dn'}`}>
                    {(quote.changePercent ?? 0) >= 0 ? '▲' : '▼'}{' '}
                    {(quote.changePercent ?? 0) >= 0 ? '+' : ''}
                    {(quote.changePercent ?? 0).toFixed(2)}%
                  </span>
                </>
              ) : (
                <span className="comm-ticker-price" style={{ color: '#6b7280', fontSize: '0.6875rem' }}>
                  Quote unavailable
                </span>
              )}
            </div>
          )}
        </div>
        <div className="comm-engage comm-engage--card">
          <button
            type="button"
            className="comm-engage-btn"
            aria-label="Like"
            onClick={(e) => {
              e.stopPropagation();
              onLike(post.id, post.liked_by_me);
            }}
          >
            <i className={post.liked_by_me ? 'bi bi-heart-fill' : 'bi bi-heart'} aria-hidden /> {post.likes}
          </button>
          <button type="button" className="comm-engage-btn" aria-label="Comments" onClick={toggleComments}>
            <i className="bi bi-chat-dots" aria-hidden /> {post.comments}
          </button>
          <button type="button" className="comm-engage-btn" aria-label="Share">
            <i className="bi bi-share" aria-hidden /> Share
          </button>
          <button
            type="button"
            className="comm-engage-btn"
            aria-label="Save"
            onClick={(e) => {
              e.stopPropagation();
              onSave(post.id, post.saved_by_me);
            }}
          >
            <i className="bi bi-bookmark" aria-hidden /> {post.saved_by_me ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {commentsOpen && (
        <div className="comm-comment-thread" onClick={(e) => e.stopPropagation()} role="region" aria-label="Comments">
          <div className="comm-comment-thread-head">
            <span>{post.comments} comments</span>
            <button type="button" className="comm-comment-collapse" onClick={toggleComments}>
              Collapse <i className="bi bi-chevron-up" aria-hidden />
            </button>
          </div>
          {commentsLoading && <p className="comm-empty">Loading comments…</p>}
          {!commentsLoading &&
            comments.map((c) => (
              <div key={c.id} className="comm-comment-row">
                <div className="comm-avatar comm-avatar-sm" aria-hidden>
                  {c.author.initials}
                </div>
                <div className="comm-comment-body">
                  <div className="comm-comment-meta">
                    {c.author.id ? (
                      <Link href={`/profile/${c.author.username || c.author.id}`} className="comm-name-link" onClick={(e) => e.stopPropagation()}>
                        {c.author.name}
                      </Link>
                    ) : (
                      <span className="comm-post-name">{c.author.name}</span>
                    )}
                    <span className="comm-post-time"> · {formatRelativeTime(c.created_at)}</span>
                  </div>
                  <p className="comm-comment-text">{c.content}</p>
                </div>
              </div>
            ))}
          {user && (
            <div className="comm-comment-compose">
              <input
                className="comm-compose-input"
                placeholder="Write a comment..."
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitComment(e);
                  }
                }}
              />
              <button type="button" className="comm-btn-sm" onClick={submitComment} disabled={postingComment || !commentDraft.trim()}>
                {postingComment ? 'Posting…' : 'Post'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

