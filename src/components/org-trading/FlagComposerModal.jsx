'use client';

import { useState } from 'react';
import { PinnedAttachmentPicker } from './PinnedAttachmentPicker';

export function FlagComposerModal({ ticker, mockTeamId, teamDbId, position, onClose, onSuccess }) {
  const [flagColor, setFlagColor] = useState('green');
  const [subject, setSubject] = useState(`Position review: ${ticker}`);
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setError(null);
    if (!body.trim()) {
      setError('Please add a message describing your concern or note.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/org-trading/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          mock_team_id: mockTeamId,
          team_id: teamDbId || null,
          flag_color: flagColor,
          subject,
          body,
          position_snapshot: {
            shares: position.shares,
            avg_cost: position.avg_cost,
            current_price: position.current_price,
          },
          attachments,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      onSuccess?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ot-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ot-modal">
        <div className="ot-modal-header">
          <h2 className="ot-modal-title">Flag Position: {ticker}</h2>
          <button type="button" aria-label="Close" className="ot-modal-close" onClick={onClose}>
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <p style={{ fontSize: '0.75rem', color: '#8b949e', marginTop: 0 }}>
          You are flagging {position.shares} shares · avg ${position.avg_cost.toFixed(2)} · current $
          {position.current_price.toFixed(2)}
        </p>

        <div className="ot-flag-color-row">
          <button
            type="button"
            className={`ot-flag-color-btn ${flagColor === 'green' ? 'is-selected green' : ''}`}
            onClick={() => setFlagColor('green')}
          >
            <i className="bi bi-flag-fill" style={{ color: '#10b981' }} />
            <span>Green Flag</span>
          </button>
          <button
            type="button"
            className={`ot-flag-color-btn ${flagColor === 'red' ? 'is-selected red' : ''}`}
            onClick={() => setFlagColor('red')}
          >
            <i className="bi bi-flag-fill" style={{ color: '#ef4444' }} />
            <span>Red Flag</span>
          </button>
        </div>

        <div className="ot-form-group">
          <label className="ot-form-label" htmlFor="ot-flag-subject">
            Subject
          </label>
          <input
            id="ot-flag-subject"
            type="text"
            className="ot-form-input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="ot-form-group">
          <label className="ot-form-label" htmlFor="ot-flag-body">
            Message
          </label>
          <textarea
            id="ot-flag-body"
            className="ot-form-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              flagColor === 'green'
                ? 'e.g., Strong earnings beat, consider sizing up exposure.'
                : 'e.g., Negative guidance pre-announce, recommend trimming.'
            }
          />
        </div>

        <div className="ot-form-group">
          <span className="ot-form-label">Attach From Your Collection</span>
          <PinnedAttachmentPicker ticker={ticker} selected={attachments} onChange={setAttachments} />
        </div>

        {error && (
          <div
            style={{
              padding: '0.5rem 0.75rem',
              background: 'rgba(239,68,68,0.1)',
              color: '#ef4444',
              borderRadius: 6,
              fontSize: '0.75rem',
              marginBottom: '0.5rem',
            }}
          >
            {error}
          </div>
        )}

        <div className="ot-modal-footer">
          <button type="button" className="ot-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ot-btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !body.trim()}
          >
            {isSubmitting ? 'Sending…' : `Send ${flagColor === 'green' ? 'Green' : 'Red'} Flag`}
          </button>
        </div>
      </div>
    </div>
  );
}
