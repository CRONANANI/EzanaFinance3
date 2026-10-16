'use client';

/**
 * Sanctions & Trade Policy Tracking: a sanctions intelligence page over the
 * whole OFAC SDN list. Every figure comes from the server (no sample data).
 *
 * Layout:
 *   01 Sanctions landscape  one card: the four headline measures, the
 *                          program treemap, then the address-country map
 *                          (Oct 15: replaces the KPI row, the side-by-side
 *                          map and treemap, and the left filter rail)
 *   03 Activity            the designation timeline; fastest-rising countries
 *   04 Jurisdictions       program x jurisdiction explorer
 *   05 Intelligence feed   official OFAC actions and press, kept apart
 *   06 Entity explorer     alias/identifier search, expandable rows, drawer
 *   07 Data integrity      source freshness and coverage
 *
 * One filter state (ui.NO_FILTER) is shared: the map, treemap, explorer,
 * timeline, rising countries and the ticker write into it; the timeline,
 * map focus, jurisdiction explorer and listings all read it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HubQueryLink from '@/components/datasets/HubQueryLink';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import { hasProgramMeta } from '@/lib/sanctions/programs';
import ActivityTimeline from './ActivityTimeline';
import DataIntegrity from './DataIntegrity';
import EntityExplorer from './EntityExplorer';
import IntelFeed from './IntelFeed';
import JurisdictionExplorer from './JurisdictionExplorer';
import LandscapeCard from './LandscapeCard';
import { RecordDrawer } from './RecordDetail';
import RisingCountries from './RisingCountries';
import { NO_FILTER, TYPE_BY_KEY, filterParams, sameFilter, useReducedMotion } from './ui';
import './sanctions.css';

export default function SanctionsClient({
  summary,
  firstPage,
  newest = [],
  map,
  trends = null,
  pulses = [],
  kpis = null,
  activity = null,
  targetActivity = null,
  actions = null,
  news = null,
  coverage = null,
  status = null,
  nowIso,
  baselineLabel,
}) {
  const reduced = useReducedMotion();
  const [filter, setFilter] = useState(NO_FILTER);
  const [data, setData] = useState(firstPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(firstPage?.error || null);
  const [drawer, setDrawer] = useState(null);
  const tableRef = useRef(null);
  const reqId = useRef(0);

  /* Listings: one server query per filter, the first page comes from the server. */
  useEffect(() => {
    if (sameFilter(filter, NO_FILTER)) {
      setData(firstPage);
      setError(firstPage?.error || null);
      return undefined;
    }
    const id = ++reqId.current;
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/datasets/sanctions?${filterParams(filter)}`, { signal: ctrl.signal })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (id !== reqId.current) return;
        if (!res.ok) {
          setError(
            res.status === 429
              ? 'Too many requests. Wait a moment and try again.'
              : body?.error && res.status === 400
                ? body.error
                : 'The listings could not be loaded. Try again shortly.',
          );
          return;
        }
        setError(null);
        setData(body);
      })
      .catch((e) => {
        if (e?.name !== 'AbortError' && id === reqId.current) {
          setError('The listings could not be loaded. Check your connection.');
        }
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
    return () => ctrl.abort();
  }, [filter, firstPage]);

  const toTable = useCallback(() => {
    tableRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }, [reduced]);

  const patch = useCallback((p) => setFilter((f) => ({ ...f, ...p, page: 1 })), []);
  const toggle = useCallback(
    (key) => (v) => setFilter((f) => ({ ...f, [key]: f[key] === v ? '' : v, page: 1 })),
    [],
  );
  const pickCountry = useMemo(() => toggle('country'), [toggle]);
  const pickProgram = useMemo(() => toggle('program'), [toggle]);
  const closeDrawer = useCallback(() => setDrawer(null), []);
  const openRecord = useCallback((id) => setDrawer(id), []);
  const filterFromRecord = useCallback(
    (p) => {
      patch(p);
      toTable();
    },
    [patch, toTable],
  );
  const applyRange = useCallback(
    (from, to) => {
      patch({ from, to });
      toTable();
    },
    [patch, toTable],
  );

  const landscapeHandlers = useMemo(
    () => ({
      pickCountry,
      pickProgram,
      clearCountry: () => patch({ country: '' }),
      clearProgram: () => patch({ program: '' }),
      toTable,
    }),
    [pickCountry, pickProgram, patch, toTable],
  );

  /* Ticker: the newest additions since tracking began. */
  const tickerItems = useMemo(
    () =>
      newest.slice(0, 30).map((e) => ({
        id: String(e.id),
        lead: e.programs[0] || 'OFAC',
        main: e.name,
        value: e.countries[0] || TYPE_BY_KEY[e.type]?.label || 'Listed',
        _id: e.id,
      })),
    [newest],
  );
  const onTickerSelect = useCallback((it) => setDrawer(it._id), []);
  usePublishTicker({
    items: tickerItems,
    onSelect: onTickerSelect,
    ariaLabel: 'Newest additions to the OFAC sanctions list',
  });

  const programsMapped = useMemo(
    () => ({
      mapped: summary.programs.filter((p) => hasProgramMeta(p.code)).length,
      total: summary.programs.length,
    }),
    [summary.programs],
  );

  const empty = !summary.active;

  return (
    <div className="snx-page">
      <header className="snx-header">
        <p className="snx-eyebrow">Datasets · US Treasury OFAC</p>
        <h1 className="snx-title">Sanctions &amp; trade policy</h1>
        <p className="snx-lead">
          Every individual, company, vessel and aircraft on the US Specially Designated Nationals
          list: where they are based, the programs behind each listing, how listing activity is
          changing, and the record behind every name.
        </p>
      </header>

      <HubQueryLink dimension="lighthouse" />

      {empty ? (
        <section className="snx-card snx-empty">
          <i className="bi bi-shield-exclamation" aria-hidden="true" />
          <p>The sanctions list has not loaded yet. It refreshes daily from the US Treasury.</p>
        </section>
      ) : (
        <>
          <div className="snx-main">
            <LandscapeCard
              summary={summary}
              kpis={kpis}
              map={map}
              filter={filter}
              pulses={pulses}
              handlers={landscapeHandlers}
            />

            <ActivityTimeline
              initial={activity || { ready: false, rows: [] }}
              filter={filter}
              onApplyRange={applyRange}
              baselineLabel={baselineLabel}
            />

            <JurisdictionExplorer
              targets={summary.targets}
              activity={targetActivity}
              program={filter.program}
              onPickProgram={pickProgram}
              onClearProgram={() => patch({ program: '' })}
            />

            <div className="snx-pair">
              <RisingCountries trends={trends} selected={filter.country} onPick={pickCountry} />
              <IntelFeed actions={actions} news={news} today={nowIso} />
            </div>

            <EntityExplorer
              data={data}
              filter={filter}
              setFilter={setFilter}
              loading={loading}
              error={error}
              summary={summary}
              tableRef={tableRef}
              onOpenRecord={openRecord}
            />

            <DataIntegrity
              status={status}
              coverage={coverage}
              summary={summary}
              programsMapped={programsMapped}
              nowIso={nowIso}
            />
          </div>
          <RecordDrawer
            id={drawer}
            onClose={closeDrawer}
            onFilter={filterFromRecord}
            onOpen={openRecord}
          />
        </>
      )}
    </div>
  );
}
