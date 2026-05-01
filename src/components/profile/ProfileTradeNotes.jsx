'use client';

import { useState, useEffect } from 'react';
import './profile-trade-notes.css';

export function ProfileTradeNotes({ userId, isOwn }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTicker, setEditingTicker] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trade-notes?userId=${userId}`);
      const data = await res.json();
      setNotes(data.notes || []);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [userId]);

  const handleDelete = async (ticker) => {
    if (!confirm(`Delete note for ${ticker}?`)) return;
    await fetch(`/api/trade-notes?ticker=${ticker}`, { method: 'DELETE' });
    loadNotes();
  };

  const handleSave = async (ticker, body, isPublic = true) => {
    const res = await fetch('/api/trade-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, body, is_public: isPublic }),
    });
    if (res.ok) {
      setEditingTicker(null);
      setShowAddForm(false);
      loadNotes();
    }
    return res.ok;
  };

  if (loading) {
    return (
      <div className="ptn-section">
        <div className="ptn-empty">Loading…</div>
      </div>
    );
  }

  if (!isOwn && notes.length === 0) {
    return null;
  }

  return (
    <section className="ptn-section">
      <header className="ptn-header">
        <h3 className="ptn-title">Trade Notes</h3>
        {isOwn && !showAddForm && !editingTicker && (
          <button type="button" className="ptn-add-btn" onClick={() => setShowAddForm(true)}>
            <i className="bi bi-plus-circle" /> Add note
          </button>
        )}
      </header>

      {isOwn && showAddForm && <NoteForm onSave={handleSave} onCancel={() => setShowAddForm(false)} />}

      {notes.length === 0 && isOwn && !showAddForm && (
        <div className="ptn-empty">
          No trade notes yet. Add one to share your thinking on a stock.
        </div>
      )}

      {notes.length > 0 && (
        <ul className="ptn-list">
          {notes.map((n) => (
            <li key={n.id} className="ptn-item">
              {editingTicker === n.ticker ? (
                <NoteForm
                  initial={{ ticker: n.ticker, body: n.body, is_public: n.is_public }}
                  onSave={handleSave}
                  onCancel={() => setEditingTicker(null)}
                  isEdit
                />
              ) : (
                <>
                  <div className="ptn-item-head">
                    <span className="ptn-ticker">{n.ticker}</span>
                    {!n.is_public && (
                      <span className="ptn-private">
                        <i className="bi bi-lock-fill" /> Private
                      </span>
                    )}
                    {isOwn && (
                      <div className="ptn-item-actions">
                        <button type="button" onClick={() => setEditingTicker(n.ticker)} title="Edit">
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(n.ticker)}
                          title="Delete"
                          className="ptn-danger"
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="ptn-body">{n.body}</p>
                  <div className="ptn-meta">
                    Updated{' '}
                    {new Date(n.updated_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function NoteForm({ initial, onSave, onCancel, isEdit }) {
  const [ticker, setTicker] = useState(initial?.ticker || '');
  const [body, setBody] = useState(initial?.body || '');
  const [isPublic, setIsPublic] = useState(initial?.is_public !== false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSave(ticker.toUpperCase().trim(), body.trim(), isPublic);
    setSubmitting(false);
  };

  return (
    <form className="ptn-form" onSubmit={handleSubmit}>
      <div className="ptn-form-row">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="TICKER"
          maxLength={10}
          required
          disabled={isEdit}
          className="ptn-form-ticker"
        />
        <label className="ptn-form-public">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Public
        </label>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Why are you in this position? What's your thesis?"
        rows={4}
        maxLength={1000}
        required
        className="ptn-form-body"
      />
      <div className="ptn-form-meta">{body.length}/1000</div>
      <div className="ptn-form-actions">
        <button type="button" onClick={onCancel} className="ptn-btn ptn-btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="ptn-btn ptn-btn-primary">
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add note'}
        </button>
      </div>
    </form>
  );
}
