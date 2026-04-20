'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?';
}

export function NewMessageDialog({
  open,
  friends,
  loading,
  onClose,
  onPickFriend,
}) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ('');
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

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return friends || [];
    return (friends || []).filter((f) => (f.name || '').toLowerCase().includes(query));
  }, [friends, q]);

  if (!open) return null;

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
          <button
            type="button"
            className="m-dialog__close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="m-dialog__search">
          <div className="m-search">
            <input
              ref={inputRef}
              type="text"
              className="m-search__input"
              placeholder="Search friends..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ paddingLeft: '0.9rem', paddingRight: '0.9rem' }}
              aria-label="Search friends"
            />
          </div>
        </div>

        <div className="m-dialog__list">
          {loading && <p className="m-dialog__muted">Loading friends...</p>}
          {!loading && filtered.length === 0 && (
            <p className="m-dialog__muted">
              {(friends || []).length === 0
                ? 'No friends yet. Follow someone and have them follow you back!'
                : 'No friends match your search.'}
            </p>
          )}
          {filtered.map((f) => (
            <button
              key={f.id}
              type="button"
              className="m-dialog__item"
              onClick={() => onPickFriend?.(f)}
            >
              {f.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.avatar_url}
                  alt=""
                  className="m-row__avatar"
                  style={{ width: 32, height: 32 }}
                />
              ) : (
                <div
                  className="m-row__avatar-fallback"
                  style={{ width: 32, height: 32, fontSize: '0.7rem' }}
                  aria-hidden
                >
                  {getInitials(f.name)}
                </div>
              )}
              <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 600 }}>
                {f.name}
              </span>
              {f.conversation_id && (
                <span className="m-dialog__item-existing">Existing</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
