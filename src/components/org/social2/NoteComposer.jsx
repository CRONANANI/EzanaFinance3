'use client';

import { useState } from 'react';
import './social.css';

export const GICS_SECTORS = [
  'Energy',
  'Materials',
  'Industrials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Health Care',
  'Financials',
  'Information Technology',
  'Communication Services',
  'Utilities',
  'Real Estate',
];

/** Modal composer for a research note. Calls POST /api/org/research-notes. */
export function NoteComposer({ open, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [ticker, setTicker] = useState('');
  const [sector, setSector] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [visibility, setVisibility] = useState('org');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const submit = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/org/research-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          ticker: ticker.trim() || null,
          sector: sector || null,
          tags: tagsRaw
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          visibility,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not save the note.');
        return;
      }
      onCreated?.(data.note);
      onClose?.();
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sc2-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="sc2-modal sc2-root" role="dialog" aria-modal="true" aria-label="New research note">
        <h2 className="sc2-modal-title">New research note</h2>

        <div className="sc2-field">
          <label className="sc2-label">Title</label>
          <input
            className="sc2-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. NVDA — datacenter demand still underappreciated"
            maxLength={200}
          />
        </div>

        <div className="sc2-field">
          <label className="sc2-label">Thesis / notes</label>
          <textarea
            className="sc2-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Markdown welcome. Lay out the thesis, catalysts, risks…"
            rows={6}
          />
        </div>

        <div className="sc2-row">
          <div className="sc2-field">
            <label className="sc2-label">Ticker</label>
            <input
              className="sc2-input"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="NVDA"
              maxLength={12}
            />
          </div>
          <div className="sc2-field">
            <label className="sc2-label">Sector</label>
            <select className="sc2-select" value={sector} onChange={(e) => setSector(e.target.value)}>
              <option value="">—</option>
              {GICS_SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="sc2-row">
          <div className="sc2-field">
            <label className="sc2-label">Tags (comma-separated)</label>
            <input
              className="sc2-input"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="ai, moat, long"
            />
          </div>
          <div className="sc2-field">
            <label className="sc2-label">Visibility</label>
            <select
              className="sc2-select"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <option value="org">Whole org</option>
              <option value="team">My team</option>
              <option value="private">Private (just me)</option>
            </select>
          </div>
        </div>

        {error && <div className="sc2-error" style={{ fontSize: '0.78rem' }}>{error}</div>}

        <div className="sc2-modal-actions">
          <button type="button" className="sc2-btn sc2-btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="sc2-btn sc2-btn--primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Publish note'}
          </button>
        </div>
      </div>
    </div>
  );
}
