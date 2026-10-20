'use client';

/**
 * /datasets/prediction-markets: the card dashboard
 * (docs/design/prediction-markets-handoff). Oct 20: the Edge Board and the
 * Legislation card are retired; Event Horizon takes the Edge Board's row.
 * This file owns the page state
 * (filters in the URL, the loaded market, the shared fetches) and lays the
 * cards out; page-model.js calculates, the cards render.
 *
 * The shared green chrome and ticker are drawn by the datasets layout. The
 * page publishes ticker items through usePublishTicker and nothing else.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import { useAuth } from '@/components/auth-context';
import {
  CATEGORY_SLUGS,
  categoryCounts,
  filterRows,
  rankMovers,
  tickerMovers,
} from '@/lib/prediction-markets/page-model';
import { useJson } from './use-json';
import { FilterBar } from './FilterBar';
import { PulseCard } from './PulseCard';
import { PriceChartCard } from './PriceChartCard';
import { MoversCard } from './MoversCard';
import { HorizonCard } from './HorizonCard';
import { TopTradersCard } from './TopTradersCard';
import { CategoryMapCard } from './CategoryMapCard';
import { ClosingSoonCard } from './ClosingSoonCard';
import { ConvictionCard } from './ConvictionCard';
import { OpenMarketsCard } from './OpenMarketsCard';
import { SignupBand } from './SignupBand';
import { MethodNote } from './MethodNote';
import { VenueChip } from './parts';
import { VENUE_SHORT, dateTimeEt, pct, pts } from './format';
import './prediction-markets.css';

const VENUES = new Set(['polymarket', 'kalshi']);
const WINDOWS = new Set(['24h', '7d', '30d']);

/** ?market=<venue>:<id> <-> index market id. Kalshi ids already carry 'kalshi:'. */
function marketFromParam(v) {
  const s = String(v || '');
  if (s.startsWith('polymarket:')) return s.slice('polymarket:'.length) || null;
  if (s.startsWith('kalshi:')) return s;
  return null;
}
function marketParam(id) {
  if (!id) return null;
  return String(id).startsWith('kalshi:') ? id : `polymarket:${id}`;
}

function decode(universe) {
  if (!universe || !Array.isArray(universe.rows) || !Array.isArray(universe.cols)) return [];
  const cols = universe.cols;
  return universe.rows.map((arr) => {
    const o = {};
    for (let i = 0; i < cols.length; i += 1) o[cols[i]] = arr[i];
    return o;
  });
}

export default function PredictionMarketsPage() {
  const router = useRouter();
  const pathname = usePathname() || '/datasets/prediction-markets';
  const params = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();

  /* ── data ── */
  const universe = useJson('/api/prediction-markets/universe');
  const rows = useMemo(() => decode(universe.data), [universe.data]);
  const windowsAvailable = universe.data?.windows || { '24h': true, '7d': false, '30d': false };
  const defaultWindow = windowsAvailable['7d'] ? '7d' : '24h';

  /* ── filters (URL is the source of truth) ── */
  const category = CATEGORY_SLUGS.includes(params.get('category')) ? params.get('category') : 'all';
  const venue = VENUES.has(params.get('venue')) ? params.get('venue') : 'all';
  const winParam = WINDOWS.has(params.get('window')) ? params.get('window') : null;
  const win = winParam && windowsAvailable[winParam] ? winParam : defaultWindow;
  const q = String(params.get('q') || '').slice(0, 120);
  const marketParamValue = marketFromParam(params.get('market'));

  const setParams = useCallback(
    (patch) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        const omit =
          v == null ||
          v === '' ||
          (k === 'category' && v === 'all') ||
          (k === 'venue' && v === 'all') ||
          (k === 'window' && v === defaultWindow);
        if (omit) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router, defaultWindow],
  );

  const filters = useMemo(() => ({ category, venue, q }), [category, venue, q]);
  const filtered = useMemo(() => filterRows(rows, filters), [rows, filters]);
  const counts = useMemo(
    () => categoryCounts(filterRows(rows, { venue, q }), null),
    [rows, venue, q],
  );

  /* ── movers and the loaded market ── */
  const [moversBy, setMoversBy] = useState('moves');
  const movers = useMemo(() => rankMovers(filtered, moversBy, 8, win), [filtered, moversBy, win]);
  const loadedId = marketParamValue || movers[0]?.id || null;
  const chartRef = useRef(null);

  const loadMarket = useCallback(
    (id) => {
      if (!id) return;
      setParams({ market: marketParam(id) });
      if (globalThis.matchMedia?.('(max-width: 900px)').matches) {
        const reduce = globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
        chartRef.current?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
      }
    },
    [setParams],
  );

  /* ── table day filter from Closing Soon "+N more" ── */
  const [closesOn, setClosesOn] = useState(null);
  const tableRef = useRef(null);
  const showDay = useCallback((key) => {
    setClosesOn(key);
    requestAnimationFrame(() => tableRef.current?.scrollIntoView({ block: 'start' }));
  }, []);
  useEffect(() => setClosesOn(null), [category, venue, q]);

  /* ── shared ticker: 12 largest 24h movers ── */
  const tickerItems = useMemo(
    () =>
      tickerMovers(rows).map((r) => ({
        id: r.id,
        lead: VENUE_SHORT[r.venue],
        main: r.question.length > 64 ? `${r.question.slice(0, 63)}…` : r.question,
        value: `${pct(r.p)} · ${pts(r.change24h).toUpperCase()}`,
      })),
    [rows],
  );
  const onTicker = useCallback((item) => loadMarket(item?.id), [loadMarket]);
  usePublishTicker({
    items: tickerItems,
    onSelect: onTicker,
    ariaLabel: 'Biggest prediction market moves, last 24 hours',
  });

  const uState = universe.error ? 'error' : universe.loading && !rows.length ? 'loading' : 'ready';
  const signedIn = !authLoading && isAuthenticated;
  const stale = Boolean(universe.data?.stale);

  return (
    <div className="pmk-page">
      <div className="pmk-wrap">
        <header className="pmk-header">
          <div className="pmk-header-main">
            <p className="pmk-eyebrow">Datasets · Prediction markets</p>
            <h1 className="pmk-h1">Prediction markets</h1>
            <p className="pmk-lead">
              What the crowd is pricing, what is moving, and how much money stands behind each
              price, across Polymarket and Kalshi.
            </p>
          </div>
          <div className="pmk-header-side">
            <p className="pmk-asof pmk-num">
              Odds as of{' '}
              <span className="pmk-asof-time">
                {universe.data?.updatedAt ? dateTimeEt(universe.data.updatedAt) : 'loading'}
              </span>
              {stale ? <span className="pmk-asof-stale"> · Odds delayed</span> : null}
            </p>
            <div className="pmk-legend" aria-label="Venues">
              <VenueChip venue="polymarket" />
              <VenueChip venue="kalshi" />
            </div>
          </div>
        </header>

        <FilterBar
          category={category}
          venue={venue}
          win={win}
          q={q}
          counts={counts}
          windowsAvailable={windowsAvailable}
          defaultWindow={defaultWindow}
          matching={filtered.length}
          onChange={setParams}
        />

        <div className="pmk-grid">
          <PulseCard
            className="pmk-span-12"
            state={uState}
            rows={filtered}
            win={win}
            filters={filters}
            updatedAt={universe.data?.updatedAt}
            stale={stale}
            onRetry={universe.retry}
            onLoad={loadMarket}
            onReset={() => setParams({ category: null, venue: null, q: null, window: null })}
          />

          <div className="pmk-span-8 pmk-slot" ref={chartRef}>
            <PriceChartCard
              marketId={loadedId}
              movers={movers}
              onLoad={loadMarket}
              universeState={uState}
            />
          </div>
          <MoversCard
            className="pmk-span-4"
            state={uState}
            movers={movers}
            by={moversBy}
            onBy={setMoversBy}
            win={win}
            filters={filters}
            loadedId={loadedId}
            onLoad={loadMarket}
            onRetry={universe.retry}
          />

          <HorizonCard
            className="pmk-span-12"
            state={uState}
            rows={filtered}
            filters={filters}
            onLoad={loadMarket}
            onRetry={universe.retry}
          />

          <TopTradersCard
            className="pmk-span-7"
            category={category}
            signedIn={signedIn}
            onLoad={loadMarket}
          />
          <CategoryMapCard
            className="pmk-span-5"
            state={uState}
            rows={filterRows(rows, { venue: 'all', q: '' })}
            win={win}
            category={category}
            onPick={(slug) => setParams({ category: slug === category ? null : slug })}
            onRetry={universe.retry}
          />

          <ClosingSoonCard
            className="pmk-span-6"
            state={uState}
            rows={filtered}
            filters={filters}
            onLoad={loadMarket}
            onShowDay={showDay}
            onRetry={universe.retry}
          />
          <ConvictionCard
            className="pmk-span-6"
            state={uState}
            rows={filtered}
            win={win}
            filters={filters}
            onLoad={loadMarket}
            onRetry={universe.retry}
          />

          <div className="pmk-span-12 pmk-slot" ref={tableRef}>
            <OpenMarketsCard
              state={uState}
              rows={filtered}
              total={rows.length}
              category={category}
              closesOn={closesOn}
              onClearDay={() => setClosesOn(null)}
              onClearCategory={() => setParams({ category: null })}
              onLoad={loadMarket}
              onRetry={universe.retry}
            />
          </div>

          {!authLoading && !isAuthenticated ? <SignupBand className="pmk-span-12" /> : null}
        </div>

        <MethodNote />
      </div>
    </div>
  );
}
