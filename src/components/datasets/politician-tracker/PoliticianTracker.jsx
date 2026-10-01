'use client';

/**
 * Politician Tracker, P3 "Portrait gallery" (docs/design/tracker-handoff/).
 *
 * Every member of Congress with disclosed trades, House and Senate in ONE
 * ranking. Faces first: the top eight as portrait cards beside a House vs
 * Senate rail, then the rest of the ranking as a dense list. Selecting a
 * card or a row opens the member panel (MemberPanel.jsx).
 *
 * Data is the canonical STOCK Act feed (/api/politicians/trades); contract
 * exposure is /api/politicians/contractor-exposure. Nothing is estimated:
 * "disclosed volume" is the sum of the midpoints of disclosed ranges, and
 * every place it appears says so. Every computation lives in
 * tracker-model.js; this file renders.
 *
 * The shared green chrome and ticker are drawn by the datasets layout. The
 * page publishes ticker items through usePublishTicker and nothing else.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART } from '@/lib/chart-theme';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import EzanaQLBar from '@/components/ezanaql/EzanaQLBar';
import { seedForDataset } from '@/lib/ezanaql/seeds';
import {
  buildMembers,
  chamberStats,
  filterMembers,
  loadedWindow,
  mergeServerRankings,
  mostHeldTickers,
  monthlyByChamber,
  rankMembers,
  seatLabel,
  serverWindow,
  SORT_KEYS,
  tradesOf,
  usdShort,
} from '@/lib/politicians/tracker-model';
import { buildFixtureTrades } from '@/lib/politicians/tracker-fixture';
import { POSITION_BASIS_NOTE } from '@/lib/politicians/position-status';
import Headshot, { AVATAR_SIZE, ChamberChip, PartyTag } from './Headshot';
import MemberPanel from './MemberPanel';
import Segmented from './Segmented';
import '@/components/datasets/disclosures/disclosures.css';
import './politician-tracker.css';

const NONE = '·';

/** '29 Sep 2026, 14:05' in the reader's locale; the raw string if unparseable. */
function formatUpdated(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso || '');
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
const PAGES = [0, 1, 2];
const GALLERY = 8;
const LIST_DEFAULT = 8;

const SORTS = [
  { value: 'volume', label: 'Disclosed volume', heading: 'disclosed volume' },
  { value: 'trades', label: 'Most trades', heading: 'most trades' },
  { value: 'latest', label: 'Latest trade', heading: 'latest trade' },
];
const CHAMBERS = [
  { value: null, label: 'Both' },
  { value: 'House', label: 'House', dot: 'ptk-dot--house' },
  { value: 'Senate', label: 'Senate', dot: 'ptk-dot--senate' },
];
const PARTIES = [
  { value: null, label: 'ALL' },
  { value: 'D', label: 'D' },
  { value: 'R', label: 'R' },
  { value: 'I', label: 'I' },
];
const SIDE_LABEL = { purchase: 'BUY', sale: 'SELL', exchange: 'EXCH', other: 'OTHER' };

/* ── URL state: member pushes (one entry per panel), everything else
      replaces. Defaults are omitted so the canonical URL stays clean. ──── */
function readUrl() {
  if (typeof window === 'undefined') return {};
  const p = new URL(window.location.href).searchParams;
  const ch = String(p.get('chamber') || '').toLowerCase();
  const party = String(p.get('party') || '').toUpperCase();
  return {
    member: p.get('member'),
    chamber: ch === 'house' ? 'House' : ch === 'senate' ? 'Senate' : null,
    party: ['D', 'R', 'I'].includes(party) ? party : null,
    sort: SORT_KEYS.includes(p.get('sort')) ? p.get('sort') : 'volume',
    q: p.get('q') || '',
  };
}

function writeUrl({ member, chamber, party, sort, q }, push = false) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const set = (k, v) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
  set('member', member);
  set('chamber', chamber ? chamber.toLowerCase() : null);
  set('party', party);
  set('sort', sort === 'volume' ? null : sort);
  set('q', q.trim());
  window.history[push ? 'pushState' : 'replaceState'](
    { ...(window.history.state || {}), ptkMember: member || null },
    '',
    `${url.pathname}${url.search}`,
  );
}

/* ── small presentational pieces ─────────────────────────────────────── */

function Skel({ className = '' }) {
  return <span className={`ptk-skel ${className}`.trim()} aria-hidden="true" />;
}

function SplitBar({ left, right, leftCls, rightCls }) {
  const total = (left || 0) + (right || 0);
  const l = total ? ((left || 0) / total) * 100 : left ? 100 : right ? 0 : 50;
  return (
    <span className="ptk-split" aria-hidden="true">
      <i className={leftCls} style={{ width: `${l}%` }} />
      <i className={rightCls} style={{ width: `${100 - l}%` }} />
    </span>
  );
}

function Tickers({ tickers, n = 3, cls = '' }) {
  if (!tickers?.length) return <span className="dsc-none">{NONE}</span>;
  return (
    <span className={`ptk-tks ${cls}`.trim()}>
      {tickers.slice(0, n).map((t) => (
        <span key={t.ticker} className="ptk-tk dsc-mn">
          {t.ticker}
        </span>
      ))}
    </span>
  );
}

function Card({ m, selected, showPct, onOpen }) {
  const seat = seatLabel(m);
  const ch = String(m.chamber || '').toLowerCase();
  return (
    <button
      type="button"
      className={`ptk-card${m.rank === 1 ? ' ptk-card--first' : ''}${
        selected ? ` ptk-card--selected ptk-card--selected-${ch}` : ''
      }`}
      aria-label={`${m.name}, rank ${m.rank}, disclosed volume ${usdShort(m.volume)}`}
      aria-pressed={selected}
      onClick={(e) => onOpen(m, e.currentTarget)}
    >
      <span className={`ptk-rank dsc-mn${m.rank === 1 ? ' ptk-rank--first' : ''}`}>#{m.rank}</span>
      <span className="ptk-card-chip">
        <ChamberChip chamber={m.chamber} />
      </span>
      <Headshot
        name={m.name}
        bioguideId={m.bioguideId}
        chamber={m.chamber}
        photoUrl={m.photoUrl}
        size={AVATAR_SIZE.card}
        ring={3}
        priority
      />
      <span className="ptk-card-name">{m.name}</span>
      <span className="ptk-seat">
        <PartyTag party={m.party} />
        <span className="dsc-mn">{seat || NONE}</span>
      </span>
      <span className="ptk-card-vol dsc-mn">{usdShort(m.volume)}</span>
      <span className="ptk-card-cap">
        disclosed volume, midpoints
        {showPct && m.pctOfFirst != null && m.rank !== 1 ? (
          <span className="dsc-mn"> · {m.pctOfFirst}% of #1</span>
        ) : null}
      </span>
      <SplitBar left={m.buys} right={m.sells} leftCls="ptk-split--buy" rightCls="ptk-split--sell" />
      <span className="ptk-card-line dsc-mn">
        <span>
          <b className="ptk-buy-n">{m.buys}</b> buys
        </span>
        <span>
          <b>{m.count}</b> trades
        </span>
        <span>
          <b>{m.sells}</b> sells
        </span>
      </span>
      <Tickers tickers={m.tickers} />
    </button>
  );
}

function CardSkeleton() {
  return (
    <div className="ptk-card ptk-card--skel" aria-hidden="true">
      <Skel className="ptk-skel--circle" />
      <Skel className="ptk-skel--line ptk-skel--w60" />
      <Skel className="ptk-skel--line ptk-skel--w40" />
      <Skel className="ptk-skel--big" />
      <Skel className="ptk-skel--bar" />
      <Skel className="ptk-skel--line ptk-skel--w80" />
    </div>
  );
}

/* ── the page ────────────────────────────────────────────────────────── */

export default function PoliticianTracker({
  initialMember = null,
  initialChamber = null,
  initialParty = null,
  initialSort = 'volume',
  initialQuery = '',
}) {
  const [trades, setTrades] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | empty | sample
  const [feeds, setFeeds] = useState(null);
  /* ISO time of the last good fetch when the route served its snapshot
     (X-Data-Stale), else null. */
  const [staleAt, setStaleAt] = useState(null);
  const [contractors, setContractors] = useState({ state: 'loading', data: null });
  const [reload, setReload] = useState(0);

  const [chamber, setChamber] = useState(initialChamber);
  const [party, setParty] = useState(initialParty);
  const [sort, setSort] = useState(initialSort);
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [lastFilter, setLastFilter] = useState(null);
  const [showAll, setShowAll] = useState(false);

  /* SQL aggregates for the current filters ({ key, data }), and trades
     fetched for a member whose rows were not in the loaded pages. */
  const [summary, setSummary] = useState(null);
  const [memberTrades, setMemberTrades] = useState({});

  const [openSlug, setOpenSlug] = useState(initialMember);
  const triggerRef = useRef(null);
  const pushedRef = useRef(false);
  const searchRef = useRef(null);

  /* ── data ── */
  useEffect(() => {
    let alive = true;
    setStatus('loading');
    Promise.all(
      PAGES.map((p) =>
        fetch(`/api/politicians/trades?page=${p}&limit=500`)
          .then(async (r) => ({
            status: r.status,
            stale: r.headers.get('X-Data-Stale') === 'true',
            body: r.ok ? await r.json() : null,
          }))
          .catch(() => ({ status: 0, stale: false, body: null })),
      ),
    ).then((pages) => {
      if (!alive) return;
      /* 503 means no live source is configured: serve the placeholder
         fixture under the SAMPLE DATA chip. Anything else that is empty is
         "unavailable", never the fixture, because fixture rows would read
         as real filings without the chip. */
      if (pages.every((p) => p.status === 503)) {
        setTrades(buildFixtureTrades());
        setFeeds(null);
        setStaleAt(null);
        setStatus('sample');
        return;
      }
      const seen = new Set();
      const merged = [];
      let f = null;
      for (const pg of pages) {
        if (pg.body?.feeds && !f) f = pg.body.feeds;
        for (const t of pg.body?.trades || []) {
          const id =
            t.id ||
            `${t.bioguideId || t.name}|${t.ticker}|${t.tradedAt}|${t.sideRaw}|${t.amountBand?.raw}`;
          if (seen.has(id)) continue;
          seen.add(id);
          merged.push({ ...t, id });
        }
      }
      const stalePage = pages.find((pg) => pg.stale && pg.body?.fetchedAt);
      setTrades(merged);
      setFeeds(f);
      setStaleAt(stalePage ? stalePage.body.fetchedAt : null);
      setStatus(merged.length ? 'ready' : 'empty');
    });
    setContractors({ state: 'loading', data: null });
    fetch('/api/politicians/contractor-exposure')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        setContractors(d?.ok ? { state: 'ready', data: d } : { state: 'failed', data: null });
      })
      .catch(() => alive && setContractors({ state: 'failed', data: null }));
    return () => {
      alive = false;
    };
  }, [reload]);

  /* ── server aggregates: rankings, monthly and tickers over the whole
        window, filtered in SQL. Unavailable (503) → the local model. ── */
  const summaryKey = `${chamber || ''}|${party || ''}|${query.trim()}|${sort}|${reload}`;
  useEffect(() => {
    const ctrl = new AbortController();
    const qs = new URLSearchParams({ sort });
    if (chamber) qs.set('chamber', chamber.toLowerCase());
    if (party) qs.set('party', party);
    if (query.trim()) qs.set('q', query.trim());
    fetch(`/api/politicians/summary?${qs}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSummary({ key: summaryKey, data: d?.ok ? d : null }))
      .catch(() => {
        if (!ctrl.signal.aborted) setSummary({ key: summaryKey, data: null });
      });
    return () => ctrl.abort();
    // summaryKey captures every input
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryKey]);

  /* ── search debounce ── */
  useEffect(() => {
    const id = setTimeout(() => setQuery(queryInput), 150);
    return () => clearTimeout(id);
  }, [queryInput]);

  /* ── url sync for filters (replace) ── */
  useEffect(() => {
    writeUrl({ member: openSlug, chamber, party, sort, q: query }, false);
    // openSlug is written by open/close below with push semantics; it is read
    // here only so a filter change does not drop it from the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chamber, party, sort, query]);

  /* ── model ── */
  const members = useMemo(() => buildMembers(trades), [trades]);
  /* The server ranking no longer waits for the three trade pages: the
     summary is small and edge-cached, so the Top eight (and their
     portraits) render from it as soon as it lands, and loaded trades merge
     in by bioguideId afterwards without remounting a card. Never over the
     sample fixture or the unavailable state. */
  const server =
    status !== 'sample' &&
    status !== 'empty' &&
    summary?.key === summaryKey &&
    summary.data?.rankings?.length
      ? summary.data
      : null;
  const filtered = useMemo(
    () =>
      server
        ? mergeServerRankings(members, server.rankings)
        : filterMembers(members, { chamber, party, query }),
    [server, members, chamber, party, query],
  );
  const ranked = useMemo(() => rankMembers(filtered, sort), [filtered, sort]);
  const gallery = ranked.slice(0, GALLERY);
  const rest = ranked.slice(GALLERY);
  const listRows = showAll ? rest : rest.slice(0, LIST_DEFAULT);
  const first = ranked[0] || null;

  const filteredTrades = useMemo(() => tradesOf(filtered), [filtered]);
  const stats = useMemo(() => chamberStats(filtered), [filtered]);
  const monthly = useMemo(
    () => (server ? server.monthly.slice(-12) : monthlyByChamber(filteredTrades)),
    [server, filteredTrades],
  );
  /* Most HELD, not most traded: members whose disclosures show a position
     still open (inferred, see POSITION_BASIS_NOTE). Server-wide when the
     RPC is live, else inferred from the loaded trades. */
  const held = useMemo(
    () => (server?.held ? server.held.slice(0, 5) : mostHeldTickers(filteredTrades, 5)),
    [server, filteredTrades],
  );
  const windowInfo = useMemo(
    () =>
      server ? serverWindow(server.rankings, server.windowDays) : loadedWindow(filteredTrades),
    [server, filteredTrades],
  );
  const anyFilter = Boolean(chamber || party || query.trim());
  const loaded = status === 'ready' || status === 'sample';
  /* The ranking can be on screen before the trades are. */
  const rankingReady = loaded || Boolean(server);

  const openMember = useMemo(() => {
    if (!openSlug) return null;
    const m =
      filtered.find((x) => x.slug === openSlug) || members.find((x) => x.slug === openSlug) || null;
    const extra = m?.bioguideId ? memberTrades[m.bioguideId] : null;
    if (!m || !extra?.length) return m;
    const built = buildMembers(extra)[0];
    return { ...m, trades: built.trades, tickers: built.tickers, tickerSet: built.tickerSet };
  }, [filtered, members, openSlug, memberTrades]);

  /* A ranked member whose trades were not in the loaded pages: fetch them
     for the panel. */
  const needTrades =
    openMember?.bioguideId &&
    openMember.trades.length < (openMember.count || 0) &&
    !memberTrades[openMember.bioguideId]
      ? openMember.bioguideId
      : null;
  useEffect(() => {
    if (!needTrades) return undefined;
    let alive = true;
    fetch(`/api/politicians/trades?bioguide=${encodeURIComponent(needTrades)}&limit=500`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.trades?.length) {
          setMemberTrades((prev) => ({ ...prev, [needTrades]: d.trades }));
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [needTrades]);

  /* ── ticker strip (unchanged contract) ── */
  const tickerItems = useMemo(
    () =>
      trades.slice(0, 12).map((t) => ({
        id: t.id,
        lead: t.ticker || NONE,
        main: t.name,
        value: SIDE_LABEL[t.side] || NONE,
      })),
    [trades],
  );
  usePublishTicker({ items: tickerItems, ariaLabel: 'Recent congressional disclosures' });

  /* ── panel ── */
  const measureTop = useCallback(() => {
    const chrome = document.querySelector('.dscat-chrome');
    const bottom = chrome ? Math.max(0, chrome.getBoundingClientRect().bottom) : 0;
    document.documentElement.style.setProperty('--dsc-panel-top', `${Math.round(bottom)}px`);
  }, []);

  const open = useCallback(
    (m, el) => {
      if (el) triggerRef.current = el;
      measureTop();
      const swapping = Boolean(openSlug);
      setOpenSlug(m.slug);
      /* One history entry per panel session: swapping members replaces it,
         so Back always closes the panel rather than walking through members. */
      writeUrl({ member: m.slug, chamber, party, sort, q: query }, !swapping);
      if (!swapping) pushedRef.current = true;
    },
    [openSlug, chamber, party, sort, query, measureTop],
  );

  const close = useCallback(() => {
    setOpenSlug(null);
    if (pushedRef.current) window.history.back();
    else writeUrl({ member: null, chamber, party, sort, q: query }, false);
    pushedRef.current = false;
    triggerRef.current?.focus();
  }, [chamber, party, sort, query]);

  useEffect(() => {
    const onPop = () => {
      pushedRef.current = false;
      const member = readUrl().member;
      setOpenSlug(member);
      /* Back closes the panel too; return focus to the card or row that
         opened it, as Escape and the close button do. */
      if (!member) requestAnimationFrame(() => triggerRef.current?.focus());
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!openMember) return undefined;
    measureTop();
    window.addEventListener('scroll', measureTop, true);
    window.addEventListener('resize', measureTop);
    return () => {
      window.removeEventListener('scroll', measureTop, true);
      window.removeEventListener('resize', measureTop);
    };
  }, [openMember, measureTop]);

  /* ── filter handlers (remember the last one for the empty state) ── */
  const pick = (setter, name) => (v) => {
    setter(v);
    setLastFilter(name);
    setShowAll(false);
  };
  const clearFilters = () => {
    setChamber(null);
    setParty(null);
    setQueryInput('');
    setQuery('');
    setLastFilter(null);
  };

  const H = stats.House;
  const S = stats.Senate;
  const moreActive =
    H?.perMember != null && S?.perMember != null && H.perMember !== S.perMember
      ? H.perMember > S.perMember
        ? 'House'
        : 'Senate'
      : null;
  const sortMeta = SORTS.find((s) => s.value === sort) || SORTS[0];
  const fig = (v, fmt = (x) => x) => (loaded && v != null ? fmt(v) : NONE);

  return (
    <div className="dsc ptk">
      <header className="dsc-head">
        <p className="dsc-eyebrow">
          DATASETS · CONGRESS
          {status === 'sample' ? <span className="dsc-sample">SAMPLE DATA</span> : null}
        </p>
        <h1 className="dsc-title">Politician tracker</h1>
        <p className="ptk-sub">
          Every member of the House and Senate with disclosed trades, in one list.
        </p>
      </header>

      <EzanaQLBar datasetScope={null} seedQuery={seedForDataset(null)} />

      <div className="ptk-body">
        {/* ── toolbar ── */}
        <div className="ptk-toolbar" role="search" aria-label="Filter and rank politicians">
          <label className="ptk-search">
            <i className="bi bi-search" aria-hidden="true" />
            <span className="ptk-sr">Search a member</span>
            <input
              ref={searchRef}
              className="dsc-input"
              placeholder="Search a member"
              value={queryInput}
              onChange={(e) => {
                setQueryInput(e.target.value);
                setLastFilter('search');
                setShowAll(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && queryInput) {
                  e.preventDefault();
                  setQueryInput('');
                }
              }}
            />
            {queryInput ? (
              <button
                type="button"
                className="ptk-search-x"
                aria-label="Clear search"
                onClick={() => {
                  setQueryInput('');
                  searchRef.current?.focus();
                }}
              >
                <i className="bi bi-x" aria-hidden="true" />
              </button>
            ) : null}
          </label>
          <Segmented
            label="Chamber"
            value={chamber}
            options={CHAMBERS}
            onChange={pick(setChamber, 'chamber')}
          />
          <Segmented
            label="Party"
            value={party}
            options={PARTIES}
            onChange={pick(setParty, 'party')}
            mono
          />
          <span className="ptk-toolbar-spacer" />
          <span className="ptk-rankby-label dsc-mn">RANK BY</span>
          <Segmented
            label="Rank by"
            value={sort}
            options={SORTS}
            onChange={(v) => {
              setSort(v);
              setShowAll(false);
            }}
          />
        </div>

        {/* ── unavailable ── */}
        {status === 'empty' ? (
          <div className="ptk-unavailable" role="status">
            <p className="dsc-note">Disclosures are temporarily unavailable. Try again shortly.</p>
            <button
              type="button"
              className="dsc-btn dsc-btn--ghost"
              onClick={() => setReload((n) => n + 1)}
            >
              Retry
            </button>
          </div>
        ) : null}

        {/* ── stale: the route served its last good snapshot ── */}
        {status === 'ready' && staleAt ? (
          <div className="ptk-stale" role="status">
            <p className="ptk-stale-cap">Last updated {formatUpdated(staleAt)}</p>
            <button
              type="button"
              className="dsc-btn dsc-btn--ghost"
              onClick={() => setReload((n) => n + 1)}
            >
              Retry
            </button>
          </div>
        ) : null}

        {/* ── gallery + rail ── */}
        <div className="ptk-grid">
          <section className="ptk-gallery" aria-label={`Top eight by ${sortMeta.heading}`}>
            <div className="ptk-gallery-head">
              <h2 className="ptk-h2">Top eight by {sortMeta.heading}</h2>
              <span className="ptk-cap">ring colour is chamber, letter tag is party</span>
            </div>

            {!rankingReady ? (
              <div className="ptk-cards" aria-busy="true">
                {Array.from({ length: GALLERY }, (_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : rankingReady && !ranked.length && anyFilter ? (
              <div className="ptk-empty" role="status">
                <p className="dsc-note">
                  No members match. Try clearing{' '}
                  {lastFilter === 'search' ? 'the search' : `the ${lastFilter || ''} filter`.trim()}
                  .
                </p>
                <button type="button" className="dsc-btn dsc-btn--ghost" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="ptk-cards">
                {gallery.map((m) => (
                  <Card
                    key={m.key}
                    m={m}
                    selected={openMember?.key === m.key}
                    showPct={sort === 'volume'}
                    onOpen={open}
                  />
                ))}
              </div>
            )}
          </section>

          <aside
            className="ptk-rail"
            aria-label={`House versus Senate, ${server ? 'trailing 12 months' : 'loaded window'}`}
          >
            <div className="ptk-rail-head">
              <span className="ptk-eyebrow dsc-mn">
                HOUSE VS SENATE,{' '}
                {anyFilter ? 'FILTERED' : server ? 'TRAILING 12 MONTHS' : 'LOADED WINDOW'}
                {feeds?.house === 'down' ? (
                  <span className="ptk-feed-chip dsc-mn">HOUSE FEED UNAVAILABLE</span>
                ) : null}
                {feeds?.senate === 'down' ? (
                  <span className="ptk-feed-chip dsc-mn">SENATE FEED UNAVAILABLE</span>
                ) : null}
              </span>
              <span className="ptk-window dsc-mn">
                {status === 'loading' ? (
                  <Skel className="ptk-skel--line ptk-skel--w80" />
                ) : windowInfo ? (
                  `${windowInfo.from} TO ${windowInfo.to} · ${windowInfo.count} DISCLOSURES`
                ) : (
                  NONE
                )}
              </span>
            </div>

            <div className="ptk-chamber-cards">
              {[
                ['house', 'HOUSE', H],
                ['senate', 'SENATE', S],
              ].map(([id, label, s]) => (
                <div key={id} className={`ptk-chamber-card ptk-chamber-card--${id}`}>
                  <span className="ptk-chamber-card-label dsc-mn">
                    <i className={`ptk-dot ptk-dot--${id}`} aria-hidden="true" />
                    {label}
                  </span>
                  <span className="ptk-chamber-card-fig dsc-mn">
                    {status === 'loading' ? (
                      <Skel className="ptk-skel--big" />
                    ) : (
                      fig(s?.volume, usdShort)
                    )}
                  </span>
                  <span className="ptk-chamber-card-sub">
                    {fig(s?.members)} members · {fig(s?.trades)} trades
                  </span>
                </div>
              ))}
            </div>

            <div className="ptk-versus">
              {[
                ['Active members', H?.members, S?.members, (v) => v],
                ['Disclosed trades', H?.trades, S?.trades, (v) => v],
                ['Trades per member', H?.perMember, S?.perMember, (v) => v.toFixed(1)],
                ['Disclosed volume', H?.volume, S?.volume, usdShort],
              ].map(([label, h, s, f]) => (
                <div className="ptk-vs-row" key={label}>
                  <span className="ptk-vs-label">{label}</span>
                  <span className="ptk-vs-fig dsc-mn">{fig(h, f)}</span>
                  <SplitBar
                    left={h}
                    right={s}
                    leftCls="ptk-split--house"
                    rightCls="ptk-split--senate"
                  />
                  <span className="ptk-vs-fig dsc-mn">{fig(s, f)}</span>
                </div>
              ))}
            </div>
            <p className="ptk-note">
              {moreActive ? `${moreActive} trades more per member in this window. ` : ''}
              Volume is the sum of the midpoints of disclosed ranges.
            </p>

            <div className="ptk-rail-block">
              <div className="ptk-rail-block-head">
                <span className="ptk-eyebrow dsc-mn">TRADES BY MONTH</span>
                <span className="ptk-cap">counts, not dollars</span>
              </div>
              <div
                className="ptk-chart"
                role="img"
                aria-label="Monthly trade counts, House and Senate, last twelve months"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthly}
                    barGap={2}
                    margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray={CHART.gridDash}
                      stroke={CHART.gridStroke}
                    />
                    <XAxis
                      dataKey="month"
                      tick={CHART.tick}
                      axisLine={CHART.xAxisLine}
                      tickLine={false}
                      tickFormatter={(m) => m.slice(5)}
                    />
                    <YAxis hide allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'var(--emerald-bg-subtle)' }} />
                    <Bar dataKey="House" fill="var(--ptk-house)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Senate" fill="var(--ptk-senate)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* The same numbers for keyboard and screen-reader users. */}
              <table className="ptk-sr">
                <caption>Monthly trade counts by chamber</caption>
                <thead>
                  <tr>
                    <th scope="col">Month</th>
                    <th scope="col">House</th>
                    <th scope="col">Senate</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((r) => (
                    <tr key={r.month}>
                      <td>{r.month}</td>
                      <td>{r.House}</td>
                      <td>{r.Senate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ptk-rail-block">
              <div className="ptk-rail-block-head">
                <span className="ptk-eyebrow dsc-mn">MOST HELD TICKERS</span>
                <span className="ptk-cap">members holding</span>
              </div>
              {status === 'loading' && !server?.held ? (
                Array.from({ length: 5 }, (_, i) => (
                  <Skel key={i} className="ptk-skel--line ptk-skel--row" />
                ))
              ) : held.length ? (
                <ul className="ptk-tickers">
                  {held.map((t) => (
                    <li key={t.ticker} className="ptk-ticker-row">
                      <span className="dsc-mn ptk-ticker-sym">{t.ticker}</span>
                      <span className="ptk-track" aria-hidden="true">
                        <i style={{ width: `${(t.holders / held[0].holders) * 100}%` }} />
                      </span>
                      <span
                        className="dsc-mn ptk-ticker-n"
                        aria-label={`${t.holders} member${t.holders === 1 ? '' : 's'} holding`}
                      >
                        {t.holders}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="dsc-note">{NONE}</p>
              )}
              <p className="ptk-note">{POSITION_BASIS_NOTE}</p>
            </div>
          </aside>
        </div>

        {/* ── dense list, rank 9 on ── */}
        <section className="ptk-list" aria-label="The rest of the ranking">
          <div className="ptk-list-scroll">
            <table className="ptk-table">
              <thead>
                <tr>
                  <th className="dsc-mn">#</th>
                  <th className="dsc-mn">POLITICIAN</th>
                  <th className="dsc-mn ptk-col-chamber">CHAMBER</th>
                  <th className="dsc-mn">DISCLOSED VOLUME</th>
                  <th className="dsc-mn ptk-th--c">TRADES</th>
                  <th className="dsc-mn ptk-th--c ptk-col-bs">BUYS / SELLS</th>
                  <th className="dsc-mn ptk-th--c ptk-col-last">LAST TRADE</th>
                  <th className="dsc-mn ptk-th--c ptk-col-tks">TOP TICKERS</th>
                </tr>
              </thead>
              <tbody>
                {!rankingReady
                  ? Array.from({ length: LIST_DEFAULT }, (_, i) => (
                      <tr key={i} className="ptk-row ptk-row--skel" aria-hidden="true">
                        <td colSpan={8}>
                          <Skel className="ptk-skel--line ptk-skel--row" />
                        </td>
                      </tr>
                    ))
                  : listRows.map((m) => {
                      const selected = openMember?.key === m.key;
                      const ch = String(m.chamber || '').toLowerCase();
                      return (
                        <tr
                          key={m.key}
                          tabIndex={0}
                          className={`ptk-row${selected ? ` ptk-row--selected ptk-row--selected-${ch}` : ''}`}
                          aria-selected={selected}
                          onClick={(e) => open(m, e.currentTarget)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              open(m, e.currentTarget);
                            }
                          }}
                        >
                          <td className="dsc-mn ptk-td-rank">{String(m.rank).padStart(2, '0')}</td>
                          <td>
                            <span className="ptk-who">
                              <Headshot
                                name={m.name}
                                bioguideId={m.bioguideId}
                                chamber={m.chamber}
                                photoUrl={m.photoUrl}
                                size={AVATAR_SIZE.row}
                                ring={2}
                              />
                              <span className="ptk-who-text">
                                <span className="ptk-name">{m.name}</span>
                                <span className="ptk-seat">
                                  <PartyTag party={m.party} />
                                  <span className="dsc-mn">{seatLabel(m) || NONE}</span>
                                </span>
                              </span>
                            </span>
                          </td>
                          <td className="ptk-col-chamber">
                            <ChamberChip chamber={m.chamber} />
                          </td>
                          <td>
                            <span className="ptk-vol">
                              <span className="dsc-mn ptk-vol-fig">{usdShort(m.volume)}</span>
                              {m.volume > 0 && first?.volume > 0 ? (
                                <span className="ptk-track ptk-col-volbar" aria-hidden="true">
                                  <i
                                    style={{
                                      width: `${Math.min(100, (m.volume / first.volume) * 100)}%`,
                                    }}
                                  />
                                </span>
                              ) : null}
                            </span>
                          </td>
                          <td className="dsc-mn ptk-td--c">{m.count}</td>
                          <td className="dsc-mn ptk-td--c ptk-col-bs">
                            <b className="ptk-buy-n">{m.buys}</b>
                            <span className="ptk-slash"> / </span>
                            <b>{m.sells}</b>
                          </td>
                          <td className="dsc-mn ptk-td--c ptk-td-mute ptk-col-last">
                            {m.lastTraded || NONE}
                          </td>
                          <td className="ptk-td--c ptk-col-tks">
                            <Tickers tickers={m.tickers} cls="ptk-tks--sm ptk-tks--center" />
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
          <div className="ptk-list-foot">
            <p>
              The rest of the ranking continues here, same order. Select a row or a card for the
              full profile.
            </p>
            <span className="dsc-mn ptk-list-count">
              {!rankingReady ? (
                NONE
              ) : rest.length === 0 ? (
                `ALL ${ranked.length} SHOWN`
              ) : (
                <>
                  {GALLERY + 1} TO {GALLERY + listRows.length} OF {ranked.length}
                  {rest.length > LIST_DEFAULT ? (
                    <>
                      {' · '}
                      <button
                        type="button"
                        className="ptk-link"
                        onClick={() => setShowAll((v) => !v)}
                      >
                        {showAll ? 'SHOW LESS' : 'SHOW ALL'}
                      </button>
                    </>
                  ) : null}
                </>
              )}
            </span>
          </div>
        </section>

        <p className="dsc-compliance">
          Disclosures are public records filed under the STOCK Act. Amounts are the ranges members
          disclose. Nothing here is investment advice.
        </p>
      </div>

      {openMember ? (
        <>
          <button
            type="button"
            className="dsc-scrim"
            aria-label="Close politician panel"
            onClick={close}
          />
          <MemberPanel
            member={openMember}
            members={server ? filtered : members}
            contractors={contractors}
            onClose={close}
            onSelect={(m) => open(m)}
          />
        </>
      ) : null}
    </div>
  );
}
