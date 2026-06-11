'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MentionInput } from './MentionInput';
import { ReactionBar } from './ReactionBar';
import './social.css';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/* Highlight @mentions within a comment body. */
function renderBody(text) {
  const parts = String(text).split(/(@[\w][\w'-]*(?:\s[\w][\w'-]*)?)/g);
  return parts.map((p, i) =>
    p.startsWith('@') ? (
      <span key={i} className="sc2-mention">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function Comment({ comment, onReply, viewerId }) {
  return (
    <div className={`sc2-comment${comment.parent_id ? ' sc2-comment--reply' : ''}`}>
      <div className="sc2-comment-head">
        <span className="sc2-comment-author">{comment.author_name}</span>
        {comment.author_role && (
          <span className="sc2-comment-time">{comment.author_role.replace('_', ' ')}</span>
        )}
        <span className="sc2-comment-time">· {timeAgo(comment.created_at)}</span>
      </div>
      <div className="sc2-comment-body">{renderBody(comment.body)}</div>
      <div className="sc2-comment-actions">
        <ReactionBar targetType="thread" targetId={comment.id} compact />
        {!comment.parent_id && (
          <button type="button" className="sc2-link-btn" onClick={() => onReply(comment)}>
            Reply
          </button>
        )}
      </div>
    </div>
  );
}

export function PositionThread({ ticker }) {
  const [comments, setComments] = useState([]);
  const [members, setMembers] = useState([]);
  const [viewerId, setViewerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [mentionIds, setMentionIds] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!ticker) return;
    try {
      const res = await fetch(`/api/org/positions/${encodeURIComponent(ticker)}/thread`, {
        cache: 'no-store',
      });
      if (res.status === 403) {
        setError('Members only.');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to load discussion.');
        return;
      }
      setComments(data.comments || []);
      setMembers(data.members || []);
      setViewerId(data.viewer?.userId || null);
      setError('');
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    load();
  }, [load]);

  const tree = useMemo(() => {
    const roots = comments.filter((c) => !c.parent_id);
    const repliesByParent = new Map();
    for (const c of comments) {
      if (c.parent_id) {
        if (!repliesByParent.has(c.parent_id)) repliesByParent.set(c.parent_id, []);
        repliesByParent.get(c.parent_id).push(c);
      }
    }
    return roots.map((r) => ({ root: r, replies: repliesByParent.get(r.id) || [] }));
  }, [comments]);

  const submit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/org/positions/${encodeURIComponent(ticker)}/thread`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: text,
          parent_id: replyTo?.id || null,
          mention_user_ids: mentionIds,
        }),
      });
      if (res.ok) {
        setText('');
        setMentionIds([]);
        setReplyTo(null);
        await load();
      }
    } catch {
      /* non-fatal */
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="sc2-state">Loading discussion…</div>;
  if (error) return <div className="sc2-state sc2-error">{error}</div>;

  return (
    <div className="sc2-root">
      <div className="sc2-thread">
        {tree.length === 0 ? (
          <div className="sc2-state">No discussion yet — start the thread on {ticker}.</div>
        ) : (
          tree.map(({ root, replies }) => (
            <div key={root.id}>
              <Comment comment={root} onReply={setReplyTo} viewerId={viewerId} />
              {replies.map((r) => (
                <Comment key={r.id} comment={r} onReply={setReplyTo} viewerId={viewerId} />
              ))}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '1rem' }}>
        {replyTo && (
          <div className="sc2-comment-time" style={{ marginBottom: 4 }}>
            Replying to {replyTo.author_name}{' '}
            <button type="button" className="sc2-link-btn" onClick={() => setReplyTo(null)}>
              cancel
            </button>
          </div>
        )}
        <MentionInput
          value={text}
          onChange={setText}
          members={members}
          onMentionsChange={setMentionIds}
          placeholder={`Comment on ${ticker}… use @ to mention a teammate`}
          rows={3}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="sc2-btn sc2-btn--primary"
            onClick={submit}
            disabled={sending || !text.trim()}
          >
            {sending ? 'Posting…' : replyTo ? 'Reply' : 'Comment'}
          </button>
        </div>
      </div>
    </div>
  );
}
