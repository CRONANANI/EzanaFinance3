'use client';

/**
 * SonarSaveActions (Sonar research workspace, Nov 13 2026): Save, Share and More in the Desk
 * Summary header. Every item does something real:
 *
 *   Save   saves the answer as the reader saw it (POST /api/sonar/saved); a research run is
 *          saved with its run id, a quick ping with its snapshot. A guest gets the sign-up path.
 *   Share  personal accounts only (organization and partner seats share through their
 *          organization's reports; the server refuses them too). A switch makes or kills a
 *          link; sharing an unsaved answer saves it first.
 *   More   Add to library (pick or create a folder), Copy question, Remove from saved.
 *
 * Buttons are 34px, borderless, on a surface tint, with the emerald focus ring.
 * Styles: sonar-save-actions.css (ssa-).
 */

import { useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { Modal, Toggle, Dropdown, MenuItem } from '@/components/ds';
import { useSonarPlan } from './useSonarPlan';
import { seatCanShare } from '@/lib/sonar/saved';
import './sonar-save-actions.css';

const send = async (url, method, body) => {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'That did not work. Try again.');
  return json;
};

const signupHref = () => {
  const next =
    typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/sonar';
  return `/auth/continue?intent=signup&next=${encodeURIComponent(next)}`;
};

function LibraryDialog({ open, onClose, current, onPick }) {
  const id = useId();
  const [folders, setFolders] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setError(null);
    send('/api/sonar/collections', 'GET')
      .then((j) => setFolders(j.items || []))
      .catch((e) => setError(e.message));
  }, [open]);
  const create = async (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    setError(null);
    try {
      const j = await send('/api/sonar/collections', 'POST', { name: n });
      setName('');
      await onPick(j.item.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Add to library" size="440px">
      <div className="ssa-dialog">
        {folders === null && !error ? <p className="ssa-muted">Loading your folders.</p> : null}
        {folders?.length ? (
          <ul className="ssa-folders">
            {folders.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className="ssa-folder"
                  aria-pressed={current === f.id}
                  onClick={() => onPick(f.id)}
                >
                  <i className="bi bi-folder2" aria-hidden="true" />
                  <span>{f.name}</span>
                  <span className="ssa-count">{f.count}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {folders && !folders.length ? <p className="ssa-muted">No folders yet.</p> : null}
        <form className="ssa-new" onSubmit={create}>
          <label htmlFor={id} className="ssa-label">
            New folder
          </label>
          <div className="ssa-row">
            <input
              id={id}
              className="ssa-input"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="Folder name"
            />
            <button
              type="submit"
              className="ssa-btn ssa-btn--primary"
              disabled={!name.trim() || busy}
            >
              Create and add
            </button>
          </div>
        </form>
        {error ? (
          <p className="ssa-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

/**
 * getSave()  -> the save body { kind, runId?, question, subject?, ticker?, depth?, controls?,
 *               snapshot }, or null when the answer cannot be saved
 * question   the question, for Copy question
 * initial    an already saved item ({ id, shared, shareUrl, collection_id }), on a saved page
 */
export function SonarSaveActions({ getSave, question = '', initial = null }) {
  const plan = useSonarPlan();
  const [item, setItem] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [copied, setCopied] = useState(null);
  const canShare = !plan.isGuest && plan.ready && seatCanShare(plan.version);

  const ensureSaved = useCallback(async () => {
    if (item) return item;
    const body = getSave?.();
    if (!body) throw new Error('This answer cannot be saved.');
    const j = await send('/api/sonar/saved', 'POST', body);
    setItem(j.item);
    return j.item;
  }, [item, getSave]);

  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setError('Copy did not work in this browser.');
    }
  };

  if (plan.isGuest) {
    return (
      <div className="ssa">
        <a className="ssa-btn" href={signupHref()}>
          <i className="bi bi-bookmark" aria-hidden="true" />
          Save
        </a>
      </div>
    );
  }

  const shareUrl =
    item?.shareUrl && typeof window !== 'undefined'
      ? `${window.location.origin}${item.shareUrl}`
      : null;

  return (
    <div className="ssa">
      <button
        type="button"
        className="ssa-btn"
        aria-pressed={Boolean(item)}
        disabled={busy}
        onClick={() => run(ensureSaved)}
      >
        <i className={`bi ${item ? 'bi-bookmark-fill' : 'bi-bookmark'}`} aria-hidden="true" />
        {item ? 'Saved' : 'Save'}
      </button>
      {canShare ? (
        <button type="button" className="ssa-btn" onClick={() => setShareOpen(true)}>
          <i className="bi bi-share" aria-hidden="true" />
          Share
        </button>
      ) : null}
      <Dropdown
        align="right"
        trigger={
          <span className="ssa-btn ssa-btn--icon" aria-label="More actions" title="More">
            <i className="bi bi-three-dots" aria-hidden="true" />
          </span>
        }
      >
        <MenuItem icon="bi-collection" onClick={() => setLibraryOpen(true)}>
          Add to library
        </MenuItem>
        {question ? (
          <MenuItem icon="bi-clipboard" onClick={() => copy(question, 'question')}>
            Copy question
          </MenuItem>
        ) : null}
        {item ? (
          <MenuItem
            icon="bi-bookmark-x"
            danger
            onClick={() =>
              run(async () => {
                await send(`/api/sonar/saved/${item.id}`, 'DELETE');
                setItem(null);
              })
            }
          >
            Remove from saved
          </MenuItem>
        ) : null}
      </Dropdown>
      {item ? (
        <Link className="ssa-link" href="/sonar/saved">
          View in saved research
        </Link>
      ) : null}
      <span className="ssa-status" role="status">
        {copied === 'question' ? 'Question copied.' : copied === 'link' ? 'Link copied.' : ''}
      </span>
      {error ? (
        <p className="ssa-error" role="alert">
          {error}
        </p>
      ) : null}

      {canShare ? (
        <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Share" size="460px">
          <div className="ssa-dialog">
            <Toggle
              label="Anyone with the link can view"
              checked={Boolean(item?.shared)}
              disabled={busy}
              onChange={(e) => {
                const on = e.target.checked;
                run(async () => {
                  const saved = await ensureSaved();
                  const j = await send(`/api/sonar/saved/${saved.id}`, 'PATCH', { share: on });
                  setItem(j.item);
                });
              }}
            />
            <p className="ssa-muted">
              The question, the answer and its sources. Not your name, notes or settings.
            </p>
            {shareUrl ? (
              <div className="ssa-row">
                <input className="ssa-input" readOnly value={shareUrl} aria-label="Share link" />
                <button type="button" className="ssa-btn" onClick={() => copy(shareUrl, 'link')}>
                  <i className="bi bi-clipboard" aria-hidden="true" />
                  {copied === 'link' ? 'Copied' : 'Copy'}
                </button>
              </div>
            ) : null}
            {error ? (
              <p className="ssa-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </Modal>
      ) : null}
      <LibraryDialog
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        current={item?.collection_id || null}
        onPick={(collectionId) =>
          run(async () => {
            const saved = await ensureSaved();
            const j = await send(`/api/sonar/saved/${saved.id}`, 'PATCH', { collectionId });
            setItem(j.item);
            setLibraryOpen(false);
          })
        }
      />
    </div>
  );
}

export default SonarSaveActions;
