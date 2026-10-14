'use client';

/**
 * Floating notification cards either side of the orbital map. Each card is
 * born at the map's Sonar hub as a speck, flies outward while it grows, and
 * lands full size in a free slot beside the map; it holds, then fades. The
 * cards are one line each (icon, dimension, headline) on a
 * transparent ground. Copy is illustrative (news-samples.js); names, icons
 * and colours come from the taxonomy. The rails are decorative: aria-hidden,
 * and hidden below 900px so the map keeps its width. Slots are chosen
 * deterministically (no Math.random). Under prefers-reduced-motion the cards
 * fade in place and spawn half as often.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const SLOTS_PER_SIDE = 3;
const SHOW_MS = 4600;
/* A new card every three seconds (was 1.5s). */
const NOTIFICATION_INTERVAL_MS = 3000;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

/* One card. Measures where it will land, then starts its flight from the
   hub: the offset from its landing spot back to the hub is handed to the
   keyframes as --from-x / --from-y, so the card travels outward from the
   map to where it sits. */
function NewsCard({ card, originRef }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    const origin = originRef.current;
    if (el && origin) {
      const hub = origin.querySelector('.dso-sc-hub');
      const o = (hub || origin).getBoundingClientRect();
      /* The hub target is centred on the radar point it marks. */
      const ox = o.left + o.width / 2;
      const oy = o.top + o.height / 2;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--from-x', `${Math.round(ox - (r.left + r.width / 2))}px`);
      el.style.setProperty('--from-y', `${Math.round(oy - (r.top + r.height / 2))}px`);
    }
    setReady(true);
  }, [originRef]);

  return (
    <div
      ref={ref}
      className={`dso-news-card${ready ? ' is-flying' : ''}`}
      style={{ gridRow: card.slot + 1, '--dso-news-color': card.color }}
    >
      <span className="dso-news-dim">
        <i className={`bi ${card.icon}`} aria-hidden="true" />
        {card.dimension}
      </span>
      <span className="dso-news-headline">{card.headline}</span>
    </div>
  );
}

export default function OrbitalNewsTicker({ items, children }) {
  const [cards, setCards] = useState([]);
  const seq = useRef(0);
  const cursor = useRef(0);
  const centerRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!items?.length) return undefined;
    const spawn = () => {
      const now = Date.now();
      const id = seq.current;
      const side = id % 2 === 0 ? 'left' : 'right';
      const item = items[cursor.current % items.length];
      setCards((prev) => {
        const alive = prev.filter((c) => c.until > now);
        const used = new Set(alive.filter((c) => c.side === side).map((c) => c.slot));
        const free = [];
        for (let s = 0; s < SLOTS_PER_SIDE; s += 1) if (!used.has(s)) free.push(s);
        if (!free.length) return alive;
        const slot = free[id % free.length];
        return [...alive, { ...item, id, side, slot, until: now + SHOW_MS }];
      });
      seq.current += 1;
      cursor.current += 1;
    };
    spawn();
    const t = setInterval(spawn, reduced ? NOTIFICATION_INTERVAL_MS * 2 : NOTIFICATION_INTERVAL_MS);
    return () => clearInterval(t);
  }, [items, reduced]);

  const side = (which) => (
    <div className="dso-news-side" data-side={which} aria-hidden="true">
      {cards
        .filter((c) => c.side === which)
        .map((c) => (
          <NewsCard key={c.id} card={c} originRef={centerRef} />
        ))}
    </div>
  );

  return (
    <div className="dso-news">
      {side('left')}
      <div className="dso-news-center" ref={centerRef}>
        {children}
      </div>
      {side('right')}
    </div>
  );
}
