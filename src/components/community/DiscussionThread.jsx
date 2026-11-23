'use client';

/**
 * A post's discussion, inline under the post (there is no separate post
 * page). Replies load from /api/community/thread and are written through the
 * existing POST /api/community/posts (parent_post_id), behind the community
 * terms gate like every post.
 */
import { useState } from 'react';
import s from '@/app/(dashboard)/community/community.module.css';
import { useCommunityTerms } from '@/components/moderation/useCommunityTerms';
import { EzTimeline } from '@/components/ui/timeline/EzTimeline';
import { useCommunityResource, sendJson } from './useCommunityResource';

const MAX = 500;
const PREVIEW = 180;

const initialsOf = (name) =>
  (name || 'M')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

/* Replies as a timeline (Nov 19, 2026): grouped by day, oldest first so the
   discussion reads top to bottom, a reply longer than the preview expands in
   place. A reply added here slides in at the bottom. */
function ThreadTimeline({ replies }) {
  const [now] = useState(() => Date.now());
  const events = replies.map((r) => {
    const text = String(r.content || '');
    const long = text.length > PREVIEW;
    return {
      id: r.id,
      at: r.created_at,
      actor: r.author?.name || 'Member',
      title: long ? `${text.slice(0, PREVIEW).trimEnd()}…` : text,
      meta: r.author?.username ? `@${r.author.username}` : undefined,
      detail: long ? text : undefined,
      avatar: r.author?.avatar_url || undefined,
      initials: r.author?.avatar_url ? undefined : initialsOf(r.author?.name),
    };
  });
  return <EzTimeline events={events} now={now} label="Replies" order="oldest" headingLevel={4} />;
}

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
      {loading ? <div className={s.skel} style={{ height: 40 }} aria-busy="true" /> : null}
      {error ? (
        <div className={s.cardError} role="alert">
          <span>Couldn&apos;t load this discussion.</span>
          <button type="button" className={`${s.btn} ${s.btnLink}`} onClick={reload}>
            Retry
          </button>
        </div>
      ) : null}
      {!loading && !error && data?.replies?.length === 0 ? (
        <p className={s.empty}>No replies yet. Start the discussion.</p>
      ) : null}
      {!loading && !error && data?.replies?.length ? (
        <p className={s.replyCount}>
          <span className={s.num}>{data.replies.length}</span>{' '}
          {data.replies.length === 1 ? 'reply' : 'replies'}
        </p>
      ) : null}
      {data?.replies?.length ? <ThreadTimeline replies={data.replies} /> : null}
      <form className={s.replyForm} onSubmit={submit}>
        <label className={s.srOnly} htmlFor={`reply-${postId}`}>
          Write a reply
        </label>
        <input
          id={`reply-${postId}`}
          className={s.replyInput}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a reply"
          maxLength={MAX}
        />
        <button type="submit" className={`${s.btn} ${s.btnLink}`} disabled={!text.trim() || busy}>
          {busy ? 'Posting' : 'Reply'}
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
