'use client';

/**
 * "Connect your brokerage" picker (Nov 2026 redesign).
 *
 * A flex column of header, search, scrollable grid and footer: only the grid scrolls,
 * so the search is never clipped and the footer never covers the last row. Tiles are
 * horizontal (logo, name clamped to two lines with the full name in `title`, tags in
 * normal flow under the name), so no tag can sit on a logo. Rendered through a portal
 * to document.body, so a transformed or overflow-hidden ancestor cannot clip it.
 *
 * Styles: ConnectBrokerageModal.module.css, theme tokens only (light mode through
 * body.light-mode). The steps after a pick (provider choice, disclosure) stay in
 * AddPortfolioModal.jsx.
 *
 * Props
 *   open            boolean
 *   onClose         () => void
 *   institutions    Array<{ id, name, logoUrl?, country?, readOnly?, providerCount? }>
 *   totalCount      number, total institutions available (subtitle)
 *   moreCount       number, matches not shown (the grid is capped); 0 hides the note
 *   loading         boolean
 *   query           string, controlled search value (with onQueryChange)
 *   onQueryChange   (q) => void, pass to filter outside the component
 *   onSelect        (institution) => void
 *   onAddManually   () => void
 *   renderLogo      (institution) => node, optional custom logo (else logoUrl or initials)
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ConnectBrokerageModal.module.css';

const nf = new Intl.NumberFormat('en-US');

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function ConnectBrokerageModal({
  open,
  onClose,
  institutions = [],
  totalCount,
  moreCount = 0,
  loading = false,
  query: controlledQuery,
  onQueryChange,
  onSelect,
  onAddManually,
  renderLogo,
}) {
  const [mounted, setMounted] = useState(false);
  const [localQuery, setLocalQuery] = useState('');
  const inputRef = useRef(null);
  const returnFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const isControlled = typeof onQueryChange === 'function';
  const query = isControlled ? (controlledQuery ?? '') : localQuery;
  const setQuery = isControlled ? onQueryChange : setLocalQuery;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
      returnFocusRef.current?.focus?.();
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (isControlled) return institutions;
    const q = query.trim().toLowerCase();
    if (!q) return institutions;
    return institutions.filter((i) => i.name?.toLowerCase().includes(q));
  }, [institutions, query, isControlled]);

  if (!open || !mounted) return null;

  const count = totalCount ?? institutions.length;
  const searching = query.trim().length > 0;

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cbm-title"
        aria-describedby="cbm-subtitle"
      >
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            <h2 id="cbm-title" className={styles.title}>
              Connect your brokerage
            </h2>
            <p id="cbm-subtitle" className={styles.subtitle}>
              {loading ? (
                'Loading institutions to sync your holdings.'
              ) : (
                <>
                  Search <span className={styles.num}>{nf.format(count)}</span>{' '}
                  {count === 1 ? 'institution' : 'institutions'} to sync your holdings.
                </>
              )}
            </p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div className={styles.searchWrap}>
          <label className={styles.search}>
            <i className={`bi bi-search ${styles.searchIcon}`} aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by institution name"
              aria-label="Search institutions"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                className={styles.clear}
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <i className="bi bi-x-circle-fill" aria-hidden="true" />
              </button>
            )}
          </label>
        </div>

        <div className={styles.body}>
          {loading ? (
            <ul className={styles.grid} aria-busy="true" aria-label="Loading institutions">
              {Array.from({ length: 9 }).map((_, i) => (
                <li key={i} className={styles.skeleton} />
              ))}
            </ul>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>
                <i className="bi bi-bank" aria-hidden="true" />
              </span>
              <p className={styles.emptyTitle}>
                {searching ? (
                  <>No institutions match &ldquo;{query}&rdquo;</>
                ) : (
                  'Institutions could not be loaded'
                )}
              </p>
              <p className={styles.emptyText}>
                {searching
                  ? 'Check the spelling, or add your holdings manually instead.'
                  : 'Refresh and try again, or add your holdings manually instead.'}
              </p>
              <button type="button" className={styles.ghost} onClick={onAddManually}>
                <i className="bi bi-plus-lg" aria-hidden="true" />
                Add investments manually
              </button>
            </div>
          ) : (
            <>
              <ul className={styles.grid} role="list">
                {filtered.map((inst) => (
                  <li key={inst.id}>
                    <button
                      type="button"
                      className={styles.tile}
                      onClick={() => onSelect?.(inst)}
                      title={inst.name}
                    >
                      <span className={styles.logo}>
                        {renderLogo ? (
                          renderLogo(inst)
                        ) : inst.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={inst.logoUrl} alt="" loading="lazy" decoding="async" />
                        ) : (
                          <span className={styles.logoFallback}>{initials(inst.name)}</span>
                        )}
                      </span>

                      <span className={styles.meta}>
                        <span className={styles.name}>{inst.name}</span>
                        {(inst.providerCount > 1 || inst.readOnly || inst.country) && (
                          <span className={styles.tags}>
                            {inst.providerCount > 1 && (
                              <span className={`${styles.tag} ${styles.tagAccent}`}>
                                <span className={styles.num}>{inst.providerCount}</span> providers
                              </span>
                            )}
                            {inst.readOnly && (
                              <span className={styles.tag}>
                                <i className="bi bi-eye" aria-hidden="true" />
                                Read only
                              </span>
                            )}
                            {inst.country && <span className={styles.country}>{inst.country}</span>}
                          </span>
                        )}
                      </span>

                      <i className={`bi bi-chevron-right ${styles.chev}`} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
              {moreCount > 0 ? (
                <p className={styles.more}>
                  <span className={styles.num}>{nf.format(moreCount)}</span> more{' '}
                  {moreCount === 1 ? 'institution matches' : 'institutions match'}. Keep typing to
                  narrow the list.
                </p>
              ) : null}
            </>
          )}
        </div>

        <footer className={styles.footer}>
          <span className={styles.footNote}>Can&apos;t find your institution?</span>
          <button type="button" className={styles.primary} onClick={onAddManually}>
            <i className="bi bi-plus-lg" aria-hidden="true" />
            Add investments manually
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
