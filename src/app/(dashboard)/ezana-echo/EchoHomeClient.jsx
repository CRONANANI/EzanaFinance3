'use client';

/**
 * Ezana Echo home (newspaper-style front page), the client half.
 *
 * page.js renders this on the server with the hub (published, non-archived
 * cards and the Chart of the Week, from the data cache) and the URL filters,
 * so the hero, Most read and the first bento row are in the HTML. This file
 * owns the state; EchoHome renders it.
 *   - /api/echo/hub: only for Retry, or if the server could not load the hub
 *   - /api/echo/article-statuses: admins only (the View archived count)
 *   - filters live in the URL (?section=&region=&range=&q=, defaults omitted,
 *     replaceState) and apply to the bento only, never the hero or Most read
 *   - paging is client-side over the hub payload: the top TOP_STORIES fill the
 *     feature block and the row of three, then PAGE_SIZE stories a bento page
 *   - The Evening Brief posts to /api/newsletter/marketing/subscribe (double opt-in)
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useIsAdmin } from '@/lib/admin-helpers-client';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
import EchoHome from '@/components/echo/home/EchoHome';
import { PAGE_SIZE, TOP_STORIES } from '@/lib/echo/bento-layout';
import {
  DEFAULT_FILTERS,
  SECTIONS,
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
  const { isAdmin } = useIsAdmin(user);

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
  // Past picks: the earlier Article of the Month on show (null = current).
  const [aotmMonth, setAotmMonth] = useState(null);

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

  // Earlier AOTM_HISTORY entries that resolve to a story, newest first. The
  // current pick (the first resolving entry) is not one of them.
  const aotmOptions = useMemo(() => {
    const resolved = AOTM_HISTORY.map((h) => ({
      month: h.month,
      story: stories.find((s) => s.id === h.articleId),
    })).filter((o) => o.story);
    return resolved.slice(1);
  }, [stories]);
  const pastPick = aotmMonth ? aotmOptions.find((o) => o.month === aotmMonth) : null;
  // Swapping the card never changes the grid or Most read: they key off `hero`.
  const shownHero = pastPick ? { ...pastPick.story, kicker: monthKicker(pastPick.month) } : hero;

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
  // Stories 1-7 fill the feature block and the row of three; the bento then
  // gets full PAGE_SIZE pages from story 8 on.
  const visible = useMemo(
    () => filtered.slice(0, TOP_STORIES + pages * PAGE_SIZE),
    [filtered, pages],
  );
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

  const smooth = () =>
    typeof window !== 'undefined' &&
    !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? 'smooth'
      : 'auto';

  // Masthead section links filter the feed and bring the reader to it.
  const goToSection = (section) => {
    onFiltersChange({ section });
    document.getElementById('latest')?.scrollIntoView({ behavior: smooth(), block: 'start' });
  };

  // Subscribe: scroll to The Evening Brief and put the cursor in its email field.
  const goToBrief = () => {
    document.getElementById('brief')?.scrollIntoView({ behavior: smooth(), block: 'start' });
    document.getElementById('ech-brief-email')?.focus({ preventScroll: true });
  };

  const openSearch = () => {
    const next = !searchOpen;
    setSearchOpen(next);
    if (next)
      document.getElementById('latest')?.scrollIntoView({ behavior: smooth(), block: 'start' });
    else onFiltersChange({ q: '' });
  };

  // Dateline from the server clock so server and client render the same day.
  const dateline = new Date(nowMs)
    .toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/Toronto',
    })
    .toUpperCase();

  return (
    <>
      {/* The Echo masthead is this route's top bar (the marketing nav is
          suppressed here): logo + wordmark left, the six section links in the
          middle, then search, Archived (admins), Login and Subscribe right.
          Below 768px the section links drop to their own scrolling row. */}
      <header className="eth-masthead">
        <div className="eth-masthead-brand">
          <Link href="/" className="eth-masthead-logo" aria-label="Ezana home">
            <EzanaNavLogo width={36} height={41} priority />
          </Link>
          <Link href="/ezana-echo" className="eth-wordmark">
            Ezana <span>Echo</span>
          </Link>
        </div>
        <nav className="eth-sections" aria-label="Echo sections">
          {SECTIONS.map((s) => {
            const on = filters.section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                className={`eth-section${on ? ' is-on' : ''}`}
                aria-current={on ? 'true' : undefined}
                onClick={() => goToSection(s.id)}
              >
                {s.label}
              </button>
            );
          })}
        </nav>
        <div className="eth-masthead-auth">
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
          {isAdmin && (
            <Link
              href="/ezana-echo/archived"
              className="eth-archived-btn"
              aria-label={`Archived articles (${archivedSet.size})`}
            >
              <i className="bi bi-archive" aria-hidden="true" />
              <span className="eth-archived-label">Archived</span>
              <span className="eth-archived-count">{archivedSet.size}</span>
            </Link>
          )}
          <a href="/auth/login" className="eth-login">
            Login
          </a>
          <button type="button" className="eth-subscribe" onClick={goToBrief}>
            Subscribe
          </button>
        </div>
      </header>
      <div className="eth-dateline">
        <span>{dateline}</span>
      </div>

      <EchoHome
        hero={status === 'loading' ? null : shownHero}
        aotmOptions={aotmOptions}
        aotmMonth={pastPick ? aotmMonth : null}
        onAotmChange={setAotmMonth}
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
