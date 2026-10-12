'use client';

/**
 * Floating notification cards either side of the orbital map. Cards pop in,
 * hold, and fade out, cycling through illustrative items from all seven
 * dataset dimensions (news-samples.js; names, icons and colours come from
 * the taxonomy). The rails are decorative: aria-hidden, and hidden entirely
 * below 900px so the map keeps its width. Slots are chosen deterministically
 * (no Math.random): each new card takes the free slot indexed by its own
 * sequence number, so the rotation is even and the markup is reproducible.
 * Under prefers-reduced-motion the cards cross-fade without moving and spawn
 * half as often.
 */
import { useEffect, useRef, useState } from 'react';

const SLOTS_PER_SIDE = 3;
const SHOW_MS = 4200;
const SPAWN_MS = 1400;

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

export default function OrbitalNewsTicker({ items, children }) {
  const [cards, setCards] = useState([]);
  const seq = useRef(0);
  const cursor = useRef(0);
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
    const t = setInterval(spawn, reduced ? SPAWN_MS * 2 : SPAWN_MS);
    return () => clearInterval(t);
  }, [items, reduced]);

  const side = (which) => (
    <div className="dso-news-side" data-side={which} aria-hidden="true">
      {cards
        .filter((c) => c.side === which)
        .map((c) => (
          <div
            key={c.id}
            className="dso-news-card"
            style={{ gridRow: c.slot + 1, '--dso-news-color': c.color }}
          >
            <span className="dso-news-dim">
              <i className={`bi ${c.icon}`} aria-hidden="true" />
              {c.dimension}
            </span>
            <p className="dso-news-headline">{c.headline}</p>
            {c.meta ? <span className="dso-news-meta dso-mono">{c.meta}</span> : null}
          </div>
        ))}
    </div>
  );

  return (
    <div className="dso-news">
      {side('left')}
      <div className="dso-news-center">{children}</div>
      {side('right')}
    </div>
  );
}
