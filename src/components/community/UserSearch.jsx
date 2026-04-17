'use client';

import { useState, useEffect, useMemo, useRef, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, X, ChevronRight, User as UserIcon } from 'lucide-react';
import './user-search.css';

const RECENT_KEY = 'ezana.userSearch.recent';
const RECENT_MAX = 5;

/** Escape regex meta-characters so highlighting doesn't explode on `.` / `*` / etc. */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Return text split into highlighted pieces for any substring match (case-insensitive).
 * Returns the original string if there's no match or the query is empty.
 */
function renderHighlight(text, query, keyPrefix) {
  if (!text) return null;
  const q = (query || '').trim();
  if (!q) return text;
  const re = new RegExp(`(${escapeRegExp(q)})`, 'ig');
  const parts = text.split(re);
  return parts.map((part, i) => {
    const k = `${keyPrefix}-${i}`;
    if (part.toLowerCase() === q.toLowerCase()) {
      return <mark key={k} className="us-hl">{part}</mark>;
    }
    return <span key={k}>{part}</span>;
  });
}

/**
 * Derive a small "top badge" to show on a result row.
 * Uses fields that exist on the current /api/community/search response.
 */
function deriveTopBadge(u) {
  if (u.is_partner) {
    return { label: u.partner_type || 'Partner', tone: 'gold' };
  }
  if (u.bio && u.bio.length > 40) {
    return { label: 'Active', tone: 'accent' };
  }
  return { label: 'Member', tone: 'neutral' };
}

function initialsFor(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
}

/**
 * Prominent, accessible user search. Drops into any page that exposes the
 * existing `/api/community/search?q=...` endpoint. Handles:
 *   - debounced fetch (300ms)
 *   - loading / empty / error states
 *   - keyboard navigation (↑/↓/Enter/Esc)
 *   - recent searches (localStorage, cap 5)
 *   - matches highlighting on name/@handle/email_hint
 *   - outside-click close
 *   - ARIA combobox semantics
 */
export function UserSearch({ className = '' }) {
  const router = useRouter();
  const listboxId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  const [recent, setRecent] = useState([]);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecent(parsed.slice(0, RECENT_MAX));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      setErrored(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setErrored(false);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/community/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setResults(Array.isArray(data?.users) ? data.users : []);
      } catch {
        if (!cancelled) {
          setResults([]);
          setErrored(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const debouncedQuery = query.trim();
  const showRecents = !debouncedQuery && recent.length > 0;

  const list = useMemo(() => (debouncedQuery.length >= 2 ? results : recent), [debouncedQuery, results, recent]);

  useEffect(() => {
    setActiveIdx(list.length > 0 ? 0 : -1);
  }, [list.length, debouncedQuery]);

  const persistRecent = useCallback((user) => {
    const next = [user, ...recent.filter((u) => u.id !== user.id)].slice(0, RECENT_MAX);
    setRecent(next);
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, [recent]);

  const clearRecents = useCallback(() => {
    setRecent([]);
    try {
      window.localStorage.removeItem(RECENT_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const selectUser = useCallback((user) => {
    if (!user) return;
    persistRecent(user);
    setOpen(false);
    setQuery('');
    const handle = user.username || user.id;
    router.push(`/profile/${handle}`);
  }, [persistRecent, router]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, list.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && list[activeIdx]) {
        e.preventDefault();
        selectUser(list[activeIdx]);
      }
    }
  };

  return (
    <div ref={containerRef} className={`us-wrap ${className}`}>
      <div className={`us-input-box ${open ? 'focus' : ''}`}>
        <Search className="us-icon" size={16} aria-hidden />
        <input
          ref={inputRef}
          type="text"
          className="us-input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIdx >= 0 && list[activeIdx] ? `${listboxId}-opt-${list[activeIdx].id}` : undefined
          }
          placeholder="Search users by name, @handle, or email…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck="false"
        />
        {query && (
          <button
            type="button"
            className="us-clear"
            onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div id={listboxId} role="listbox" className="us-panel">
          {loading && debouncedQuery.length >= 2 && (
            <div className="us-state">
              <Loader2 size={14} className="us-spin" />
              <span>Searching…</span>
            </div>
          )}

          {errored && !loading && (
            <div className="us-state us-state-error">
              Something went wrong. Try again in a moment.
            </div>
          )}

          {!loading && !errored && debouncedQuery.length >= 2 && results.length === 0 && (
            <div className="us-state">
              No users found for <span className="us-q">&ldquo;{debouncedQuery}&rdquo;</span>
            </div>
          )}

          {!loading && !errored && debouncedQuery.length > 0 && debouncedQuery.length < 2 && (
            <div className="us-state us-state-hint">Keep typing — at least 2 characters.</div>
          )}

          {showRecents && (
            <>
              <div className="us-section-head">
                <span>Recent</span>
                <button type="button" className="us-section-clear" onClick={clearRecents}>
                  Clear
                </button>
              </div>
            </>
          )}

          {!loading && list.map((u, idx) => {
            const badge = deriveTopBadge(u);
            const active = idx === activeIdx;
            const displayName = u.full_name || 'Member';
            const handle = u.username ? `@${u.username}` : '';
            const showEmail = Boolean(u.email_hint);
            return (
              <button
                key={u.id}
                id={`${listboxId}-opt-${u.id}`}
                role="option"
                aria-selected={active}
                type="button"
                className={`us-row ${active ? 'on' : ''}`}
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectUser(u)}
              >
                <div
                  className="us-avatar"
                  style={u.avatar_url ? { backgroundImage: `url(${u.avatar_url})`, backgroundSize: 'cover' } : undefined}
                  aria-hidden
                >
                  {!u.avatar_url && (
                    displayName ? initialsFor(displayName) : <UserIcon size={14} />
                  )}
                </div>
                <div className="us-row-main">
                  <div className="us-row-top">
                    <span className="us-name">
                      {renderHighlight(displayName, debouncedQuery, `n-${u.id}`)}
                    </span>
                    {handle && (
                      <span className="us-handle">
                        {renderHighlight(handle, debouncedQuery, `h-${u.id}`)}
                      </span>
                    )}
                  </div>
                  <div className="us-row-sub">
                    {showEmail
                      ? renderHighlight(u.email_hint, debouncedQuery, `e-${u.id}`)
                      : (u.bio && u.bio.slice(0, 72)) || 'Ezana member'}
                  </div>
                </div>
                {badge && (
                  <span className={`us-badge tone-${badge.tone}`}>{badge.label}</span>
                )}
                <ChevronRight size={14} className="us-chev" aria-hidden />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
