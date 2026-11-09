'use client';

/**
 * The Community Feed card (Nov 2026): Following | Trending | Latest tabs
 * (a proper tablist with arrow keys), a topic select that mirrors the
 * sidebar, and the post list with infinite scroll plus a Load more button.
 * Tab and topic live in the URL (handled by the page).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import s from '@/app/(dashboard)/community/community.module.css';
import { FeedPostCard } from './FeedPostCard';
import { DiscussionThread } from './DiscussionThread';
import { useCommunityResource } from './useCommunityResource';
import { Avatar } from './primitives';
import { FEED_PAGE } from '@/lib/community/redesign';

const TABS = [
  { key: 'following', label: 'Following' },
  { key: 'trending', label: 'Trending' },
  { key: 'latest', label: 'Latest' },
];

function feedUrl(tab, topic, cursor) {
  const p = new URLSearchParams({ tab, limit: String(FEED_PAGE) });
  if (topic) p.set('topic', topic);
  if (cursor?.before) p.set('before', cursor.before);
  if (cursor?.offset) p.set('offset', String(cursor.offset));
  return `/api/community/feed?${p}`;
}

function PostSkeleton() {
  return (
    <div className={s.post} aria-hidden="true">
      <div className={s.postBody}>
        <div className={s.skel} style={{ height: 40, width: 220 }} />
        <div className={s.skel} style={{ height: 20, width: '70%', marginTop: 12 }} />
        <div className={s.skel} style={{ height: 36, marginTop: 8 }} />
      </div>
    </div>
  );
}

/** A post opened from a shared link (?post=<id>), with its discussion open. */
function PinnedDiscussion({ postId, onClose }) {
  const { data, error, loading } = useCommunityResource(
    `/api/community/thread?post=${encodeURIComponent(postId)}`,
    { refetchOnFocus: false },
  );
  if (loading) return <PostSkeleton />;
  if (error || !data?.post) {
    return (
      <div className={s.post}>
        <p className={s.empty}>That discussion isn&apos;t available.</p>
        <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={onClose}>
          Close
        </button>
      </div>
    );
  }
  return (
    <article className={s.post} aria-label="Shared discussion">
      <div className={s.postBody}>
        <div className={s.postMeta}>
          <Avatar src={data.post.author?.avatar_url} name={data.post.author?.name} size={32} />
          <span className={s.strong}>{data.post.author?.name || 'Member'}</span>
          <div className={s.postTools}>
            <button
              type="button"
              className={s.iconBtn}
              aria-label="Close discussion"
              onClick={onClose}
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
        </div>
        <h3 className={s.postTitle} style={{ marginTop: 10 }}>
          {data.post.title}
        </h3>
        <DiscussionThread postId={postId} />
      </div>
    </article>
  );
}

export function CommunityFeed({
  tab,
  onTab,
  topic,
  onTopic,
  topics,
  showFollowHint,
  refreshKey,
  myId,
  pinnedPostId,
  onClosePinned,
  onNewPost,
}) {
  const [posts, setPosts] = useState([]);
  const [next, setNext] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [more, setMore] = useState(false);
  const seq = useRef(0);
  const sentinel = useRef(null);
  const tabRefs = useRef([]);

  const load = useCallback(
    async (cursor) => {
      const id = cursor ? seq.current : ++seq.current;
      if (cursor) setMore(true);
      else setStatus('loading');
      try {
        const res = await fetch(feedUrl(tab, topic, cursor), { credentials: 'include' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error);
        if (id !== seq.current) return;
        setPosts((prev) => {
          if (!cursor) return body.posts || [];
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...(body.posts || []).filter((p) => !seen.has(p.id))];
        });
        setNext(body.next || null);
        setStatus('ready');
      } catch {
        if (id === seq.current && !cursor) setStatus('error');
      } finally {
        if (cursor) setMore(false);
      }
    },
    [tab, topic],
  );

  useEffect(() => {
    load(null);
  }, [load, refreshKey]);

  /* Infinite scroll: load the next page as the sentinel nears the viewport. */
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !next || status !== 'ready' || typeof IntersectionObserver === 'undefined')
      return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !more) load(next);
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [next, status, more, load]);

  const onTabKey = (e, i) => {
    let j = null;
    if (e.key === 'ArrowRight') j = (i + 1) % TABS.length;
    if (e.key === 'ArrowLeft') j = (i - 1 + TABS.length) % TABS.length;
    if (e.key === 'Home') j = 0;
    if (e.key === 'End') j = TABS.length - 1;
    if (j === null) return;
    e.preventDefault();
    tabRefs.current[j]?.focus();
    onTab(TABS[j].key);
  };

  const topicLabel = topics.find((t) => t.slug === topic)?.label;

  return (
    <section className={s.card} aria-labelledby="community-feed-title">
      <div className={s.feedHead}>
        <h2 className={s.feedTitle} id="community-feed-title">
          Community Feed
        </h2>
        <div className={s.tabs} role="tablist" aria-label="Feed">
          {TABS.map((t, i) => (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`feed-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls="community-feed-panel"
              tabIndex={tab === t.key ? 0 : -1}
              className={s.tab}
              onClick={() => onTab(t.key)}
              onKeyDown={(e) => onTabKey(e, i)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className={s.srOnly} htmlFor="feed-topic">
          Topic
        </label>
        <select
          id="feed-topic"
          className={s.topicSelect}
          value={topic || ''}
          onChange={(e) => onTopic(e.target.value || null)}
        >
          <option value="">All Topics</option>
          {topics.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div id="community-feed-panel" role="tabpanel" aria-labelledby={`feed-tab-${tab}`}>
        {showFollowHint ? (
          <p className={s.hint}>
            Follow investors to build your feed.{' '}
            <a href="#people-to-follow">See people to follow</a>
          </p>
        ) : null}

        <div className={s.posts}>
          {pinnedPostId ? <PinnedDiscussion postId={pinnedPostId} onClose={onClosePinned} /> : null}

          {status === 'loading' ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : null}

          {status === 'error' ? (
            <div className={s.cardError} role="alert">
              <span>Couldn&apos;t load this section.</span>
              <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => load(null)}>
                <i className="bi bi-arrow-clockwise" aria-hidden="true" />
                Retry
              </button>
            </div>
          ) : null}

          {status === 'ready' && posts.length === 0 ? (
            <div className={s.feedEmpty}>
              {topicLabel
                ? `No posts in ${topicLabel} yet.`
                : tab === 'following'
                  ? 'No posts from people you follow yet.'
                  : 'No posts yet.'}
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={onNewPost}>
                <i className="bi bi-pencil-square" aria-hidden="true" />
                New Post
              </button>
            </div>
          ) : null}

          {status === 'ready'
            ? posts.map((p) => (
                <FeedPostCard
                  key={p.id}
                  post={p}
                  myId={myId}
                  onTopic={onTopic}
                  onDeleted={(id) => setPosts((list) => list.filter((x) => x.id !== id))}
                  onBlocked={(uid) => setPosts((list) => list.filter((x) => x.author?.id !== uid))}
                />
              ))
            : null}

          {status === 'ready' && next ? (
            <>
              <div ref={sentinel} className={s.sentinel} aria-hidden="true" />
              <button
                type="button"
                className={`${s.btn} ${s.btnGhost} ${s.loadMore}`}
                onClick={() => load(next)}
                disabled={more}
              >
                {more ? 'Loading…' : 'Load more'}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
