'use client';

/**
 * Research library (Sonar research workspace, Nov 13 2026): folders on the left with their
 * counts and "Unfiled", the selected folder's saved items on the right. Create, rename and
 * delete a folder; deleting one keeps its items (they become unfiled).
 */
import { useCallback, useEffect, useState } from 'react';
import { ResearchWorkspaceShell } from './ResearchWorkspaceShell';
import { SavedRows } from './SavedClient';

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

export default function LibraryClient() {
  const [folders, setFolders] = useState([]);
  const [unfiled, setUnfiled] = useState(0);
  const [selected, setSelected] = useState('none');
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [rename, setRename] = useState('');
  const [error, setError] = useState(null);
  const [state, setState] = useState('loading');

  const loadFolders = useCallback(async () => {
    try {
      const j = await api('/api/sonar/collections');
      setFolders(j.items || []);
      setUnfiled(j.unfiled || 0);
      setState(j.unavailable ? 'unavailable' : 'ready');
    } catch {
      setState('error');
    }
  }, []);
  const loadItems = useCallback(async (id) => {
    try {
      const j = await api(`/api/sonar/saved?collection=${encodeURIComponent(id)}`);
      setItems(j.items || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);
  useEffect(() => {
    loadItems(selected);
    const f = folders.find((x) => x.id === selected);
    setRename(f ? f.name : '');
  }, [selected, loadItems, folders]);

  const act = async (fn) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    }
  };
  const current = folders.find((f) => f.id === selected) || null;

  return (
    <ResearchWorkspaceShell
      current="library"
      title="Research library"
      lede="Your saved research, in folders."
    >
      {state === 'error' ? (
        <p className="srw-error" role="alert">
          Your research library is not available right now.
        </p>
      ) : null}
      {state === 'unavailable' ? (
        <p className="srw-empty">Your research library is not available yet.</p>
      ) : null}
      {error ? (
        <p className="srw-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="srw-lib">
        <div>
          <ul className="srw-folders" aria-label="Folders">
            <li>
              <button
                type="button"
                className="srw-folder"
                aria-pressed={selected === 'none'}
                onClick={() => setSelected('none')}
              >
                <i className="bi bi-inbox" aria-hidden="true" />
                Unfiled
                <span className="srw-count">{unfiled}</span>
              </button>
            </li>
            {folders.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className="srw-folder"
                  aria-pressed={selected === f.id}
                  onClick={() => setSelected(f.id)}
                >
                  <i className="bi bi-folder2" aria-hidden="true" />
                  {f.name}
                  <span className="srw-count">{f.count}</span>
                </button>
              </li>
            ))}
          </ul>
          <form
            className="srw-inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              const n = name.trim();
              if (!n) return;
              act(async () => {
                const j = await api('/api/sonar/collections', 'POST', { name: n });
                setName('');
                await loadFolders();
                setSelected(j.item.id);
              });
            }}
          >
            <input
              className="srw-input"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="New folder"
              aria-label="New folder name"
            />
            <button type="submit" className="srw-btn" disabled={!name.trim()}>
              Create
            </button>
          </form>
        </div>
        <div>
          {current ? (
            <form
              className="srw-inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                const n = rename.trim();
                if (!n || n === current.name) return;
                act(async () => {
                  await api(`/api/sonar/collections/${current.id}`, 'PATCH', { name: n });
                  await loadFolders();
                });
              }}
            >
              <input
                className="srw-input"
                value={rename}
                maxLength={60}
                onChange={(e) => setRename(e.target.value)}
                aria-label="Folder name"
              />
              <button type="submit" className="srw-btn" disabled={!rename.trim()}>
                Rename
              </button>
              <button
                type="button"
                className="srw-btn srw-btn--danger"
                onClick={() =>
                  act(async () => {
                    await api(`/api/sonar/collections/${current.id}`, 'DELETE');
                    setSelected('none');
                    await loadFolders();
                  })
                }
              >
                Delete folder
              </button>
            </form>
          ) : null}
          {current ? (
            <p className="srw-note">Deleting a folder keeps its research, unfiled.</p>
          ) : null}
          {items.length ? (
            <SavedRows
              items={items}
              folders={folders}
              onMove={(s, collectionId) =>
                act(async () => {
                  await api(`/api/sonar/saved/${s.id}`, 'PATCH', { collectionId });
                  await Promise.all([loadItems(selected), loadFolders()]);
                })
              }
            />
          ) : state === 'ready' ? (
            <p className="srw-empty">Nothing in this folder.</p>
          ) : null}
        </div>
      </div>
    </ResearchWorkspaceShell>
  );
}
