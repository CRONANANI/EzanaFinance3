'use client';

/**
 * Sticky filter bar: category chips with live counts, venue, window and
 * search. Every change writes the URL (router.replace, no history entry);
 * search commits after 200ms. On mobile, venue, window and search move into a
 * bottom sheet opened by the Filters chip.
 */
import { useEffect, useRef, useState } from 'react';
import { PAGE_CATEGORIES } from '@/lib/prediction-markets/page-model';
import { Seg, cx } from './parts';
import { int } from './format';

const VENUE_OPTS = [
  { value: 'all', label: 'All' },
  { value: 'polymarket', label: 'Polymarket' },
  { value: 'kalshi', label: 'Kalshi' },
];
const WINDOW_TITLE = 'Longer windows arrive with price history';

function CategoryChips({ category, counts, onPick, wrap }) {
  const ref = useRef(null);
  const all = [{ slug: 'all', label: 'All' }, ...PAGE_CATEGORIES];
  const onKeyDown = (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const i = all.findIndex((c) => c.slug === category);
    const next = all[(i + (e.key === 'ArrowLeft' ? -1 : 1) + all.length) % all.length];
    onPick(next.slug);
    ref.current?.querySelector(`[data-slug="${next.slug}"]`)?.focus();
  };
  return (
    <div
      ref={ref}
      className={cx('pmk-chips', wrap && 'pmk-chips--wrap')}
      role="radiogroup"
      aria-label="Category"
      onKeyDown={onKeyDown}
    >
      {all.map((c) => {
        const on = c.slug === category;
        return (
          <button
            key={c.slug}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            data-slug={c.slug}
            className={cx('pmk-chip', on && 'is-on')}
            onClick={() => onPick(c.slug)}
          >
            {c.label}
            <span className="pmk-chip-count pmk-num">{int(counts?.[c.slug] ?? 0)}</span>
          </button>
        );
      })}
    </div>
  );
}

function SearchBox({ q, onCommit, id }) {
  const [text, setText] = useState(q);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  useEffect(() => setText(q), [q]);
  useEffect(() => {
    if (text === q) return undefined;
    const t = setTimeout(() => commitRef.current(text.trim()), 200);
    return () => clearTimeout(t);
  }, [text, q]);
  return (
    <label className="pmk-search" htmlFor={id}>
      <i className="bi bi-search" aria-hidden="true" />
      <span className="pmk-sr">Search markets</span>
      <input
        id={id}
        type="search"
        placeholder="Search markets…"
        value={text}
        autoComplete="off"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setText('');
            commitRef.current('');
          }
        }}
      />
    </label>
  );
}

function FilterSheet({ open, onClose, children, matching, onReset, returnFocus }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const el = ref.current;
    const focusables = () =>
      el
        ? [...el.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')].filter(
            (n) => !n.disabled && n.getAttribute('aria-disabled') !== 'true',
          )
        : [];
    focusables()[0]?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const ret = returnFocus.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      ret?.focus();
    };
  }, [open, onClose, returnFocus]);
  if (!open) return null;
  return (
    <div className="pmk-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        ref={ref}
        className="pmk-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Market filters"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="pmk-sheet-grabber" aria-hidden="true" />
        {children}
        <div className="pmk-sheet-actions">
          <button type="button" className="pmk-btn pmk-btn--ghost" onClick={onReset}>
            Reset
          </button>
          <button type="button" className="pmk-btn" onClick={onClose}>
            Show {int(matching)} markets
          </button>
        </div>
      </div>
    </div>
  );
}

export function FilterBar({
  category,
  venue,
  win,
  q,
  counts,
  windowsAvailable,
  defaultWindow,
  matching,
  onChange,
}) {
  const [sheet, setSheet] = useState(false);
  const filtersBtn = useRef(null);
  const windowOpts = ['24h', '7d', '30d'].map((w) => ({
    value: w,
    label: w,
    disabled: !windowsAvailable?.[w],
    title: windowsAvailable?.[w] ? undefined : WINDOW_TITLE,
  }));
  const nonDefault = (venue !== 'all' ? 1 : 0) + (win !== defaultWindow ? 1 : 0) + (q ? 1 : 0);

  const controls = (lg) => (
    <>
      <Seg
        label="Venue"
        value={venue}
        options={VENUE_OPTS}
        onChange={(v) => onChange({ venue: v })}
        size={lg ? 'lg' : undefined}
      />
      <Seg
        label="Window"
        value={win}
        options={windowOpts}
        onChange={(v) => onChange({ window: v })}
        mono
        size={lg ? 'lg' : undefined}
      />
    </>
  );

  return (
    <div className="pmk-bar" role="region" aria-label="Market filters">
      <div className="pmk-bar-inner">
        <CategoryChips
          category={category}
          counts={counts}
          onPick={(slug) => onChange({ category: slug })}
        />
        <div className="pmk-bar-controls">
          {controls(false)}
          <SearchBox q={q} id="pmk-search" onCommit={(v) => onChange({ q: v })} />
        </div>
        <button
          ref={filtersBtn}
          type="button"
          className="pmk-chip pmk-filters-btn"
          aria-haspopup="dialog"
          aria-expanded={sheet}
          onClick={() => setSheet(true)}
        >
          <i className="bi bi-sliders" aria-hidden="true" />
          Filters
          {nonDefault ? <span className="pmk-chip-count pmk-num">{nonDefault}</span> : null}
        </button>
      </div>
      <FilterSheet
        open={sheet}
        onClose={() => setSheet(false)}
        matching={matching}
        returnFocus={filtersBtn}
        onReset={() => onChange({ category: null, venue: null, window: null, q: null })}
      >
        <SearchBox q={q} id="pmk-search-sheet" onCommit={(v) => onChange({ q: v })} />
        <p className="pmk-sheet-label">Venue and window</p>
        <div className="pmk-sheet-segs">{controls(true)}</div>
        <p className="pmk-sheet-label">Category</p>
        <CategoryChips
          category={category}
          counts={counts}
          wrap
          onPick={(slug) => onChange({ category: slug })}
        />
      </FilterSheet>
    </div>
  );
}
