'use client';

/**
 * Ezana Echo home (option B, Magazine bento), the client half.
 *
 * page.js renders this on the server with the hub (published, non-archived
 * cards and the Chart of the Week, from the data cache) and the URL filters,
 * so the hero, Most read and the first bento row are in the HTML. This file
 * owns the state; EchoHome renders it.
 *   - /api/echo/hub: only for Retry, or if the server could not load the hub
 *   - /api/echo/article-statuses: admins only (the View archived count)
 *   - filters live in the URL (?section=&region=&range=&q=, defaults omitted,
 *     replaceState) and apply to the bento only, never the hero or Most read
 *   - paging is client-side over the hub payload, PAGE_SIZE stories a page
 *   - The Evening Brief posts to /api/newsletter/marketing/subscribe (double opt-in)
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
  toStory,
} from '@/lib/echo/home-feed';
import { AOTM_HISTORY } from '@/lib/echo/aotm';
import { withHomeImage } from '@/lib/echo/home-card-images';

import './ezana-echo.css';
import './ezana-echo-home.css';

const DAY_MS = 86400000;

export default function EchoHomeClient({ initialHub = null, initialFilters = null, now }) {
  const { user } = useAuth();
  const isAdmin = isAdminUserClient(user);

  const [hub, setHub] = useState(() =>
    initialHub
      ? { status: 'ready', articles: initialHub.articles || [], chart: initialHub.chart || null }
      : { status: 'loading', articles: [], chart: null },
  );
  const [archivedSet, setArchivedSet] = useState(() => new Set());
  const [archivingId, setArchivingId] = useState(null);
  const [filters, setFilters] = useState(() => initialFilters || DEFAULT_FILTERS);
  const [pages, setPages] = useState(1);
  const [searchOpen, setSearchOpen] = useState(() => !!initialFilters?.q);

  // Paint the Echo canvas on the dashboard shell (ezana-echo-home.css).
  useEffect(() => {
    document.body.classList.add('echo-route');
    return () => document.body.classList.remove('echo-route');
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
  /* The server normally hands the hub in; fetch only if it could not. */
  const hadInitialHub = !!initialHub;
  useEffect(() => {
    if (!hadInitialHub) loadHub();
  }, [hadInitialHub, loadHub]);

  /* Archived ids feed the admin "View archived" count. Everyone else is
     already filtered on the server, so only admins fetch them. */
  useEffect(() => {
    if (!isAdmin) return undefined;
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
  }, [isAdmin]);

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
  /* The server already nulled images that are not in public/. */
  const stories = useMemo(() => cards.map(toStory).map(withHomeImage), [cards]);
  /* One clock for server and client, so the hero pick hydrates identically. */
  const nowMs = now || Date.now();

  // Article of the Month: AOTM_HISTORY[0], else the flagged article, else the
  // most-read story of the last 30 days, else the newest.
  const hero = useMemo(() => {
    if (!stories.length) return null;
    const entry = AOTM_HISTORY.find((h) => stories.some((s) => s.id === h.articleId));
    const flagged = cards.find((c) => c.articleOfMonth);
    const recent = rankMostRead(
      stories.filter(
        (s) => s.publishedAt && nowMs - new Date(s.publishedAt).getTime() <= 30 * DAY_MS,
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
  }, [stories, cards, nowMs]);

  const mostRead = useMemo(() => rankMostRead(stories, 5), [stories]);

  // The bento: everything except the hero, newest first (the hub's order).
  const filtered = useMemo(
    () =>
      filterStories(
        stories.filter((s) => s.id !== hero?.id),
        filters,
        nowMs,
      ),
    [stories, hero, filters, nowMs],
  );
  const visible = useMemo(() => filtered.slice(0, pages * PAGE_SIZE), [filtered, pages]);
  // The chart is an editorial pick for the unfiltered front page; a filtered
  // grid shows only stories that match.
  const chart =
    hub.chart && !archivedSet.has(hub.chart.slug) && isDefaultFilters(filters) ? hub.chart : null;

  const status = hub.status;

  /* Double opt-in with a stored consent record: nothing is sent until the
     reader clicks the confirmation email. */
  const subscribe = async (email, consentText) => {
    const res = await fetch('/api/newsletter/marketing/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        marketing_consent: true,
        consent_text: consentText,
        source: 'echo_evening_brief',
      }),
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
