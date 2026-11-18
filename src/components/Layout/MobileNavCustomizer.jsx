'use client';

/**
 * The bottom bar's customise sheet (Nov 18 2026). Four slots around Trade,
 * shown as the bar will look; tap a slot, then a page to put in it. Saved
 * at once (per browser); Reset restores Home, Dashboard, Community, Profile.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_SLOTS, NAV_CATALOG, itemFor, writeSlots } from '@/lib/mobile-nav/catalog';

export function MobileNavCustomizer({ slots, profileHref, onClose }) {
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!mounted) return null;

  const place = (id) => {
    const next = [...slots];
    const already = next.indexOf(id);
    /* A page already in another slot swaps places with what was here. */
    if (already >= 0) next[already] = next[active];
    next[active] = id;
    writeSlots(next);
    setActive((a) => (a + 1) % slots.length);
  };

  const slotView = slots.map((id) => itemFor(id, profileHref));
  const preview = [slotView[0], slotView[1], null, slotView[2], slotView[3]];

  return createPortal(
    <div className="mnc" role="presentation" onClick={onClose}>
      <div
        className="mnc-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mnc-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mnc-head">
          <div>
            <h2 id="mnc-title" className="mnc-title">
              Customize bottom bar
            </h2>
            <p className="mnc-sub">Pick a slot, then a page. Trade stays in the middle.</p>
          </div>
          <button type="button" className="mnc-done" onClick={onClose}>
            Done
          </button>
        </header>

        <div className="mnc-preview" role="group" aria-label="Bottom bar slots">
          {preview.map((item, i) => {
            if (!item) {
              return (
                <span key="trade" className="mnc-slot mnc-slot--trade" aria-hidden="true">
                  <i className="bi bi-lightning-charge" />
                  <span>Trade</span>
                </span>
              );
            }
            const slot = i < 2 ? i : i - 1;
            return (
              <button
                key={`slot-${slot}`}
                type="button"
                className={`mnc-slot${active === slot ? ' is-on' : ''}`}
                aria-pressed={active === slot}
                aria-label={`Slot ${slot + 1}: ${item.label}`}
                onClick={() => setActive(slot)}
              >
                <i className={`bi ${item.icon}`} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <p className="mnc-eyebrow">Pages</p>
        <ul className="mnc-list">
          {NAV_CATALOG.map((item) => {
            const at = slots.indexOf(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`mnc-opt${at === active ? ' is-current' : ''}`}
                  onClick={() => place(item.id)}
                >
                  <i className={`bi ${item.icon}`} aria-hidden="true" />
                  <span className="mnc-opt-label">{item.label}</span>
                  {at >= 0 ? <span className="mnc-opt-slot">Slot {at + 1}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>

        <footer className="mnc-foot">
          <button type="button" className="mnc-reset" onClick={() => writeSlots(DEFAULT_SLOTS)}>
            Reset to default
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
