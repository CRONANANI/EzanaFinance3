'use client';

/**
 * Community page (v3, Nov 23 2026): "Research. Discuss. Build Together."
 *   hero        eyebrow, heading, one line
 *   nav row     Feed / Topics / Research Builds / Members / Events, and the
 *               Create Post button (with a post-type menu) on the right
 *   Feed        the editorially featured Echo article, filter chips (All
 *               Posts, Research, Analysis, Ideas, Data, Product,
 *               Announcements), Saved, a sort menu, then posts
 *   right rail  about 272px: Community Overview, Trending, Upcoming Events,
 *               Top Contributors
 * Section, filter, sort, topic, saved and a shared post (?post=) live in the
 * URL, so back and forward work. Every section loads and fails on its own,
 * and nothing shows a number it cannot back. Search and Messages stay in the
 * nav row's tools.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import s from '@/app/(dashboard)/community/community.module.css';
import { useAuth } from '@/components/AuthProvider';
import { CommunityFeed } from './CommunityFeed';
import { CommunitySearch } from './CommunityHeader';
import {
  CommunityHero,
  HubTabs,
  CreatePostButton,
  FeaturedBanner,
  FeedFilterBar,
} from './CommunityHub';
import { OverviewCard, TrendingCard, EventsCard, ContributorsCard } from './CommunityRail';
import { TopicsPanel, MembersPanel, EventsPanel } from './CommunityPanels';
import { CreatePostDialog } from './CreatePostDialog';
import { useCommunityResource, sendJson } from './useCommunityResource';
import { normalizeTopic } from '@/lib/community/redesign';
import { normalizeFilter, normalizeSort, normalizeHubTab } from '@/lib/community/v3';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function CommunityPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { user } = useAuth();

  const hub = normalizeHubTab(params.get('tab')) || 'feed';
  const filter = normalizeFilter(params.get('filter'));
  const sort = normalizeSort(params.get('sort'));
  const saved = params.get('view') === 'saved';
  const topic = normalizeTopic(params.get('topic'));
  const pinned = UUID.test(params.get('post') || '') ? params.get('post') : null;

  const me = useCommunityResource('/api/community/me');
  const topicsRes = useCommunityResource('/api/community/topics', { refetchOnFocus: false });
  const topics = useMemo(() => topicsRes.data?.topics || [], [topicsRes.data]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [composer, setComposer] = useState(null); // null | post type key

  /* Partner and admin post types are offered only to those accounts (the
     posts API checks again). */
  const who = useMemo(
    () => ({ partner: Boolean(me.data?.is_partner), admin: Boolean(me.data?.is_admin) }),
    [me.data?.is_partner, me.data?.is_admin],
  );

  /* Whom the member follows, for the Follow action on each post. */
  const [followingIds, setFollowingIds] = useState(null);
  useEffect(() => {
    if (!user?.id) return undefined;
    let alive = true;
    fetch('/api/community/follow?list=following', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { following: [] }))
      .then((d) => alive && setFollowingIds(new Set((d.following || []).map((f) => f.id))))
      .catch(() => alive && setFollowingIds(new Set()));
    return () => {
      alive = false;
    };
  }, [user?.id]);
  const onFollowChange = useCallback((id, on) => {
    setFollowingIds((prev) => {
      const next = new Set(prev || []);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const setParams = useCallback(
    (patch, { push = false } = {}) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      const q = next.toString();
      const url = q ? `${pathname}?${q}` : pathname;
      if (push) router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    },
    [params, pathname, router],
  );

  /* Sections push history (back returns to the last section); filters replace. */
  const onHub = useCallback(
    (t) => setParams({ tab: t === 'feed' ? null : t, post: null }, { push: true }),
    [setParams],
  );
  const onTopic = useCallback(
    (slug) => setParams({ topic: slug, tab: null, view: null }, { push: true }),
    [setParams],
  );
  const onFilter = useCallback(
    (f) => setParams({ filter: f === 'all' ? null : f, view: null }),
    [setParams],
  );
  const onSort = useCallback((k) => setParams({ sort: k === 'relevant' ? null : k }), [setParams]);
  const onSaved = useCallback((on) => setParams({ view: on ? 'saved' : null }), [setParams]);

  const onToggleFollowTopic = async (t) => {
    const next = !t.followed;
    const flip = (val) =>
      topicsRes.setData((d) => ({
        ...d,
        topics: (d?.topics || []).map((x) => (x.slug === t.slug ? { ...x, followed: val } : x)),
      }));
    flip(next);
    try {
      if (next) await sendJson('/api/community/topics', { body: { slug: t.slug } });
      else
        await sendJson(`/api/community/topics?slug=${encodeURIComponent(t.slug)}`, {
          method: 'DELETE',
        });
    } catch {
      flip(!next);
    }
  };

  const onPosted = async () => {
    setComposer(null);
    /* A new post leads Recent; send the member there. */
    setParams({ tab: null, sort: 'recent', filter: null, view: null, topic: null });
    setRefreshKey((k) => k + 1);
  };

  const topicLabel = topics.find((t) => t.slug === topic)?.label;
  const feedQuery = useMemo(() => ({ sort, filter }), [sort, filter]);
  const buildsQuery = useMemo(() => ({ sort: 'recent', builds: true }), []);

  return (
    <div className="ez-canvas">
      <div className={`${s.page} ${s.cv3Page}`}>
        <div className={s.cv3Layout}>
          <main className={s.cv3Main}>
            <CommunityHero demo={Boolean(me.data?.demo)}>
              <CommunitySearch onOpenPost={(id) => setParams({ tab: null, post: id })} />
            </CommunityHero>

            <HubTabs tab={hub} onTab={onHub}>
              <div className={s.cv3NavTools}>
                <Link
                  href="/community/messages"
                  className={s.cv3IconLink}
                  aria-label={
                    me.data?.has_unread_messages ? 'Messages, unread messages' : 'Messages'
                  }
                >
                  <i className="bi bi-chat-dots" aria-hidden="true" />
                  {me.data?.has_unread_messages ? (
                    <span className={s.dot} aria-hidden="true" />
                  ) : null}
                </Link>
                <CreatePostButton who={who} onCreate={(t) => setComposer(t)} />
              </div>
            </HubTabs>

            <div id="hub-panel" role="tabpanel" aria-labelledby={`hub-tab-${hub}`}>
              {hub === 'feed' ? (
                <>
                  <FeaturedBanner />
                  <FeedFilterBar
                    filter={filter}
                    onFilter={onFilter}
                    sort={sort}
                    onSort={onSort}
                    saved={saved}
                    onSaved={onSaved}
                  />
                  {topicLabel ? (
                    <p className={s.cv3TopicNotice}>
                      <i className="bi bi-hash" aria-hidden="true" />
                      Showing <strong>{topicLabel}</strong>
                      <button
                        type="button"
                        className={`${s.btn} ${s.btnLink}`}
                        onClick={() => setParams({ topic: null })}
                      >
                        Clear
                      </button>
                    </p>
                  ) : null}
                  <CommunityFeed
                    tab={saved ? 'saved' : 'latest'}
                    onTab={(t) => onSaved(t === 'saved')}
                    topic={topic}
                    onTopic={onTopic}
                    topics={topics}
                    refreshKey={refreshKey}
                    myId={me.data?.user_id}
                    pinnedPostId={pinned}
                    onClosePinned={() => setParams({ post: null })}
                    onNewPost={() => setComposer('discussion')}
                    query={saved ? null : feedQuery}
                    followingIds={followingIds}
                    onFollowChange={onFollowChange}
                  />
                </>
              ) : null}

              {hub === 'topics' ? (
                <TopicsPanel
                  topics={topics}
                  loading={topicsRes.loading}
                  onOpenTopic={onTopic}
                  onToggleFollow={onToggleFollowTopic}
                />
              ) : null}

              {hub === 'builds' ? (
                <section>
                  <div className={s.cv3PanelHead}>
                    <div>
                      <h2 className={s.cv3PanelTitle}>Research Builds</h2>
                      <p className={s.cv3Note}>
                        Sonar research members chose to publish here. A build shows only its public
                        share page; private notes, controls and saved reports are never listed.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={`${s.btn} ${s.btnLink}`}
                      onClick={() => setComposer('sonar_share')}
                    >
                      <i className="bi bi-plus-lg" aria-hidden="true" />
                      Share a build
                    </button>
                  </div>
                  <CommunityFeed
                    tab="latest"
                    onTab={() => {}}
                    topic={null}
                    onTopic={onTopic}
                    topics={topics}
                    refreshKey={refreshKey}
                    myId={me.data?.user_id}
                    onNewPost={() => setComposer('sonar_share')}
                    query={buildsQuery}
                    followingIds={followingIds}
                    onFollowChange={onFollowChange}
                    emptyText="No research builds shared yet"
                  />
                </section>
              ) : null}

              {hub === 'members' ? <MembersPanel /> : null}
              {hub === 'events' ? <EventsPanel /> : null}
            </div>
          </main>

          <aside className={s.cv3Rail} aria-label="Community highlights">
            <OverviewCard />
            <TrendingCard onTopic={onTopic} />
            <EventsCard onViewAll={() => onHub('events')} />
            <ContributorsCard />
          </aside>
        </div>

        <button
          type="button"
          className={s.fab}
          aria-label="Create post"
          onClick={() => setComposer('discussion')}
        >
          <i className="bi bi-plus-lg" aria-hidden="true" />
        </button>

        <CreatePostDialog
          open={Boolean(composer)}
          initialType={composer || 'discussion'}
          onClose={() => setComposer(null)}
          topics={topics}
          defaultTopic={topic}
          who={who}
          onPosted={onPosted}
        />
      </div>
    </div>
  );
}
