'use client';

/** Small shared pieces for the home dashboard (Nov 2026 redesign). */
import { useEffect, useId, useRef, useState } from 'react';
import s from '@/app/(dashboard)/home-dashboard/dashboard.module.css';
import { tone as toneOf } from '@/lib/dashboard/derive';

export const cx = (...c) => c.filter(Boolean).join(' ');

/** A number coloured by its sign. The sign is always in the text too. */
export function Signed({ value, children, className }) {
  const t = toneOf(value);
  return <span className={cx(s.num, s[t], className)}>{children}</span>;
}

/** Info icon with a tooltip on hover, focus or tap. */
export function InfoTip({ label, text }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <span className={s.infoWrap} ref={ref}>
      <button
        type="button"
        className={s.info}
        aria-label={`About ${label}`}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        <i className="bi bi-info-circle" aria-hidden="true" />
      </button>
      {open ? (
        <span className={s.tip} role="tooltip" id={id}>
          {text}
        </span>
      ) : null}
    </span>
  );
}

/** Segmented time-range control. */
export function Segmented({ options, value, onChange, label, small }) {
  return (
    <div className={cx(s.seg, small && s.segSm)} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function Badge({ badge }) {
  if (!badge) return null;
  return <span className={cx(s.badge, s[`badge_${badge.tone}`])}>{badge.label}</span>;
}

/** A card. `title` renders as an h2; `tools` sit on the right of the header. */
export function Card({ title, titleExtra, tools, className, children, ...rest }) {
  return (
    <section className={cx(s.card, className)} {...rest}>
      {title ? (
        <div className={s.cardHead}>
          <h2 className={s.cardTitle}>
            {title}
            {titleExtra}
          </h2>
          {tools ? <div className={s.headTools}>{tools}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Skeleton rows that hold the card's height while data loads. */
export function Skeleton({ rows = 5, height = 18, gap = 12 }) {
  return (
    <div aria-busy="true" aria-label="Loading" style={{ display: 'grid', gap }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={s.skel} style={{ height }} />
      ))}
    </div>
  );
}

export function ErrorState({ message = "Couldn't load this section.", onRetry }) {
  return (
    <div className={s.state} role="alert">
      <i className="bi bi-exclamation-circle" aria-hidden="true" />
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className={s.btn} onClick={onRetry}>
          <i className="bi bi-arrow-clockwise" aria-hidden="true" />
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ icon = 'bi-inbox', message, action }) {
  return (
    <div className={s.state}>
      <i className={`bi ${icon}`} aria-hidden="true" />
      <span>{message}</span>
      {action}
    </div>
  );
}
