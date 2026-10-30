'use client';

import { useEffect, useRef } from 'react';
import { IconButton, Tooltip } from '@/components/ds';
import { SECTIONS } from '@/lib/research/sectionStack';

const LABEL = Object.fromEntries(SECTIONS.map((s) => [s.id, s.label]));

/**
 * The active section first, then pinned sections. Keyed by id so React moves
 * a pinned section instead of remounting it (an open analysis survives).
 * `renderSection(id)` returns the body; `titles` overrides a heading.
 */
export function SectionStack({
  state,
  order,
  onPin,
  renderSection,
  titles = {},
  stickyOffset = 120,
}) {
  const slotRef = useRef(null);
  const prevActive = useRef(state.active);

  /* On a tab change, bring the slot into view only when the user has
     scrolled past it; otherwise the page stays put. */
  useEffect(() => {
    if (prevActive.current === state.active) return;
    prevActive.current = state.active;
    const el = slotRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < stickyOffset) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({
        top: window.scrollY + top - stickyOffset - 8,
        behavior: reduce ? 'auto' : 'smooth',
      });
    }
  }, [state.active, stickyOffset]);

  return (
    <div ref={slotRef} className="crx-stack">
      {order.map((id) => {
        const active = id === state.active;
        const pinned = state.pinned.includes(id);
        const headingId = `crx-section-${id}-title`;
        return (
          <section
            key={id}
            id={`crx-section-${id}`}
            role={active ? 'tabpanel' : 'region'}
            aria-labelledby={active ? `crx-tab-${id}` : headingId}
            className={`crx-section${active ? ' is-active' : ''}${pinned ? ' is-pinned' : ''}`}
          >
            <header className="crx-section-head">
              <div className="crx-section-titles">
                {pinned && !active && <span className="crx-eyebrow">Pinned</span>}
                <h2 id={headingId} className="crx-section-title">
                  {titles[id] ?? LABEL[id]}
                </h2>
              </div>
              <Tooltip label={pinned ? 'Unpin section' : 'Keep this section on the page'}>
                <IconButton
                  icon={pinned ? 'bi-pin-angle-fill' : 'bi-pin-angle'}
                  label={pinned ? `Unpin ${LABEL[id]}` : `Pin ${LABEL[id]}`}
                  aria-pressed={pinned}
                  className={`crx-section-pin${pinned ? ' is-on' : ''}`}
                  onClick={() => onPin(id, LABEL[id])}
                />
              </Tooltip>
            </header>
            <div className="crx-section-body">{renderSection(id)}</div>
          </section>
        );
      })}
    </div>
  );
}
