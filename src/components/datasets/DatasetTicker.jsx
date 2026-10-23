'use client';

import { useMemo, useRef, useState } from 'react';
import { useTickerSpeed } from './useTickerSpeed';
import EventDetailModal from './EventDetailModal';
import './dataset-ticker.css';

/**
 * Page-agnostic conveyor-belt ticker for dataset pages. Each page supplies its
 * own items — the component knows nothing about contracts, 13F, or anything
 * else. Item shape:
 *   { id, lead, main, value, detail?, href? }
 *     lead   — small mono label on the left  (e.g. agency, fund, form type)
 *     main   — the entity name               (e.g. recipient, issuer, insider)
 *     value  — right-aligned mono figure      (e.g. $ amount, %, shares)
 *     detail — optional { label: value } map for the generic detail modal
 *     href   — optional source-filing link shown in the modal
 *
 * Every item is a real button (Enter/Space work for free). A click pauses the
 * belt and either hands the item to the page's own `onSelect` (pages with a
 * richer destination, a side panel say, keep it) or opens the generic
 * EventDetailModal, fed by the page's `renderDetails(item)` when published.
 * The belt resumes when the modal closes. Empty items → renders nothing.
 */
export default function DatasetTicker({
  items,
  onSelect,
  renderDetails,
  getTitle,
  ariaLabel = 'Latest activity',
}) {
  const loop = useMemo(() => {
    const list = (items || []).filter((it) => it && it.main).slice(0, 30);
    return list.length ? [...list, ...list] : []; // duplicate for a seamless marquee
  }, [items]);
  const trackRef = useRef(null);
  const [active, setActive] = useState(null);
  useTickerSpeed(trackRef, [loop.length]);

  if (!loop.length) return null;

  const pick = (it) => {
    if (typeof onSelect === 'function') onSelect(it);
    else setActive(it);
  };

  return (
    <div className="dsx-ticker" aria-label={ariaLabel}>
      <div className="dsx-ticker-track" ref={trackRef} data-paused={active ? 'true' : undefined}>
        {loop.map((it, i) => (
          <button
            type="button"
            key={`${it.id}-${i}`}
            className="dsx-titem"
            onClick={() => pick(it)}
            aria-label={`${it.main}${it.value != null ? `, ${it.value}` : ''}. Open detail.`}
          >
            {it.lead && <span className="dsx-tlead dsx-mono">{it.lead}</span>}
            <span className="dsx-tmain">{it.main}</span>
            {it.value != null && <span className="dsx-tval dsx-mono">{it.value}</span>}
          </button>
        ))}
      </div>
      <EventDetailModal
        item={active}
        onClose={() => setActive(null)}
        renderDetails={renderDetails}
        title={getTitle}
      />
    </div>
  );
}
