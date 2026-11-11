'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';

/* "My Portfolio" chip for the /home performance chart, as a split control
   (Nov 2026). The chip body still shows or hides the main portfolio line;
   the caret opens a menu of everything else the user can plot beside it:
   their other portfolios and their saved trading strategies.

   The menu lists what the page passes in and invents nothing. An empty
   group shows where to create one. Styles: `bs-series-*` in
   src/app/(dashboard)/home/broadsheet.css.

   sources: [{ id, group: 'portfolio' | 'strategy', label, color, pct?, loading? }]
   active:  Set of source ids currently plotted. */
export function PortfolioSeriesMenu({
  label,
  pctLabel,
  pctUp,
  primaryOn,
  onTogglePrimary,
  sources = [],
  active,
  onToggleSource,
  onAddPortfolio,
  hasMockPortfolio,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const caretRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        caretRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /* Arrow keys walk the menu items; Home and End jump to the ends. */
  const onMenuKeyDown = (e) => {
    const items = [...(rootRef.current?.querySelectorAll('[data-series-item]') || [])];
    const i = items.indexOf(document.activeElement);
    let next = null;
    if (e.key === 'ArrowDown') next = items[(i + 1) % items.length];
    if (e.key === 'ArrowUp') next = items[(i - 1 + items.length) % items.length];
    if (e.key === 'Home') next = items[0];
    if (e.key === 'End') next = items[items.length - 1];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  const portfolios = sources.filter((s) => s.group === 'portfolio');
  const strategies = sources.filter((s) => s.group === 'strategy');
  const extraCount = sources.filter((s) => active.has(s.id)).length;
  const lit = primaryOn || extraCount > 0;

  const renderSource = (s) => {
    const on = active.has(s.id);
    return (
      <button
        key={s.id}
        type="button"
        role="menuitemcheckbox"
        aria-checked={on}
        data-series-item
        className="bs-series-item"
        onClick={() => onToggleSource(s.id)}
      >
        <span className="bs-series-item-dot" style={{ background: s.color }} />
        <span className="bs-series-item-label">{s.label}</span>
        {s.loading ? (
          <span className="bs-series-item-pct">Loading</span>
        ) : s.pct ? (
          <span className="bs-series-item-pct">{s.pct}</span>
        ) : null}
        <i className={`bi ${on ? 'bi-check-lg' : ''} bs-series-item-check`} aria-hidden="true" />
      </button>
    );
  };

  return (
    <div className="bs-series" ref={rootRef}>
      <div className={`bs-series-chip${lit ? ' bs-series-chip--active' : ''}`}>
        <button
          type="button"
          className="bs-series-main"
          aria-pressed={primaryOn}
          onClick={onTogglePrimary}
        >
          <span
            className="bs-index-chip-dot"
            style={{ background: primaryOn ? 'var(--bs-green)' : 'var(--bs-border-rule)' }}
          />
          <span>{label}</span>
          {extraCount > 0 ? <span className="bs-series-count">+{extraCount}</span> : null}
          <span
            className="bs-index-chip-pct"
            style={{ color: lit ? 'inherit' : pctUp ? 'var(--bs-green)' : 'var(--bs-red)' }}
          >
            {pctLabel}
          </span>
        </button>
        <button
          ref={caretRef}
          type="button"
          className="bs-series-caret"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label="Choose portfolios and strategies to plot"
          onClick={() => setOpen((v) => !v)}
        >
          <i className={`bi bi-chevron-${open ? 'up' : 'down'}`} aria-hidden="true" />
        </button>
      </div>

      {open ? (
        <div
          id={menuId}
          className="bs-series-menu"
          role="menu"
          aria-label="Chart series"
          onKeyDown={onMenuKeyDown}
        >
          <div className="bs-series-group">Portfolios</div>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={primaryOn}
            data-series-item
            className="bs-series-item"
            onClick={onTogglePrimary}
          >
            <span className="bs-series-item-dot" style={{ background: 'var(--bs-green)' }} />
            <span className="bs-series-item-label">{label}</span>
            <span className="bs-series-item-pct">{pctLabel}</span>
            <i
              className={`bi ${primaryOn ? 'bi-check-lg' : ''} bs-series-item-check`}
              aria-hidden="true"
            />
          </button>
          {portfolios.map(renderSource)}
          <button
            type="button"
            role="menuitem"
            data-series-item
            className="bs-series-item bs-series-item--action"
            onClick={() => {
              setOpen(false);
              onAddPortfolio();
            }}
          >
            <i className="bi bi-plus-lg bs-series-item-ico" aria-hidden="true" />
            <span className="bs-series-item-label">Connect a brokerage</span>
          </button>
          <Link
            href="/trading/mock"
            role="menuitem"
            data-series-item
            className="bs-series-item bs-series-item--action"
            onClick={() => setOpen(false)}
          >
            <i className="bi bi-box-arrow-up-right bs-series-item-ico" aria-hidden="true" />
            <span className="bs-series-item-label">
              {hasMockPortfolio ? 'Open Mock Portfolio' : 'Start a mock portfolio'}
            </span>
          </Link>

          <div className="bs-series-group">Saved strategies</div>
          {strategies.length > 0 ? (
            strategies.map(renderSource)
          ) : (
            <p className="bs-series-empty">No saved strategies yet.</p>
          )}
          <Link
            href="/for-the-quants"
            role="menuitem"
            data-series-item
            className="bs-series-item bs-series-item--action"
            onClick={() => setOpen(false)}
          >
            <i className="bi bi-diagram-3 bs-series-item-ico" aria-hidden="true" />
            <span className="bs-series-item-label">Build a strategy</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export default PortfolioSeriesMenu;
