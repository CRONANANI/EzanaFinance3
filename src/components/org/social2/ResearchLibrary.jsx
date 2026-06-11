'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { NoteComposer, GICS_SECTORS } from './NoteComposer';
import { ReactionBar } from './ReactionBar';
import './social.css';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `${h}h ago`;
  return 'just now';
}

export function ResearchLibrary() {
  const [notes, setNotes] = useState([]);
  const [viewer, setViewer] = useState({ canManage: false, userId: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all'); // 'all' | sector | 'pinned'

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/org/research-notes', { cache: 'no-store' });
      if (res.status === 403) {
        setError('This page is for organizational members only.');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to load notes.');
        return;
      }
      setNotes(data.notes || []);
      setViewer(data.viewer || { canManage: false });
      setError('');
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sectorsPresent = useMemo(
    () => GICS_SECTORS.filter((s) => notes.some((n) => n.sector === s)),
    [notes],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (sectorFilter === 'pinned' && !n.pinned) return false;
      if (sectorFilter !== 'all' && sectorFilter !== 'pinned' && n.sector !== sectorFilter)
        return false;
      if (q) {
        const hay = `${n.title} ${n.body} ${n.ticker || ''} ${(n.tags || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [notes, search, sectorFilter]);

  const togglePin = async (note) => {
    try {
      const res = await fetch(`/api/org/research-notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !note.pinned }),
      });
      if (res.ok) load();
    } catch {
      /* non-fatal */
    }
  };

  if (loading) return <div className="sc2-state">Loading research library…</div>;
  if (error) return <div className="sc2-state sc2-error">{error}</div>;

  return (
    <div className="sc2-root">
      <div className="sc2-header">
        <div>
          <p className="sc2-eyebrow">Team Hub</p>
          <h1 className="sc2-title">Research Library</h1>
          <p className="sc2-sub">Persistent theses and notes — they survive across cohorts.</p>
        </div>
        <button type="button" className="sc2-btn sc2-btn--primary" onClick={() => setComposerOpen(true)}>
          <i className="bi bi-plus-lg" aria-hidden /> New Note
        </button>
      </div>

      <div className="sc2-toolbar">
        <input
          className="sc2-search"
          placeholder="Search title, ticker, tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="sc2-pills">
          <button
            type="button"
            className={`sc2-pill${sectorFilter === 'all' ? ' is-active' : ''}`}
            onClick={() => setSectorFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`sc2-pill${sectorFilter === 'pinned' ? ' is-active' : ''}`}
            onClick={() => setSectorFilter('pinned')}
          >
            ★ Pinned
          </button>
          {sectorsPresent.map((s) => (
            <button
              key={s}
              type="button"
              className={`sc2-pill${sectorFilter === s ? ' is-active' : ''}`}
              onClick={() => setSectorFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="sc2-state">No notes match. Be the first to publish one.</div>
      ) : (
        <div className="sc2-note-grid">
          {filtered.map((n) => (
            <div key={n.id} className={`sc2-note-card${n.pinned ? ' is-pinned' : ''}`}>
              <div className="sc2-note-top">
                <h3 className="sc2-note-title">{n.title}</h3>
                {(viewer.canManage || n.author_id === viewer.userId) && (
                  <button
                    type="button"
                    className={`sc2-pin-star${n.pinned ? ' is-on' : ''}`}
                    onClick={() => togglePin(n)}
                    aria-label={n.pinned ? 'Unpin note' : 'Pin note'}
                    title={n.pinned ? 'Unpin' : 'Pin'}
                  >
                    {n.pinned ? '★' : '☆'}
                  </button>
                )}
              </div>
              <div className="sc2-note-meta">
                {n.ticker && <span className="sc2-tag sc2-tag--ticker">{n.ticker}</span>}
                {n.sector && <span className="sc2-tag">{n.sector}</span>}
                {(n.tags || []).slice(0, 3).map((t) => (
                  <span key={t} className="sc2-tag">
                    #{t}
                  </span>
                ))}
                {n.visibility === 'private' && <span className="sc2-tag">🔒 private</span>}
              </div>
              <p className="sc2-note-snippet">{n.body}</p>
              <div className="sc2-note-foot">
                <span className="sc2-comment-time">
                  {n.author_name} · {timeAgo(n.created_at)}
                </span>
                <ReactionBar targetType="note" targetId={n.id} compact />
              </div>
            </div>
          ))}
        </div>
      )}

      <NoteComposer open={composerOpen} onClose={() => setComposerOpen(false)} onCreated={load} />
    </div>
  );
}
