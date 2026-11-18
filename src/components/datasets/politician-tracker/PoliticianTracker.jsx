'use client';

/**
 * Politician Tracker (redesign, Nov 18 2026; handoff
 * EZANA_POLITICIAN_TRACKER_REDESIGN_HANDOFF).
 *
 * Every member of Congress with disclosed trades, House and Senate in ONE
 * ranking table from rank #1, capped at ten visible rows with the rest
 * scrolling inside the table. The reader picks the sort key (disclosed
 * volume, buy-to-sell ratio, trade count, last trade) and its direction, and
 * can narrow the ranking to one ticker. Beside it a compact rail: Trades by
 * state, Most held companies, House vs Senate. Politician Sentiment (Bull or
 * bear) follows directly under the table. Selecting a row opens the member
 * panel (MemberPanel.jsx).
 *
 * Data is the canonical STOCK Act feed (/api/politicians/trades) and the SQL
 * summary (/api/politicians/summary; with ?ticker= the ranking is recomputed
 * on that ticker's trades only). Nothing is estimated: "disclosed volume" is
 * the sum of the midpoints of disclosed ranges, and every place it appears
 * says so. Every computation lives in tracker-model.js; this file renders.
 *
 * The shared green chrome and ticker are drawn by the datasets layout. The
 * page publishes ticker items through usePublishTicker and nothing else.
 */
import { getDatasetSampleViewer } from '@/components/datasets/sample-viewer';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import HubQueryLink from '@/components/datasets/HubQueryLink';
import { EzDropdown } from '@/components/ui/ez-dropdown';
import {
  buildMembers,
  buySellRatio,
  chamberStats,
  filterMembers,
  loadedWindow,
  mergeServerRankings,
  mostHeldTickers,
  DEFAULT_PERIOD,
  PERIODS,
  periodMeta,
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
/* The member panel (its charts included) loads only when a member is
   opened, so the page's first paint does not carry it. */
const MemberPanel = dynamic(() => import('./MemberPanel'), { ssr: false });
import MostHeldChart from './MostHeldChart';
import PoliticianSentiment from './PoliticianSentiment';
import StateMap from '@/components/datasets/hub/StateMap';
import Segmented from './Segmented';
import TickerFilter from './TickerFilter';
import GuidedTour from '@/components/tour/GuidedTour';
import { useTourState } from '@/components/tour/useTourState';
import '@/components/datasets/disclosures/disclosures.css';
import './politician-tracker.css';
import { listenForMemberIntent, prefetchTrackerMember } from '@/components/datasets/prefetch-cache';

const NONE = '·';

/* ── first-visit guided tour ─────────────────────────────────────────────
   Phase one spotlights the first row of the current ranking (whoever that
   is under the reader's filters) and waits for a click on any row; phase
   two walks the member panel's sections top to bottom. Copy describes what
   each section actually renders, in plain words, never advice. Steps whose
   section did not render (no committees on file, say) are skipped. */
const TOUR_KEY = 'politician_v1';
const ROW_STEP = [
  {
    target: 'ptk-row-first',
    title: 'Start here',
    body: 'Select any row to open that member’s full trading profile. This is the first member in the current ranking.',
  },
];
const SIDEBAR_STEPS = [
  {
    target: 'sb-stats',
    title: 'The headline counts',
    body: 'Trades, buys and sells in the loaded window, and the disclosed volume. Amounts are the midpoints of the ranges members report, because filings disclose ranges, not exact sums.',
  },
  {
    target: 'sb-committees',
    title: 'Committees',
    body: 'The committees this member sits on. Each chip opens the Committee Assignments dataset filtered to that committee.',
  },
  {
    target: 'sb-portfolio',
    title: 'Portfolio, top holdings',
    body: 'An estimate of what they still hold, built from every disclosure on file. Positions still open are sized from the midpoints of disclosed ranges; no market prices are applied.',
  },
  {
    target: 'sb-sectors',
    title: 'Sector breakdown',
    body: 'The same estimated portfolio grouped by sector, so you can see where their holdings concentrate.',
  },
  {
    target: 'sb-activity',
    title: 'Trade activity',
    body: 'Buys and sells by month, then each disclosed trade with its amount range, trade date and a link to the source filing.',
  },
  {
    target: 'sb-alike',
    title: 'Trades most like',
    body: 'Members whose traded tickers overlap this one the most. The percentage is the overlap of their traded tickers in the loaded window.',
  },
  {
    target: 'sb-contractors',
    title: 'Government contractors they trade',
    body: 'Tickers this member trades that are also top federal contractors, with the contract value awarded to each company.',
  },
];

/* One key per filter set; the server seed and the client fetch share it.
   The server ranking is always fetched in volume order (the page sorts the
   whole set itself), so sort and direction are not part of the key. */
function summaryKeyFor({ chamber, party, query, days, ticker, reload }) {
  return `${chamber || ''}|${party || ''}|${String(query || '').trim()}|${days}|${ticker || ''}|${reload}`;
}

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
/* The table shows at most this many rows; the rest scroll inside it. */
const VISIBLE_ROWS = 10;
/* Rows mount in windows of this size as the reader scrolls the table (an
   observed sentinel row), so a 500-member ranking is not 500 rows and
   portraits on the first paint. The 10-row cap is visual, not a data cap. */
const ROW_WINDOW = 50;
/* Skeleton rows while the ranking loads. */
const LIST_SKELETON = VISIBLE_ROWS;

/* Sort keys. `desc` / `asc` are what the direction toggle says for each. */
const SORTS = [
  {
    value: 'volume',
    label: 'Disclosed volume',
    col: 'DISCLOSED VOLUME',
    desc: 'High to low',
    asc: 'Low to high',
  },
  {
    value: 'ratio',
    label: 'Buy-to-sell ratio',
    col: 'BUY : SELL',
    desc: 'Most buying first',
    asc: 'Most selling first',
  },
  { value: 'trades', label: 'Most trades', col: 'TRADES', desc: 'High to low', asc: 'Low to high' },
  {
    value: 'latest',
    label: 'Last trade',
    col: 'LAST TRADE',
    desc: 'Newest first',
    asc: 'Oldest first',
  },
];
const sortMetaOf = (v) => SORTS.find((s) => s.value === v) || SORTS[0];
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
const TICKER_RE = /^[A-Z0-9][A-Z0-9./-]{0,11}$/;

/* ── URL state: member pushes (one entry per panel), everything else
      replaces. Defaults are omitted so the canonical URL stays clean. ──── */
function readUrl() {
  if (typeof window === 'undefined') return {};
  const p = new URL(window.location.href).searchParams;
  const ch = String(p.get('chamber') || '').toLowerCase();
  const party = String(p.get('party') || '').toUpperCase();
  const tk = String(p.get('ticker') || '').toUpperCase();
  return {
    member: p.get('member'),
    chamber: ch === 'house' ? 'House' : ch === 'senate' ? 'Senate' : null,
    party: ['D', 'R', 'I'].includes(party) ? party : null,
    sort: SORT_KEYS.includes(p.get('sort')) ? p.get('sort') : 'volume',
    dir: p.get('dir') === 'asc' ? 'asc' : 'desc',
    period: PERIODS.some((x) => x.value === p.get('period')) ? p.get('period') : DEFAULT_PERIOD,
    ticker: TICKER_RE.test(tk) ? tk : null,
    q: p.get('q') || '',
  };
}

function writeUrl({ member, chamber, party, sort, dir, period, ticker, q }, push = false) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const set = (k, v) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
  set('member', member);
  set('chamber', chamber ? chamber.toLowerCase() : null);
  set('party', party);
  set('sort', sort === 'volume' ? null : sort);
  set('dir', dir === 'asc' ? 'asc' : null);
  set('period', period === DEFAULT_PERIOD ? null : period);
  set('ticker', ticker);
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

const plural = (n, word) => (n === 1 ? word : `${word}s`);

/** '2.25', '12.0', 'No sells', or the placeholder when there is no ratio. */
function ratioText(r) {
  if (r == null) return NONE;
  if (r === Infinity) return 'No sells';
  return r >= 10 ? r.toFixed(1) : r.toFixed(2);
}

/** Buy-to-sell cell: the ratio, then the two counts it is made of. */
function RatioCell({ m }) {
  const r = buySellRatio(m);
  const b = m.buys || 0;
  const s = m.sells || 0;
  const explain =
    r == null
      ? 'No buy or sell trades in this period (exchanges only)'
      : r === Infinity
        ? `${b} buy ${plural(b, 'trade')} and no sell trades, so no finite ratio`
        : `${b} buy ${plural(b, 'trade')} divided by ${s} sell ${plural(s, 'trade')} = ${ratioText(r)}`;
  return (
    <span className="ptk-ratio" title={explain}>
      <span className={`dsc-mn ptk-ratio-fig${r === Infinity ? ' is-inf' : ''}`}>
        {ratioText(r)}
      </span>
      <span className="dsc-mn ptk-ratio-n" aria-hidden="true">
        <b className="ptk-buy-n">{b}</b>
        <span className="ptk-slash"> / </span>
        {s}
      </span>
      <span className="ptk-sr">{explain}</span>
    </span>
  );
}

/** A sortable column heading: a button inside the th, which carries aria-sort. */
function SortTh({ k, sort, dir, onSort, className = '', children }) {
  const on = sort === k;
  return (
    <th
      className={`dsc-mn ${className}`.trim()}
      aria-sort={on ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className={`ptk-th-sort${on ? ' is-on' : ''}`}
        onClick={() => onSort(k)}
        aria-label={`Sort by ${sortMetaOf(k).label}${
          on ? `, now ${sortMetaOf(k)[dir].toLowerCase()}` : ''
        }`}
      >
        {children}
        <i
          className={`bi ${on ? (dir === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down') : 'bi-arrow-down-up'}`}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

/* ── the page ────────────────────────────────────────────────────────── */

export default function PoliticianTracker({
  initialMember = null,
  initialChamber = null,
  initialParty = null,
  initialSort = 'volume',
  initialDir = 'desc',
  initialPeriod = DEFAULT_PERIOD,
  initialTicker = null,
  initialQuery = '',
  initialSummary = null,
  stateTrades = null,
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
  const [sort, setSort] = useState(SORT_KEYS.includes(initialSort) ? initialSort : 'volume');
  const [dir, setDir] = useState(initialDir === 'asc' ? 'asc' : 'desc');
  const [period, setPeriod] = useState(initialPeriod);
  const [ticker, setTicker] = useState(initialTicker);
  const pMeta = periodMeta(period);
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [lastFilter, setLastFilter] = useState(null);

  /* SQL aggregates for the current filters ({ key, data }), and trades
     fetched for a member whose rows were not in the loaded pages. */
  const [summary, setSummary] = useState(() =>
    initialSummary?.rankings
      ? {
          key: summaryKeyFor({
            chamber: initialChamber,
            party: initialParty,
            query: initialQuery,
            days: periodMeta(initialPeriod).days,
            ticker: initialTicker,
            reload: 0,
          }),
          data: initialSummary,
        }
      : null,
  );
  const [memberTrades, setMemberTrades] = useState({});

  const [openSlug, setOpenSlug] = useState(initialMember);
  const triggerRef = useRef(null);
  const pushedRef = useRef(false);
  const searchRef = useRef(null);
  const scrollRef = useRef(null);

  /* ── data ── */
  useEffect(() => {
    let alive = true;
    setStatus('loading');
    Promise.all(
      PAGES.map((p) =>
        fetch(`/api/politicians/trades?page=${p}&limit=500&days=${pMeta.days}`)
          .then(async (r) => ({
            status: r.status,
            stale: r.headers.get('X-Data-Stale') === 'true',
            body: r.ok ? await r.json() : null,
          }))
          .catch(() => ({ status: 0, stale: false, body: null })),
      ),
    ).then((pages) => {
      if (!alive) return;
      /* 503 means no live source is configured: admin and demo accounts get
         the placeholder fixture under the SAMPLE DATA chip; everyone else the
         "unavailable" state. Anything else that is empty is "unavailable",
         never the fixture, because fixture rows would read as real filings
         without the chip. */
      if (pages.every((p) => p.status === 503)) {
        getDatasetSampleViewer().then((ok) => {
          if (!alive) return;
          setTrades(ok ? buildFixtureTrades() : []);
          setFeeds(null);
          setStaleAt(null);
          setStatus(ok ? 'sample' : 'empty');
        });
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
      /* A period with no disclosures is a real, empty answer; only a
         failed read is "unavailable". */
      const answered = pages.some((pg) => pg.body?.ok);
      setStatus(merged.length || answered ? 'ready' : 'empty');
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
  }, [reload, pMeta.days]);

  /* ── server aggregates: rankings, monthly and tickers over the whole
        window, filtered in SQL. Unavailable (503) → the local model. A
        newer filter set aborts the older request, so a slow answer never
        replaces a newer one. ── */
  const summaryKey = summaryKeyFor({ chamber, party, query, days: pMeta.days, ticker, reload });
  const seededKey = useRef(summary?.key || null);
  useEffect(() => {
    /* The server already rendered this key's summary: no round trip. */
    if (seededKey.current === summaryKey) return undefined;
    seededKey.current = null;
    const ctrl = new AbortController();
    const qs = new URLSearchParams({ sort: 'volume', days: String(pMeta.days) });
    if (chamber) qs.set('chamber', chamber.toLowerCase());
    if (party) qs.set('party', party);
    if (query.trim()) qs.set('q', query.trim());
    if (ticker) qs.set('ticker', ticker);
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
    writeUrl({ member: openSlug, chamber, party, sort, dir, period, ticker, q: query }, false);
    // openSlug is written by open/close below with push semantics; it is read
    // here only so a filter change does not drop it from the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chamber, party, sort, dir, period, ticker, query]);

  /* ── model ── */
  /* Every loaded member with their whole loaded record: the panel, similar
     traders and the ticker-mode panel read these. */
  const members = useMemo(() => buildMembers(trades), [trades]);
  /* The local fallback ranking. With a ticker it is built from that
     ticker's trades only, the same rule the server applies. */
  const tickerMembers = useMemo(
    () => (ticker ? buildMembers(trades.filter((t) => t.ticker === ticker)) : null),
    [trades, ticker],
  );
  /* The server ranking does not wait for the three trade pages: the summary
     is small and edge-cached, so the table (and its portraits) renders from
     it as soon as it lands, and loaded trades merge in by bioguideId
     afterwards without remounting a row. Never over the sample fixture or
     the unavailable state. A ticker ranking may be legitimately empty. */
  const server =
    status !== 'sample' &&
    status !== 'empty' &&
    summary?.key === summaryKey &&
    summary.data?.rankings &&
    (summary.data.rankings.length || ticker)
      ? summary.data
      : null;
  const filtered = useMemo(
    () =>
      server
        ? mergeServerRankings(ticker ? [] : members, server.rankings)
        : filterMembers(tickerMembers || members, { chamber, party, query }),
    [server, members, tickerMembers, ticker, chamber, party, query],
  );
  /* Rank over the WHOLE filtered set for the chosen key and direction, so
     rank numbers and order never depend on how many rows are mounted. */
  const ranked = useMemo(() => rankMembers(filtered, sort, dir), [filtered, sort, dir]);
  const traders = useMemo(() => ranked.filter((m) => (m.count || 0) > 0), [ranked]);
  const firstQuiet = ranked.findIndex((m) => !(m.count > 0));

  /* Rows mount in windows of ROW_WINDOW as the sentinel inside the table
     scrolls into view; any change of filter or order starts over at the
     top of the table. */
  const [rowLimit, setRowLimit] = useState(ROW_WINDOW);
  const sentinelRef = useRef(null);
  useEffect(() => {
    setRowLimit(ROW_WINDOW);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [chamber, party, query, sort, dir, ticker, pMeta.days]);
  const moreRows = ranked.length > rowLimit;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !moreRows || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setRowLimit((n) => n + ROW_WINDOW);
      },
      { root: scrollRef.current, rootMargin: '240px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [moreRows, rowLimit]);

  /* "Showing 1–10 of N": the first row whose bottom is below the sticky
     header, read on scroll (one read per frame). */
  const [firstShown, setFirstShown] = useState(1);
  const scrollFrame = useRef(0);
  const onTableScroll = useCallback(() => {
    if (scrollFrame.current) return;
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = 0;
      const box = scrollRef.current;
      if (!box) return;
      const head = box.querySelector('thead')?.offsetHeight || 0;
      const top = box.scrollTop + head;
      const rows = box.querySelectorAll('tr[data-idx]');
      let idx = 0;
      for (const r of rows) {
        if (r.offsetTop + r.offsetHeight > top + 1) {
          idx = Number(r.getAttribute('data-idx')) || 0;
          break;
        }
      }
      setFirstShown(idx + 1);
    });
  }, []);
  useEffect(() => setFirstShown(1), [ranked]);
  useEffect(() => () => cancelAnimationFrame(scrollFrame.current), []);

  const filteredTrades = useMemo(() => tradesOf(filtered), [filtered]);
  const stats = useMemo(() => chamberStats(filtered), [filtered]);
  /* Most HELD, not most traded: members whose disclosures show a position
     still open (inferred, see POSITION_BASIS_NOTE). Server-wide when the
     RPC is live, else inferred from the loaded trades. */
  const held = useMemo(
    () => (server?.held ? server.held.slice(0, 10) : mostHeldTickers(tradesOf(members), 10)),
    [server, members],
  );
  const windowInfo = useMemo(
    () =>
      server ? serverWindow(server.rankings, server.windowDays) : loadedWindow(filteredTrades),
    [server, filteredTrades],
  );
  const anyFilter = Boolean(chamber || party || query.trim() || ticker);
  const loaded = status === 'ready' || status === 'sample';
  /* The ranking can be on screen before the trades are. */
  const rankingReady = loaded || Boolean(server);

  /* The member panel always shows the member's whole record for the period,
     never the ticker slice the ranking was computed on. */
  const mtKey = (m) => (m?.bioguideId ? `${m.bioguideId}|${pMeta.days}` : null);
  const openMember = useMemo(() => {
    if (!openSlug) return null;
    /* ?member= takes a slug, or a bioguide ID (links from Committee
       Assignments); slugs are lowercase, so the two never collide. */
    const hit = (x) => x.slug === openSlug || (x.bioguideId && x.bioguideId === openSlug);
    const m = filtered.find(hit) || members.find(hit) || null;
    if (!m) return null;
    const k = m.bioguideId ? `${m.bioguideId}|${pMeta.days}` : null;
    const extra = k ? memberTrades[k] : null;
    if (ticker) {
      const whole = extra?.length
        ? buildMembers(extra)[0]
        : members.find((x) => x.key === m.key) || null;
      if (!whole) return { ...m, trades: [], tickers: [], tickerSet: new Set() };
      return {
        ...m,
        trades: whole.trades,
        tickers: whole.tickers,
        tickerSet: whole.tickerSet,
        count: whole.count,
        buys: whole.buys,
        sells: whole.sells,
        volume: whole.volume,
        lastTraded: whole.lastTraded,
      };
    }
    if (!extra?.length) return m;
    const built = buildMembers(extra)[0];
    return { ...m, trades: built.trades, tickers: built.tickers, tickerSet: built.tickerSet };
  }, [filtered, members, openSlug, memberTrades, ticker, pMeta.days]);

  /* Warm a member's panel reads on pointer over, focus or touch on their
     row, so the click usually resolves from the shared cache. */
  useEffect(() => listenForMemberIntent(document.body, prefetchTrackerMember), []);

  /* Fetch the member's own trades for the period when the loaded pages do
     not hold them all, and always under a ticker filter (the ranking row
     carries only that ticker's figures). */
  const openKey = mtKey(openMember);
  const needTrades =
    openKey &&
    !memberTrades[openKey] &&
    (ticker || openMember.trades.length < (openMember.count || 0))
      ? openKey
      : null;
  useEffect(() => {
    if (!needTrades) return undefined;
    let alive = true;
    const [bioguide, days] = needTrades.split('|');
    fetch(
      `/api/politicians/trades?bioguide=${encodeURIComponent(bioguide)}&limit=500&days=${days}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) setMemberTrades((prev) => ({ ...prev, [needTrades]: d.trades || [] }));
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
      writeUrl({ member: m.slug, chamber, party, sort, dir, period, ticker, q: query }, !swapping);
      if (!swapping) pushedRef.current = true;
    },
    [openSlug, chamber, party, sort, dir, period, ticker, query, measureTop],
  );

  const close = useCallback(() => {
    setOpenSlug(null);
    if (pushedRef.current) window.history.back();
    else writeUrl({ member: null, chamber, party, sort, dir, period, ticker, q: query }, false);
    pushedRef.current = false;
    triggerRef.current?.focus({ preventScroll: true });
  }, [chamber, party, sort, dir, period, ticker, query]);

  /* ── first-visit guided tour ── */
  const tour = useTourState(TOUR_KEY);
  const [tourPhase, setTourPhase] = useState(null); // null | 'row' | 'sidebar'
  const tourStarted = useRef(false);
  /* The spotlight is the first ranked row under the current filters. */
  const tourTargetKey = traders[0]?.key ?? null;
  useEffect(() => {
    if (!tour.shouldRun || tourStarted.current) return;
    if (!rankingReady || !traders.length || openMember) return;
    tourStarted.current = true;
    setTourPhase('row');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.shouldRun, rankingReady, traders.length, openMember]);
  const endTour = useCallback(() => {
    setTourPhase(null);
    tour.complete();
  }, [tour]);
  /* Selecting any row while the spotlight is up opens its panel; the tour
     follows into that panel once the slide-in settles. */
  const openWithTour = useCallback(
    (m, el) => {
      open(m, el);
      if (tourPhase === 'row') setTimeout(() => setTourPhase('sidebar'), 350);
    },
    [open, tourPhase],
  );
  /* Closing the panel mid-walk ends the tour rather than stranding it. */
  useEffect(() => {
    if (tourPhase === 'sidebar' && !openMember) endTour();
  }, [tourPhase, openMember, endTour]);
  const replayTour = useCallback(() => {
    tour.replay();
    tourStarted.current = true;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setTourPhase(openMember ? 'sidebar' : 'row');
  }, [tour, openMember]);

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

  /* ── filter and sort handlers (remember the last filter for the empty
        state) ── */
  const pick = (setter, name) => (v) => {
    setter(v);
    setLastFilter(name);
  };
  const clearFilters = () => {
    setChamber(null);
    setParty(null);
    setTicker(null);
    setQueryInput('');
    setQuery('');
    setLastFilter(null);
  };
  /* A heading click sorts by that column; a second click flips the
     direction. A new key starts high to low (newest first for dates). */
  const sortBy = (k) => {
    if (k === sort) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(k);
      setDir('desc');
    }
  };

  const H = stats.House;
  const S = stats.Senate;
  const moreActive =
    H?.perMember != null && S?.perMember != null && H.perMember !== S.perMember
      ? H.perMember > S.perMember
        ? 'House'
        : 'Senate'
      : null;
  const sortMeta = sortMetaOf(sort);
  const fig = (v, fmt = (x) => x) => (loaded && v != null ? fmt(v) : NONE);
  const total = ranked.length;
  const lastShown = Math.min(total, firstShown + VISIBLE_ROWS - 1);
  const announce = rankingReady
    ? `Sorted by ${sortMeta.label.toLowerCase()}, ${sortMeta[dir].toLowerCase()}. ${total} ${plural(
        total,
        'member',
      )}${ticker ? `, ticker ${ticker}` : ''}.`
    : '';
  const emptyNote = !rankingReady
    ? null
    : ticker && !traders.length
      ? `No member disclosed a trade in ${ticker} in this period.`
      : !traders.length && anyFilter
        ? `No members match. Try clearing ${
            lastFilter === 'search' ? 'the search' : `the ${lastFilter || ''} filter`.trim()
          }.`
        : !traders.length
          ? 'No disclosed trades in this period. Try a longer period.'
          : null;

  return (
    <div className="dsc ptk">
      <header className="dsc-head">
        <p className="dsc-eyebrow">
          DATASETS · CONGRESS
          {status === 'sample' ? <span className="dsc-sample">SAMPLE DATA</span> : null}
        </p>
        <h1 className="dsc-title">Politician tracker</h1>
        <p className="ptk-sub">
          Every member of the House and Senate, ranked by their disclosed trades.
        </p>
      </header>

      <div className="ptk-body">
        <HubQueryLink dimension="capitol" />

        {/* Two columns. Left (about 60%): the controls and the ranking
            table, then the Bull or bear headline. Right (about 40%): Trades
            by state, Most held companies, House vs Senate. The rest of Bull
            or bear runs full width under both. */}
        <div className="ptk-grid">
          <section className="ptk-main" aria-labelledby="ptk-rank-title">
            <h2 className="ptk-sr" id="ptk-rank-title">
              Every member, ranked
            </h2>

            {/* ── filters ── */}
            <div className="ptk-toolbar" role="search" aria-label="Filter politicians">
              <label className="ptk-search">
                <i className="bi bi-search" aria-hidden="true" />
                <span className="ptk-sr">Search a member</span>
                <input
                  ref={searchRef}
                  className="dsc-input ds-search-input"
                  placeholder="Search a member"
                  value={queryInput}
                  onChange={(e) => {
                    setQueryInput(e.target.value);
                    setLastFilter('search');
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
                className="ptk-seg-party"
                label="Party"
                value={party}
                options={PARTIES}
                onChange={pick(setParty, 'party')}
                mono
              />
              <Segmented
                className="ptk-seg-period"
                label="Period"
                value={period}
                options={PERIODS}
                onChange={(v) => setPeriod(v)}
                mono
              />
            </div>

            {/* ── order and ticker ── */}
            <div className="ptk-sortbar">
              <span className="ptk-sortbar-label dsc-mn" id="ptk-sort-label">
                SORT BY
              </span>
              <EzDropdown
                className="ptk-sort-dd"
                size="sm"
                label="Sort by"
                options={SORTS.map((s) => ({ value: s.value, label: s.label }))}
                value={sort}
                onChange={(v) => {
                  setSort(v);
                  setDir('desc');
                }}
              />
              <button
                type="button"
                className="ptk-dir"
                onClick={() => setDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                aria-label={`Sort direction: ${sortMeta[dir]}. Switch to ${sortMeta[
                  dir === 'asc' ? 'desc' : 'asc'
                ].toLowerCase()}`}
              >
                <i
                  className={`bi ${dir === 'asc' ? 'bi-sort-up' : 'bi-sort-down'}`}
                  aria-hidden="true"
                />
                <span>{sortMeta[dir]}</span>
              </button>
              <span className="ptk-sortbar-rule" aria-hidden="true" />
              <TickerFilter
                value={ticker}
                days={pMeta.days}
                onChange={(t) => {
                  setTicker(t);
                  setLastFilter('ticker');
                }}
              />
              {ticker ? (
                <span className="ptk-active-filter">
                  <span className="dsc-mn">
                    Ticker: <b>{ticker}</b>
                  </span>
                  <button
                    type="button"
                    className="ptk-link"
                    onClick={() => setTicker(null)}
                    aria-label={`Clear ticker filter ${ticker}`}
                  >
                    Clear
                  </button>
                </span>
              ) : null}
              <span className="ptk-showing dsc-mn" aria-hidden="true">
                {rankingReady && total
                  ? `SHOWING ${firstShown}–${lastShown} OF ${total}${
                      total > VISIBLE_ROWS ? ' · SCROLL FOR MORE' : ''
                    }`
                  : NONE}
              </span>
            </div>
            <p className="ptk-sr" aria-live="polite">
              {announce}
            </p>
            {ticker ? (
              <p className="ptk-note ptk-ticker-note">
                Ranked on {ticker} trades only: volume, buys, sells, buy-to-sell ratio and last
                trade count only this ticker in the period. Open a member for their whole record.
              </p>
            ) : null}

            {/* ── unavailable ── */}
            {status === 'empty' ? (
              <div className="ptk-unavailable" role="status">
                <p className="dsc-note">
                  Disclosures are temporarily unavailable. Try again shortly.
                </p>
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

            {emptyNote ? (
              <div className="ptk-empty" role="status">
                <p className="dsc-note">{emptyNote}</p>
                {anyFilter ? (
                  <button type="button" className="dsc-btn dsc-btn--ghost" onClick={clearFilters}>
                    Clear filters
                  </button>
                ) : null}
              </div>
            ) : null}

            {/* ── the ranking: at most ten rows visible, the rest scroll
                  inside the table under a sticky header ── */}
            {emptyNote && !total ? null : (
              <div className="ptk-list">
                <div
                  className="ptk-list-scroll"
                  ref={scrollRef}
                  onScroll={onTableScroll}
                  tabIndex={0}
                  role="region"
                  aria-label={`Politician ranking, ${total || 'loading'} ${plural(
                    total,
                    'member',
                  )}. Scroll for more.`}
                >
                  <table className="ptk-table" aria-describedby="ptk-list-note">
                    <thead>
                      <tr>
                        <th className="dsc-mn ptk-th-rank">#</th>
                        <th className="dsc-mn">POLITICIAN</th>
                        <th className="dsc-mn ptk-col-chamber">CHAMBER</th>
                        <SortTh k="volume" sort={sort} dir={dir} onSort={sortBy}>
                          DISCLOSED VOLUME
                        </SortTh>
                        <SortTh
                          k="ratio"
                          sort={sort}
                          dir={dir}
                          onSort={sortBy}
                          className="ptk-th--c"
                        >
                          BUY : SELL
                        </SortTh>
                        <SortTh
                          k="trades"
                          sort={sort}
                          dir={dir}
                          onSort={sortBy}
                          className="ptk-th--c ptk-col-trades"
                        >
                          TRADES
                        </SortTh>
                        <SortTh
                          k="latest"
                          sort={sort}
                          dir={dir}
                          onSort={sortBy}
                          className="ptk-th--c ptk-col-last"
                        >
                          LAST TRADE
                        </SortTh>
                        <th className="dsc-mn ptk-th--c ptk-col-tks">TOP TICKERS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!rankingReady
                        ? Array.from({ length: LIST_SKELETON }, (_, i) => (
                            <tr key={i} className="ptk-row ptk-row--skel" aria-hidden="true">
                              <td colSpan={8}>
                                <Skel className="ptk-skel--line ptk-skel--row" />
                              </td>
                            </tr>
                          ))
                        : ranked.slice(0, rowLimit).map((m, i) => {
                            const selected = openMember?.key === m.key;
                            const ch = String(m.chamber || '').toLowerCase();
                            const quiet = !(m.count > 0);
                            const isTourRow = tourPhase === 'row' && m.key === tourTargetKey;
                            return (
                              <Fragment key={m.key}>
                                {i === firstQuiet && i > 0 ? (
                                  <tr className="ptk-row-sep" aria-hidden="true">
                                    <td colSpan={8} className="dsc-mn">
                                      NO DISCLOSED TRADES, {pMeta.heading} · {total - firstQuiet}{' '}
                                      MEMBERS
                                    </td>
                                  </tr>
                                ) : null}
                                <tr
                                  tabIndex={0}
                                  data-idx={i}
                                  data-member={m.bioguideId || undefined}
                                  data-tour={isTourRow ? 'ptk-row-first' : undefined}
                                  className={`ptk-row${
                                    selected ? ` ptk-row--selected ptk-row--selected-${ch}` : ''
                                  }`}
                                  aria-selected={selected}
                                  onClick={(e) => openWithTour(m, e.currentTarget)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      openWithTour(m, e.currentTarget);
                                    }
                                  }}
                                >
                                  <td className="dsc-mn ptk-td-rank">
                                    {m.rank ? m.rank : NONE}
                                  </td>
                                  <td>
                                    <span className="ptk-who">
                                      <Headshot
                                        name={m.name}
                                        bioguideId={m.bioguideId}
                                        chamber={m.chamber}
                                        photoUrl={m.photoUrl}
                                        size={AVATAR_SIZE.row}
                                        ring={2}
                                        priority={i < VISIBLE_ROWS}
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
                                      <span className="dsc-mn ptk-vol-fig">
                                        {usdShort(m.volume)}
                                      </span>
                                      {m.volume > 0 && m.pctOfFirst != null ? (
                                        <span
                                          className="ptk-track ptk-col-volbar"
                                          aria-hidden="true"
                                        >
                                          <i style={{ width: `${Math.max(2, m.pctOfFirst)}%` }} />
                                        </span>
                                      ) : null}
                                    </span>
                                  </td>
                                  <td className="ptk-td--c">
                                    {quiet ? <span className="dsc-mn">{NONE}</span> : <RatioCell m={m} />}
                                  </td>
                                  <td className="dsc-mn ptk-td--c ptk-col-trades">
                                    {quiet ? NONE : m.count.toLocaleString()}
                                  </td>
                                  <td className="dsc-mn ptk-td--c ptk-td-mute ptk-col-last">
                                    {m.lastTraded || NONE}
                                  </td>
                                  <td className="ptk-td--c ptk-col-tks">
                                    <Tickers
                                      tickers={m.tickers}
                                      cls="ptk-tks--sm ptk-tks--center"
                                    />
                                  </td>
                                </tr>
                              </Fragment>
                            );
                          })}
                      {rankingReady && moreRows ? (
                        <tr ref={sentinelRef} className="ptk-row-more">
                          <td colSpan={8}>
                            <button
                              type="button"
                              className="ptk-more-btn dsc-mn"
                              onClick={() => setRowLimit((n) => n + ROW_WINDOW)}
                            >
                              LOAD MORE · {total - rowLimit} REMAINING
                            </button>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
                <div className="ptk-list-foot">
                  <p id="ptk-list-note">
                    <i className="bi bi-info-circle" aria-hidden="true" /> Volume is the sum of the
                    midpoints of each trade&apos;s disclosed range, not exact amounts. Buy : sell is
                    buy trades over sell trades in the period; exchanges count in neither. Last
                    trade is the trade date, not the filing date.
                  </p>
                  <span className="dsc-mn ptk-list-count">
                    {!rankingReady
                      ? NONE
                      : `${total} ${plural(total, 'MEMBER').toUpperCase()} · ${traders.length} WITH DISCLOSED TRADES`}
                  </span>
                </div>
                <button type="button" className="ptk-link ptk-tour-replay" onClick={replayTour}>
                  Replay tour
                </button>
              </div>
            )}
          </section>

          <aside className="ptk-right" aria-label="Congressional trading context">
            {/* Trades by state, compact, opening this page's member panel. */}
            <StateMap
              data={stateTrades}
              compact
              topStates={5}
              onMember={(m) => open({ slug: m.id })}
            />

            <section className="ptk-held" aria-labelledby="ptk-held-title">
              <div className="ptk-rail-block-head">
                <h2 className="ptk-eyebrow dsc-mn ptk-held-title" id="ptk-held-title">
                  MOST HELD COMPANIES
                </h2>
                <span className="ptk-cap">top 10 · members holding</span>
              </div>
              <MostHeldChart items={held} loading={status === 'loading' && !server?.held} />
              <p className="ptk-note">{POSITION_BASIS_NOTE}</p>
            </section>

            <section
              className="ptk-rail"
              aria-label={`House versus Senate, ${pMeta.heading.toLowerCase()}`}
            >
              <div className="ptk-rail-head">
                <h2 className="ptk-eyebrow dsc-mn">
                  HOUSE VS SENATE,{' '}
                  {anyFilter
                    ? `${pMeta.heading}, FILTERED`
                    : server
                      ? pMeta.heading
                      : 'LOADED WINDOW'}
                </h2>
                {feeds?.house === 'down' ? (
                  <span className="ptk-feed-chip dsc-mn">HOUSE FEED UNAVAILABLE</span>
                ) : null}
                {feeds?.senate === 'down' ? (
                  <span className="ptk-feed-chip dsc-mn">SENATE FEED UNAVAILABLE</span>
                ) : null}
                <span className="ptk-window dsc-mn">
                  {status === 'loading' && !server ? (
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
                      {status === 'loading' && !server ? (
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
                  ['Disclosed trades', H?.trades, S?.trades, (v) => v.toLocaleString()],
                  ['Trades per member', H?.perMember, S?.perMember, (v) => v.toFixed(1)],
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
            </section>
          </aside>

          {/* Politician sentiment: its headline fills the space under the
              table beside the rail; the detail runs full width below. */}
          <PoliticianSentiment />
        </div>

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
            members={ticker || !server ? members : filtered}
            contractors={contractors}
            onClose={close}
            onSelect={(m) => open(m)}
          />
        </>
      ) : null}

      <GuidedTour
        open={tourPhase === 'row'}
        hideNext
        steps={ROW_STEP}
        onFinish={endTour}
        onSkip={endTour}
      />
      <GuidedTour
        open={tourPhase === 'sidebar' && Boolean(openMember)}
        steps={SIDEBAR_STEPS}
        onFinish={endTour}
        onSkip={endTour}
      />
    </div>
  );
}
