'use client';

import { useState } from 'react';
import './social.css';

export const BADGE_TYPES = [
  { key: 'analyst_of_month', label: 'Analyst of the Month', icon: '🏅' },
  { key: 'best_call', label: 'Best Call', icon: '🎯' },
  { key: 'most_accurate', label: 'Most Accurate', icon: '📊' },
  { key: 'rising_star', label: 'Rising Star', icon: '🌟' },
  { key: 'clutch', label: 'Clutch Contributor', icon: '🔥' },
  { key: 'deep_dive', label: 'Best Deep Dive', icon: '🔎' },
];

export function badgeIcon(type) {
  return BADGE_TYPES.find((b) => b.key === type)?.icon || '🏅';
}

/** Manager-only modal to award a recognition badge. */
export function AwardModal({ open, onClose, members = [], onAwarded }) {
  const [recipient, setRecipient] = useState('');
  const [badgeType, setBadgeType] = useState('analyst_of_month');
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [period, setPeriod] = useState('');
  const [isAward, setIsAward] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const submit = async () => {
    if (!recipient || !title.trim()) {
      setError('Pick a recipient and a title.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/org/recognition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: recipient,
          badge_type: badgeType,
          title,
          reason: reason || null,
          period: period || null,
          is_award: isAward,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not award.');
        return;
      }
      onAwarded?.(data.recognition);
      onClose?.();
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sc2-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        className="sc2-modal sc2-root"
        role="dialog"
        aria-modal="true"
        aria-label="Award recognition"
      >
        <h2 className="sc2-modal-title">Award recognition</h2>

        <div className="sc2-field">
          <label className="sc2-label">Recipient</label>
          <select
            className="sc2-select"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          >
            <option value="">Choose a member…</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name} ({(m.role || '').replace('_', ' ')})
              </option>
            ))}
          </select>
        </div>

        <div className="sc2-row">
          <div className="sc2-field">
            <label className="sc2-label">Badge</label>
            <select
              className="sc2-select"
              value={badgeType}
              onChange={(e) => setBadgeType(e.target.value)}
            >
              {BADGE_TYPES.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.icon} {b.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sc2-field">
            <label className="sc2-label">Period</label>
            <input
              className="sc2-input"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="e.g. 2026-Q2"
            />
          </div>
        </div>

        <div className="sc2-field">
          <label className="sc2-label">Title</label>
          <input
            className="sc2-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Best Call — NVDA"
          />
        </div>

        <div className="sc2-field">
          <label className="sc2-label">Reason</label>
          <textarea
            className="sc2-textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are they getting this?"
            rows={3}
          />
        </div>

        <div className="sc2-field">
          <label
            className="sc2-label"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={isAward}
              onChange={(e) => setIsAward(e.target.checked)}
            />
            Mark as a gold Award (distinct from a standard badge)
          </label>
        </div>

        {error && (
          <div className="sc2-error" style={{ fontSize: '0.78rem' }}>
            {error}
          </div>
        )}

        <div className="sc2-modal-actions">
          <button
            type="button"
            className="sc2-btn sc2-btn--ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="sc2-btn sc2-btn--primary"
            onClick={submit}
            disabled={saving}
          >
            {saving ? 'Awarding…' : 'Award badge'}
          </button>
        </div>
      </div>
    </div>
  );
}
