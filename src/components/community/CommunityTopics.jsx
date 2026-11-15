'use client';

/**
 * The topic row (Nov 15 2026): topics as text-only filters under the KPI
 * strip, replacing the left navigation column. "All topics" first, the
 * member's followed topics next (marked with a dot), then the rest. Show
 * more reveals the full list, and "Follow topics" opens the follow menu.
 * Below 1024px the row scrolls sideways instead of wrapping.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import s from '@/app/(dashboard)/community/community.module.css';

const TOPICS_SHOWN = 6;

function TopicFollowMenu({ topics, onToggleFollow }) {
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
        className={`${s.topicItem} ${s.topicMore}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Follow topics
        <i className="bi bi-plus-lg" aria-hidden="true" />
      </button>
      {open ? (
        <div className={s.popover} role="menu" aria-label="Follow topics">
          {topics.length === 0 ? <p className={s.empty}>No topics yet.</p> : null}
          {topics.map((t) => (
            <button
              key={t.slug}
              type="button"
              role="menuitemcheckbox"
              aria-checked={t.followed}
              className={s.popItem}
              onClick={() => onToggleFollow(t)}
            >
              <i className={`bi ${t.followed ? 'bi-check-lg' : 'bi-plus-lg'}`} aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CommunityTopics({ topic, onTopic, topics, onToggleFollow }) {
  const [expanded, setExpanded] = useState(false);
  const ordered = useMemo(
    () => [...topics.filter((t) => t.followed), ...topics.filter((t) => !t.followed)],
    [topics],
  );
  /* The active topic always shows, even when it sits past the fold. */
  const shown = useMemo(() => {
    if (expanded) return ordered;
    const head = ordered.slice(0, TOPICS_SHOWN);
    const active = ordered.find((t) => t.slug === topic);
    return active && !head.includes(active) ? [...head, active] : head;
  }, [expanded, ordered, topic]);

  return (
    <nav className={s.topicRow} aria-label="Topics">
      <button
        type="button"
        className={s.topicItem}
        aria-pressed={!topic}
        onClick={() => onTopic(null)}
      >
        All topics
      </button>
      {shown.map((t) => (
        <button
          key={t.slug}
          type="button"
          className={s.topicItem}
          aria-pressed={topic === t.slug}
          onClick={() => onTopic(t.slug)}
        >
          {t.label}
          {t.followed ? <span className={s.topicDot} role="img" aria-label="Following" /> : null}
        </button>
      ))}
      {ordered.length > TOPICS_SHOWN ? (
        <button
          type="button"
          className={`${s.topicItem} ${s.topicMore}`}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : 'Show more'}
          <i
            className={`bi ${expanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}
            aria-hidden="true"
          />
        </button>
      ) : null}
      <TopicFollowMenu topics={topics} onToggleFollow={onToggleFollow} />
    </nav>
  );
}
