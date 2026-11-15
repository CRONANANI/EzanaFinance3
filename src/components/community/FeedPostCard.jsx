'use client';

/**
 * One post in the Community feed (Nov 15 2026). Text column plus an optional
 * thumbnail; the title is the primary link (it opens the discussion), so the
 * buttons stay separately reachable. Like and save are optimistic and roll
 * back on failure. "View discussion" opens the replies inline.
 *
 * A post also shows what its author attached when writing it: the partner
 * post format, the ticker embed and its period, their conviction, the
 * disclosure, and the poll (results as rows, voting through the existing
 * PATCH /api/community/posts). Deleting confirms in a dialog.
 */
import { useState } from 'react';
import Link from 'next/link';
import s from '@/app/(dashboard)/community/community.module.css';
import ContentActionsMenu from '@/components/moderation/ContentActionsMenu';
import { Modal } from '@/components/ds';
import { getPostType } from '@/lib/post-types';
import { Avatar, VerifiedBadge, TickerChip } from './primitives';
import { sendJson } from './useCommunityResource';
import { DiscussionThread } from './DiscussionThread';
import { groupNumber, relativeTime } from '@/lib/community/redesign';

/** "Analyst Take" -> "Analyst take" (the guide asks for sentence case). */
const sentenceCase = (v) => {
  const t = String(v || '');
  return t.charAt(0) + t.slice(1).toLowerCase();
};

function postLink(id) {
  if (typeof window === 'undefined') return `/community?post=${id}`;
  return `${window.location.origin}/community?post=${encodeURIComponent(id)}`;
}

function OwnPostMenu({ post, onDeleted, onCopied, onError }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    setBusy(true);
    try {
      await sendJson(`/api/community/posts?post_id=${encodeURIComponent(post.id)}`, {
        method: 'DELETE',
      });
      setConfirming(false);
      onDeleted?.(post.id);
    } catch (e) {
      setConfirming(false);
      onError?.(e.message || 'That post was not deleted. Try again.');
    } finally {
      setBusy(false);
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
            className={`${s.popItem} ${s.popDanger}`}
            onClick={() => {
              setOpen(false);
              setConfirming(true);
            }}
          >
            <i className="bi bi-trash" aria-hidden="true" /> Delete
          </button>
        </div>
      ) : null}
      <Modal
        open={confirming}
        onClose={() => (busy ? null : setConfirming(false))}
        title="Delete this post?"
        size="sm"
        footer={
          <div className={s.confirmActions}>
            <button
              type="button"
              className={s.btn}
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`${s.btn} ${s.btnDanger}`}
              onClick={remove}
              disabled={busy}
            >
              {busy ? 'Deleting' : 'Delete post'}
            </button>
          </div>
        }
      >
        <p className={s.confirmText}>
          The post and its discussion are removed for everyone. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

/**
 * A poll as rows on hairlines: the option on the left, its share and vote
 * count on the right. The leading option's share is emerald. Choosing an
 * option votes (or moves the member's vote); sample polls stay on screen.
 */
function PostPoll({ postId, poll, myVote, isDemo, onError }) {
  const [state, setState] = useState(poll);
  const [vote, setVote] = useState(myVote || null);
  const [busy, setBusy] = useState(false);
  const total = state.options.reduce((n, o) => n + o.votes, 0);
  const lead = Math.max(...state.options.map((o) => o.votes));

  const choose = async (optId) => {
    if (busy || optId === vote) return;
    const before = { state, vote };
    setState((st) => ({
      ...st,
      options: st.options.map((o) => ({
        ...o,
        votes: Math.max(0, o.votes + (o.id === optId ? 1 : 0) - (o.id === vote ? 1 : 0)),
      })),
    }));
    setVote(optId);
    if (isDemo) return;
    setBusy(true);
    try {
      const res = await sendJson('/api/community/posts', {
        method: 'PATCH',
        body: { post_id: postId, option_id: optId },
      });
      if (res.poll_data?.options) {
        setState((st) => ({
          ...st,
          options: res.poll_data.options.map((o) => ({
            id: String(o.id),
            label: String(o.label || ''),
            votes: Math.max(0, Number(o.votes) || 0),
          })),
        }));
      }
      if (res.my_vote) setVote(String(res.my_vote));
    } catch {
      setState(before.state);
      setVote(before.vote);
      onError?.('Your vote did not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.poll} role="group" aria-label={state.question || 'Poll'}>
      {state.question ? <p className={s.pollQ}>{state.question}</p> : null}
      {state.options.map((o) => {
        const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
        const leading = total > 0 && o.votes === lead;
        return (
          <button
            key={o.id}
            type="button"
            className={s.pollOpt}
            aria-pressed={vote === o.id}
            disabled={busy}
            onClick={() => choose(o.id)}
          >
            <span className={s.pollLabel}>
              <span className={s.ellipsis}>{o.label}</span>
              {vote === o.id ? (
                <i className="bi bi-check-lg" role="img" aria-label="Your vote" />
              ) : null}
            </span>
            <span className={`${s.pollPct} ${leading ? s.pollLead : ''}`}>
              {pct}% ({groupNumber(o.votes)} {o.votes === 1 ? 'vote' : 'votes'})
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function FeedPostCard({
  post,
  myId,
  onTopic,
  onDeleted,
  onBlocked,
  onUnsaved,
  defaultOpen = false,
}) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likes, setLikes] = useState(post.likes_count);
  const [saved, setSaved] = useState(post.saved_by_me);
  const [comments, setComments] = useState(post.comments_count);
  const [threadOpen, setThreadOpen] = useState(defaultOpen);
  const [flash, setFlash] = useState('');
  const own = myId && post.author?.id === myId;
  /* Sample posts (admin and demo accounts only) have no profile page, and
     their likes and saves stay on this screen. */
  const isDemo = Boolean(post.is_demo);
  const profileHref = isDemo
    ? '/community'
    : post.author?.username
      ? `/profile/${encodeURIComponent(post.author.username)}`
      : `/community/profile/${post.author?.id}`;

  const format = getPostType(post.post_type);
  const embedSymbols = post.ticker_embed?.symbols || [];
  /* The mentioned ticker first, then any embedded symbols not already shown. */
  const tickers = [
    ...new Set(
      [post.mentioned_ticker, ...embedSymbols].filter(Boolean).map((t) => t.toUpperCase()),
    ),
  ].slice(0, 3);
  const hasMeta =
    tickers.length > 0 || post.conviction_pct != null || Boolean(post.disclosure) || false;

  const say = (msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(''), 2600);
  };

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    if (isDemo) return;
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
    if (isDemo) return;
    try {
      await sendJson('/api/community/posts/save', {
        body: { post_id: post.id, action: next ? 'save' : 'unsave' },
      });
      /* On the Saved tab, an unsaved post leaves the list. */
      if (!next) onUnsaved?.(post.id);
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
          {format ? <span className={s.formatLabel}>{sentenceCase(format.label)}</span> : null}
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
              <OwnPostMenu post={post} onDeleted={onDeleted} onCopied={copyLink} onError={say} />
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
        ) : null}

        <h3 className={s.postTitle} id={`post-${post.id}-title`}>
          <button type="button" onClick={() => setThreadOpen(true)} aria-expanded={threadOpen}>
            {post.title}
          </button>
        </h3>
        {post.excerpt ? <p className={s.excerpt}>{post.excerpt}</p> : null}
        {hasMeta ? (
          <div className={s.metaLine}>
            {tickers.map((t) => (
              <TickerChip key={t} ticker={t} />
            ))}
            {post.ticker_embed?.period && embedSymbols.length ? (
              <>
                <span className={s.sep} aria-hidden="true">
                  ·
                </span>
                <span className={s.num}>{post.ticker_embed.period}</span>
              </>
            ) : null}
            {post.conviction_pct != null ? (
              <>
                {tickers.length ? (
                  <span className={s.sep} aria-hidden="true">
                    ·
                  </span>
                ) : null}
                <span>
                  Conviction <span className={s.metaValue}>{post.conviction_pct}%</span>
                </span>
              </>
            ) : null}
            {post.disclosure ? (
              <>
                {tickers.length || post.conviction_pct != null ? (
                  <span className={s.sep} aria-hidden="true">
                    ·
                  </span>
                ) : null}
                <span>Disclosure: {post.disclosure}</span>
              </>
            ) : null}
          </div>
        ) : null}
        {post.poll ? (
          <PostPoll
            postId={post.id}
            poll={post.poll}
            myVote={post.my_vote}
            isDemo={isDemo}
            onError={say}
          />
        ) : null}

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
            <i className="bi bi-forward" aria-hidden="true" />
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
