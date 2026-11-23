'use client';

/**
 * Community v3 page chrome (Nov 23 2026):
 *   CommunityHero      eyebrow, heading and one line, over a faint dot field
 *   HubTabs            Feed, Topics, Research Builds, Members, Events (a
 *                      tablist with arrow keys; the page keeps it in the URL)
 *   CreatePostButton   the page's one filled button, with a type menu
 *   FeaturedBanner     the editorially featured Echo article(s): is_featured
 *                      on echo_articles, set by editors. Pagination dots only
 *                      when more than one item is featured.
 *   FeedFilterBar      All Posts / Research / Analysis / Ideas / Data /
 *                      Product / Announcements, a Saved toggle, and a sort
 *                      menu (Most Relevant, Recent, Trending, Most Discussed).
 */
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import s from '@/app/(dashboard)/community/community.module.css';
import { useCommunityResource } from './useCommunityResource';
import { HUB_TABS, FEED_FILTERS, FEED_SORTS, COMPOSER_TYPES, canUseType } from '@/lib/community/v3';

export function CommunityHero({ demo = false, children }) {
  return (
    <header className={s.cv3Hero}>
      <div className={s.cv3HeroDots} aria-hidden="true" />
      {children ? <div className={s.cv3HeroTools}>{children}</div> : null}
      <p className={s.cv3Eyebrow}>
        Ezana Community
        {demo ? <span className={s.sampleTag}>Sample content</span> : null}
      </p>
      <h1 className={s.cv3Heading}>Research. Discuss. Build Together.</h1>
      <p className={s.cv3Lede}>
        A community for market intelligence, data-driven research, and the next financial
        infrastructure.
      </p>
    </header>
  );
}

export function HubTabs({ tab, onTab, children }) {
  const refs = useRef([]);
  const onKey = (e, i) => {
    let j = null;
    if (e.key === 'ArrowRight') j = (i + 1) % HUB_TABS.length;
    if (e.key === 'ArrowLeft') j = (i - 1 + HUB_TABS.length) % HUB_TABS.length;
    if (e.key === 'Home') j = 0;
    if (e.key === 'End') j = HUB_TABS.length - 1;
    if (j === null) return;
    e.preventDefault();
    refs.current[j]?.focus();
    onTab(HUB_TABS[j].key);
  };
  return (
    <div className={s.cv3NavRow}>
      <div className={s.cv3Tabs} role="tablist" aria-label="Community sections">
        {HUB_TABS.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`hub-tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls="hub-panel"
            tabIndex={tab === t.key ? 0 : -1}
            className={s.cv3Tab}
            onClick={() => onTab(t.key)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <i className={`bi ${t.icon}`} aria-hidden="true" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}

function useDismiss(open, setOpen, wrapRef) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen, wrapRef]);
}

export function CreatePostButton({ onCreate, who = {} }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const menuId = useId();
  useDismiss(open, setOpen, wrap);
  const types = COMPOSER_TYPES.filter((t) => canUseType(t.key, who));
  return (
    <div className={s.cv3Create} ref={wrap}>
      <button
        type="button"
        className={`${s.btn} ${s.btnPrimary} ${s.cv3CreateMain}`}
        onClick={() => onCreate('discussion')}
      >
        <i className="bi bi-plus-lg" aria-hidden="true" />
        Create Post
      </button>
      <button
        type="button"
        className={`${s.btn} ${s.btnPrimary} ${s.cv3CreateChevron}`}
        aria-label="Choose a post type"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <i className="bi bi-chevron-down" aria-hidden="true" />
      </button>
      {open ? (
        <ul className={s.cv3Menu} role="menu" id={menuId}>
          {types.map((t) => (
            <li key={t.key} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onCreate(t.key);
                }}
              >
                <i className={`bi ${t.icon}`} aria-hidden="true" />
                {t.label}
              </button>
            </li>
          ))}
          <li role="none">
            <button type="button" role="menuitem" disabled aria-disabled="true">
              <i className="bi bi-cpu" aria-hidden="true" />
              Quant Lab Strategy Share
              <span className={s.cv3Soon}>Not yet</span>
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

export function FeaturedBanner() {
  const { data, loading } = useCommunityResource('/api/community/featured', {
    refetchOnFocus: false,
  });
  const items = data?.items || [];
  const [i, setI] = useState(0);
  if (loading) return <div className={`${s.cv3Featured} ${s.skel}`} aria-hidden="true" />;
  if (!items.length) return null;
  const item = items[Math.min(i, items.length - 1)];
  return (
    <section className={s.cv3Featured} aria-roledescription="Featured" aria-label="Featured">
      <div className={s.cv3FeaturedText}>
        <p className={s.cv3FeaturedLabel}>
          <i className="bi bi-broadcast" aria-hidden="true" />
          Ezana Echo
          {item.read_minutes ? (
            <span className={s.cv3FeaturedMeta}>{item.read_minutes} min read</span>
          ) : null}
        </p>
        <h2 className={s.cv3FeaturedTitle}>
          <Link href={item.url}>{item.title}</Link>
        </h2>
        {item.excerpt ? <p className={s.cv3FeaturedExcerpt}>{item.excerpt}</p> : null}
        <div className={s.cv3FeaturedFoot}>
          <Link href={item.url} className={`${s.btn} ${s.btnLink}`}>
            Read Analysis
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
          {items.length > 1 ? (
            <div className={s.cv3Dots} role="group" aria-label="Featured articles">
              {items.map((it, j) => (
                <button
                  key={it.slug}
                  type="button"
                  aria-label={`Show featured article ${j + 1} of ${items.length}`}
                  aria-current={j === i ? 'true' : undefined}
                  onClick={() => setI(j)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {item.image ? (
        <div className={s.cv3FeaturedMedia}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image} alt={item.image_alt || ''} loading="lazy" decoding="async" />
        </div>
      ) : null}
    </section>
  );
}

export function FeedFilterBar({ filter, onFilter, sort, onSort, saved, onSaved }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const menuId = useId();
  useDismiss(open, setOpen, wrap);
  const current = FEED_SORTS.find((x) => x.key === sort) || FEED_SORTS[0];
  return (
    <div className={s.cv3FilterBar}>
      <div className={s.cv3Chips} role="group" aria-label="Filter posts">
        {FEED_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={s.cv3Chip}
            aria-pressed={!saved && filter === f.key}
            onClick={() => onFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className={s.cv3FilterTools}>
        <button
          type="button"
          className={s.cv3Chip}
          aria-pressed={saved}
          onClick={() => onSaved(!saved)}
        >
          <i className={`bi ${saved ? 'bi-bookmark-fill' : 'bi-bookmark'}`} aria-hidden="true" />
          Saved
        </button>
        <div className={s.cv3Sort} ref={wrap}>
          <button
            type="button"
            className={s.cv3SortBtn}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={menuId}
            disabled={saved}
            onClick={() => setOpen((v) => !v)}
          >
            <span className={s.muted}>Sort:</span> {current.label}
            <i className="bi bi-chevron-down" aria-hidden="true" />
          </button>
          {open ? (
            <ul className={s.cv3Menu} role="listbox" id={menuId} aria-label="Sort posts">
              {FEED_SORTS.map((o) => (
                <li key={o.key} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.key === current.key}
                    onClick={() => {
                      setOpen(false);
                      onSort(o.key);
                    }}
                  >
                    {o.label}
                    {o.key === current.key ? (
                      <i className="bi bi-check2" aria-hidden="true" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
