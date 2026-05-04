'use client';

import { useEffect } from 'react';

export function AdvisorModal({ advisor, onClose, onStart }) {
  useEffect(() => {
    if (!advisor) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advisor, onClose]);

  if (!advisor) return null;

  return (
    <div className="cc-modal-root" role="presentation">
      <button type="button" className="cc-modal-backdrop" aria-label="Close" onClick={onClose} />
      <div className="cc-modal-panel" role="dialog" aria-modal="true" aria-labelledby="cc-advisor-modal-title">
        <div className="cc-modal-head">
          <div className="cc-modal-glyph" aria-hidden>{advisor.glyph}</div>
          <div>
            <h2 id="cc-advisor-modal-title" className="cc-modal-title">{advisor.name}</h2>
            <p className="cc-modal-persona">Inspired by {advisor.persona}</p>
            <p className="cc-modal-edge">{advisor.edge}</p>
          </div>
          <button type="button" className="cc-modal-close" onClick={onClose} aria-label="Close dialog">
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <p className="cc-modal-myth">{advisor.myth}</p>
        <p className="cc-modal-bio">{advisor.bio}</p>
        <div className="cc-modal-stats">
          <div>
            <span className="cc-modal-stat-label">Conviction</span>
            <span className="cc-modal-stat-value">{advisor.stats.conviction}</span>
          </div>
          <div>
            <span className="cc-modal-stat-label">Coverage</span>
            <span className="cc-modal-stat-value">{advisor.stats.coverage}</span>
          </div>
          <div>
            <span className="cc-modal-stat-label">Last spoke</span>
            <span className="cc-modal-stat-value">{advisor.stats.recency}</span>
          </div>
        </div>
        <div className="cc-modal-actions">
          <button type="button" className="cc-modal-btn cc-modal-btn--ghost" onClick={onClose}>
            VIEW HISTORY
          </button>
          <button
            type="button"
            className="cc-modal-btn cc-modal-btn--primary"
            onClick={() => onStart(advisor)}
          >
            ⚡ START MEETING
          </button>
        </div>
      </div>
    </div>
  );
}
