'use client';

/**
 * Community page header (Nov 2026): eyebrow, title, subtitle, search with a
 * Cmd/Ctrl K shortcut, Messages (with an unread dot) and New Post.
 * Search is debounced (250ms) against /api/community/search/all and shows
 * People and Posts, five each, with arrow-key navigation; Esc closes.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import s from '@/app/(dashboard)/community/community.module.css';
import { Avatar, VerifiedBadge } from './primitives';
import { relativeTime } from '@/lib/community/redesign';

function useIsMac() {
  const [mac, setMac] = useState(true);
  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || ''));
  }, []);
  return mac;
}

function CommunitySearch({ onOpenPost }) {
  const router = useRouter();
  const isMac = useIsMac();
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const listId = useId();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState({ people: [], posts: [] });
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(-1);

  /* Cmd/Ctrl K focuses the search; scoped to this page and removed on unmount. */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults({ people: [], posts: [] });
      setBusy(false);
      return undefined;
    }
    setBusy(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/community/search/all?q=${encodeURIComponent(term)}`, {
          credentials: 'include',
          signal: ctrl.signal,
        });
        const d = await res.json().catch(() => ({}));
        setResults({ people: d.people || [], posts: d.posts || [] });
        setActive(-1);
      } catch {
        /* aborted or offline: keep the last results */
      } finally {
        setBusy(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const items = useMemo(
    () => [
      ...results.people.map((p) => ({ kind: 'person', key: `u-${p.id}`, p })),
      ...results.posts.map((p) => ({ kind: 'post', key: `p-${p.id}`, p })),
    ],
    [results],
  );

  const choose = (item) => {
    setOpen(false);
    if (!item) return;
    if (item.kind === 'person') {
      router.push(
        item.p.username
          ? `/profile/${encodeURIComponent(item.p.username)}`
          : `/community/profile/${item.p.id}`,
      );
    } else {
      onOpenPost?.(item.p.id);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(items[active]);
    }
  };

  const showMenu = open && q.trim().length >= 2;
  const optionId = (i) => `${listId}-opt-${i}`;
  let idx = -1;

  return (
    <div className={s.search} ref={wrapRef}>
      <label className={s.searchField}>
        <i className="bi bi-search" aria-hidden="true" />
        <span className={s.srOnly}>Search the community</span>
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search for people, posts or discussions…"
          role="combobox"
          aria-expanded={showMenu}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
        />
        <kbd className={s.kbd} aria-hidden="true">
          {isMac ? '⌘K' : 'Ctrl K'}
        </kbd>
      </label>
      {showMenu ? (
        <div className={s.searchMenu} id={listId} role="listbox" aria-label="Search results">
          {busy && !items.length ? <div className={s.searchEmpty}>Searching…</div> : null}
          {!busy && !items.length ? (
            <div className={s.searchEmpty}>No matches for “{q.trim()}”.</div>
          ) : null}
          {results.people.length ? <div className={s.searchGroup}>People</div> : null}
          {results.people.map((p) => {
            idx += 1;
            const i = idx;
            return (
              <button
                key={p.id}
                type="button"
                id={optionId(i)}
                role="option"
                aria-selected={active === i}
                className={s.searchItem}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(items[i])}
              >
                <Avatar src={p.avatar_url} name={p.name} size={28} />
                <span className={s.ellipsis}>{p.name}</span>
                {p.is_partner ? <VerifiedBadge /> : null}
                {p.username ? <span className={s.searchItemMeta}>@{p.username}</span> : null}
              </button>
            );
          })}
          {results.posts.length ? <div className={s.searchGroup}>Posts</div> : null}
          {results.posts.map((p) => {
            idx += 1;
            const i = idx;
            return (
              <button
                key={p.id}
                type="button"
                id={optionId(i)}
                role="option"
                aria-selected={active === i}
                className={s.searchItem}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(items[i])}
              >
                <i className="bi bi-chat" aria-hidden="true" />
                <span className={s.ellipsis}>{p.title}</span>
                <span className={s.searchItemMeta}>
                  {p.author} · {relativeTime(p.created_at)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function CommunityHeader({ hasUnreadMessages, onNewPost, onOpenPost }) {
  return (
    <header className={s.header}>
      <div className={s.headText}>
        <p className={s.eyebrow}>Ezana Community</p>
        <h1 className={s.title}>Community</h1>
        <p className={s.subtitle}>
          Connect with investors, share research and discuss markets with the Ezana community.
        </p>
      </div>
      <div className={s.headTools}>
        <CommunitySearch onOpenPost={onOpenPost} />
        <Link href="/community/messages" className={`${s.btn} ${s.btnSecondary}`}>
          <i className="bi bi-chat" aria-hidden="true" />
          Messages
          {hasUnreadMessages ? (
            <>
              <span className={s.dot} aria-hidden="true" />
              <span className={s.srOnly}>, unread messages</span>
            </>
          ) : null}
        </Link>
        <button
          type="button"
          className={`${s.btn} ${s.btnPrimary} ${s.newPostDesktop}`}
          onClick={onNewPost}
        >
          <i className="bi bi-pencil-square" aria-hidden="true" />
          New Post
        </button>
      </div>
    </header>
  );
}
