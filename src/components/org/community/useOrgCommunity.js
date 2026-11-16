'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NO_EXTRAS,
  applySampleAction,
  comingUp,
  reactionByKey,
  shapeFeed,
  summarizeReactions,
  viewerRights,
} from '@/lib/org-community-model';

/**
 * Data for the council Community. Each section loads and fails on its own,
 * from GET /api/org/community?section=..., the council digest and the
 * shared reactions, mentions and messages routes, all as the signed-in
 * member.
 *
 * Sample content: master admin and demo accounts also receive a sample
 * bundle. While it shows, every section reads the bundle and every action is
 * applied to it on the page with the routes' own rules. Nothing is sent.
 */
const BASE = '/api/org/community';
const SAMPLE_URL = `${BASE}/sample`;
const SECTIONS = [
  'feed',
  'events',
  'mentions',
  'inbox',
  'recognition',
  'pitches',
  'notes',
  'council',
  'across',
];

async function getJson(url, opts) {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include', ...opts });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
const send = (url, method, body) =>
  getJson(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

const loadingAll = () =>
  Object.fromEntries([...SECTIONS, 'digest'].map((k) => [k, { status: 'loading', data: null }]));

export function useOrgCommunity() {
  const [live, setLive] = useState(loadingAll);
  const [sample, setSample] = useState({ status: 'loading', bundle: null });
  const [showSample, setShowSample] = useState(true);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const put = useCallback((key, value) => {
    if (alive.current) setLive((s) => ({ ...s, [key]: value }));
  }, []);

  const loadSection = useCallback(
    async (key) => {
      put(key, { status: 'loading', data: null });
      try {
        const url = key === 'digest' ? '/api/org/digest' : `${BASE}?section=${key}`;
        const r = await getJson(url);
        put(key, r.ok ? { status: 'ready', data: r.data } : { status: 'error', data: null });
      } catch {
        put(key, { status: 'error', data: null });
      }
    },
    [put],
  );

  /* Reload quietly after a write: keep the rows on screen while it runs. */
  const reload = useCallback(
    async (key) => {
      try {
        const r = await getJson(`${BASE}?section=${key}`);
        if (r.ok) put(key, { status: 'ready', data: r.data });
      } catch {
        /* The write succeeded; Retry or the next visit catches up. */
      }
    },
    [put],
  );

  useEffect(() => {
    for (const k of [...SECTIONS, 'digest']) loadSection(k);
    (async () => {
      let bundle = null;
      try {
        const r = await getJson(SAMPLE_URL);
        if (r.ok) bundle = r.data?.sample || null;
      } catch {
        bundle = null;
      }
      if (alive.current) setSample({ status: 'ready', bundle });
    })();
  }, [loadSection]);

  const sampleAvailable = Boolean(sample.bundle);
  const sampleActive = sampleAvailable && showSample;
  const sampleLoading = sample.status === 'loading';

  /* What the page draws: one { status, data } per section. */
  const view = useMemo(() => {
    if (sampleActive) {
      const b = sample.bundle;
      const ready = (data) => ({ status: 'ready', data });
      return {
        feed: ready({
          posts: b.posts,
          reactions: b.reactions,
          members: b.members,
          teams: b.teams,
          caps: b.caps,
          rights: b.rights,
          viewer: b.viewer,
        }),
        events: ready({
          events: b.events,
          meetings: b.meetings,
          teams: b.teams,
          canAdd: b.rights.addEvent,
        }),
        mentions: ready({ mentions: b.mentions }),
        inbox: ready({ messages: b.inbox }),
        recognition: ready({ awards: b.awards }),
        pitches: ready({ pitches: b.pitches }),
        notes: ready({ notes: b.notes }),
        council: ready(b.council),
        across: ready(b.across),
        digest: ready(b.digest),
      };
    }
    /* A sample viewer waits for the bundle rather than flashing council data. */
    if (sampleLoading) return loadingAll();
    return live;
  }, [sampleActive, sample.bundle, sampleLoading, live]);

  const feedData = view.feed.data;
  const viewer = feedData?.viewer || null;
  const caps = feedData?.caps || NO_EXTRAS;
  const rights = useMemo(
    () => feedData?.rights || viewerRights(viewer, caps),
    [feedData, viewer, caps],
  );

  const feed = useMemo(() => {
    if (view.feed.status !== 'ready' || !feedData) return [];
    return shapeFeed({
      posts: feedData.posts,
      members: feedData.members,
      teams: feedData.teams,
      reactions: summarizeReactions(feedData.reactions, viewer?.user_id),
      viewer,
      caps,
    });
  }, [view.feed.status, feedData, viewer, caps]);

  const upcoming = useMemo(() => {
    const d = view.events.data;
    if (view.events.status !== 'ready' || !d) return [];
    return comingUp({ events: d.events, meetings: d.meetings, teams: d.teams });
  }, [view.events]);

  const sampleAct = useCallback(
    (action) => {
      const r = applySampleAction(sample.bundle, action, { viewer: sample.bundle.viewer });
      if (r.ok) setSample({ status: 'ready', bundle: r.bundle });
      return { ok: r.ok, error: r.ok ? null : r.error, status: r.status, sample: true };
    },
    [sample.bundle],
  );

  const result = (r) => ({
    ok: r.ok,
    status: r.status,
    error: r.data?.error || null,
    notAvailable: r.data?.code === 'not_available',
  });

  /** New post or reply. */
  const createPost = useCallback(
    async (body) => {
      if (sampleActive) return sampleAct({ type: 'post', body });
      let r;
      try {
        r = await send(`${BASE}/posts`, 'POST', body);
      } catch {
        return { ok: false, status: 0, error: null };
      }
      if (r.ok) await reload('feed');
      return result(r);
    },
    [sampleActive, sampleAct, reload],
  );

  /** 'edit' | 'pin' | 'unpin' | 'delete' | 'remove'. */
  const changePost = useCallback(
    async (id, action, body) => {
      if (sampleActive) return sampleAct({ type: action, id, body });
      let r;
      try {
        if (action === 'delete' || action === 'remove') {
          r = await send(
            `${BASE}/posts/${encodeURIComponent(id)}?as=${action === 'remove' ? 'executive' : 'author'}`,
            'DELETE',
          );
        } else {
          r = await send(`${BASE}/posts/${encodeURIComponent(id)}`, 'PATCH', {
            action,
            ...(body || {}),
          });
        }
      } catch {
        return { ok: false, status: 0, error: null };
      }
      if (r.ok) await reload('feed');
      return result(r);
    },
    [sampleActive, sampleAct, reload],
  );

  /** Toggle a reaction. Updates the post's counts from the route's answer. */
  const react = useCallback(
    async (postId, key) => {
      const def = reactionByKey(key);
      if (!def) return { ok: false };
      if (sampleActive) return sampleAct({ type: 'react', id: postId, key });
      let r;
      try {
        r = await send('/api/org/reactions', 'POST', {
          target_type: 'post',
          target_id: postId,
          emoji: def.stored,
        });
      } catch {
        return { ok: false };
      }
      if (!r.ok) return { ok: false };
      const counts = r.data?.counts || {};
      const mine = new Set(r.data?.mine || []);
      const uid = viewer?.user_id;
      setLive((s) => {
        const d = s.feed.data;
        if (!d) return s;
        const others = (d.reactions || []).filter((x) => x.target_id !== postId);
        const rows = [];
        for (const [emoji, n] of Object.entries(counts)) {
          for (let i = 0; i < n; i += 1) {
            const isMine = i === 0 && mine.has(emoji);
            rows.push({ target_id: postId, emoji, user_id: isMine ? uid : `other-${i}` });
          }
        }
        return { ...s, feed: { status: 'ready', data: { ...d, reactions: [...others, ...rows] } } };
      });
      return { ok: true };
    },
    [sampleActive, sampleAct, viewer],
  );

  const addEvent = useCallback(
    async (body) => {
      if (sampleActive) return sampleAct({ type: 'event', body });
      let r;
      try {
        r = await send(`${BASE}/events`, 'POST', body);
      } catch {
        return { ok: false, status: 0, error: null };
      }
      if (r.ok) await reload('events');
      return result(r);
    },
    [sampleActive, sampleAct, reload],
  );

  const markMentionsSeen = useCallback(
    async (ids) => {
      if (!ids.length) return;
      if (sampleActive) {
        sampleAct({ type: 'mentions-seen', ids });
        return;
      }
      try {
        const r = await send('/api/org/mentions', 'PATCH', { ids });
        if (!r.ok) return;
      } catch {
        return;
      }
      const seen = new Set(ids);
      setLive((s) => {
        const d = s.mentions.data;
        if (!d) return s;
        return {
          ...s,
          mentions: {
            status: 'ready',
            data: {
              ...d,
              mentions: d.mentions.map((m) => (seen.has(m.id) ? { ...m, seen: true } : m)),
            },
          },
        };
      });
    },
    [sampleActive, sampleAct],
  );

  const markRead = useCallback(
    async (id) => {
      if (sampleActive) {
        sampleAct({ type: 'message-read', id });
        return;
      }
      try {
        const r = await send(`/api/org/messages/${encodeURIComponent(id)}/read`, 'PATCH');
        if (!r.ok) return;
      } catch {
        return;
      }
      setLive((s) => {
        const d = s.inbox.data;
        if (!d) return s;
        return {
          ...s,
          inbox: {
            status: 'ready',
            data: {
              ...d,
              messages: d.messages.map((m) => (m.id === id ? { ...m, is_read: true } : m)),
            },
          },
        };
      });
    },
    [sampleActive, sampleAct],
  );

  return {
    view,
    feed,
    upcoming,
    viewer,
    caps,
    rights,
    sampleActive,
    sampleAvailable,
    setShowSample,
    retry: loadSection,
    createPost,
    changePost,
    react,
    addEvent,
    markMentionsSeen,
    markRead,
  };
}
