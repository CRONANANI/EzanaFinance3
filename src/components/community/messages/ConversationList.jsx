'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Pencil } from 'lucide-react';
import { ConversationRow } from './ConversationRow';
import { OnlineNowStrip } from './OnlineNowStrip';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
];

export function ConversationList({
  conversations,
  loading,
  selectedId,
  onSelect,
  onNewMessage,
  onlineUsers = [],
}) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const inputRef = useRef(null);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (conversations || []).filter((c) => {
      if (tab === 'unread' && (c.unread_count || 0) === 0) return false;
      if (!q) return true;
      const name = (c.other_user?.name || '').toLowerCase();
      const preview = (c.last_message?.content || '').toLowerCase();
      return name.includes(q) || preview.includes(q);
    });
  }, [conversations, search, tab]);

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
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search conversations"
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
            className="m-tab"
            onClick={onNewMessage}
            aria-label="Start a new message"
            title="Start a new message"
          >
            <Pencil size={12} style={{ verticalAlign: '-2px' }} /> New
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
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
