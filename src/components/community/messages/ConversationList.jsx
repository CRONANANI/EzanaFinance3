'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ConversationRow } from './ConversationRow';
import { OnlineNowStrip } from './OnlineNowStrip';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
];

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
  onlineUsers = [],
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (conversations || []).filter((c) => {
      if (tab === 'unread' && (c.unread_count || 0) === 0) return false;
      if (!q) return true;

      const name = (c.other_user?.name || '').toLowerCase();
      if (name.includes(q)) return true;

      const preview = (c.last_message?.content || '').toLowerCase();
      if (preview.includes(q)) return true;

      if (contentMatches[c.id]?.length > 0) return true;

      return false;
    });
  }, [conversations, search, tab, contentMatches]);

  const highlightTerm = useMemo(() => search.trim(), [search]);

  return (
    <div className="m-list">
      <div className="m-search-wrap">
        <div className="m-search">
          <span className="m-search__icon" aria-hidden>
            <Search size={14} />
          </span>
          <input
            ref={inputRef}
            type="text"
            className="m-search__input"
            placeholder="Search messages and conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search conversations and messages"
          />
          {search ? (
            <button
              type="button"
              className="m-search__clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          ) : (
            <kbd className="m-search__kbd" aria-hidden>
              ⌘/
            </kbd>
          )}
          {searching ? (
            <span className="m-search__spinner" aria-label="Searching" />
          ) : null}
        </div>
      </div>

      <OnlineNowStrip users={onlineUsers} />

      <div className="m-tabs">
        <div
          className="m-tabs__group"
          role="tablist"
          aria-label="Filter conversations"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`m-tab${tab === t.id ? ' is-active' : ''}`}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            className="m-tab m-tab-new"
            onClick={onNewMessage}
            aria-label="Start a new message"
            title="Start a new message"
          >
            <span className="m-tab-new__label">New</span>
            <Pencil size={12} className="m-tab-new__icon" aria-hidden />
          </button>
        </div>
      </div>

      <div className="m-rows-wrap">
        {loading && (conversations?.length ?? 0) === 0 ? (
          <div className="m-list__skeleton" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="m-skeleton-row" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="m-list__empty">
            {search
              ? `No results for "${search}"`
              : tab === 'unread'
                ? 'Nothing unread.'
                : 'No messages yet. Connect with investors from the Community page to start a conversation.'}
          </div>
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
