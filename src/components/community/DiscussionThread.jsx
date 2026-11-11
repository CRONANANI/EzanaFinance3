'use client';

/**
 * A post's discussion, inline under the post (there is no separate post
 * page). Replies load from /api/community/thread and are written through the
 * existing POST /api/community/posts (parent_post_id), behind the community
 * terms gate like every post.
 */
import { useState } from 'react';
import Link from 'next/link';
import s from '@/app/(dashboard)/community/community.module.css';
import { useCommunityTerms } from '@/components/moderation/useCommunityTerms';
import { Avatar } from './primitives';
import { useCommunityResource, sendJson } from './useCommunityResource';
import { relativeTime } from '@/lib/community/redesign';

const MAX = 500;

export function DiscussionThread({ postId, onReplied }) {
  const { data, error, loading, reload, setData } = useCommunityResource(
    `/api/community/thread?post=${encodeURIComponent(postId)}`,
    { refetchOnFocus: false },
  );
  const { ensureAccepted, termsModal } = useCommunityTerms();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || busy) return;
    /* Sample discussions (admin and demo accounts only): the reply is added
       on this screen and never sent. */
    if (data?.post?.is_demo) {
      setText('');
      setData((d) => ({
        ...(d || {}),
        replies: [
          ...((d && d.replies) || []),
          {
            id: `local-${((d && d.replies) || []).length + 1}`,
            content,
            created_at: new Date().toISOString(),
            author: { name: 'You' },
          },
        ],
      }));
      onReplied?.();
      return;
    }
    if (!(await ensureAccepted())) return;
    setBusy(true);
    setFormError('');
    try {
      const res = await sendJson('/api/community/posts', {
        body: { content, parent_post_id: postId },
      });
      setText('');
      if (res.post) {
        setData((d) => ({
          ...(d || {}),
          replies: [
            ...((d && d.replies) || []),
            {
              id: res.post.id,
              content: res.post.content,
              created_at: res.post.created_at,
              author: { name: 'You' },
            },
          ],
        }));
      } else {
        reload();
      }
      onReplied?.();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.thread}>
      {termsModal}
      {loading ? <div className={s.skel} style={{ height: 48 }} aria-busy="true" /> : null}
      {error ? (
        <div className={s.cardError} role="alert">
          <span>Couldn&apos;t load this discussion.</span>
          <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={reload}>
            Retry
          </button>
        </div>
      ) : null}
      {!loading && !error && data?.replies?.length === 0 ? (
        <p className={s.empty}>No replies yet. Start the discussion.</p>
      ) : null}
      {(data?.replies || []).map((r) => (
        <div key={r.id} className={s.reply}>
          <Avatar src={r.author?.avatar_url} name={r.author?.name} size={28} />
          <div className={s.replyBody}>
            <div className={s.replyMeta}>
              {r.author?.username ? (
                <Link
                  href={`/profile/${encodeURIComponent(r.author.username)}`}
                  style={{ color: 'inherit' }}
                >
                  <strong>{r.author.name}</strong>
                </Link>
              ) : (
                <strong>{r.author?.name || 'Member'}</strong>
              )}{' '}
              · {relativeTime(r.created_at)}
            </div>
            <p className={s.replyText}>{r.content}</p>
          </div>
        </div>
      ))}
      <form className={s.replyForm} onSubmit={submit}>
        <label className={s.srOnly} htmlFor={`reply-${postId}`}>
          Write a reply
        </label>
        <input
          id={`reply-${postId}`}
          className={s.replyInput}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a reply…"
          maxLength={MAX}
        />
        <button
          type="submit"
          className={`${s.btn} ${s.btnPrimary}`}
          style={{ height: 40 }}
          disabled={!text.trim() || busy}
        >
          {busy ? 'Posting…' : 'Reply'}
        </button>
      </form>
      {formError ? (
        <p className={s.formError} role="alert">
          {formError}
        </p>
      ) : null}
    </div>
  );
}
