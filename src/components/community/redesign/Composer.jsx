'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getInitials } from '@/lib/community-utils';
import { Avatar } from './Avatar';

function ComposerTool({ icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 10px',
        background: active ? 'var(--emerald-bg)' : 'transparent',
        border: `1px solid ${active ? 'var(--emerald-border)' : 'transparent'}`,
        borderRadius: 6,
        color: active ? 'var(--emerald)' : 'var(--text-muted)',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 500,
        transition: 'all .15s',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--surface-card-hover)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <i className={`bi ${icon}`} style={{ fontSize: 13 }} />
      <span>{label}</span>
    </button>
  );
}

export function Composer({ expanded, setExpanded, text, setText, mode, setMode, onPosted }) {
  const { user } = useAuth();
  const [posting, setPosting] = useState(false);

  const author = {
    display_name:
      user?.user_metadata?.full_name ||
      user?.user_metadata?.first_name ||
      user?.email?.split('@')[0] ||
      'You',
    username: user?.user_metadata?.username || '',
    id: user?.id,
    initials: getInitials(user?.user_metadata?.full_name, user?.email),
  };

  const handlePost = async () => {
    if (!user || !text.trim() || posting) return;
    setPosting(true);
    try {
      let content = text.trim();
      if (mode === 'discussion' && !/^#discussion\b/i.test(content)) {
        content = `#discussion ${content}`;
      }
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setText('');
        setMode?.(null);
        setExpanded?.(false);
        await onPosted?.();
      }
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="ez-card" style={{ padding: 14, background: 'var(--surface-card)' }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <Avatar author={author} size={38} />
        <div style={{ flex: 1 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setExpanded?.(true)}
            placeholder="What's your take on the markets today?"
            rows={expanded ? 3 : 1}
            disabled={!user}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              lineHeight: 1.5,
            }}
          />
        </div>
      </div>

      {expanded && mode === 'image' && (
        <div
          style={{
            margin: '10px 0',
            padding: 14,
            background: 'var(--bg-tertiary)',
            borderRadius: 8,
            border: '1px dashed var(--border-input)',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 12,
          }}
        >
          <i className="bi bi-cloud-upload" style={{ fontSize: 22, color: 'var(--emerald)' }} />
          <div style={{ marginTop: 6 }}>Image upload coming soon</div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: expanded ? 10 : 6,
          paddingTop: expanded ? 10 : 0,
          borderTop: expanded ? '1px solid var(--border-secondary)' : 'none',
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          <ComposerTool
            icon="bi-image"
            label="Image"
            active={mode === 'image'}
            onClick={() => setMode?.(mode === 'image' ? null : 'image')}
          />
          <ComposerTool
            icon="bi-bar-chart"
            label="Poll"
            active={mode === 'poll'}
            onClick={() => setMode?.(mode === 'poll' ? null : 'poll')}
          />
          <ComposerTool
            icon="bi-graph-up"
            label="Ticker"
            active={mode === 'ticker'}
            onClick={() => setMode?.(mode === 'ticker' ? null : 'ticker')}
          />
          <ComposerTool
            icon="bi-chat-square-quote"
            label="Discussion"
            active={mode === 'discussion'}
            onClick={() => setMode?.(mode === 'discussion' ? null : 'discussion')}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {expanded && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-faint)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {1000 - text.length}
            </span>
          )}
          <button
            type="button"
            className="ez-btn ez-btn--primary"
            disabled={!text.trim() || !user || posting}
            onClick={handlePost}
            style={{ opacity: text.trim() && user ? 1 : 0.5, padding: '7px 16px', fontSize: 13 }}
          >
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
