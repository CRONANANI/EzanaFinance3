'use client';

/**
 * Community page (Nov 2026 redesign): header, then three columns: the
 * sidebar, the stats and feed, and the right rail (Insights, Active
 * Discussions, Leaderboard, People to Follow). Every section loads and fails
 * on its own. Tab, topic and a shared post (?post=) live in the URL.
 *
 * Feed default: Following; Trending (with a hint) when the member follows
 * nobody yet.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import s from '@/app/(dashboard)/community/community.module.css';
import { EvoComposer } from '@/components/community/redesign_v2/EvoComposer';
import { CommunityHeader } from './CommunityHeader';
import { CommunitySidebar, CommunityChipRow } from './CommunitySidebar';
import { CommunityStats } from './CommunityStats';
import { CommunityFeed } from './CommunityFeed';
import { CommunityInsights } from './CommunityInsights';
import { ActiveDiscussions } from './ActiveDiscussions';
import { CommunityLeaderboard } from './CommunityLeaderboard';
import { PeopleToFollow } from './PeopleToFollow';
import { useCommunityResource, sendJson } from './useCommunityResource';
import { normalizeTab, normalizeTopic } from '@/lib/community/redesign';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ComposerDialog({ open, onClose, topics, defaultTopic, onPosted }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className={s.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={s.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="composer-title"
        ref={dialogRef}
      >
        <div className={s.dialogHead}>
          <h2 className={s.dialogTitle} id="composer-title">
            New Post
          </h2>
          <button type="button" className={s.iconBtn} aria-label="Close" onClick={onClose}>
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
        <EvoComposer
          topics={topics}
          defaultTopic={defaultTopic || ''}
          onPosted={onPosted}
          autoFocusTitle
        />
      </div>
    </div>
  );
}

export function CommunityPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlTab = normalizeTab(params.get('tab'));
  const topic = normalizeTopic(params.get('topic'));
  const pinned = UUID.test(params.get('post') || '') ? params.get('post') : null;

  const me = useCommunityResource('/api/community/me');
  const topicsRes = useCommunityResource('/api/community/topics', { refetchOnFocus: false });
  const topics = useMemo(() => topicsRes.data?.topics || [], [topicsRes.data]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);

  /* Following by default; Trending (with a hint) for a member who follows nobody. */
  const followsNobody = me.data ? me.data.following === 0 : false;
  const meSettled = !me.loading;
  const tab = urlTab || (me.error ? 'trending' : followsNobody ? 'trending' : 'following');
  const showFollowHint = !urlTab && followsNobody;

  const setParams = useCallback(
    (patch) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const onTab = useCallback((t) => setParams({ tab: t }), [setParams]);
  const onTopic = useCallback((slug) => setParams({ topic: slug }), [setParams]);
  const openPost = useCallback(
    (id) => {
      setParams({ post: id });
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document
        .getElementById('community-feed-title')
        ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    },
    [setParams],
  );

  const onToggleFollow = async (t) => {
    const next = !t.followed;
    topicsRes.setData((d) => ({
      ...d,
      topics: (d?.topics || []).map((x) => (x.slug === t.slug ? { ...x, followed: next } : x)),
    }));
    try {
      if (next) await sendJson('/api/community/topics', { body: { slug: t.slug } });
      else
        await sendJson(`/api/community/topics?slug=${encodeURIComponent(t.slug)}`, {
          method: 'DELETE',
        });
    } catch {
      topicsRes.setData((d) => ({
        ...d,
        topics: (d?.topics || []).map((x) => (x.slug === t.slug ? { ...x, followed: !next } : x)),
      }));
    }
  };

  const onFollowed = () => {
    me.reload();
    if (tab === 'following') setRefreshKey((k) => k + 1);
  };

  const onPosted = async () => {
    setComposerOpen(false);
    /* A new post shows under Latest (Following lists other people's posts). */
    if (tab !== 'latest') onTab('latest');
    else setRefreshKey((k) => k + 1);
  };

  return (
    <div className="ez-canvas">
      <div className={s.page}>
        <CommunityHeader
          hasUnreadMessages={Boolean(me.data?.has_unread_messages)}
          demo={Boolean(me.data?.demo)}
          onNewPost={() => setComposerOpen(true)}
          onOpenPost={openPost}
        />

        <div className={s.grid}>
          <CommunitySidebar
            tab={tab}
            onTab={onTab}
            topic={topic}
            onTopic={onTopic}
            topics={topics}
            onToggleFollow={onToggleFollow}
            me={me.data}
          />

          <div className={s.center}>
            <CommunityChipRow tab={tab} onTab={onTab} me={me.data} />
            <CommunityStats />
            {meSettled ? (
              <CommunityFeed
                tab={tab}
                onTab={onTab}
                topic={topic}
                onTopic={onTopic}
                topics={topics}
                showFollowHint={showFollowHint && tab === 'trending'}
                refreshKey={refreshKey}
                myId={me.data?.user_id}
                pinnedPostId={pinned}
                onClosePinned={() => setParams({ post: null })}
                onNewPost={() => setComposerOpen(true)}
              />
            ) : (
              <section className={s.card} aria-busy="true">
                <div className={s.skel} style={{ height: 44, marginBottom: 14 }} />
                <div className={s.skel} style={{ height: 140 }} />
              </section>
            )}
          </div>

          <aside className={s.rail} aria-label="Community highlights">
            <CommunityInsights onTopic={onTopic} />
            <ActiveDiscussions
              onOpenPost={openPost}
              onViewAll={() => {
                onTab('trending');
                document.getElementById('community-feed-title')?.scrollIntoView({ block: 'start' });
              }}
            />
            <CommunityLeaderboard />
            <PeopleToFollow onFollowed={onFollowed} />
          </aside>
        </div>

        <button
          type="button"
          className={s.fab}
          aria-label="New Post"
          onClick={() => setComposerOpen(true)}
        >
          <i className="bi bi-pencil-square" aria-hidden="true" />
        </button>

        <ComposerDialog
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          topics={topics}
          defaultTopic={topic}
          onPosted={onPosted}
        />
      </div>
    </div>
  );
}
