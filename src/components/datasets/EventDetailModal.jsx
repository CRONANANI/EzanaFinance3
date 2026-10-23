'use client';

/**
 * Generic detail modal for conveyor-belt items (DatasetTicker). The belt
 * knows nothing about datasets, so a page can publish renderDetails(item)
 * alongside its items; without one, the modal lists the item's own fields
 * (its `detail` map of label -> value, else the lead/main/value triplet) and
 * a source link when the item carries one. Focus is trapped, Escape and the
 * backdrop close, focus returns to the opener, and on phones the dialog
 * becomes a bottom sheet (dataset-ticker.css).
 */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function EventDetailModal({ item, onClose, renderDetails, title }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!item) return undefined;
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab' && ref.current) {
        const els = ref.current.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = '';
      if (prev instanceof HTMLElement) prev.focus();
    };
  }, [item, onClose]);

  if (!item || typeof document === 'undefined') return null;

  const heading = (typeof title === 'function' ? title(item) : title) || item.main || 'Detail';
  const fields = item.detail && typeof item.detail === 'object' ? Object.entries(item.detail) : [];

  return createPortal(
    <div className="dsx-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        className="dsx-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dsx-modal-head">
          <h3 className="dsx-modal-title">{heading}</h3>
          <button type="button" className="dsx-modal-x" aria-label="Close" onClick={onClose}>
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>
        <div className="dsx-modal-body">
          {typeof renderDetails === 'function' ? (
            renderDetails(item)
          ) : (
            <dl className="dsx-modal-dl">
              {item.lead ? (
                <div>
                  <dt>Type</dt>
                  <dd className="dsx-mono">{item.lead}</dd>
                </div>
              ) : null}
              {item.value != null ? (
                <div>
                  <dt>Figure</dt>
                  <dd className="dsx-mono">{item.value}</dd>
                </div>
              ) : null}
              {fields.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd className="dsx-mono">
                    {value == null || value === '' ? '·' : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {item.href ? (
            <a className="dsx-modal-src" href={item.href} target="_blank" rel="noopener noreferrer">
              Open the source filing <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
