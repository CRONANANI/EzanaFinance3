'use client';

import { useRef } from 'react';
import { SECTIONS } from '@/lib/research/sectionStack';

/**
 * Sticky section tabs. A tab swaps its section into the slot below (no anchor
 * scrolling); a pinned tab shows a pin before its label. Arrow keys move
 * between tabs, Home and End jump to the ends.
 */
export function SectionTabs({ state, onOpen, compactQuote = null }) {
  const listRef = useRef(null);

  const onKeyDown = (e) => {
    const tabs = [...(listRef.current?.querySelectorAll('[role="tab"]') || [])];
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
    if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
    if (e.key === 'Home') next = tabs[0];
    if (e.key === 'End') next = tabs[tabs.length - 1];
    if (next) {
      e.preventDefault();
      next.focus();
      next.click();
    }
  };

  return (
    <nav className="crx-tabs-bar" aria-label="Company research sections">
      {compactQuote}
      <div
        ref={listRef}
        className="crx-tabs"
        role="tablist"
        aria-label="Sections"
        onKeyDown={onKeyDown}
      >
        {SECTIONS.map((s) => {
          const selected = state.active === s.id;
          const pinned = state.pinned.includes(s.id);
          return (
            <button
              key={s.id}
              id={`crx-tab-${s.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`crx-section-${s.id}`}
              tabIndex={selected ? 0 : -1}
              className="crx-tab"
              onClick={() => onOpen(s.id, s.label)}
            >
              {pinned && <i className="bi bi-pin-angle-fill crx-tab-pin" aria-hidden="true" />}
              {s.label}
              {pinned && <span className="crx-visually-hidden"> (pinned)</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
