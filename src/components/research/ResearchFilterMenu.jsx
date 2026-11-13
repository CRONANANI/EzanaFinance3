'use client';

/**
 * The filter menu at the right edge of the research search pill. Its options
 * follow the selected view (Company, Industry or Portfolio); the rules live
 * in @/lib/research/research-filters.
 *
 * A badge on the button counts the groups that are narrowing the page, so a
 * filter left on is never invisible.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { FILTER_GROUPS, countActive } from '@/lib/research/research-filters';

const VIEW_NAME = { company: 'Company', industry: 'Industry', portfolio: 'Portfolio' };

export function ResearchFilterMenu({ view, filters, onChoose, onReset }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();
  const groups = FILTER_GROUPS[view] || [];
  const active = countActive(filters, view);

  /* Close on a click elsewhere and on Escape; Escape returns focus. */
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /* The options change with the view, so a menu left open would mislead. */
  useEffect(() => setOpen(false), [view]);

  return (
    <div className="crx-filter" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="crx-filter-btn"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={
          active ? `${VIEW_NAME[view]} filters, ${active} active` : `${VIEW_NAME[view]} filters`
        }
        onClick={() => setOpen((v) => !v)}
      >
        <i className="bi bi-sliders" aria-hidden="true" />
        {active ? (
          <span className="crx-filter-count" aria-hidden="true">
            {active}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          className="crx-filter-panel"
          role="dialog"
          aria-label={`${VIEW_NAME[view]} filters`}
        >
          <div className="crx-filter-head">
            <span className="crx-filter-title">{VIEW_NAME[view]} filters</span>
            <button
              type="button"
              className="crx-filter-reset"
              onClick={() => onReset(view)}
              disabled={!active}
            >
              Reset
            </button>
          </div>

          {groups.map((group) => {
            const value = filters[view][group.id];
            const multi = group.kind === 'multi';
            return (
              <fieldset key={group.id} className="crx-filter-group">
                <legend className="crx-filter-legend">{group.label}</legend>
                <div className="crx-filter-options">
                  {multi ? (
                    <button
                      type="button"
                      className="crx-filter-chip"
                      aria-pressed={value.length === 0}
                      onClick={() => onChoose(view, group.id, null)}
                    >
                      All
                    </button>
                  ) : null}
                  {group.options.map((option) => {
                    const on = multi ? value.includes(option.id) : value === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className="crx-filter-chip"
                        aria-pressed={on}
                        onClick={() => onChoose(view, group.id, option.id)}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default ResearchFilterMenu;
