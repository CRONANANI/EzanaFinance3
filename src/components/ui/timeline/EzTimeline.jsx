'use client';

/**
 * EzTimeline: a vertical activity feed grouped by day (port of the 21st.dev
 * timeline to the Ezana stack: plain JS, scoped CSS, framer-motion, Bootstrap
 * Icons). Day labels stay pinned while their rows scroll, the connecting line
 * draws as rows come into view, rows with detail expand in place, and rows
 * added after mount slide in at the top. Arrow keys move between expandable
 * rows; Enter or Space expands one.
 *
 * Props
 *   events: [{ id, at, actor?, title, meta?, detail?, avatar?, initials?, icon?, tone?, href? }]
 *     at      ISO string or epoch ms
 *     title   completes the actor ("replied: ...")
 *     detail  revealed in place when the row is expanded
 *     tone    'neutral' | 'success' | 'danger' (system events)
 *   now       epoch ms for relative labels and day groups
 *   label     accessible name
 *   order     'newest' (default) or 'oldest'
 *   maxHeight optional scroll height
 *   timeZone, locale, headingLevel, className
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import './ez-timeline.css';

const HOUR = 3_600_000;
const STEP = 0.09;
const EASE_ENTER = [0.16, 1, 0.3, 1];
const SPRING = { type: 'spring', stiffness: 260, damping: 30 };

function dayKey(time, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(time));
  const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function relative(time, now) {
  const minutes = Math.max(0, Math.floor((now - time) / 60_000));
  if (minutes < 1) return { short: 'Now', long: 'just now' };
  if (minutes < 60) return { short: `${minutes}m`, long: `${minutes} min ago` };
  const hours = Math.floor(minutes / 60);
  return { short: `${hours}h`, long: `${hours} ${hours === 1 ? 'hour' : 'hours'} ago` };
}

function Row({ row, last, expanded, onToggle, timeLabel, timeFull, reduced, schedule, fresh }) {
  const detailId = useId();
  const [delay, setDelay] = useState(null);
  const shown = delay !== null;
  const d = (delay ?? 0) + (fresh ? 0.12 : 0);
  const tone = row.avatar || row.initials ? undefined : row.tone || 'neutral';
  const Trigger = row.detail ? 'button' : 'div';

  return (
    <motion.li
      className="ezt-item"
      initial={fresh && !reduced ? { opacity: 0, y: -10 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, transition: { duration: reduced ? 0 : 0.18 } }}
      transition={reduced ? { duration: 0 } : SPRING}
      onViewportEnter={() => setDelay((c) => c ?? schedule())}
      viewport={{ once: true, amount: 0.2 }}
    >
      <motion.span
        className="ezt-marker"
        data-tone={tone}
        aria-hidden="true"
        initial={reduced ? false : { scale: 0.4, opacity: 0 }}
        animate={shown || reduced ? { scale: 1, opacity: 1 } : undefined}
        transition={
          reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 18, delay: d }
        }
      >
        {row.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.avatar} alt="" width={28} height={28} decoding="async" loading="lazy" />
        ) : row.initials ? (
          <span className="ezt-initials">{row.initials}</span>
        ) : row.icon ? (
          <i className={`bi ${row.icon}`} />
        ) : (
          <span className="ezt-dot" />
        )}
      </motion.span>
      {!last ? (
        <motion.span
          className="ezt-segment"
          aria-hidden="true"
          initial={reduced ? false : { scaleY: 0 }}
          animate={shown || reduced ? { scaleY: 1 } : undefined}
          transition={reduced ? { duration: 0 } : { ...SPRING, delay: d + 0.1 }}
        />
      ) : null}
      <div className="ezt-content">
        <Trigger
          className={`ezt-trigger${row.detail ? ' is-interactive' : ''}`}
          {...(row.detail
            ? {
                type: 'button',
                'data-ezt-trigger': '',
                'aria-expanded': expanded,
                'aria-controls': expanded ? detailId : undefined,
                onClick: onToggle,
              }
            : {})}
        >
          <span className="ezt-text">
            <span className="ezt-title">
              {row.actor ? <span className="ezt-actor">{row.actor}</span> : null}
              {row.actor ? ' ' : ''}
              {row.title}
            </span>
            {row.meta ? <span className="ezt-meta">{row.meta}</span> : null}
          </span>
          <time className="ezt-time" dateTime={new Date(row.time).toISOString()} title={timeFull}>
            <span aria-hidden="true">{timeLabel}</span>
            <span className="ezt-sr">{timeFull}</span>
          </time>
          {row.detail ? (
            <motion.i
              className="bi bi-chevron-down ezt-chevron"
              aria-hidden="true"
              initial={false}
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={
                reduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 32 }
              }
            />
          ) : null}
        </Trigger>
        <AnimatePresence initial={false}>
          {expanded && row.detail ? (
            <motion.div
              key="detail"
              id={detailId}
              className="ezt-detail"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { height: SPRING, opacity: { duration: 0.2, ease: EASE_ENTER } }
              }
            >
              <div className="ezt-detail-inner">{row.detail}</div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}

export function EzTimeline({
  events,
  now,
  label,
  order = 'newest',
  timeZone,
  locale = 'en-US',
  maxHeight,
  headingLevel = 3,
  className = '',
}) {
  const reduced = Boolean(useReducedMotion());
  const id = useId();
  const zone = useMemo(
    () => timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [timeZone],
  );
  const scrollerRef = useRef(null);
  const [expanded, setExpanded] = useState(() => new Set());

  /* Rows that arrive after mount are fresh: they slide in. */
  const known = useRef(null);
  if (known.current === null) known.current = new Set(events.map((e) => e.id));
  const fresh = useMemo(() => {
    const set = new Set();
    events.forEach((e) => {
      if (!known.current.has(e.id)) set.add(e.id);
    });
    return set;
  }, [events]);
  useEffect(() => {
    events.forEach((e) => known.current.add(e.id));
  }, [events]);
  const announcement = useMemo(() => {
    const added = events.filter((e) => fresh.has(e.id));
    return added.length
      ? `New: ${added.map((e) => [e.actor, e.title].filter(Boolean).join(' ')).join('. ')}`
      : '';
  }, [events, fresh]);

  const groups = useMemo(() => {
    const today = dayKey(now, zone);
    const yesterday = dayKey(now - 24 * HOUR, zone);
    const heading = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: zone,
    });
    const sign = order === 'oldest' ? 1 : -1;
    const byDay = new Map();
    events
      .map((e) => ({ ...e, time: new Date(e.at).getTime() }))
      .filter((e) => Number.isFinite(e.time))
      .sort((a, b) => sign * (a.time - b.time))
      .forEach((e) => {
        const day = dayKey(e.time, zone);
        byDay.set(day, [...(byDay.get(day) || []), e]);
      });
    return [...byDay].map(([day, rows]) => ({
      day,
      rows,
      label:
        day === today
          ? 'Today'
          : day === yesterday
            ? 'Yesterday'
            : heading.format(new Date(rows[0].time)),
    }));
  }, [events, now, zone, locale, order]);

  const formats = useMemo(
    () => ({
      clock: new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: zone,
      }),
      full: new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: zone,
      }),
    }),
    [locale, zone],
  );

  /* Rows that enter view together reveal a beat apart, so the line draws down. */
  const nextReveal = useRef(0);
  const schedule = useCallback(() => {
    if (reduced) return 0;
    const t = performance.now() / 1000;
    const start = Math.min(Math.max(t, nextReveal.current), t + 0.45);
    nextReveal.current = start + STEP;
    return start - t;
  }, [reduced]);

  const toggle = (rid) =>
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(rid)) next.delete(rid);
      else next.add(rid);
      return next;
    });

  const onKeyDown = (e) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const triggers = [...(scrollerRef.current?.querySelectorAll('[data-ezt-trigger]') || [])];
    const i = triggers.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const n =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? triggers.length - 1
          : Math.min(Math.max(i + (e.key === 'ArrowDown' ? 1 : -1), 0), triggers.length - 1);
    triggers[n]?.focus();
  };

  return (
    <div className={`ezt ${className}`.trim()} role="region" aria-label={label}>
      <div
        ref={scrollerRef}
        className={`ezt-scroller${maxHeight ? ' is-scrolling' : ''}`}
        style={maxHeight ? { maxHeight } : undefined}
        onKeyDown={onKeyDown}
      >
        {groups.map((g) => (
          <section key={g.day} className="ezt-group" aria-labelledby={`${id}-${g.day}`}>
            <div className="ezt-day" role="heading" aria-level={headingLevel} id={`${id}-${g.day}`}>
              <span>{g.label}</span>
              <span className="ezt-count">
                {g.rows.length} {g.rows.length === 1 ? 'update' : 'updates'}
              </span>
            </div>
            <ol className="ezt-list">
              <AnimatePresence initial={false}>
                {g.rows.map((row, i) => {
                  const today = g.label === 'Today' && now - row.time < 12 * HOUR;
                  const rel = today ? relative(row.time, now) : null;
                  const clock = formats.clock.format(new Date(row.time));
                  const full = formats.full.format(new Date(row.time));
                  return (
                    <Row
                      key={row.id}
                      row={row}
                      last={i === g.rows.length - 1}
                      expanded={expanded.has(row.id)}
                      onToggle={() => toggle(row.id)}
                      timeLabel={rel ? rel.short : clock}
                      timeFull={rel ? `${rel.long}, ${full}` : full}
                      reduced={reduced}
                      schedule={schedule}
                      fresh={fresh.has(row.id)}
                    />
                  );
                })}
              </AnimatePresence>
            </ol>
          </section>
        ))}
      </div>
      <span className="ezt-sr" role="status">
        {announcement}
      </span>
    </div>
  );
}

export default EzTimeline;
