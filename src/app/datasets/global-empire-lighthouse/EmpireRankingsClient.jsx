'use client';

/**
 * Global Empire Rankings (/datasets/global-empire-lighthouse), client side.
 *
 * Built on DatasetDashboard like the World Bank page: header, composite
 * leaders, the composite table, then (as children) one dimension's full table
 * with a category-grouped pill row, the country panel, a two-country compare,
 * the pending dimensions, and the lighthouse datasets slot from the server.
 *
 * Every number comes from the shared empire model (buildEmpireModel and its
 * helpers) through empire-rankings-model.js. There is no mock path: with no
 * live scores the page shows one calm unavailable card and the datasets.
 *
 * URL: ?dim=<id> selects a dimension, ?country=<ISO3> highlights that country
 * and opens its panel, ?layers= (from the old /empire-ranking links) maps to a
 * dimension through LAYER_TO_DIM. The query is read in a small Suspense-wrapped
 * sync component so the rest of the page still renders on the server.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { DatasetDashboard } from '@/components/marketing/DatasetDashboard';
import { DatasetTable, EntityName } from '@/components/marketing/DatasetTable';
import { CHART } from '@/lib/chart-theme';
import { buildEmpireModel } from '../oecd-macro/oecd-empire-model';
import {
  PAGE_PATH,
  compositeTableRows,
  countryProfile,
  dimHref,
  dimensionTableRows,
  groupDimsByCategory,
  pairRows,
  resolveEmpireQuery,
} from './empire-rankings-model';

const SearchIcon = () => <i className="bi bi-search" aria-hidden="true" />;
const CrownIcon = () => <i className="bi bi-trophy" aria-hidden="true" />;
const DASH = '–';

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};
const shortName = (name) => (name.length > 16 ? `${name.slice(0, 14)}…` : name);

const TOOLTIP_STYLE = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-primary)',
  borderRadius: 'var(--radius-md)',
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
};

/* Reads the query (and the hash) and hands them up. Wrapped in its own
   Suspense boundary: useSearchParams opts its subtree out of static
   rendering, and this keeps that subtree to nothing visible. */
function QuerySync({ onChange }) {
  const sp = useSearchParams();
  const key = sp?.toString() || '';
  useEffect(() => {
    onChange({
      dim: sp?.get('dim') || null,
      country: sp?.get('country') || null,
      layers: sp?.get('layers') || null,
      hash: typeof window !== 'undefined' ? window.location.hash : '',
    });
    // `key` captures every change to the query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, onChange]);
  return null;
}

function SearchedTag() {
  return <span className="hdc-you gerx-you">Your search</span>;
}

/* ── country panel ─────────────────────────────────────────────────────── */

function DimLinks({ title, dims, iso, onPickDim }) {
  if (!dims.length) return null;
  return (
    <div className="gerx-dimlinks">
      <h4 className="gerx-label">{title}</h4>
      <ol className="gerx-dimlinks-list">
        {dims.map((d) => (
          <li key={d.id}>
            <a
              href={dimHref(d.id, iso)}
              onClick={(e) => {
                e.preventDefault();
                onPickDim(d.id);
              }}
            >
              <span className="gerx-dimlinks-name">{d.name}</span>
              <span className="gerx-mono gerx-dimlinks-meta">
                {ordinal(d.rank)} of {d.of} · {d.score.toFixed(1)}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CountryRadar({ rows, nameA, nameB }) {
  if (rows.length < 3) return null;
  const data = rows.map((r) => ({ dimension: shortName(r.name), full: r.name, a: r.a, b: r.b }));
  return (
    <figure className="gerx-radar" aria-label={`${nameA} against ${nameB} on every live dimension`}>
      <div className="gerx-radar-box">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke={CHART.gridStroke} />
            <PolarAngleAxis dataKey="dimension" tick={CHART.tick} />
            <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
            <Radar
              name={nameB}
              dataKey="b"
              stroke={CHART.goldStroke}
              fill={CHART.goldStroke}
              fillOpacity={0.12}
              strokeWidth={CHART.secondaryStrokeWidth}
              isAnimationActive={false}
            />
            <Radar
              name={nameA}
              dataKey="a"
              stroke={CHART.primaryStroke}
              fill={CHART.primaryStroke}
              fillOpacity={0.2}
              strokeWidth={CHART.primaryStrokeWidth}
              isAnimationActive={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelFormatter={(_l, p) => p?.[0]?.payload?.full || ''}
              formatter={(v, n) => [v == null ? DASH : Number(v).toFixed(1), n]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="gerx-legend">
        <span className="gerx-legend-item">
          <span className="gerx-swatch gerx-swatch--a" aria-hidden="true" />
          {nameA}
        </span>
        <span className="gerx-legend-item">
          <span className="gerx-swatch gerx-swatch--b" aria-hidden="true" />
          {nameB}
        </span>
        <span className="gerx-legend-note">Score 0 to 100, outward is stronger</span>
      </figcaption>
    </figure>
  );
}

function CountryPanel({ model, profile, onClose, onPickDim, panelRef }) {
  const vsIso = profile.leaderIso === profile.iso ? profile.runnerUpIso : profile.leaderIso;
  const vsName = vsIso ? model.nameByCode.get(vsIso) || vsIso : null;
  const vsLabel = vsName
    ? profile.leaderIso === profile.iso
      ? `${vsName} (2nd)`
      : `${vsName} (1st)`
    : null;
  const rows = useMemo(() => pairRows(model, profile.iso, vsIso), [model, profile.iso, vsIso]);
  return (
    <section
      ref={panelRef}
      className="mkt-card gerx-panel"
      aria-labelledby="gerx-panel-title"
      tabIndex={-1}
    >
      <div className="gerx-panel-head">
        <div>
          <p className="gerx-label">Country</p>
          <h2 className="gerx-panel-title" id="gerx-panel-title">
            {profile.name}
          </h2>
          <p className="gerx-panel-lede">
            {profile.rank != null ? (
              <>
                <span className="gerx-mono">{ordinal(profile.rank)}</span> of{' '}
                <span className="gerx-mono">{profile.of}</span> on the composite, score{' '}
                <span className="gerx-mono">{profile.composite.toFixed(1)}</span>
              </>
            ) : (
              'Not ranked on the composite: too few live dimensions'
            )}
            {' · '}
            <span className="gerx-mono">
              {profile.present} of {profile.live}
            </span>{' '}
            live dimensions · <span className="gerx-mono">{profile.year}</span>
          </p>
        </div>
        <button type="button" className="gerx-close" onClick={onClose} aria-label="Close country">
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>
      <div className="gerx-panel-body">
        {vsLabel ? <CountryRadar rows={rows} nameA={profile.name} nameB={vsLabel} /> : null}
        <div className="gerx-panel-side">
          <DimLinks
            title="Ranks highest in"
            dims={profile.top}
            iso={profile.iso}
            onPickDim={onPickDim}
          />
          <DimLinks
            title="Ranks lowest in"
            dims={profile.bottom}
            iso={profile.iso}
            onPickDim={onPickDim}
          />
          <p className="gerx-panel-out">
            Underlying series:{' '}
            <Link href="/datasets/world-bank">World Bank Economic Indicators</Link>
            {' · '}
            <Link href={`/datasets/oecd-macro?a=${encodeURIComponent(profile.iso)}`}>
              {profile.name} on the OECD explorer
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── compare ───────────────────────────────────────────────────────────── */

function Compare({ model, defaultA, defaultB }) {
  const [a, setA] = useState(defaultA);
  const [b, setB] = useState(defaultB);
  useEffect(() => setA(defaultA), [defaultA]);
  const rows = useMemo(() => pairRows(model, a, b), [model, a, b]);
  const nameA = model.nameByCode.get(a) || a;
  const nameB = model.nameByCode.get(b) || b;
  const options = model.countries;
  return (
    <section className="gerx-section" aria-labelledby="gerx-compare">
      <h2 className="mkt-section-title" id="gerx-compare">
        Compare two countries
      </h2>
      <div className="mkt-card gerx-compare">
        <div className="gerx-compare-pick">
          <label className="gerx-select">
            <span className="gerx-swatch gerx-swatch--a" aria-hidden="true" />
            <span className="gerx-sr">Country A</span>
            <select value={a || ''} onChange={(e) => setA(e.target.value)}>
              {options.map((c) => (
                <option key={c.iso} value={c.iso}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <span className="gerx-vs">vs</span>
          <label className="gerx-select">
            <span className="gerx-swatch gerx-swatch--b" aria-hidden="true" />
            <span className="gerx-sr">Country B</span>
            <select value={b || ''} onChange={(e) => setB(e.target.value)}>
              {options.map((c) => (
                <option key={c.iso} value={c.iso}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ul className="gerx-bars" aria-label={`${nameA} and ${nameB} by dimension`}>
          {rows.map((r) => (
            <li key={r.id} className="gerx-bar-row">
              <span className="gerx-bar-name">{r.name}</span>
              <span className="gerx-bar-pair">
                <span className="gerx-bar-track" aria-hidden="true">
                  <span
                    className="gerx-bar gerx-bar--a"
                    style={{ width: `${r.a == null ? 0 : r.a}%` }}
                  />
                </span>
                <span className="gerx-mono gerx-bar-val">
                  {r.a == null ? DASH : r.a.toFixed(1)}
                </span>
                <span className="gerx-bar-track" aria-hidden="true">
                  <span
                    className="gerx-bar gerx-bar--b"
                    style={{ width: `${r.b == null ? 0 : r.b}%` }}
                  />
                </span>
                <span className="gerx-mono gerx-bar-val">
                  {r.b == null ? DASH : r.b.toFixed(1)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── page ──────────────────────────────────────────────────────────────── */

export default function EmpireRankingsClient({ empire, datasets = null }) {
  const router = useRouter();
  const model = useMemo(() => buildEmpireModel(empire), [empire]);
  const available = Boolean(model && model.liveDims.length);

  const liveIds = useMemo(() => (model ? model.liveDims.map((d) => d.id) : []), [model]);
  const isoSet = useMemo(() => (model ? new Set(model.scoreMap.keys()) : null), [model]);

  const [query, setQuery] = useState({ dimId: null, country: null, focus: null });
  const scrollIntent = useRef(null); // 'dims' | 'composite' | 'panel' | null
  const firstSync = useRef(true);
  const dimsRef = useRef(null);
  const panelRef = useRef(null);

  const onQuery = useCallback(
    (params) => {
      const next = resolveEmpireQuery(params, liveIds, isoSet);
      setQuery(next);
      if (firstSync.current) {
        firstSync.current = false;
        const hashDim = /^#dim-/.test(params.hash || '');
        if (next.focus === 'dim' || hashDim) scrollIntent.current = 'dims';
        else if (next.focus === 'composite') scrollIntent.current = 'composite';
        else if (next.country) scrollIntent.current = 'panel';
      }
    },
    [liveIds, isoSet],
  );

  const selectedId = query.dimId || liveIds[0] || null;
  const selectedDim = model?.liveDims.find((d) => d.id === selectedId) || null;

  /* Shallow URL update: no navigation, no scroll jump. `layers` is dropped
     once the reader picks something, since dim now says it. */
  const writeQuery = useCallback(
    (patch) => {
      const next = { dimId: query.dimId, country: query.country, ...patch };
      setQuery((q) => ({ ...q, ...patch, focus: q.focus }));
      const qs = new URLSearchParams();
      if (next.dimId) qs.set('dim', next.dimId);
      if (next.country) qs.set('country', next.country);
      const s = qs.toString();
      router.replace(s ? `${PAGE_PATH}?${s}` : PAGE_PATH, { scroll: false });
    },
    [query.dimId, query.country, router],
  );

  const openCountry = useCallback(
    (iso) => {
      if (!iso) return;
      scrollIntent.current = 'panel';
      writeQuery({ country: iso });
    },
    [writeQuery],
  );
  const pickDim = useCallback(
    (id, scroll = true) => {
      if (scroll) scrollIntent.current = 'dims';
      writeQuery({ dimId: id });
    },
    [writeQuery],
  );

  const compositeRows = useMemo(() => compositeTableRows(model), [model]);
  const dimRows = useMemo(() => dimensionTableRows(model, selectedDim), [model, selectedDim]);
  const groups = useMemo(() => groupDimsByCategory(model?.liveDims), [model]);
  const profile = useMemo(
    () => (query.country ? countryProfile(model, query.country) : null),
    [model, query.country],
  );

  /* Scroll once the DOM reflects the query: the section the URL pointed at,
     then the highlighted row inside the dimension table's own scroll box. */
  useEffect(() => {
    const intent = scrollIntent.current;
    scrollIntent.current = null;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const behavior = reduce ? 'auto' : 'smooth';
    if (intent === 'dims') dimsRef.current?.scrollIntoView({ behavior, block: 'start' });
    else if (intent === 'composite')
      document.getElementById('composite')?.scrollIntoView({ behavior, block: 'start' });
    else if (intent === 'panel') panelRef.current?.scrollIntoView({ behavior, block: 'start' });

    if (query.country && dimsRef.current) {
      const wrap = dimsRef.current.querySelector('.mkt-ds-table-wrap');
      const row = wrap?.querySelector(`tr[data-row-id="${query.country}"]`);
      if (wrap && row) {
        wrap.scrollTop = Math.max(0, row.offsetTop - wrap.clientHeight / 2 + row.offsetHeight);
      }
    }
  }, [query, selectedId]);

  const leaders = useMemo(
    () =>
      compositeRows
        .filter((r) => r.rank != null)
        .slice(0, 5)
        .map((r) => ({
          name: r.country,
          iso: r.iso,
          meta: `${r.present} of ${r.live} live dimensions · ${r.year}`,
          value: r.composite.toFixed(1),
        })),
    [compositeRows],
  );

  const tickerItems = useMemo(
    () =>
      compositeRows
        .filter((r) => r.rank != null)
        .slice(0, 30)
        .map((r) => ({
          id: r.iso,
          lead: `#${r.rank}`,
          main: r.country,
          value: r.composite.toFixed(1),
        })),
    [compositeRows],
  );
  const onTicker = useCallback((it) => openCountry(it?.id), [openCountry]);

  const isSearched = useCallback(
    (row) => (query.country && row.iso === query.country ? 'gerx-row-searched' : ''),
    [query.country],
  );
  const countryCell = useCallback(
    (v, row) => (
      <span className="gerx-country">
        <EntityName>{v}</EntityName>
        {query.country && row.iso === query.country ? <SearchedTag /> : null}
      </span>
    ),
    [query.country],
  );

  const liveCount = model?.liveDims.length ?? 0;
  const totalCount = model?.totalDims ?? 18;

  const config = {
    eyebrow: 'GLOBAL EMPIRE LIGHTHOUSE',
    title: 'Global Empire Rankings',
    lead: available
      ? `Ezana's composite of Dalio-style power dimensions, built only from sourced data. ${liveCount} of ${totalCount} dimensions are live; the rest are listed as pending until their sources are wired.`
      : "Ezana's composite of Dalio-style power dimensions, built only from sourced data.",
    searches: available
      ? [
          {
            id: 'country',
            label: 'Country search',
            placeholder: 'Search by country…',
            icon: SearchIcon,
            keys: ['country', 'iso'],
          },
        ]
      : [],
    highlight: available
      ? {
          badge: String(model.year),
          icon: CrownIcon,
          title: 'Composite leaders',
          desc: 'The five strongest countries on the composite: the mean of their live dimension scores.',
          items: leaders,
          emptyText: 'No country has enough live dimensions for a composite yet.',
          onItemClick: (it) => openCountry(it.iso),
        }
      : null,
    table: available
      ? {
          id: 'composite',
          caption: 'Composite ranking',
          ariaLabel: 'Composite ranking table',
          columns: [
            {
              key: 'rank',
              label: 'Rank',
              mono: true,
              render: (v) => (v == null ? <span className="mkt-ds-muted">{DASH}</span> : v),
            },
            { key: 'country', label: 'Country', render: countryCell },
            {
              key: 'composite',
              label: 'Composite',
              align: 'right',
              mono: true,
              render: (v) =>
                v == null ? (
                  <span className="mkt-ds-muted">n/a, too few dimensions</span>
                ) : (
                  v.toFixed(1)
                ),
            },
            {
              key: 'present',
              label: 'Coverage',
              align: 'right',
              mono: true,
              render: (v, row) => `${v}/${row.live}`,
            },
            { key: 'strongest', label: 'Strongest', render: (v) => v || DASH },
            { key: 'weakest', label: 'Weakest', render: (v) => v || DASH },
            { key: 'year', label: 'Year', mono: true },
          ],
          rows: compositeRows,
          emptyText: 'No country carries a live score yet.',
        }
      : null,
    sampleNote: available
      ? `Scoring year ${model.year}. A country needs scores on at least 70% of the live dimensions to be ranked; the rest follow, unranked.`
      : null,
    onRowClick: (row) => openCountry(row.iso),
    isRowClickable: () => true,
    getRowLabel: (row) => `Open ${row.country}`,
    rowClassName: isSearched,
    queryHref: '#hub-ezanaql',
    source: {
      title: 'How we score it',
      body: [
        'Every score is built from the World Bank Indicators API (CC BY 4.0), loaded weekly. Each live dimension is a weighted blend of the World Bank metrics mapped to it, normalized 0 to 100 across the ranked countries, with metrics where lower is better (debt, inflation, inequality, energy use per unit of output) inverted so a higher score always means stronger.',
        'The composite is the mean of a country’s live dimension scores, and a country needs scores on at least 70% of the live dimensions to be ranked. Dimensions without a sourced series yet are listed as pending and never scored.',
        available
          ? `This is Ezana's own ranking, inspired by Ray Dalio's Changing World Order framework, not an official index. Scoring year: ${model.year}.`
          : "This is Ezana's own ranking, inspired by Ray Dalio's Changing World Order framework, not an official index.",
      ],
    },
    cta: { href: '/auth/login', label: 'Explore in the app' },
    activeCategory: 'lighthouse',
    activeItem: 'Global Empire Rankings',
    ticker: available
      ? { items: tickerItems, onSelect: onTicker, ariaLabel: 'Composite ranking' }
      : undefined,
  };

  return (
    <>
      <Suspense fallback={null}>
        <QuerySync onChange={onQuery} />
      </Suspense>
      <DatasetDashboard config={config}>
        {available ? (
          <>
            <section
              id="dimensions"
              ref={dimsRef}
              className="gerx-section gerx-dims"
              aria-labelledby="gerx-dims-title"
            >
              <h2 className="mkt-section-title" id="gerx-dims-title">
                Every dimension
              </h2>
              <nav className="gerx-pills" aria-label="Power dimension">
                {groups.map((g) => (
                  <div key={g.category} className="gerx-pill-group">
                    <span className="gerx-label gerx-pill-cat">{g.category}</span>
                    <div className="gerx-pill-row">
                      {g.dims.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          className={`gerx-pill${d.id === selectedId ? ' is-active' : ''}`}
                          aria-pressed={d.id === selectedId}
                          onClick={() => pickDim(d.id, false)}
                        >
                          {d.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
              {selectedDim ? (
                <div id={`dim-${selectedDim.id}`} className="gerx-dimtable">
                  <p className="mkt-ds-sample-note">
                    {selectedDim.name} · {selectedDim.category} · {dimRows.length} countries ·{' '}
                    {selectedDim.higher_is_better === false
                      ? 'lower raw values score higher'
                      : 'higher raw values score higher'}{' '}
                    · {model.year}
                  </p>
                  <DatasetTable
                    columns={[
                      { key: 'rank', label: 'Rank', mono: true },
                      { key: 'country', label: 'Country', render: countryCell },
                      {
                        key: 'score',
                        label: 'Score (0 to 100)',
                        align: 'right',
                        mono: true,
                        render: (v) => v.toFixed(1),
                      },
                    ]}
                    rows={dimRows}
                    emptyText="No country is scored on this dimension yet."
                    onRowClick={(row) => openCountry(row.iso)}
                    isRowClickable={() => true}
                    getRowLabel={(row) => `Open ${row.country}`}
                    rowClassName={isSearched}
                    ariaLabel={`${selectedDim.name} table`}
                  />
                </div>
              ) : null}
            </section>

            {profile ? (
              <CountryPanel
                model={model}
                profile={profile}
                panelRef={panelRef}
                onClose={() => writeQuery({ country: null })}
                onPickDim={(id) => pickDim(id, true)}
              />
            ) : null}

            {model.countries.length > 1 ? (
              <Compare
                model={model}
                defaultA={profile?.iso || compositeRows[0]?.iso}
                defaultB={
                  (profile?.iso === compositeRows[0]?.iso
                    ? compositeRows[1]?.iso
                    : compositeRows[0]?.iso) || model.countries[1]?.iso
                }
              />
            ) : null}

            {model.pendingDims.length ? (
              <section className="gerx-section" aria-labelledby="gerx-pending">
                <h2 className="mkt-section-title" id="gerx-pending">
                  Pending dimensions
                </h2>
                <p className="gerx-pending">
                  {model.pendingDims.map((d) => d.name).join(', ')}. Not scored until a sourced
                  series is wired; sources pending include the IMF, SIPRI, the World Justice
                  Project, Transparency International and V-Dem.
                </p>
              </section>
            ) : null}
          </>
        ) : (
          <div className="gerx-unavailable" role="status">
            <i className="bi bi-arrow-repeat" aria-hidden="true" />
            <p>Rankings are refreshing. Scores load from the World Bank every Monday.</p>
          </div>
        )}
        {datasets}
      </DatasetDashboard>
    </>
  );
}
