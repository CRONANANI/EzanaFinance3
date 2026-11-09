'use client';

/**
 * Community sidebar (Nov 2026): the feed nav, MY COMMUNITY and TOPICS.
 * Below 1024px the nav becomes a horizontal chip row (CommunityChipRow) and
 * topics move into the feed's own select.
 *
 * Only items with a real destination render. Not shown for now, for lack of
 * one: My Network, Legendary Investors (no index page) and Saved Posts (the
 * feed has no saved filter yet).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import s from '@/app/(dashboard)/community/community.module.css';
import { CountPill } from './primitives';
import { groupNumber } from '@/lib/community/redesign';

const TOPICS_SHOWN = 6;

function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

export function useNavItems({ tab, onTab, me }) {
  return useMemo(() => {
    const profileHref = me?.username ? `/profile/${encodeURIComponent(me.username)}` : null;
    return {
      main: [
        {
          key: 'feed',
          icon: 'bi-house',
          label: 'Feed',
          current: tab !== 'trending',
          onClick: () => onTab(null),
        },
        {
          key: 'trending',
          icon: 'bi-graph-up-arrow',
          label: 'Trending',
          pressed: tab === 'trending',
          onClick: () => onTab('trending'),
        },
        {
          key: 'discussions',
          icon: 'bi-chat',
          label: 'Active Discussions',
          onClick: () => scrollToId('active-discussions'),
        },
        {
          key: 'insights',
          icon: 'bi-bar-chart',
          label: 'Community Insights',
          onClick: () => scrollToId('community-insights'),
        },
      ],
      mine: [
        profileHref && {
          key: 'profile',
          icon: 'bi-person',
          label: 'My Profile',
          href: profileHref,
        },
        {
          key: 'friends',
          icon: 'bi-people',
          label: 'Friends',
          href: '/community/messages',
          count: me ? groupNumber(me.friends) : null,
        },
        {
          key: 'following',
          icon: 'bi-shield-check',
          label: 'Following',

          onClick: () => onTab('following'),
          count: me ? groupNumber(me.following) : null,
        },
      ].filter(Boolean),
    };
  }, [tab, onTab, me]);
}

function NavRow({ item }) {
  const inner = (
    <>
      <i className={`bi ${item.icon}`} aria-hidden="true" />
      <span>{item.label}</span>
      {item.count != null ? <CountPill value={item.count} /> : null}
    </>
  );
  if (item.href) {
    return (
      <Link href={item.href} className={s.navItem}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={s.navItem}
      onClick={item.onClick}
      aria-current={item.current ? 'page' : undefined}
      aria-pressed={item.pressed === undefined ? undefined : item.pressed}
    >
      {inner}
    </button>
  );
}

function TopicFollowPopover({ topics, onToggleFollow }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrap.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className={s.topicPop} ref={wrap}>
      <button
        type="button"
        className={s.plusBtn}
        aria-label="Follow a topic"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <i className="bi bi-plus-lg" aria-hidden="true" />
      </button>
      {open ? (
        <div className={s.popover} role="menu" aria-label="Follow topics">
          {topics.length === 0 ? (
            <p className={s.empty} style={{ padding: 8 }}>
              No topics yet.
            </p>
          ) : null}
          {topics.map((t) => (
            <button
              key={t.slug}
              type="button"
              role="menuitemcheckbox"
              aria-checked={t.followed}
              className={s.popItem}
              onClick={() => onToggleFollow(t)}
            >
              <i className={`bi ${t.followed ? 'bi-check2' : 'bi-plus'}`} aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CommunitySidebar({ tab, onTab, topic, onTopic, topics, onToggleFollow, me }) {
  const nav = useNavItems({ tab, onTab, me });
  const [expanded, setExpanded] = useState(false);
  const ordered = useMemo(
    () => [...topics.filter((t) => t.followed), ...topics.filter((t) => !t.followed)],
    [topics],
  );
  const shown = expanded ? ordered : ordered.slice(0, TOPICS_SHOWN);

  return (
    <nav className={s.sidebar} aria-label="Community">
      <div className={s.navGroup}>
        {nav.main.map((item) => (
          <NavRow key={item.key} item={item} />
        ))}
      </div>
      <div className={s.divider} />
      <div className={s.navEyebrow}>My community</div>
      <div className={s.navGroup}>
        {nav.mine.map((item) => (
          <NavRow key={item.key} item={item} />
        ))}
      </div>
      <div className={s.divider} />
      <div className={s.navEyebrow}>
        <span>Topics</span>
        <TopicFollowPopover topics={topics} onToggleFollow={onToggleFollow} />
      </div>
      <div className={s.navGroup}>
        <button
          type="button"
          className={s.navItem}
          aria-pressed={!topic}
          onClick={() => onTopic(null)}
        >
          <i className="bi bi-hash" aria-hidden="true" />
          <span>All Topics</span>
        </button>
        {shown.map((t) => (
          <button
            key={t.slug}
            type="button"
            className={s.navItem}
            aria-pressed={topic === t.slug}
            onClick={() => onTopic(t.slug)}
          >
            <i className="bi bi-hash" aria-hidden="true" />
            <span className={s.ellipsis}>{t.label}</span>
            {t.followed ? <span className={s.topicDot} aria-label="Following" role="img" /> : null}
          </button>
        ))}
        {ordered.length > TOPICS_SHOWN ? (
          <button
            type="button"
            className={s.navItem}
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            <i
              className={`bi ${expanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}
              aria-hidden="true"
            />
            <span>{expanded ? 'Show less' : 'Show more'}</span>
          </button>
        ) : null}
      </div>
    </nav>
  );
}

/** Below 1024px: the same destinations as a horizontal chip row. */
export function CommunityChipRow({ tab, onTab, me }) {
  const nav = useNavItems({ tab, onTab, me });
  const items = [...nav.main, ...nav.mine];
  return (
    <nav className={s.chipRow} aria-label="Community">
      {items.map((item) =>
        item.href ? (
          <Link key={item.key} href={item.href} className={s.chip}>
            <i className={`bi ${item.icon}`} aria-hidden="true" />
            {item.label}
          </Link>
        ) : (
          <button
            key={item.key}
            type="button"
            className={s.chip}
            onClick={item.onClick}
            aria-current={item.current ? 'page' : undefined}
            aria-pressed={item.pressed === undefined ? undefined : item.pressed}
          >
            <i className={`bi ${item.icon}`} aria-hidden="true" />
            {item.label}
          </button>
        ),
      )}
    </nav>
  );
}
