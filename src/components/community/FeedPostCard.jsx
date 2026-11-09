'use client';

/**
 * One post in the Community feed (Nov 2026). Text column plus an optional
 * thumbnail; the title is the primary link (it opens the discussion), so the
 * buttons stay separately reachable. Like and save are optimistic and roll
 * back on failure. "View discussion" opens the replies inline.
 */
import { useState } from 'react';
import Link from 'next/link';
import s from '@/app/(dashboard)/community/community.module.css';
import ContentActionsMenu from '@/components/moderation/ContentActionsMenu';
import { Avatar, VerifiedBadge, TickerChip } from './primitives';
import { sendJson } from './useCommunityResource';
import { DiscussionThread } from './DiscussionThread';
import { groupNumber, relativeTime } from '@/lib/community/redesign';

function postLink(id) {
  if (typeof window === 'undefined') return `/community?post=${id}`;
  return `${window.location.origin}/community?post=${encodeURIComponent(id)}`;
}

function OwnPostMenu({ post, onDeleted, onCopied }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    setBusy(true);
    try {
      await sendJson(`/api/community/posts?post_id=${encodeURIComponent(post.id)}`, {
        method: 'DELETE',
      });
      onDeleted?.(post.id);
    } catch (e) {
      window.alert(e.message);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };
  return (
    <div className={s.menuWrap}>
      <button
        type="button"
        className={s.iconBtn}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      >
        <i className="bi bi-three-dots" aria-hidden="true" />
      </button>
      {open ? (
        <div className={s.menu} role="menu">
          <button
            type="button"
            role="menuitem"
            className={s.popItem}
            onClick={() => {
              onCopied();
              setOpen(false);
            }}
          >
            <i className="bi bi-link-45deg" aria-hidden="true" /> Copy link
          </button>
          <button
            type="button"
            role="menuitem"
            className={s.popItem}
            onClick={remove}
            disabled={busy}
          >
            <i className="bi bi-trash" aria-hidden="true" /> Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function FeedPostCard({ post, myId, onTopic, onDeleted, onBlocked, defaultOpen = false }) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likes, setLikes] = useState(post.likes_count);
  const [saved, setSaved] = useState(post.saved_by_me);
  const [comments, setComments] = useState(post.comments_count);
  const [threadOpen, setThreadOpen] = useState(defaultOpen);
  const [flash, setFlash] = useState('');
  const own = myId && post.author?.id === myId;
  const profileHref = post.author?.username
    ? `/profile/${encodeURIComponent(post.author.username)}`
    : `/community/profile/${post.author?.id}`;

  const say = (msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(''), 2200);
  };

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    try {
      await sendJson('/api/community/posts/like', {
        body: { post_id: post.id, action: next ? 'like' : 'unlike' },
      });
    } catch {
      setLiked(!next);
      setLikes((n) => Math.max(0, n + (next ? -1 : 1)));
      say('Your like did not save. Try again.');
    }
  };

  const toggleSave = async () => {
    const next = !saved;
    setSaved(next);
    try {
      await sendJson('/api/community/posts/save', {
        body: { post_id: post.id, action: next ? 'save' : 'unsave' },
      });
    } catch {
      setSaved(!next);
      say('That did not save. Try again.');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(postLink(post.id));
      say('Link copied');
    } catch {
      say('Copy failed');
    }
  };

  const share = async () => {
    const url = postLink(post.id);
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, url });
        return;
      } catch {
        /* dismissed: fall through to copy */
      }
    }
    copyLink();
  };

  return (
    <article className={s.post} aria-labelledby={`post-${post.id}-title`}>
      <div className={s.postBody}>
        <div className={s.postMeta}>
          <Link href={profileHref} className={s.author}>
            <Avatar src={post.author?.avatar_url} name={post.author?.name} size={40} />
            <span className={s.ellipsis}>{post.author?.name || 'Member'}</span>
          </Link>
          {post.author?.is_partner ? <VerifiedBadge /> : null}
          <time
            className={s.time}
            dateTime={post.created_at}
            title={new Date(post.created_at).toLocaleString()}
          >
            · {relativeTime(post.created_at)}
          </time>
          <div className={s.postTools}>
            {flash ? (
              <span className={s.flash} role="status">
                {flash}
              </span>
            ) : null}
            <button
              type="button"
              className={s.iconBtn}
              aria-pressed={saved}
              aria-label={saved ? 'Remove from saved' : 'Save post'}
              onClick={toggleSave}
            >
              <i
                className={`bi ${saved ? 'bi-bookmark-fill' : 'bi-bookmark'}`}
                aria-hidden="true"
              />
            </button>
            {own ? (
              <OwnPostMenu post={post} onDeleted={onDeleted} onCopied={copyLink} />
            ) : (
              <ContentActionsMenu
                contentType="post"
                contentId={post.id}
                authorId={post.author?.id}
                authorName={post.author?.name}
                onBlocked={onBlocked}
              />
            )}
          </div>
        </div>

        {post.topic_label ? (
          <button type="button" className={s.topicLink} onClick={() => onTopic?.(post.topic_slug)}>
            {post.topic_label}
          </button>
        ) : (
          <div style={{ height: 8 }} />
        )}

        <h3 className={s.postTitle} id={`post-${post.id}-title`}>
          <button type="button" onClick={() => setThreadOpen(true)} aria-expanded={threadOpen}>
            {post.title}
          </button>
        </h3>
        {post.excerpt ? <p className={s.excerpt}>{post.excerpt}</p> : null}
        {post.mentioned_ticker ? <TickerChip ticker={post.mentioned_ticker} /> : null}

        <div className={s.actions}>
          <button
            type="button"
            className={s.action}
            aria-pressed={liked}
            aria-label={`${liked ? 'Unlike' : 'Like'}, ${likes} likes`}
            onClick={toggleLike}
          >
            <i
              className={`bi ${liked ? 'bi-hand-thumbs-up-fill' : 'bi-hand-thumbs-up'}`}
              aria-hidden="true"
            />
            <span className={s.num}>{groupNumber(likes)}</span>
          </button>
          <button
            type="button"
            className={s.action}
            aria-label={`${comments} comments`}
            aria-expanded={threadOpen}
            onClick={() => setThreadOpen((v) => !v)}
          >
            <i className="bi bi-chat" aria-hidden="true" />
            <span className={s.num}>{groupNumber(comments)}</span>
          </button>
          <button type="button" className={s.action} aria-label="Share" onClick={share}>
            <i className={`bi bi-reply ${s.mirror}`} aria-hidden="true" />
            <span className={s.num}>{groupNumber(post.reposts_count)}</span>
          </button>
          <button
            type="button"
            className={`${s.viewAll} ${s.viewDiscussion}`}
            aria-expanded={threadOpen}
            onClick={() => setThreadOpen((v) => !v)}
          >
            {threadOpen ? 'Hide discussion' : 'View discussion'}
            <i
              className={`bi ${threadOpen ? 'bi-chevron-up' : 'bi-arrow-right'}`}
              aria-hidden="true"
            />
          </button>
        </div>

        {threadOpen ? (
          <DiscussionThread postId={post.id} onReplied={() => setComments((n) => n + 1)} />
        ) : null}
      </div>
      {post.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={s.thumb} src={post.image_url} alt="" loading="lazy" decoding="async" />
      ) : null}
    </article>
  );
}
