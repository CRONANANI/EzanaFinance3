'use client';

/* New message (Nov 2026): search any member by name or @username. Friends
   (mutual follows) go straight to the inbox; anyone else gets the first
   message as a request they can accept or decline. With an empty search
   the dialog lists your friends. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { handleOf } from '@/lib/messages/requests';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?';
}

async function authedFetch(url) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
}

function Person({ person, onPick }) {
  const handle = handleOf(person.username);
  return (
    <li>
      <button type="button" className="m-dialog__item" onClick={() => onPick(person)}>
        {person.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.avatar_url} alt="" className="m-dialog__avatar" />
        ) : (
          <span className="m-dialog__avatar m-dialog__avatar--fallback" aria-hidden="true">
            {getInitials(person.name)}
          </span>
        )}
        <span className="m-dialog__who">
          <span className="m-dialog__name">{person.name}</span>
          {handle ? <span className="m-dialog__handle">{handle}</span> : null}
        </span>
        {person.conversation_id ? (
          <span className="m-dialog__tag">Open chat</span>
        ) : person.is_friend ? (
          <span className="m-dialog__tag m-dialog__tag--friend">Friend</span>
        ) : (
          <span className="m-dialog__tag m-dialog__tag--request">Sends a request</span>
        )}
      </button>
    </li>
  );
}

export function NewMessageDialog({
  open,
  friends,
  conversations,
  currentUserId,
  loading,
  onClose,
  onPick,
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setResults([]);
      setSearchError(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  /* The leading "@" is how people type handles; the search wants the bare name. */
  const term = q.trim().replace(/^@+/, '');

  useEffect(() => {
    if (!open || term.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(false);
      return undefined;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await authedFetch(`/api/community/search?q=${encodeURIComponent(term)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setResults(Array.isArray(data?.users) ? data.users : []);
          setSearchError(false);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
          setSearchError(true);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, term]);

  const friendIds = useMemo(() => new Set((friends || []).map((f) => f.id)), [friends]);
  const convoByUser = useMemo(() => {
    const m = new Map();
    for (const c of conversations || []) {
      if (c.other_user?.id) m.set(c.other_user.id, c.id);
    }
    return m;
  }, [conversations]);

  const people = useMemo(() => {
    if (term.length < 2) {
      return (friends || []).map((f) => ({
        id: f.id,
        name: f.name || 'Member',
        username: f.username || '',
        avatar_url: f.avatar_url || null,
        is_friend: true,
        conversation_id: f.conversation_id || convoByUser.get(f.id) || null,
      }));
    }
    return results
      .filter((u) => u.id && u.id !== currentUserId)
      .map((u) => ({
        id: u.id,
        name: u.full_name || 'Member',
        username: u.username || '',
        avatar_url: u.avatar_url || null,
        is_friend: friendIds.has(u.id),
        conversation_id: convoByUser.get(u.id) || null,
      }));
  }, [term, friends, results, currentUserId, friendIds, convoByUser]);

  if (!open) return null;

  const browsing = term.length < 2;
  let status = null;
  if (browsing && loading) status = 'Loading friends...';
  else if (browsing && people.length === 0)
    status = 'Search for anyone on Ezana by name or @username.';
  else if (!browsing && searching && people.length === 0) status = 'Searching...';
  else if (!browsing && searchError) status = "Search isn't available right now. Try again.";
  else if (!browsing && people.length === 0) status = `No members match "${q.trim()}".`;

  return (
    <div
      className="m-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-message-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="m-dialog">
        <div className="m-dialog__head">
          <h2 id="new-message-title" className="m-dialog__title">
            New message
          </h2>
          <button type="button" className="m-dialog__close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="m-dialog__search">
          <div className="m-search">
            <span className="m-search__icon" aria-hidden="true">
              <i className="bi bi-search" />
            </span>
            <input
              ref={inputRef}
              type="text"
              className="m-search__input"
              placeholder="Search by name or @username"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search members by name or username"
              autoComplete="off"
            />
            {searching ? <span className="m-search__spinner" aria-label="Searching" /> : null}
          </div>
          <p className="m-dialog__hint">
            Friends get your message right away. Anyone else gets it as a message request.
          </p>
        </div>

        <div className="m-dialog__list" aria-live="polite">
          {browsing && people.length > 0 ? <p className="m-dialog__section">Friends</p> : null}
          {status ? <p className="m-dialog__muted">{status}</p> : null}
          {people.length > 0 ? (
            <ul className="m-dialog__people">
              {people.map((p) => (
                <Person key={p.id} person={p} onPick={onPick} />
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
