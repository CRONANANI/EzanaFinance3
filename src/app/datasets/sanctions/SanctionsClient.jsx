'use client';

/**
 * Sanctions & Trade Policy Tracking: a sanctions intelligence page over the
 * whole OFAC SDN list. Every figure comes from the server (no sample data).
 *
 * Layout:
 *   01 Executive summary   four KPI cards (coverage, recency, geography,
 *                          concentration)
 *   02 Geography & programs  the map and the program treemap (kept), with
 *                          a country panel, count/share and a theme filter
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
import { hasProgramMeta, programMeta, themeOf } from '@/lib/sanctions/programs';
import ActivityTimeline from './ActivityTimeline';
import DataIntegrity from './DataIntegrity';
import EntityExplorer from './EntityExplorer';
import IntelFeed from './IntelFeed';
import JurisdictionExplorer from './JurisdictionExplorer';
import KpiCards from './KpiCards';
import MapCard from './MapCard';
import ProgramsCard from './ProgramsCard';
import { RecordDrawer } from './RecordDetail';
import RisingCountries from './RisingCountries';
import { NO_FILTER, TYPE_BY_KEY, filterParams, sameFilter, useReducedMotion } from './ui';
import './sanctions.css';

/* Rail list: searchable countries or programs, writing the shared filter. */
function RailList({ items, selected, onPick, render, placeholder, ariaLabel }) {
  const [term, setTerm] = useState('');
  const shown = useMemo(() => {
    const t = term.trim().toLowerCase();
    return t ? items.filter((it) => it.search.includes(t)) : items;
  }, [items, term]);
  const max = items[0]?.total || 1;
  return (
    <>
      <label className="snx-rail-search">
        <i className="bi bi-search" aria-hidden="true" />
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
        />
      </label>
      <div className="snx-rail-list">
        {shown.length === 0 ? (
          <p className="snx-rail-note">No match for “{term}”.</p>
        ) : (
          shown.map((it) => (
            <button
              key={it.key}
              type="button"
              className={`snx-rail-row${selected === it.key ? ' is-on' : ''}`}
              aria-pressed={selected === it.key}
              onClick={() => onPick(selected === it.key ? '' : it.key)}
              title={it.title}
            >
              {render(it)}
              <span className="snx-rail-n">{Number(it.total).toLocaleString('en-US')}</span>
              <span
                className="snx-rail-bar"
                style={{ width: `${Math.max(2, (it.total / max) * 100)}%` }}
                aria-hidden="true"
              />
            </button>
          ))
        )}
      </div>
    </>
  );
}

function FilterGroup({ title, meta, children }) {
  return (
    <div className="snx-filter">
      <div className="snx-filter-head">
        <span className="snx-filter-title">{title}</span>
        {meta != null ? <span className="snx-filter-meta">{meta}</span> : null}
      </div>
      {children}
    </div>
  );
}

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
  const [railOpen, setRailOpen] = useState(true);
  const tableRef = useRef(null);
  const reqId = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(max-width: 900px)').matches) setRailOpen(false);
  }, []);

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

  const countryItems = useMemo(
    () =>
      summary.countries.map((c) => ({
        key: c.name,
        total: c.total,
        search: c.name.toLowerCase(),
        title: c.name,
      })),
    [summary.countries],
  );
  const programItems = useMemo(
    () =>
      summary.programs.map((p) => {
        const meta = programMeta(p.code);
        return {
          key: p.code,
          total: p.total,
          search: `${p.code} ${meta.label}`.toLowerCase(),
          title: meta.label,
          color: themeOf(p.code).color,
          label: meta.label,
        };
      }),
    [summary.programs],
  );
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
          <KpiCards summary={summary} kpis={kpis} syncedAt={summary.synced} />

          <div className="snx-body">
            <aside className="snx-rail" aria-label="Filters">
              <details
                className="snx-rail-fold"
                open={railOpen}
                onToggle={(e) => setRailOpen(e.currentTarget.open)}
              >
                <summary className="snx-rail-fold-head">
                  Filters
                  <i className="bi bi-chevron-down" aria-hidden="true" />
                </summary>
                <FilterGroup title="Based in" meta={summary.countries.length}>
                  <RailList
                    items={countryItems}
                    selected={filter.country}
                    onPick={(c) => patch({ country: c })}
                    placeholder="Filter countries"
                    ariaLabel="Filter the country list"
                    render={(it) => <span className="snx-rail-label">{it.key}</span>}
                  />
                </FilterGroup>
                <FilterGroup title="Program" meta={summary.programs.length}>
                  <RailList
                    items={programItems}
                    selected={filter.program}
                    onPick={(p) => patch({ program: p })}
                    placeholder="Filter programs"
                    ariaLabel="Filter the program list"
                    render={(it) => (
                      <span className="snx-rail-label">
                        <i
                          className="snx-rail-dot"
                          style={{ background: it.color }}
                          aria-hidden="true"
                        />
                        <span className="snx-rail-code">{it.key}</span>
                        <span className="snx-rail-sub">{it.label}</span>
                      </span>
                    )}
                  />
                </FilterGroup>
              </details>
            </aside>

            <div className="snx-main">
              <div className="snx-pair snx-pair--map">
                <MapCard
                  map={map}
                  summary={summary}
                  filter={filter}
                  pulses={pulses}
                  onPickCountry={pickCountry}
                  onClearCountry={() => patch({ country: '' })}
                  onPickProgram={pickProgram}
                  onClearProgram={() => patch({ program: '' })}
                  onShowListings={toTable}
                />
                <ProgramsCard
                  programs={summary.programs}
                  themes={summary.themes}
                  selected={filter.program}
                  onPick={pickProgram}
                />
              </div>

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
