'use client';

/**
 * Ezana Echo home (option B, Magazine bento).
 *
 * This route owns the data and state; EchoHome renders it.
 *   - /api/echo/hub: published cards, the featured flag, the Chart of the Week
 *   - /api/echo/article-statuses: archived ids (hidden from everyone here)
 *   - filters live in the URL (?section=&region=&range=&q=, defaults omitted,
 *     replaceState) and apply to the bento only, never the hero or Most read
 *   - paging is client-side over the hub payload, PAGE_SIZE stories a page
 *   - The Evening Brief posts to /api/newsletter/subscribe (the Echo list)
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { isAdminUserClient } from '@/lib/admin-helpers-client';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
import EchoHome from '@/components/echo/home/EchoHome';
import { PAGE_SIZE } from '@/lib/echo/bento-layout';
import {
  DEFAULT_FILTERS,
  filterStories,
  filtersToSearch,
  isDefaultFilters,
  monthKicker,
  mostRead as rankMostRead,
  parseFilters,
  toStory,
} from '@/lib/echo/home-feed';
import { AOTM_HISTORY } from '@/lib/ezana-echo-mock';

import './ezana-echo.css';
import './ezana-echo-home.css';

const DAY_MS = 86400000;
const PROBE_TIMEOUT_MS = 2500;

/**
 * Which article images actually exist. Several hero images are referenced in
 * the DB but not yet in public/, and the packer must know before it lays out
 * the grid (a missing image becomes a text tile, never an empty image box).
 * HEAD requests, same origin, no image bytes. Anything still pending after
 * PROBE_TIMEOUT_MS is assumed present; <Picture> still falls back on error.
 */
function useMissingImages(urls) {
  const key = urls.join('|');
  const [state, setState] = useState({ key: null, missing: new Set() });
  useEffect(() => {
    const list = key ? key.split('|') : [];
    if (!list.length) {
      setState({ key, missing: new Set() });
      return undefined;
    }
    let cancelled = false;
    const missing = new Set();
    const settle = () => {
      if (!cancelled) setState({ key, missing: new Set(missing) });
    };
    const timer = setTimeout(settle, PROBE_TIMEOUT_MS);
    Promise.all(
      list.map((u) =>
        fetch(u, { method: 'HEAD' })
          .then((r) => {
            if (!r.ok) missing.add(u);
          })
          .catch(() => {}),
      ),
    ).then(() => {
      clearTimeout(timer);
      settle();
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key]);
  return state.key === key
    ? { ready: true, missing: state.missing }
    : { ready: false, missing: null };
}

export default function EzanaEchoPage() {
  const { user } = useAuth();
  const isAdmin = isAdminUserClient(user);

  const [hub, setHub] = useState({ status: 'loading', articles: [], chart: null });
  const [archivedSet, setArchivedSet] = useState(() => new Set());
  const [archivingId, setArchivingId] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [pages, setPages] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);

  // Paint the Echo canvas on the dashboard shell (ezana-echo-home.css).
  useEffect(() => {
    document.body.classList.add('echo-route');
    return () => document.body.classList.remove('echo-route');
  }, []);

  // Filters from the URL on load (a shared link renders the filtered grid).
  useEffect(() => {
    const f = parseFilters(new URLSearchParams(window.location.search));
    setFilters(f);
    if (f.q) setSearchOpen(true);
  }, []);

  const loadHub = useCallback(async () => {
    setHub((h) => ({ ...h, status: 'loading' }));
    try {
      const res = await fetch('/api/echo/hub', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHub({ status: 'ready', articles: data.articles || [], chart: data.chart || null });
    } catch {
      setHub((h) => ({ ...h, status: 'error' }));
    }
  }, []);
  useEffect(() => {
    loadHub();
  }, [loadHub]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/echo/article-statuses', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setArchivedSet(new Set(data.archivedIds || []));
      } catch {
        /* the feed still renders; archived ids are a filter, not a dependency */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onFiltersChange = useCallback((patch) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      try {
        const url = `${window.location.pathname}${filtersToSearch(next)}${window.location.hash}`;
        window.history.replaceState(window.history.state, '', url);
      } catch {
        /* URL sync is a convenience */
      }
      return next;
    });
    setPages(1);
  }, []);

  async function handleArchive(articleId, e) {
    e?.preventDefault();
    e?.stopPropagation();
    if (!confirm('Archive this article? It will be hidden from non-admin users.')) return;
    setArchivingId(articleId);
    try {
      const res = await fetch('/api/echo/admin/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setArchivedSet((prev) => new Set(prev).add(articleId));
    } catch (err) {
      alert(`Failed to archive: ${err.message}`);
    } finally {
      setArchivingId(null);
    }
  }

  const cards = useMemo(
    () => hub.articles.filter((a) => !archivedSet.has(a.id)),
    [hub.articles, archivedSet],
  );
  const allStories = useMemo(() => cards.map(toStory), [cards]);

  const imageUrls = useMemo(
    () => [...new Set(allStories.map((s) => s.image).filter(Boolean))].sort(),
    [allStories],
  );
  const probe = useMissingImages(hub.status === 'ready' ? imageUrls : []);
  const stories = useMemo(() => {
    if (!probe.missing || !probe.missing.size) return allStories;
    return allStories.map((s) => (probe.missing.has(s.image) ? { ...s, image: null } : s));
  }, [allStories, probe.missing]);

  // Article of the Month: AOTM_HISTORY[0], else the flagged article, else the
  // most-read story of the last 30 days, else the newest.
  const hero = useMemo(() => {
    if (!stories.length) return null;
    const entry = AOTM_HISTORY.find((h) => stories.some((s) => s.id === h.articleId));
    const flagged = cards.find((c) => c.articleOfMonth);
    const recent = rankMostRead(
      stories.filter(
        (s) => s.publishedAt && Date.now() - new Date(s.publishedAt).getTime() <= 30 * DAY_MS,
      ),
      1,
    )[0];
    const fromHistory = entry && stories.find((s) => s.id === entry.articleId);
    if (fromHistory) return { ...fromHistory, kicker: monthKicker(entry.month) };
    const fromFlag = flagged && stories.find((s) => s.id === flagged.id);
    if (fromFlag) return { ...fromFlag, kicker: monthKicker(null) };
    // Fallbacks say what they are rather than claim the monthly pick.
    if (recent) return { ...recent, kicker: 'MOST READ THIS MONTH' };
    return { ...stories[0], kicker: 'LATEST STORY' };
  }, [stories, cards]);

  const mostRead = useMemo(() => rankMostRead(stories, 5), [stories]);

  // The bento: everything except the hero, newest first (the hub's order).
  const filtered = useMemo(
    () =>
      filterStories(
        stories.filter((s) => s.id !== hero?.id),
        filters,
      ),
    [stories, hero, filters],
  );
  const visible = useMemo(() => filtered.slice(0, pages * PAGE_SIZE), [filtered, pages]);
  // The chart is an editorial pick for the unfiltered front page; a filtered
  // grid shows only stories that match.
  const chart =
    hub.chart && !archivedSet.has(hub.chart.slug) && isDefaultFilters(filters) ? hub.chart : null;

  const status =
    hub.status === 'error'
      ? 'error'
      : hub.status === 'loading' || !probe.ready
        ? 'loading'
        : 'ready';

  const subscribe = async (email) => {
    const res = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, step: 'email' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  };

  const openSearch = () => {
    const next = !searchOpen;
    setSearchOpen(next);
    if (next)
      document.getElementById('latest')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else onFiltersChange({ q: '' });
  };

  return (
    <>
      {/* The Echo masthead is this route's top bar (the marketing nav is
          suppressed here): logo left, centred wordmark, search + Login +
          Become a Partner right, with "Publish to the Echo" hanging below
          the partner button. */}
      <header className="eth-masthead">
        <Link href="/" className="eth-masthead-brand" aria-label="Ezana home">
          <EzanaNavLogo width={47} height={54} priority />
        </Link>
        <Link href="/ezana-echo" className="nav-echo-wordmark eth-nav-center">
          Ezana <span>Echo</span>
        </Link>
        <div className="eth-masthead-auth">
          {isAdmin && (
            <Link href="/ezana-echo/archived" className="eth-archived-btn">
              View archived
              <span className="eth-archived-count">{archivedSet.size}</span>
            </Link>
          )}
          <button
            type="button"
            className="eth-search-btn"
            aria-label="Search Echo"
            aria-expanded={searchOpen}
            aria-controls="latest"
            onClick={openSearch}
          >
            <i className="bi bi-search" aria-hidden="true" />
          </button>
          <a href="/auth/login" className="eth-login">
            Login
          </a>
          <div className="eth-partner-stack">
            <a href="/auth/partner/apply" className="eth-partner-btn">
              Become a Partner
            </a>
            <a href="/auth/partner/apply" className="eth-partner-note">
              Publish to the Echo →
            </a>
          </div>
        </div>
      </header>

      <EchoHome
        hero={status === 'loading' ? null : hero}
        mostRead={status === 'loading' ? [] : mostRead}
        stories={visible}
        chart={chart}
        filters={filters}
        onFiltersChange={onFiltersChange}
        hasMore={filtered.length > visible.length}
        onLoadMore={() => setPages((p) => p + 1)}
        status={status}
        onRetry={loadHub}
        onSubscribe={subscribe}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        isAdmin={isAdmin}
        onArchive={handleArchive}
        archivingId={archivingId}
      />
    </>
  );
}
