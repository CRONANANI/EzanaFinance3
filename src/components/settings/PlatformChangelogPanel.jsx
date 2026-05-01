'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import './platform-changelog-panel.css';

const CATEGORY_META = {
  feature: { label: 'Feature', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  improvement: { label: 'Improvement', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  fix: { label: 'Fix', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  announcement: { label: 'Announcement', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  breaking: { label: 'Breaking', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

function formatReleaseDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Simple markdown-ish renderer for entry bodies. Supports newlines as
 * paragraph breaks and **bold** / *italic* / `code` inline. No external lib.
 */
function renderBody(text) {
  const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
  return paragraphs.map((p, i) => {
    let html = p
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\n/g, '<br />');
    return <p key={i} className="pcl-entry-paragraph" dangerouslySetInnerHTML={{ __html: html }} />;
  });
}

function ChangelogEntryCard({ entry }) {
  const meta = CATEGORY_META[entry.category] || CATEGORY_META.improvement;
  return (
    <article className={`pcl-entry ${entry.is_pinned ? 'is-pinned' : ''}`}>
      <header className="pcl-entry-head">
        <div className="pcl-entry-head-left">
          <span
            className="pcl-entry-category"
            style={{ color: meta.color, background: meta.bg, borderColor: `${meta.color}40` }}
          >
            {meta.label}
          </span>
          {entry.is_pinned && (
            <span className="pcl-entry-pinned" title="Pinned">
              <i className="bi bi-pin-fill" />
            </span>
          )}
        </div>
        <time className="pcl-entry-date" dateTime={entry.released_at}>
          {formatReleaseDate(entry.released_at)}
        </time>
      </header>
      <h3 className="pcl-entry-title">{entry.title}</h3>
      <div className="pcl-entry-body">{renderBody(entry.body)}</div>
    </article>
  );
}

function AdminEntryForm({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('improvement');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/changelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          category,
          is_pinned: isPinned,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create');
        return;
      }
      setTitle('');
      setBody('');
      setCategory('improvement');
      setIsPinned(false);
      setOpen(false);
      onCreated?.(data.entry);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="pcl-admin-open-btn" onClick={() => setOpen(true)}>
        <i className="bi bi-plus-circle" /> Add changelog entry
      </button>
    );
  }

  return (
    <form className="pcl-admin-form" onSubmit={handleSubmit}>
      <div className="pcl-admin-form-head">
        <h4>New changelog entry</h4>
        <button type="button" className="pcl-admin-cancel" onClick={() => setOpen(false)}>
          <i className="bi bi-x-lg" />
        </button>
      </div>

      <label className="pcl-admin-field">
        <span>Title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short headline (max 200 chars)"
          maxLength={200}
          required
        />
      </label>

      <label className="pcl-admin-field">
        <span>Category</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {Object.entries(CATEGORY_META).map(([key, m]) => (
            <option key={key} value={key}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <label className="pcl-admin-field">
        <span>Body (supports **bold**, *italic*, `code`)</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Description of the change…"
          rows={5}
          maxLength={5000}
          required
        />
      </label>

      <label className="pcl-admin-checkbox">
        <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />
        <span>Pin to top</span>
      </label>

      {error && <div className="pcl-admin-error">{error}</div>}

      <div className="pcl-admin-actions">
        <button type="button" className="pcl-btn pcl-btn-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button type="submit" className="pcl-btn pcl-btn-primary" disabled={submitting}>
          {submitting ? 'Publishing…' : 'Publish entry'}
        </button>
      </div>
    </form>
  );
}

export function PlatformChangelogPanel() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/changelog', { method: 'OPTIONS' })
      .then((r) => {
        if (cancelled) return;
        setIsAdmin(r.ok || r.status === 204);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const loadEntries = () => {
    setLoading(true);
    fetch('/api/changelog?limit=100')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to load');
        return data;
      })
      .then((data) => {
        setEntries(data.entries || []);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEntries();
  }, []);

  return (
    <div className="pcl-panel">
      <header className="pcl-header">
        <h2 className="pcl-title">Platform Changelog</h2>
        <p className="pcl-subtitle">Recent updates, improvements, and fixes shipped to the platform.</p>
      </header>

      {isAdmin && (
        <div className="pcl-admin-section">
          <AdminEntryForm
            onCreated={(newEntry) => {
              setEntries((prev) => [newEntry, ...prev]);
            }}
          />
        </div>
      )}

      {loading && <div className="pcl-empty">Loading…</div>}

      {!loading && error && (
        <div className="pcl-empty pcl-empty-error">Failed to load changelog: {error}</div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="pcl-empty">No changelog entries yet.</div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div className="pcl-entries">
          {entries.map((e) => (
            <ChangelogEntryCard key={e.id} entry={e} />
          ))}
        </div>
      )}
    </div>
  );
}
