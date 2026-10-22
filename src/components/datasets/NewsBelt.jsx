'use client';

/**
 * The /datasets overview's signal belt (Oct 16, live and clickable Oct 21).
 *
 * One continuous belt beside the Ezana logo in the top bar. Each card is one
 * line: its dimension icon (in the dimension's hue), the headline and a short
 * meta. Every card is a real row from a live dataset, mapped by
 * src/lib/datasets/pulse; with no rows the belt renders nothing.
 *
 * Clicking a card calls `onSelect(key)`, which the page uses to open that
 * signal's brief in place of the deck. The list is drawn twice for the
 * seamless loop: the first copy is the interactive one (buttons in tab order),
 * the second is aria-hidden and out of the tab order, so assistive tech and
 * keyboards meet each signal once. Hover or keyboard focus pauses the belt so
 * a card never slides out from under the pointer or the focus ring. Under
 * prefers-reduced-motion it stops and scrolls by hand instead.
 *
 * Same mechanics as DatasetTicker: the track moves -50% on a loop at the
 * shared pixels-per-second speed from useTickerSpeed.
 */
import { useMemo, useRef } from 'react';
import { useTickerSpeed } from './useTickerSpeed';
import './news-belt.css';

/* A trailing figure in the headline ("... wins $313K", "... transits +4.2%")
   is drawn in mint. Presentation only: the row text is unchanged, it is just
   split for styling. */
const TRAILING_VALUE = /^(.*\s)((?:\$|[+-](?=[\d$]))\S+|\d[\d.,]*%)$/;

function Headline({ text }) {
  const m = TRAILING_VALUE.exec(text);
  if (!m) return <span className="dsnb-headline">{text}</span>;
  return (
    <span className="dsnb-headline">
      {m[1]}
      <span className="dsnb-value">{m[2]}</span>
    </span>
  );
}

function Card({ it, copy, onSelect, active }) {
  const style = it.dimensionId ? { '--dsnb-hue': `var(--dim-hue-${it.dimensionId})` } : undefined;
  const body = (
    <>
      <i className={`bi ${it.icon} dsnb-icon`} aria-hidden="true" />
      <Headline text={it.headline} />
      {it.meta ? <span className="dsnb-meta">{it.meta}</span> : null}
    </>
  );
  if (!onSelect) {
    return (
      <span className="dsnb-card" style={style}>
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`dsnb-card dsnb-card--btn${active ? ' is-active' : ''}`}
      style={style}
      tabIndex={copy ? -1 : 0}
      aria-hidden={copy ? 'true' : undefined}
      aria-pressed={copy ? undefined : active}
      onClick={() => onSelect(it.key)}
    >
      {body}
    </button>
  );
}

export default function NewsBelt({
  items,
  onSelect = null,
  ariaLabel = 'Latest signals',
  activeKey = null,
}) {
  const list = useMemo(() => (items || []).filter((it) => it && it.headline).slice(0, 60), [items]);
  const trackRef = useRef(null);
  useTickerSpeed(trackRef, [list.length]);

  if (!list.length) return null;
  const interactive = typeof onSelect === 'function';

  return (
    <div
      className={`dsnb-belt${interactive ? ' is-interactive' : ''}`}
      role={interactive ? 'region' : undefined}
      aria-label={interactive ? ariaLabel : undefined}
      aria-hidden={interactive ? undefined : 'true'}
    >
      <div className="dsnb-track" ref={trackRef}>
        {list.map((it) => (
          <Card
            key={`a-${it.key}`}
            it={it}
            copy={false}
            onSelect={onSelect}
            active={it.key === activeKey}
          />
        ))}
        {list.map((it) => (
          <Card
            key={`b-${it.key}`}
            it={it}
            copy
            onSelect={onSelect}
            active={it.key === activeKey}
          />
        ))}
      </div>
    </div>
  );
}
