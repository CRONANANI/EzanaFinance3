'use client';

/**
 * The Community feed (Nov 15 2026).
 *   FeedControls  Following | Trending | Latest | Saved as text-only tabs (a
 *                 proper tablist with arrow keys) and a topic select that
 *                 mirrors the topic row. It sits beside the KPI strip.
 *   CommunityFeed the post list with infinite scroll plus a Load more button.
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
  { key: 'saved', label: 'Saved' },
];

/* v3 (Nov 23 2026): `query` = { sort, filter, builds } switches the feed API
   to community_feed_v3; the Saved view still uses tab=saved. */
function feedUrl(tab, topic, cursor, query) {
  const p = new URLSearchParams({ limit: String(FEED_PAGE) });
  if (query && tab !== 'saved') {
    p.set('sort', query.sort || 'relevant');
    if (query.filter && query.filter !== 'all') p.set('filter', query.filter);
    if (query.builds) p.set('builds', '1');
  } else {
    p.set('tab', tab);
  }
  if (topic) p.set('topic', topic);
  if (cursor?.before) p.set('before', cursor.before);
  if (cursor?.offset) p.set('offset', String(cursor.offset));
  return `/api/community/feed?${p}`;
}

function PostSkeleton() {
  return (
    <div className={s.post} aria-hidden="true">
      <div className={s.postBody}>
        <div className={s.postMeta}>
          <div className={`${s.skel} ${s.skelCircle}`} style={{ width: 40, height: 40 }} />
          <div className={s.skel} style={{ height: 12, width: '28%' }} />
        </div>
        <div className={s.skel} style={{ height: 18, width: '72%', marginTop: 16 }} />
        <div className={s.skel} style={{ height: 12, marginTop: 12 }} />
        <div className={s.skel} style={{ height: 12, width: '86%', marginTop: 8 }} />
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
        <button type="button" className={`${s.btn} ${s.btnLink}`} onClick={onClose}>
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
        <h3 className={s.postTitle} style={{ marginTop: 12 }}>
          {data.post.title}
        </h3>
        <DiscussionThread postId={postId} />
      </div>
    </article>
  );
}

/** The feed's tabs and topic select, shown on the KPI strip's row. */
export function FeedControls({ tab, onTab, topic, onTopic, topics }) {
  const tabRefs = useRef([]);
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
  return (
    <div className={s.feedControls}>
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
        <option value="">All topics</option>
        {topics.map((t) => (
          <option key={t.slug} value={t.slug}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
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
  query = null,
  followingIds,
  onFollowChange,
  emptyText = '',
}) {
  const [posts, setPosts] = useState([]);
  const [next, setNext] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [more, setMore] = useState(false);
  const seq = useRef(0);
  const sentinel = useRef(null);

  const load = useCallback(
    async (cursor) => {
      const id = cursor ? seq.current : ++seq.current;
      if (cursor) setMore(true);
      else setStatus('loading');
      try {
        const res = await fetch(feedUrl(tab, topic, cursor, query), { credentials: 'include' });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, topic, query?.sort, query?.filter, query?.builds],
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

  const topicLabel = topics.find((t) => t.slug === topic)?.label;
  const saved = tab === 'saved';

  return (
    <section
      className={s.feed}
      aria-labelledby="community-feed-title"
      data-task-target="community-feed"
    >
      <h2 className={s.srOnly} id="community-feed-title">
        Community feed
      </h2>
      <div id="community-feed-panel">
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
              <span>Couldn&apos;t load the feed.</span>
              <button type="button" className={`${s.btn} ${s.btnLink}`} onClick={() => load(null)}>
                Retry
              </button>
            </div>
          ) : null}

          {status === 'ready' && posts.length === 0 ? (
            <div className={s.feedEmpty}>
              {emptyText && !saved
                ? emptyText
                : saved
                  ? topicLabel
                    ? `No saved posts in ${topicLabel} yet`
                    : 'No saved posts yet'
                  : topicLabel
                    ? `No posts in ${topicLabel} yet`
                    : tab === 'following'
                      ? 'No posts from people you follow yet'
                      : 'No posts yet'}
              {saved ? (
                <button
                  type="button"
                  className={`${s.btn} ${s.btnLink}`}
                  onClick={() => onTab('latest')}
                >
                  Browse latest
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </button>
              ) : (
                <button type="button" className={`${s.btn} ${s.btnLink}`} onClick={onNewPost}>
                  Write a post
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </button>
              )}
            </div>
          ) : null}

          {status === 'ready'
            ? posts.map((p) => (
                <FeedPostCard
                  key={p.id}
                  post={p}
                  myId={myId}
                  onTopic={onTopic}
                  followingIds={followingIds}
                  onFollowChange={onFollowChange}
                  onDeleted={(id) => setPosts((list) => list.filter((x) => x.id !== id))}
                  onBlocked={(uid) => setPosts((list) => list.filter((x) => x.author?.id !== uid))}
                  onUnsaved={
                    saved ? (id) => setPosts((list) => list.filter((x) => x.id !== id)) : undefined
                  }
                />
              ))
            : null}

          {status === 'ready' && next ? (
            <>
              <div ref={sentinel} className={s.sentinel} aria-hidden="true" />
              <button
                type="button"
                className={`${s.btn} ${s.btnLink} ${s.loadMore}`}
                onClick={() => load(next)}
                disabled={more}
              >
                {more ? 'Loading' : 'Load more'}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
