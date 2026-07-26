'use client';

import { useMemo } from 'react';
import './dataset-ticker.css';

/**
 * Page-agnostic conveyor-belt ticker for dataset pages. Each page supplies its
 * own items — the component knows nothing about contracts, 13F, or anything
 * else. Item shape:
 *   { id, lead, main, value, onClick? }
 *     lead  — small mono label on the left  (e.g. agency, fund, form type)
 *     main  — the entity name               (e.g. recipient, issuer, insider)
 *     value — right-aligned mono figure      (e.g. $ amount, %, shares)
 *
 * If `onSelect` is provided, items are buttons; otherwise plain spans
 * (decorative). Empty items → renders nothing (honest: no fake ticker).
 */
export default function DatasetTicker({ items, onSelect, ariaLabel = 'Latest activity' }) {
  const loop = useMemo(() => {
    const list = (items || []).filter((it) => it && it.main).slice(0, 30);
    return list.length ? [...list, ...list] : []; // duplicate for a seamless marquee
  }, [items]);

  if (!loop.length) return null;

  const interactive = typeof onSelect === 'function';

  return (
    <div className="dsx-ticker" aria-label={ariaLabel}>
      <div className="dsx-ticker-track">
        {loop.map((it, i) => {
          const inner = (
            <>
              {it.lead && <span className="dsx-tlead dsx-mono">{it.lead}</span>}
              <span className="dsx-tmain">{it.main}</span>
              {it.value != null && <span className="dsx-tval dsx-mono">{it.value}</span>}
            </>
          );
          return interactive ? (
            <button
              type="button"
              key={`${it.id}-${i}`}
              className="dsx-titem"
              onClick={() => onSelect(it)}
              aria-label={`${it.main}${it.value != null ? `, ${it.value}` : ''}. Open detail.`}
            >
              {inner}
            </button>
          ) : (
            <span key={`${it.id}-${i}`} className="dsx-titem is-static">
              {inner}
            </span>
          );
        })}
      </div>
    </div>
  );
}
