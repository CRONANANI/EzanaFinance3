'use client';

import { useRef } from 'react';

const VIEWS = [
  { id: 'company', label: 'Company', icon: 'bi-building' },
  { id: 'industry', label: 'Industry', icon: 'bi-grid-3x3-gap' },
  { id: 'portfolio', label: 'Portfolio', icon: 'bi-pie-chart' },
];

/**
 * Compact segmented control, sized to its content and right-aligned in the
 * page header. Keeps the existing setView / ?view= contract. Arrow keys move
 * between segments; Home and End jump to the ends.
 */
export function ViewToggle({ view, setView }) {
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
    <div
      ref={listRef}
      role="tablist"
      aria-label="Research view"
      className="crx-view-toggle"
      onKeyDown={onKeyDown}
    >
      {VIEWS.map((v) => {
        const selected = view === v.id;
        return (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className="crx-view-toggle-btn"
            onClick={() => setView(v.id)}
          >
            <i className={`bi ${v.icon}`} aria-hidden="true" />
            <span>{v.label}</span>
          </button>
        );
      })}
    </div>
  );
}
