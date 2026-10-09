'use client';

/**
 * The card drawer: a pull tab pinned to the right edge of a hub page that
 * opens a side sheet listing every component card the hub offers.
 *
 * Each card shows one of three states:
 *   On page   placed; the row offers Remove
 *   Add       placeable now
 *   Members   a members-only card for a signed-out visitor (lock); choosing
 *             it opens the waitlist gate rather than adding it
 *
 * A dialog in the accessible sense: focus moves into the sheet on open,
 * Tab stays inside it, Escape and the backdrop close it, and focus returns to
 * the tab that opened it.
 */
import { useEffect, useRef } from 'react';

export default function HubCardDrawer({
  open,
  onOpenChange,
  cards,
  placed,
  mode,
  guestLimit,
  onAdd,
  onRemove,
  onReset,
}) {
  const sheetRef = useRef(null);
  const tabRef = useRef(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      sheetRef.current?.focus();
      const onKey = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onOpenChange(false);
          return;
        }
        if (e.key !== 'Tab' || !sheetRef.current) return;
        const f = sheetRef.current.querySelectorAll(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        );
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      tabRef.current?.focus();
    }
    return undefined;
  }, [open, onOpenChange]);

  const guest = mode === 'guest';
  const count = placed.size;

  return (
    <>
      <button
        ref={tabRef}
        type="button"
        className={`hcv-tab${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-controls="hcv-drawer"
        onClick={() => onOpenChange(!open)}
      >
        <i className="bi bi-chevron-left" aria-hidden="true" />
        <span className="hcv-tab-label">Cards</span>
        <span className="hcv-tab-count" aria-label={`${count} cards on the page`}>
          {count}
        </span>
      </button>

      <div
        className={`hcv-backdrop${open ? ' is-open' : ''}`}
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
      />

      <aside
        id="hcv-drawer"
        ref={sheetRef}
        className={`hcv-drawer${open ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hcv-drawer-title"
        tabIndex={-1}
        inert={open ? undefined : ''}
      >
        <header className="hcv-dr-head">
          <div>
            <p className="hcv-dr-eyebrow">Customize this hub</p>
            <h2 id="hcv-drawer-title" className="hcv-dr-title">
              Component cards
            </h2>
          </div>
          <button
            type="button"
            className="hcv-btn"
            aria-label="Close card drawer"
            onClick={() => onOpenChange(false)}
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <p className="hcv-dr-sub">
          {guest ? (
            <>
              <span className="hcv-dr-meter">
                {Math.min(count, guestLimit)} of {guestLimit}
              </span>{' '}
              free cards on your page. Create an account to place every card.
            </>
          ) : (
            'Add any card, then drag it into place or resize it from its corner.'
          )}
        </p>

        <ul className="hcv-dr-list">
          {cards.map((c) => {
            const isPlaced = placed.has(c.id);
            const locked = guest && !c.guest;
            return (
              <li key={c.id} className={`hcv-dr-item${locked ? ' is-locked' : ''}`}>
                <span className="hcv-dr-ic" aria-hidden="true">
                  <i className={`bi ${c.icon || 'bi-square'}`} />
                </span>
                <span className="hcv-dr-text">
                  <span className="hcv-dr-name">{c.title}</span>
                  {c.blurb ? <span className="hcv-dr-blurb">{c.blurb}</span> : null}
                </span>
                {isPlaced ? (
                  <button
                    type="button"
                    className="hcv-dr-act is-placed"
                    onClick={() => onRemove(c.id)}
                    aria-label={`Remove ${c.title} from the page`}
                  >
                    <i className="bi bi-check2" aria-hidden="true" />
                    <span>On page</span>
                  </button>
                ) : locked ? (
                  <button
                    type="button"
                    className="hcv-dr-act is-locked"
                    onClick={() => onAdd(c.id)}
                    aria-label={`${c.title} is for members. Create an account to add it.`}
                  >
                    <i className="bi bi-lock" aria-hidden="true" />
                    <span>Members</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="hcv-dr-act"
                    onClick={() => onAdd(c.id)}
                    aria-label={`Add ${c.title} to the page`}
                  >
                    <i className="bi bi-plus-lg" aria-hidden="true" />
                    <span>Add</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <footer className="hcv-dr-foot">
          <button type="button" className="hcv-dr-reset" onClick={onReset}>
            <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
            Reset layout
          </button>
          <span className="hcv-dr-hint">Saved in this browser</span>
        </footer>
      </aside>
    </>
  );
}
