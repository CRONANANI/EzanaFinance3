'use client';

/**
 * Ezana Echo home (newspaper-style front page), the client half.
 *
 * page.js renders this on the server with the hub (published, non-archived
 * cards and the Chart of the Week, from the data cache) and the URL filters,
 * so the hero, Most read and the first bento row are in the HTML. This file
 * owns the state; EchoHome renders it.
 *   - /api/echo/hub: only for Retry, or if the server could not load the hub
 *   - filters live in the URL (?section=&region=&range=&q=, defaults omitted,
 *     replaceState) and apply to the story river only, never the hero, its
 *     teasers, Editors' Picks, Most read or the Chart of the Week
 *   - Editors' Picks (led by the two hero teasers, which no longer sit on the
 *     hero) are picked in src/lib/echo/editors-picks.js; on the unfiltered front page the river
 *     skips them so no story shows twice above the fold
 *   - paging is client-side over the hub payload: the top TOP_STORIES fill the
 *     river's lead and 2x2, then PAGE_SIZE stories a bento page
 *   - The Evening Brief posts to /api/newsletter/marketing/subscribe (double opt-in)
 *   - council members only (useOrg().isOrgUser, once org loading has
 *     finished): the "For our council" band (loaded on demand), the Our names
 *     tab (?ours=1) and a Team Hub link in the masthead. Nothing council
 *     related is fetched or drawn for anyone else.
 *   - masthead: wordmark + utilities only (search, Team
 *     Hub for council members, Login for signed-out readers, Subscribe). The
 *     category links live in the one filter row under Editors' Picks.
 *   - no archive controls here: admins archive and restore articles in
 *     Settings → Echo articles (Nov 19, 2026).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useAuth } from '@/components/AuthProvider';
import { useOrg } from '@/contexts/OrgContext';
import { useCouncilEcho } from '@/components/echo/council/useCouncilEcho';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
import EchoHome from '@/components/echo/home/EchoHome';
import { PAGE_SIZE, TOP_STORIES } from '@/lib/echo/bento-layout';
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
import { pickEditorsPicks, pickHeroTeasers } from '@/lib/echo/editors-picks';
import { withHomeImage } from '@/lib/echo/home-card-images';

import './ezana-echo.css';
import './ezana-echo-home.css';

const DAY_MS = 86400000;

/* The council band and its model load only for council members. */
const EchoCouncilBand = dynamic(() => import('@/components/echo/council/EchoCouncilBand'), {
  ssr: false,
  loading: () => null,
});

export default function EchoHomeClient({ initialHub = null, initialFilters = null, now }) {
  const { user, loading: authLoading } = useAuth();
  const { isOrgUser, isLoading: orgLoading, orgData } = useOrg();
  const councilReady = Boolean(user && isOrgUser && !orgLoading);
  const council = useCouncilEcho(councilReady);
  /* The Our names tab applies only with the council's tickers in hand. */
  const ourTickers = councilReady ? council.tickers : null;

  const [hub, setHub] = useState(() =>
    initialHub
      ? { status: 'ready', articles: initialHub.articles || [], chart: initialHub.chart || null }
      : { status: 'loading', articles: [], chart: null },
  );
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


  const cards = hub.articles;
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

  // Two teasers, then the rest of Editors' Picks. Both key off `hero`
  // (the current pick), so browsing past months never reshuffles them.
  const teasers = useMemo(() => pickHeroTeasers(stories, hero?.id), [stories, hero]);
  /* The teasers lead the Editors' Picks rail instead of sitting on the hero. */
  const editorsPicks = useMemo(
    () => [
      ...teasers,
      ...pickEditorsPicks(stories, {
        exclude: new Set([hero?.id, ...teasers.map((t) => t.id)].filter(Boolean)),
        history: AOTM_HISTORY,
      }),
    ],
    [stories, hero, teasers],
  );

  const shownFilters = councilReady ? filters : { ...filters, ours: false };
  const unfiltered = isDefaultFilters(shownFilters);
  // The river: everything except the hero, newest first (the hub's order). On
  // the unfiltered front page it also skips the teasers and picks shown above
  // it; once a reader filters, every matching story is listed.
  const filtered = useMemo(() => {
    const above = new Set(
      unfiltered ? [...teasers.map((t) => t.id), ...editorsPicks.map((p) => p.id)] : [],
    );
    return filterStories(
      stories.filter((s) => s.id !== hero?.id && !above.has(s.id)),
      councilReady ? filters : { ...filters, ours: false },
      nowMs,
      ourTickers || undefined,
    );
  }, [stories, hero, teasers, editorsPicks, unfiltered, filters, councilReady, nowMs, ourTickers]);
  // Stories 1-5 fill the river's lead and 2x2; the bento then gets full
  // PAGE_SIZE pages from story 6 on.
  const visible = useMemo(
    () => filtered.slice(0, TOP_STORIES + pages * PAGE_SIZE),
    [filtered, pages],
  );
  // The Chart of the Week sits in the rail, independent of the river filters.
  const chart = hub.chart || null;
  /* Our names waits for the council's tickers rather than flash every story. */
  const gridStatus =
    councilReady && filters.ours && !ourTickers && council.fund.status !== 'error'
      ? 'loading'
      : undefined;

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

  // Subscribe: scroll to The Evening Brief and put the cursor in its email field.
  const goToBrief = () => {
    document.getElementById('brief')?.scrollIntoView({ behavior: smooth(), block: 'start' });
    document.getElementById('ech-brief-email')?.focus({ preventScroll: true });
  };

  const showOurNames = () => {
    onFiltersChange({ section: '', ours: true });
    document.getElementById('latest')?.scrollIntoView({ behavior: smooth(), block: 'start' });
  };
  const browseAll = () => {
    onFiltersChange({ ...DEFAULT_FILTERS });
    document.getElementById('latest')?.scrollIntoView({ behavior: smooth(), block: 'start' });
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
          suppressed here): logo + wordmark left; search, Archived (admins),
          Team Hub (council), Login and Subscribe right. No category links:
          the filter row under Editors' Picks is the page's one category
          navigation. */}
      <header className="eth-masthead">
        <div className="eth-masthead-brand">
          <Link href="/" className="eth-masthead-logo" aria-label="Ezana home">
            <EzanaNavLogo width={36} height={41} priority />
          </Link>
          <Link href="/ezana-echo" className="eth-wordmark">
            Ezana <span>Echo</span>
          </Link>
        </div>
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
          {councilReady ? (
            <Link href="/org-team-hub" className="eth-login">
              Team Hub
            </Link>
          ) : null}
          {/* Login only once auth has settled and no one is signed in. */}
          {!authLoading && !user ? (
            <a href="/auth/login" className="eth-login">
              Login
            </a>
          ) : null}
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
        editorsPicks={status === 'loading' ? [] : editorsPicks}
        mostRead={status === 'loading' ? [] : mostRead}
        stories={visible}
        chart={chart}
        filters={shownFilters}
        onFiltersChange={onFiltersChange}
        hasMore={filtered.length > visible.length}
        onLoadMore={() => setPages((p) => p + 1)}
        status={status}
        onRetry={loadHub}
        onSubscribe={subscribe}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        ourNames={councilReady}
        gridStatus={gridStatus}
        council={
          councilReady ? (
            <EchoCouncilBand
              council={council}
              stories={stories}
              councilName={orgData?.org?.name || null}
              userId={user?.id || null}
              onBrowse={browseAll}
              onOurNames={showOurNames}
            />
          ) : null
        }
      />
    </>
  );
}
