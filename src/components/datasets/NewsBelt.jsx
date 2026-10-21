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

/* Oct 21 (Hub V1.1): a trailing dollar figure in the headline ("... wins
   $313K") is drawn in mint. Presentation only: the row text from news-feed.js
   is unchanged, it is just split for styling. */
const TRAILING_VALUE = /^(.*\s)(\$\S+)$/;

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
            <Headline text={it.headline} />
            {it.meta ? <span className="dsnb-meta">{it.meta}</span> : null}
          </span>
        ))}
      </div>
    </div>
  );
}
