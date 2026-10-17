'use client';

/**
 * The /datasets overview's news conveyor belt (Oct 16).
 *
 * The notification cards that used to fly out of the orbital map's hub now
 * run along the top bar instead, as one continuous belt beside the Ezana logo.
 * Each card is one line: its dimension icon, the headline and a short meta
 * (an amount band, an agency or a date). Every card is a real row mapped by
 * src/app/datasets/sonar/news-feed.js; with no rows the belt renders nothing.
 *
 * Same mechanics as DatasetTicker: the list is duplicated and the track moves
 * -50% on a loop, at the shared pixels-per-second speed from useTickerSpeed so
 * it runs at the same pace as every other dataset belt. Hover pauses it. The
 * belt is decorative (aria-hidden) because the same rows are not actionable
 * here; under prefers-reduced-motion it stops and scrolls by hand instead.
 */
import { useMemo, useRef } from 'react';
import { useTickerSpeed } from './useTickerSpeed';
import './news-belt.css';

export default function NewsBelt({ items }) {
  const loop = useMemo(() => {
    const list = (items || []).filter((it) => it && it.headline).slice(0, 30);
    return list.length ? [...list, ...list] : [];
  }, [items]);
  const trackRef = useRef(null);
  useTickerSpeed(trackRef, [loop.length]);

  if (!loop.length) return null;

  return (
    <div className="dsnb-belt" aria-hidden="true">
      <div className="dsnb-track" ref={trackRef}>
        {loop.map((it, i) => (
          <span key={`${it.key}-${i}`} className="dsnb-card">
            <i className={`bi ${it.icon} dsnb-icon`} aria-hidden="true" />
            <span className="dsnb-headline">{it.headline}</span>
            {it.meta ? <span className="dsnb-meta">{it.meta}</span> : null}
          </span>
        ))}
      </div>
    </div>
  );
}
