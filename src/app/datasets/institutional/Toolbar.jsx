'use client';

/**
 * The toolbar's grouped search: one input over the loaded managers and
 * securities, results grouped, Enter opens the first result's panel.
 */
import { useMemo, useState } from 'react';
import { usd } from '@/lib/titans/format';

export function GroupedToolbarSearch({ overview, onManager, onSecurity }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const t = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!t) return [];
    const managers = (overview?.topFilers || [])
      .filter((r) => (r.filer || '').toLowerCase().includes(t) || String(r.cik || '').includes(t))
      .slice(0, 4)
      .map((r) => ({ kind: 'manager', id: r.cik, label: r.filer || r.cik, meta: usd(r.valueUsd) }));
    const securities = (overview?.widelyHeld || [])
      .filter(
        (r) =>
          (r.ticker || '').toLowerCase().includes(t) ||
          (r.issuer || '').toLowerCase().includes(t) ||
          (r.cusip || '').toLowerCase().includes(t),
      )
      .slice(0, 5)
      .map((r) => ({
        kind: 'security',
        id: r.ticker || r.cusip,
        label: r.ticker || r.issuer,
        meta: r.ticker ? r.issuer : r.cusip,
      }));
    return [...managers, ...securities];
  }, [overview, t]);

  const pick = (r) => {
    setQ('');
    if (r.kind === 'manager') onManager(r.id);
    else onSecurity(r.id);
  };
  const onKeyDown = (e) => {
    if (e.key === 'Escape') return setQ('');
    if (!results.length) return undefined;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(results[Math.min(active, results.length - 1)]);
    }
    return undefined;
  };

  let lastKind = null;
  return (
    <div className="inst-search">
      <i className="bi bi-search" aria-hidden="true" />
      <input
        type="search"
        placeholder="Find a manager, ticker, issuer or CUSIP"
        aria-label="Find a manager, ticker, issuer or CUSIP"
        role="combobox"
        aria-expanded={Boolean(t)}
        aria-controls="inst-search-list"
        aria-activedescendant={results.length ? `inst-search-opt-${active}` : undefined}
        value={q}
        maxLength={60}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      {t ? (
        <ul
          className="inst-results"
          id="inst-search-list"
          role="listbox"
          aria-label="Search results"
        >
          {results.map((r, i) => {
            const header = r.kind !== lastKind;
            lastKind = r.kind;
            return (
              <li key={`${r.kind}-${r.id}`}>
                {header ? (
                  <p className="inst-results-group" aria-hidden="true">
                    {r.kind === 'manager' ? 'Managers' : 'Securities'}
                  </p>
                ) : null}
                <button
                  type="button"
                  role="option"
                  id={`inst-search-opt-${i}`}
                  aria-selected={i === active}
                  className={`inst-result${i === active ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(r)}
                >
                  <span className="inst-ellipsis">{r.label}</span>
                  <span className="inst-mono inst-muted inst-ellipsis">{r.meta}</span>
                </button>
              </li>
            );
          })}
          {!results.length ? (
            <li className="inst-results-none">Nothing in the loaded tables matches.</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
