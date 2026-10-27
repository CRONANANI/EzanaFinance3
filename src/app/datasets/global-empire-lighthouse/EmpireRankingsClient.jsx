'use client';

/**
 * Global Empire Rankings (/datasets/global-empire-lighthouse), client side.
 *
 * Laid out like the retired in-app page (/empire-ranking, now a redirect
 * here): the gold-on-dark .er-page shell, a centred .er-hero with the back
 * link and a status badge, the ?layers= banner from the Global Power Map, and
 * a two-column .er-grid of .er-card cards with header toggle chips: Global
 * Power Rankings, Country Scorecards, Power Dimension Comparison, then a
 * spotlight card per live headline dimension, every dimension's table, the
 * composite table, pending dimensions and the method. The card shell and
 * controls are shared with Centaur Intelligence
 * (src/components/empire-ranking/).
 *
 * What changed from the old page is the data, not the look: every number
 * comes from the shared empire model (buildEmpireModel and its helpers)
 * through empire-rankings-model.js. The old page's mock cards (synthesized
 * Big Cycle shapes, hand-typed debt, military and reserve-currency figures,
 * emoji flags and trajectories) have no live source, so they are not
 * restored; their section ids live on as spotlight cards for the live
 * dimension that measures the same thing. With no live scores the page shows
 * one calm unavailable card and the datasets.
 *
 * URL: ?dim=<id> selects a dimension, ?country=<ISO3> highlights that country
 * and opens its panel, ?layers= (from the Market Analysis "Show me data"
 * button) maps to a dimension through LAYER_TO_DIM. The query is read in a
 * small Suspense-wrapped sync component so the rest of the page still renders
 * on the server.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DatasetTable, EntityName } from '@/components/marketing/DatasetTable';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import {
  CardControls,
  ToggleChips,
  ToggleSelect,
  useEmpireChartTokens,
} from '@/components/empire-ranking/card-controls';
import { useCardConfig } from '@/hooks/useCardConfig';
import { CHART } from '@/lib/chart-theme';
import { DIMENSION_OPTIONS } from '@/lib/empire-dimension-groups';
import { buildEmpireModel, empireAxesForFocus } from '../oecd-macro/oecd-empire-model';
import {
  PAGE_PATH,
  SCOPE_OPTIONS,
  SPOTLIGHTS,
  applyScope,
  compositeTableRows,
  countryProfile,
  dimHref,
  dimensionTableRows,
  groupDimsByCategory,
  pairRows,
  rankedBars,
  resolveEmpireQuery,
} from './empire-rankings-model';
import '@/components/empire-ranking/er-cards.css';

const DASH = '–';

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};
const shortName = (name) => (name.length > 16 ? `${name.slice(0, 14)}…` : name);
const scopeLabel = (v) => SCOPE_OPTIONS.find((s) => s.value === v)?.label ?? 'World';

const TOPN_OPTIONS = [
  { value: 5, label: 'Top 5' },
  { value: 10, label: 'Top 10' },
  { value: 99, label: 'All' },
];
const SORT_OPTIONS = [
  { value: 'desc', label: 'Strongest' },
  { value: 'asc', label: 'Weakest' },
];
const SCORECARD_SORTS = [
  { value: 'rank', label: 'Rank' },
  { value: 'name', label: 'Name' },
  { value: 'coverage', label: 'Coverage' },
];

/* The old page's bar tiers: gold for #1, emerald for the podium, then two
   quieter tiers. Tokens only (the old page had raw indigo and grey). */
const barFill = (i) =>
  i === 0
    ? 'var(--gold-champagne)'
    : i < 3
      ? 'var(--emerald)'
      : i < 6
        ? 'var(--chart-cat-4)'
        : 'var(--chart-cat-8)';

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

/* The ?layers= banner, as on the old page: which Global Power Map layers the
   reader arrived with. Dismissible; reappears when the layers change. */
function LayersBanner() {
  const sp = useSearchParams();
  const raw = sp?.get('layers') || '';
  const layers = useMemo(
    () =>
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [raw],
  );
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => setDismissed(false), [raw]);
  if (!layers.length || dismissed) return null;
  return (
    <div className="er-layers-from-map-banner" role="status">
      <div>
        <p className="er-layers-from-map-title">
          Showing data for your selected Global Power Map layers
        </p>
        <div className="er-layers-from-map-tags">
          {layers.map((layer) => (
            <span key={layer} className="er-layers-from-map-tag">
              {layer.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="er-layers-from-map-dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <i className="bi bi-x-lg" aria-hidden="true" />
      </button>
    </div>
  );
}

function SearchedTag() {
  return <span className="hdc-you gerx-you">Your search</span>;
}

/* The old page's card shell. */
function Card({ icon, title, subtitle, children, wide, actions, className = '', id, cardRef }) {
  return (
    <section
      id={id || undefined}
      ref={cardRef}
      className={`er-card${wide ? ' er-card--wide' : ''} ${className}`.trim()}
    >
      <div className="er-card-header">
        <div className="er-card-header-left">
          <i className={`bi ${icon}`} aria-hidden="true" />
          <div>
            <h3>{title}</h3>
            {subtitle ? <p className="er-card-subtitle">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="er-card-actions">{actions}</div> : null}
      </div>
      <div className="er-card-body">{children}</div>
    </section>
  );
}

/* Horizontal bar ranking, the old Global Power Rankings chart. Clicking a bar
   opens that country. */
function RankBars({ data, domainMax = 100, onPick, tokens }) {
  if (!data.length) return <div className="er-empty">No countries in the selected scope.</div>;
  return (
    <div className="gerx-er-bars" style={{ height: Math.max(220, data.length * 34 + 40) }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid
            strokeDasharray={CHART.gridDash}
            stroke={tokens.grid}
            horizontal={false}
            vertical={false}
          />
          <XAxis
            type="number"
            domain={[0, domainMax]}
            tick={CHART.tick}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: tokens.axisTickEmphasis, fontSize: 11, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            width={56}
          />
          <Tooltip
            contentStyle={tokens.tooltipStyle}
            cursor={{ fill: tokens.grid }}
            formatter={(v, _n, p) => [Number(v).toFixed(1), p.payload.fullName]}
            labelFormatter={(_l, p) => {
              const r = p?.[0]?.payload;
              return r?.rank != null ? `#${r.rank}` : '';
            }}
          />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
            cursor="pointer"
            onClick={(d) => onPick?.(d?.iso)}
          >
            {data.map((entry, i) => (
              <Cell key={entry.iso} fill={barFill(i)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── cards ─────────────────────────────────────────────────────────────── */

function PowerRankingsCard({ rows, year, liveCount, onPick, tokens }) {
  const [cfg, setCfg] = useCardConfig('power-rankings', {
    scope: 'world',
    topN: 10,
    direction: 'desc',
  });
  const data = useMemo(() => rankedBars(rows, { ...cfg, valueKey: 'composite' }), [rows, cfg]);
  return (
    <Card
      id="section-economic-power"
      icon="bi-trophy"
      title="Global Power Rankings"
      subtitle={`Composite empire score (0 to 100) · ${liveCount} live dimensions · ${scopeLabel(cfg.scope)} · ${year}`}
      wide
      actions={
        <CardControls>
          <ToggleChips
            label="Scope"
            options={SCOPE_OPTIONS}
            value={cfg.scope}
            onChange={(v) => setCfg({ scope: v })}
          />
          <ToggleChips
            label="Show"
            options={TOPN_OPTIONS}
            value={cfg.topN}
            onChange={(v) => setCfg({ topN: v })}
          />
          <ToggleChips
            label="Sort"
            options={SORT_OPTIONS}
            value={cfg.direction}
            onChange={(v) => setCfg({ direction: v })}
          />
        </CardControls>
      }
    >
      <RankBars data={data} onPick={onPick} tokens={tokens} />
    </Card>
  );
}

function ScorecardGrid({ rows, onPick, searched }) {
  const [cfg, setCfg] = useCardConfig('scorecards', { scope: 'world', sort: 'rank' });
  const cards = useMemo(() => {
    const ranked = applyScope(
      rows.filter((r) => r.rank != null),
      cfg.scope,
    );
    if (cfg.sort === 'name') return [...ranked].sort((a, b) => a.country.localeCompare(b.country));
    if (cfg.sort === 'coverage')
      return [...ranked].sort((a, b) => b.present - a.present || a.rank - b.rank);
    return ranked;
  }, [rows, cfg.scope, cfg.sort]);
  return (
    <Card
      icon="bi-grid-3x3-gap"
      title="Country Scorecards"
      subtitle={`${cards.length} ranked ${scopeLabel(cfg.scope)} countries · sorted by ${
        SCORECARD_SORTS.find((s) => s.value === cfg.sort)?.label ?? 'Rank'
      }`}
      wide
      actions={
        <CardControls>
          <ToggleChips
            label="Scope"
            options={SCOPE_OPTIONS}
            value={cfg.scope}
            onChange={(v) => setCfg({ scope: v })}
          />
          <ToggleChips
            label="Sort by"
            options={SCORECARD_SORTS}
            value={cfg.sort}
            onChange={(v) => setCfg({ sort: v })}
          />
        </CardControls>
      }
    >
      {cards.length === 0 ? (
        <div className="er-empty">No ranked countries in the selected scope.</div>
      ) : (
        <div className="er-scorecard-grid gerx-er-scorecards">
          {cards.map((c) => (
            <button
              key={c.iso}
              type="button"
              className={`er-scorecard gerx-er-scorecard${searched === c.iso ? ' is-searched' : ''}`}
              onClick={() => onPick(c.iso)}
              aria-label={`Open ${c.country}, ranked ${ordinal(c.rank)}`}
            >
              <div className="er-scorecard-header">
                <span className="er-scorecard-flag gerx-er-iso" aria-hidden="true">
                  {c.iso}
                </span>
                <div>
                  <div className="er-scorecard-name">{c.country}</div>
                  <div className="er-scorecard-code">
                    {c.present}/{c.live} dims
                  </div>
                </div>
                <span className="er-scorecard-rank">#{c.rank}</span>
              </div>
              <div className="er-scorecard-score-row">
                <div className="er-scorecard-score">{c.composite.toFixed(1)}</div>
              </div>
              <div className="er-scorecard-bar-track">
                <div className="er-scorecard-bar-fill" style={{ width: `${c.composite}%` }} />
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function PowerDimensionRadar({ model, defaultA, defaultB, tokens }) {
  const [cfg, setCfg] = useCardConfig('power-radar', {
    countryA: defaultA,
    countryB: defaultB,
    dimensionGroup: 'all',
  });
  const known = (iso) => iso && model.scoreMap.has(iso);
  const a = known(cfg.countryA) ? cfg.countryA : defaultA;
  const b = known(cfg.countryB) ? cfg.countryB : defaultB;
  const nameA = model.nameByCode.get(a) || a;
  const nameB = model.nameByCode.get(b) || b;

  const axes = useMemo(
    () => new Set(empireAxesForFocus(model, cfg.dimensionGroup).map((d) => d.id)),
    [model, cfg.dimensionGroup],
  );
  const data = useMemo(
    () =>
      pairRows(model, a, b)
        .filter((r) => axes.has(r.id))
        .map((r) => ({ dimension: shortName(r.name), full: r.name, a: r.a, b: r.b })),
    [model, a, b, axes],
  );
  const countryOptions = useMemo(
    () => model.countries.map((c) => ({ value: c.iso, label: c.name })),
    [model],
  );
  const focusOptions = DIMENSION_OPTIONS.map((o) =>
    o.value === 'all' ? { ...o, label: `All ${model.liveDims.length}` } : o,
  );

  return (
    <Card
      id="section-energy-power"
      icon="bi-diagram-3"
      title="Power Dimension Comparison"
      subtitle={`Head-to-head across ${data.length} live dimensions · score 0 to 100, outward is stronger · ${model.year}`}
      wide
      actions={
        <CardControls>
          <ToggleSelect
            label="A"
            options={countryOptions}
            value={a}
            onChange={(v) => setCfg({ countryA: v })}
          />
          <ToggleSelect
            label="B"
            options={countryOptions}
            value={b}
            onChange={(v) => setCfg({ countryB: v })}
          />
          <ToggleChips
            label="Focus"
            options={focusOptions}
            value={cfg.dimensionGroup}
            onChange={(v) => setCfg({ dimensionGroup: v })}
          />
        </CardControls>
      }
    >
      {data.length < 3 ? (
        <div className="er-empty">
          Fewer than three live dimensions in this focus. Pick another focus.
        </div>
      ) : (
        <div className="gerx-er-radar">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid stroke={tokens.gridStrong} />
              <PolarAngleAxis dataKey="dimension" tick={CHART.tick} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              <Radar
                name={nameA}
                dataKey="a"
                stroke={CHART.goldStroke}
                fill={CHART.goldStroke}
                fillOpacity={0.18}
                strokeWidth={CHART.primaryStrokeWidth}
                isAnimationActive={false}
              />
              <Radar
                name={nameB}
                dataKey="b"
                stroke={CHART.primaryStroke}
                fill={CHART.primaryStroke}
                fillOpacity={0.18}
                strokeWidth={CHART.primaryStrokeWidth}
                isAnimationActive={false}
              />
              <Legend wrapperStyle={{ fontSize: '0.7rem', color: tokens.legend }} />
              <Tooltip
                contentStyle={tokens.tooltipStyle}
                labelFormatter={(_l, p) => p?.[0]?.payload?.full || ''}
                formatter={(v, n) => [v == null ? DASH : Number(v).toFixed(1), n]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

/* One live headline dimension, ranked: the half-width cards where the old
   page had its hand-typed Debt Cycle, Military and Reserve Currency cards. */
function SpotlightCard({ spot, dim, model, onPick, tokens, wide = false }) {
  const [cfg, setCfg] = useCardConfig(`spotlight-${dim.id}`, {
    scope: 'world',
    topN: 10,
    direction: 'desc',
  });
  const rows = useMemo(() => dimensionTableRows(model, dim), [model, dim]);
  const data = useMemo(() => rankedBars(rows, { ...cfg, valueKey: 'score' }), [rows, cfg]);
  return (
    <Card
      id={spot.section}
      icon={spot.icon}
      title={dim.name}
      wide={wide}
      subtitle={`${rows.length} countries · ${
        dim.higher_is_better === false ? 'lower raw values score higher' : 'score 0 to 100'
      } · ${scopeLabel(cfg.scope)} · ${model.year}`}
      actions={
        <CardControls>
          <ToggleSelect
            label="Scope"
            options={SCOPE_OPTIONS}
            value={cfg.scope}
            onChange={(v) => setCfg({ scope: v })}
          />
          <ToggleChips
            label="Show"
            options={TOPN_OPTIONS.slice(0, 2)}
            value={cfg.topN}
            onChange={(v) => setCfg({ topN: v })}
          />
          <ToggleChips
            label="Sort"
            options={SORT_OPTIONS}
            value={cfg.direction}
            onChange={(v) => setCfg({ direction: v })}
          />
        </CardControls>
      }
    >
      <RankBars data={data} onPick={onPick} tokens={tokens} />
    </Card>
  );
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

function CountryRadar({ rows, nameA, nameB, tokens }) {
  if (rows.length < 3) return null;
  const data = rows.map((r) => ({ dimension: shortName(r.name), full: r.name, a: r.a, b: r.b }));
  return (
    <figure className="gerx-radar" aria-label={`${nameA} against ${nameB} on every live dimension`}>
      <div className="gerx-radar-box">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke={tokens.gridStrong} />
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
              contentStyle={tokens.tooltipStyle}
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

function CountryPanel({ model, profile, onClose, onPickDim, panelRef, tokens }) {
  const vsIso = profile.leaderIso === profile.iso ? profile.runnerUpIso : profile.leaderIso;
  const vsName = vsIso ? model.nameByCode.get(vsIso) || vsIso : null;
  const vsLabel = vsName
    ? profile.leaderIso === profile.iso
      ? `${vsName} (2nd)`
      : `${vsName} (1st)`
    : null;
  const rows = useMemo(() => pairRows(model, profile.iso, vsIso), [model, profile.iso, vsIso]);
  return (
    <Card
      cardRef={panelRef}
      icon="bi-geo-alt"
      title={profile.name}
      subtitle={
        profile.rank != null
          ? `${ordinal(profile.rank)} of ${profile.of} on the composite · score ${profile.composite.toFixed(1)} · ${profile.present} of ${profile.live} live dimensions · ${profile.year}`
          : `Not ranked on the composite: too few live dimensions · ${profile.present} of ${profile.live} live dimensions · ${profile.year}`
      }
      wide
      className="gerx-er-panel"
      actions={
        <button type="button" className="gerx-close" onClick={onClose} aria-label="Close country">
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      }
    >
      <div className="gerx-panel-body">
        {vsLabel ? (
          <CountryRadar rows={rows} nameA={profile.name} nameB={vsLabel} tokens={tokens} />
        ) : null}
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
    </Card>
  );
}

/* ── page ──────────────────────────────────────────────────────────────── */

export default function EmpireRankingsClient({ empire, datasets = null }) {
  const router = useRouter();
  const tokens = useEmpireChartTokens();
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
  const spotlights = useMemo(() => {
    if (!model) return [];
    const live = new Map(model.liveDims.map((d) => [d.id, d]));
    return SPOTLIGHTS.filter((s) => live.has(s.dimId)).map((s) => ({
      spot: s,
      dim: live.get(s.dimId),
    }));
  }, [model]);

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

  /* The dataset chrome's green ticker strip, as on every /datasets page. */
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
  usePublishTicker({
    items: available ? tickerItems : undefined,
    onSelect: onTicker,
    ariaLabel: 'Composite ranking',
  });

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
  const rankedCount = compositeRows.filter((r) => r.rank != null).length;
  const radarA = compositeRows[0]?.iso || model?.countries[0]?.iso || null;
  const radarB = compositeRows[1]?.iso || model?.countries[1]?.iso || radarA;

  return (
    <div className="dsx-page">
      <Suspense fallback={null}>
        <QuerySync onChange={onQuery} />
      </Suspense>
      <div className="dsx-main er-page gerx-er">
        <header className="er-hero">
          <div className="er-hero-left">
            <Link href="/market-analysis" className="er-back-link">
              <i className="bi bi-arrow-left" aria-hidden="true" /> Back to Global Market Analysis
            </Link>
            <div className="er-hero-title-row">
              <div className="er-hero-icon">
                <i className="bi bi-globe-americas" aria-hidden="true" />
              </div>
              <div>
                <h1>Global Empire Rankings</h1>
                <p className="er-hero-sub">
                  Quantitative empire scoring inspired by Ray Dalio&apos;s{' '}
                  <em>Changing World Order</em> framework.{' '}
                  {available
                    ? `Power measured across ${liveCount} of ${totalCount} dimensions for ${rankedCount} ranked countries, built only from sourced data.`
                    : 'Built only from sourced data.'}
                </p>
              </div>
            </div>
          </div>
          <div className="er-hero-badge">
            {available
              ? `LIVE · ${liveCount}/${totalCount} DIMENSIONS · ${model.year}`
              : 'REFRESHING'}
          </div>
        </header>

        <Suspense fallback={null}>
          <LayersBanner />
        </Suspense>

        {available ? (
          <div className="er-grid">
            <PowerRankingsCard
              rows={compositeRows}
              year={model.year}
              liveCount={liveCount}
              onPick={openCountry}
              tokens={tokens}
            />

            {profile ? (
              <CountryPanel
                model={model}
                profile={profile}
                panelRef={panelRef}
                tokens={tokens}
                onClose={() => writeQuery({ country: null })}
                onPickDim={(id) => pickDim(id, true)}
              />
            ) : null}

            <ScorecardGrid rows={compositeRows} onPick={openCountry} searched={query.country} />

            {radarA ? (
              <PowerDimensionRadar
                model={model}
                defaultA={radarA}
                defaultB={radarB}
                tokens={tokens}
              />
            ) : null}

            {spotlights.map(({ spot, dim }, i) => (
              <SpotlightCard
                key={dim.id}
                spot={spot}
                dim={dim}
                model={model}
                onPick={openCountry}
                tokens={tokens}
                /* an odd last card spans the row, like the old wide cards */
                wide={spotlights.length % 2 === 1 && i === spotlights.length - 1}
              />
            ))}

            <Card
              id="dimensions"
              cardRef={dimsRef}
              icon="bi-list-ol"
              title="Every Dimension"
              subtitle={
                selectedDim
                  ? `${selectedDim.name} · ${selectedDim.category} · ${dimRows.length} countries · ${
                      selectedDim.higher_is_better === false
                        ? 'lower raw values score higher'
                        : 'higher raw values score higher'
                    } · ${model.year}`
                  : `${liveCount} live dimensions`
              }
              wide
            >
              <nav className="gerx-pills" aria-label="Power dimension">
                {groups.map((g) => (
                  <div key={g.category} className="gerx-pill-group">
                    <span className="er-control-label">{g.category}</span>
                    <div className="er-chip-group">
                      {g.dims.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          className={`er-chip${d.id === selectedId ? ' er-chip--active' : ''}`}
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
            </Card>

            <Card
              id="composite"
              icon="bi-table"
              title="Composite Ranking"
              subtitle={`Scoring year ${model.year} · a country needs scores on at least 70% of the live dimensions to be ranked; the rest follow, unranked`}
              wide
            >
              <DatasetTable
                columns={[
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
                ]}
                rows={compositeRows}
                emptyText="No country carries a live score yet."
                onRowClick={(row) => openCountry(row.iso)}
                isRowClickable={() => true}
                getRowLabel={(row) => `Open ${row.country}`}
                rowClassName={isSearched}
                ariaLabel="Composite ranking table"
              />
            </Card>

            {model.pendingDims.length ? (
              <Card
                icon="bi-hourglass-split"
                title="Pending Dimensions"
                subtitle={`${model.pendingDims.length} of ${totalCount} not scored yet`}
                wide
              >
                <p className="gerx-pending">
                  {model.pendingDims.map((d) => d.name).join(', ')}. Not scored until a sourced
                  series is wired; sources pending include the IMF, SIPRI, the World Justice
                  Project, Transparency International and V-Dem.
                </p>
              </Card>
            ) : null}

            <Card icon="bi-info-circle" title="How We Score It" wide>
              <div className="gerx-er-method">
                <p>
                  Every score is built from the World Bank Indicators API (CC BY 4.0), loaded
                  weekly. Each live dimension is a weighted blend of the World Bank metrics mapped
                  to it, normalized 0 to 100 across the ranked countries, with metrics where lower
                  is better (debt, inflation, inequality, energy use per unit of output) inverted so
                  a higher score always means stronger.
                </p>
                <p>
                  The composite is the mean of a country&rsquo;s live dimension scores, and a
                  country needs scores on at least 70% of the live dimensions to be ranked.
                  Dimensions without a sourced series yet are listed as pending and never scored.
                </p>
                <p>
                  This is Ezana&apos;s own ranking, inspired by Ray Dalio&apos;s Changing World
                  Order framework, not an official index. Scoring year: {model.year}.
                </p>
              </div>
            </Card>
          </div>
        ) : (
          <div className="er-card gerx-unavailable" role="status">
            <i className="bi bi-arrow-repeat" aria-hidden="true" />
            <p>Rankings are refreshing. Scores load from the World Bank every Monday.</p>
          </div>
        )}

        {datasets}
      </div>
    </div>
  );
}
