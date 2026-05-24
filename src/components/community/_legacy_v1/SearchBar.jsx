'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Avatar } from './Avatar';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/community/search?q=${encodeURIComponent(query.trim())}`);
        const data = res.ok ? await res.json() : { users: [] };
        setResults(data.users || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: 'var(--surface-input)',
          border: '1px solid var(--border-input)',
          borderRadius: 10,
        }}
      >
        <i className="bi bi-search" style={{ color: 'var(--text-muted)', fontSize: 14 }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Search investors by name, handle, or ticker they hold…"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 13,
          }}
        />
        {loading && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>…</span>}
      </div>
      {open && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-primary)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-lg)',
            zIndex: 40,
            maxHeight: 320,
            overflow: 'auto',
          }}
        >
          {results.map((u) => (
            <Link
              key={u.id}
              href={`/community/profile/${u.id}`}
              onClick={() => setOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                textDecoration: 'none',
                borderBottom: '1px solid var(--border-secondary)',
              }}
            >
              <Avatar
                author={{
                  id: u.id,
                  display_name: u.full_name || 'Member',
                  username: u.username,
                  avatar_url: u.avatar_url,
                }}
                size={32}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {u.full_name || 'Member'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  @{u.username || 'member'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
