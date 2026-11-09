'use client';

/**
 * Notification filter as a centred dropdown (Nov 2026), replacing the
 * horizontal pill scroller. Same filter keys and counts as before; only the
 * control changes. Click outside or Esc closes, arrows / Home / End move,
 * Enter or Space selects, and focus returns to the trigger.
 *
 *   filters   Array<{ key, label, count }>
 *   value     selected key
 *   onChange  (key) => void
 */
import { useEffect, useId, useRef, useState } from 'react';
import styles from './NotificationFilterMenu.module.css';

export default function NotificationFilterMenu({ filters = [], value, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const listId = useId();

  const selectedIndex = Math.max(
    0,
    filters.findIndex((f) => f.key === value),
  );
  const selected = filters[selectedIndex];

  useEffect(() => {
    if (!open) return undefined;
    setActive(selectedIndex);
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open, selectedIndex]);

  useEffect(() => {
    if (open) optionRefs.current[active]?.focus();
  }, [open, active]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const choose = (key) => {
    onChange?.(key);
    close();
  };

  const onListKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % filters.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + filters.length) % filters.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(filters.length - 1);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      /* Esc inside the menu closes the menu, not the notifications panel. */
      e.stopPropagation();
      close();
    }
  };

  return (
    <div className={`${styles.wrap} ${className}`.trim()} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`Filter notifications: ${selected?.label ?? 'All'}${
          selected?.count > 0 ? `, ${selected.count} unread` : ''
        }`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <i className={`bi bi-funnel ${styles.funnel}`} aria-hidden="true" />
        <span className={styles.triggerLabel}>{selected?.label ?? 'All'}</span>
        {selected?.count > 0 ? <span className={styles.count}>{selected.count}</span> : null}
        <i className={`bi bi-chevron-down ${styles.chev}`} aria-hidden="true" />
      </button>

      {open ? (
        <ul
          id={listId}
          className={styles.menu}
          role="listbox"
          aria-label="Filter notifications"
          onKeyDown={onListKey}
        >
          {filters.map((f, i) => {
            const isSelected = f.key === value;
            return (
              <li
                key={f.key}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                role="option"
                aria-selected={isSelected}
                tabIndex={i === active ? 0 : -1}
                className={`${styles.option} ${isSelected ? styles.selected : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(f.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    choose(f.key);
                  }
                }}
              >
                <i
                  className={`bi bi-check2 ${styles.check}`}
                  aria-hidden="true"
                  style={{ visibility: isSelected ? 'visible' : 'hidden' }}
                />
                <span className={styles.optionLabel}>{f.label}</span>
                {f.count > 0 ? <span className={styles.optionCount}>{f.count}</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
