'use client';

/**
 * Ticker filter for the Politician Tracker: a combobox with typeahead over
 * the tickers members disclosed trading in the selected period
 * (/api/politicians/tickers). Choosing one ranks members on that ticker's
 * trades only; the page states the active filter and offers a clear.
 *
 * Symbols only: suggestions come from the stored ticker field, never from
 * asset names. A typed symbol that is well formed is accepted on Enter even
 * when the suggestions are unavailable.
 *
 * Accessible as an ARIA 1.2 combobox: Down / Up move through the options,
 * Enter picks, Escape closes (and, with nothing open, clears the text).
 */
import { useEffect, useId, useRef, useState } from 'react';

const SYMBOL = /^[A-Z0-9][A-Z0-9./-]{0,11}$/;

export default function TickerFilter({ value, days, onChange }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(-1);
  const [state, setState] = useState('idle'); // idle | loading | ready | failed
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const listId = useId();

  /* Suggestions for the typed prefix, debounced; a newer keystroke aborts
     the older request so a slow answer never replaces a newer one. */
  useEffect(() => {
    if (!open) return undefined;
    const q = text.trim().toUpperCase();
    if (q && !SYMBOL.test(q)) {
      setItems([]);
      setState('ready');
      return undefined;
    }
    const ctrl = new AbortController();
    const id = setTimeout(() => {
      setState('loading');
      const qs = new URLSearchParams({ days: String(days) });
      if (q) qs.set('q', q);
      fetch(`/api/politicians/tickers?${qs}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d?.ok) {
            setItems([]);
            setState('failed');
            return;
          }
          setItems(d.tickers || []);
          setActive(-1);
          setState('ready');
        })
        .catch((e) => {
          if (e?.name !== 'AbortError') setState('failed');
        });
    }, 150);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [text, open, days]);

  /* Close on a press outside. */
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const choose = (t) => {
    onChange(t);
    setText('');
    setOpen(false);
    setActive(-1);
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === 'Enter') {
      const typed = text.trim().toUpperCase();
      if (active >= 0 && items[active]) {
        e.preventDefault();
        choose(items[active].ticker);
      } else if (typed && SYMBOL.test(typed)) {
        e.preventDefault();
        choose(typed);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
      } else if (text) {
        e.preventDefault();
        setText('');
      }
    }
  };

  const activeId = active >= 0 && items[active] ? `${listId}-${active}` : undefined;
  const typed = text.trim().toUpperCase();

  return (
    <div className="ptk-tkf" ref={rootRef}>
      <label className="ptk-tkf-field">
        <span className="ptk-tkf-label dsc-mn">TICKER</span>
        <input
          ref={inputRef}
          className="ptk-tkf-input dsc-mn"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-label="Filter by ticker"
          autoComplete="off"
          spellCheck={false}
          placeholder={value ? value : 'All tickers'}
          value={text}
          maxLength={12}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
        />
        <i className="bi bi-chevron-down ptk-tkf-chev" aria-hidden="true" />
      </label>
      {open ? (
        <ul className="ptk-tkf-menu" id={listId} role="listbox" aria-label="Tickers">
          {value ? (
            <li
              role="option"
              aria-selected={false}
              className="ptk-tkf-opt ptk-tkf-opt--all"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => choose(null)}
            >
              All tickers
            </li>
          ) : null}
          {items.map((t, i) => (
            <li
              key={t.ticker}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={t.ticker === value}
              className={`ptk-tkf-opt${i === active ? ' is-active' : ''}${
                t.ticker === value ? ' is-on' : ''
              }`}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => choose(t.ticker)}
              onMouseEnter={() => setActive(i)}
            >
              <span className="ptk-tkf-sym dsc-mn">{t.ticker}</span>
              <span className="ptk-tkf-co">{t.company || ''}</span>
              <span className="ptk-tkf-n dsc-mn">
                {t.members} {t.members === 1 ? 'member' : 'members'} · {t.trades}
              </span>
            </li>
          ))}
          {state === 'loading' && !items.length ? (
            <li className="ptk-tkf-note" role="presentation">
              Searching tickers…
            </li>
          ) : null}
          {state === 'ready' && !items.length ? (
            <li className="ptk-tkf-note" role="presentation">
              {typed ? `No disclosed trades in ${typed} in this period.` : 'No tickers on file.'}
            </li>
          ) : null}
          {state === 'failed' ? (
            <li className="ptk-tkf-note" role="presentation">
              Suggestions are unavailable. Type a symbol and press Enter.
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
