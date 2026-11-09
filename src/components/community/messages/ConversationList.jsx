'use client';

/* Chats column (Nov 2026 redesign): "Chats" title with a round new-message
   button, a pill search, All / Unread / Requests filters, then rows split
   by hairlines. Incoming message requests live under Requests until the
   member accepts them; requests you sent stay in All, marked as sent. */

import { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { ConversationRow } from './ConversationRow';

async function authedFetch(url, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export function ConversationList({
  conversations,
  loading,
  selectedId,
  onSelect,
  onNewMessage,
  onSearchMatchesChange,
}) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [contentMatches, setContentMatches] = useState({});
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setSearch('');
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const q = search.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 2) {
      setContentMatches({});
      onSearchMatchesChange?.({ query: '', matches: {} });
      setSearching(false);
      return undefined;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await authedFetch(`/api/messages/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        const map = {};
        for (const r of data.results || []) {
          map[r.conversation_id] = r.matched_messages || [];
        }
        setContentMatches(map);
        onSearchMatchesChange?.({ query: q, matches: map });
      } catch {
        setContentMatches({});
        onSearchMatchesChange?.({ query: q, matches: {} });
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, onSearchMatchesChange]);

  const requestCount = useMemo(
    () => (conversations || []).filter((c) => c.is_incoming_request).length,
    [conversations],
  );
  const unreadCount = useMemo(
    () =>
      (conversations || []).filter((c) => !c.is_incoming_request && (c.unread_count || 0) > 0)
        .length,
    [conversations],
  );

  /* Back to All once the last request is answered. */
  useEffect(() => {
    if (tab === 'requests' && requestCount === 0) setTab('all');
  }, [tab, requestCount]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^@+/, '');
    return (conversations || []).filter((c) => {
      if (tab === 'requests') {
        if (!c.is_incoming_request) return false;
      } else {
        if (c.is_incoming_request) return false;
        if (tab === 'unread' && (c.unread_count || 0) === 0) return false;
      }
      if (!q) return true;

      const name = (c.other_user?.name || '').toLowerCase();
      if (name.includes(q)) return true;
      const handle = (c.other_user?.username || '').toLowerCase();
      if (handle && handle.includes(q)) return true;

      const preview = (c.last_message?.content || '').toLowerCase();
      if (preview.includes(q)) return true;

      return contentMatches[c.id]?.length > 0;
    });
  }, [conversations, search, tab, contentMatches]);

  const highlightTerm = useMemo(() => search.trim(), [search]);

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread', count: unreadCount },
    ...(requestCount > 0 ? [{ id: 'requests', label: 'Requests', count: requestCount }] : []),
  ];

  const emptyText = search
    ? `No chats match "${search}"`
    : tab === 'unread'
      ? 'Nothing unread.'
      : tab === 'requests'
        ? 'No message requests.'
        : 'No chats yet. Start one with the + button.';

  return (
    <div className="m-list">
      <div className="m-chats-head">
        <h1 className="m-chats-title">Chats</h1>
        <button
          type="button"
          className="m-chats-new"
          onClick={onNewMessage}
          aria-label="New message"
          title="New message"
        >
          <i className="bi bi-plus-lg" aria-hidden="true" />
        </button>
      </div>

      <div className="m-search-wrap">
        <div className="m-search">
          <span className="m-search__icon" aria-hidden="true">
            <i className="bi bi-search" />
          </span>
          <input
            ref={inputRef}
            type="text"
            className="m-search__input"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search chats and messages"
          />
          {searching ? <span className="m-search__spinner" aria-label="Searching" /> : null}
          {search ? (
            <button
              type="button"
              className="m-search__clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="m-filters" role="tablist" aria-label="Filter chats">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`m-filter${tab === t.id ? ' is-active' : ''}`}
          >
            {t.label}
            {t.count ? <span className="m-filter__count">{t.count}</span> : null}
          </button>
        ))}
      </div>

      <div className="m-rows-wrap">
        {loading && (conversations?.length ?? 0) === 0 ? (
          <div className="m-list__skeleton" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="m-skeleton-row" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="m-list__empty">{emptyText}</div>
        ) : (
          <ul className="m-rows">
            {filtered.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                selected={c.id === selectedId}
                onClick={() => onSelect(c.id)}
                highlightTerm={highlightTerm}
                contentMatches={contentMatches[c.id] || []}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
