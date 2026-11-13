'use client';

/**
 * Saved research (Sonar research workspace, Nov 13 2026): the reader's saved answers, newest
 * first, with their folder and a "Shared" marker while a link is live. Search by title; open,
 * move to a folder, or remove.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ResearchWorkspaceShell, MODE, dateLabel } from './ResearchWorkspaceShell';

const api = async (url, method = 'GET', body) => {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error || 'That did not work. Try again.');
  return j;
};

export function SavedRows({ items, folders, onMove, onRemove }) {
  const byId = useMemo(() => new Map((folders || []).map((f) => [f.id, f.name])), [folders]);
  return (
    <ul className="srw-rows">
      {items.map((s) => (
        <li key={s.id} className="srw-row">
          <Link className="srw-row-link" href={`/sonar/saved/${s.id}`}>
            {s.title}
          </Link>
          <span className="srw-row-meta">
            {s.subject ? <span>{s.subject}</span> : null}
            {s.depth ? <span>{MODE[s.depth] || s.depth}</span> : null}
            <span>{dateLabel(s.created_at)}</span>
            {s.collection_id && byId.get(s.collection_id) ? (
              <span className="srw-chip">
                <i className="bi bi-folder2" aria-hidden="true" />
                {byId.get(s.collection_id)}
              </span>
            ) : null}
            {s.shared ? (
              <span className="srw-chip srw-chip--live">
                <i className="bi bi-link-45deg" aria-hidden="true" />
                Shared
              </span>
            ) : null}
          </span>
          <span className="srw-row-actions">
            {onMove ? (
              <select
                className="srw-select"
                aria-label={`Move "${s.title}" to a folder`}
                value={s.collection_id || ''}
                onChange={(e) => onMove(s, e.target.value || null)}
              >
                <option value="">No folder</option>
                {(folders || []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            ) : null}
            {onRemove ? (
              <button
                type="button"
                className="srw-btn srw-btn--danger"
                onClick={() => onRemove(s)}
                aria-label={`Remove "${s.title}" from saved research`}
              >
                <i className="bi bi-trash" aria-hidden="true" />
              </button>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function SavedClient() {
  const [items, setItems] = useState([]);
  const [folders, setFolders] = useState([]);
  const [query, setQuery] = useState('');
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);

  const load = useCallback(async (q = '') => {
    setState('loading');
    try {
      const [saved, cols] = await Promise.all([
        api(`/api/sonar/saved${q ? `?q=${encodeURIComponent(q)}` : ''}`),
        api('/api/sonar/collections'),
      ]);
      setItems(saved.items || []);
      setFolders(cols.items || []);
      setState(saved.unavailable ? 'unavailable' : 'ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const move = async (s, collectionId) => {
    setError(null);
    try {
      const j = await api(`/api/sonar/saved/${s.id}`, 'PATCH', { collectionId });
      setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, ...j.item } : x)));
    } catch (e) {
      setError(e.message);
    }
  };
  const remove = async (s) => {
    setError(null);
    try {
      await api(`/api/sonar/saved/${s.id}`, 'DELETE');
      setItems((prev) => prev.filter((x) => x.id !== s.id));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <ResearchWorkspaceShell
      current="saved"
      title="Saved research"
      lede="Answers you saved, as you saw them."
      actions={
        <form
          className="srw-inline-form"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            load(query.trim());
          }}
        >
          <input
            className="srw-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title"
            aria-label="Search saved research by title"
          />
          <button type="submit" className="srw-btn">
            Search
          </button>
        </form>
      }
    >
      {error ? (
        <p className="srw-error" role="alert">
          {error}
        </p>
      ) : null}
      {state === 'error' ? (
        <p className="srw-error" role="alert">
          Saved research is not available right now.
        </p>
      ) : null}
      {state === 'unavailable' ? (
        <p className="srw-empty">Saved research is not available yet.</p>
      ) : null}
      {state === 'ready' && !items.length ? (
        <p className="srw-empty">
          {query
            ? 'No saved research matches that title.'
            : 'Nothing saved yet. Save an answer from its Desk summary.'}
        </p>
      ) : null}
      {state === 'loading' ? <p className="srw-note">Loading.</p> : null}
      {items.length ? (
        <SavedRows items={items} folders={folders} onMove={move} onRemove={remove} />
      ) : null}
    </ResearchWorkspaceShell>
  );
}
