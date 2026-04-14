'use client';

import { useEffect } from 'react';

export default function DCFInfoModal({ assumption, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!assumption) return null;
  const { info } = assumption;

  return (
    <div className="dcf-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="dcf-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dcf-modal-title"
      >
        <div className="dcf-modal-header">
          <h3 id="dcf-modal-title">{info.title}</h3>
          <button type="button" className="dcf-modal-close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="dcf-modal-body">
          <div className="dcf-modal-row">
            <span className="dcf-modal-key">Variable</span>
            <code className="dcf-modal-code">{info.variable}</code>
          </div>

          <div className="dcf-modal-row">
            <span className="dcf-modal-key">Meaning</span>
            <p>{info.meaning}</p>
          </div>

          <div className="dcf-modal-row">
            <span className="dcf-modal-key">Typical range</span>
            <code className="dcf-modal-code">{info.typicalRange}</code>
          </div>

          {info.formula && (
            <div className="dcf-modal-row">
              <span className="dcf-modal-key">Formula</span>
              <code className="dcf-modal-code dcf-modal-formula">{info.formula}</code>
            </div>
          )}

          {info.example && (
            <div className="dcf-modal-row">
              <span className="dcf-modal-key">Example</span>
              <code className="dcf-modal-code">{info.example}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
