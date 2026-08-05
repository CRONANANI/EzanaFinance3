'use client';

/**
 * OECD Explorer — wireframe 3a. Selection-driven macro explorer that bypasses
 * DatasetDashboard (as Government Contracts does) and composes the shared page
 * chrome (CategoryBar) with bespoke sections: aggregates strip → lens pills →
 * heatmap matrix → ranking → radar + profile → 1961–2025 history → eras.
 *
 * All drill state (lens → indicator → country A/B → pins → window) lives in the
 * URL so a view is shareable and restores on load. When the live rollup is empty
 * the page falls back to the honest static sample (OecdMacroClient) unchanged.
 *
 * Every value shown comes from Supabase (via `latest` / the history API). Nothing
 * is synthesized — a missing figure renders as an em-dash or a broken line.
 */
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CategoryBar from '@/components/datasets/CategoryBar';
import { OECD_SERIES_BY_SLUG, OECD_CURATED_SLUGS } from '@/lib/oecd-curated';
import OecdMacroClient from './OecdMacroClient';
import { buildModel, allSlugsForLens, slugsForLens } from './oecd-explorer-model';
import OecdAggregates from './OecdAggregates';
import OecdMatrix from './OecdMatrix';
import OecdRanking from './OecdRanking';
import OecdRadar from './OecdRadar';
import OecdProfile from './OecdProfile';
import OecdHistory from './OecdHistory';
import OecdEras from './OecdEras';
import OecdModeToggle from './OecdModeToggle';
import OecdEmpireRanking from './OecdEmpireRanking';
import OecdLensPills from './OecdLensPills';
import OecdDimensionPills from './OecdDimensionPills';
import { buildEmpireModel } from './oecd-empire-model';
import { buildEmpireMatrixModel } from './oecd-empire-matrix-model';
import './oecd-explorer.css';

const DEFAULTS = {
  lens: 'all',
  ind: 'eo-gdpv_annpct',
  a: 'USA',
  b: 'CHN',
  pins: [],
  win: 1961,
  showAll: false,
  mode: 'oecd',
  focus: 'all',
};

const MODES = ['oecd', 'empire'];
const FOCI = ['all', 'economic', 'military', 'social'];
const DEFAULT_DIM = 'all';

const WINDOWS = [1961, 1990, 2005];

function parsePins(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 4);
}

function ExplorerInner({ latest, empire, empireMatrix }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const model = useMemo(() => buildModel(latest), [latest]);
  const countryIsos = useMemo(() => new Set(model.countries.map((c) => c.iso)), [model]);

  // Empire backbone (live-only; null when unsynced/unavailable). Country options
  // in empire mode = the intersection with the OECD payload, so both modes always
  // have both selected countries.
  const empireModel = useMemo(() => buildEmpireModel(empire), [empire]);

  // Empire-dimension MATRIX payload (phase 5). When present, the page pills become
  // the 18 dimensions and the matrix shows scores/metrics; when null the matrix
  // falls back to the OECD-lens form and the page pills stay the six lenses.
  const empireMatrixModel = useMemo(() => buildEmpireMatrixModel(empireMatrix), [empireMatrix]);
  const hasDimMatrix = !!empireMatrixModel;
  const empireCountries = useMemo(() => {
    if (!empireModel) return [];
    return empireModel.countries.filter((c) => countryIsos.has(c.iso));
  }, [empireModel, countryIsos]);

  // ── State, hydrated from the URL on first render ──────────────────────────
  // `dim` (empire matrix) replaces `lens` in the URL. An incoming legacy `lens=`
  // param is intentionally ignored (phase-5 migration) so old deep links don't
  // crash — lens is now a local control inside the radar card.
  const [dim, setDim] = useState(() => searchParams.get('dim') || DEFAULT_DIM);
  const [lens, setLens] = useState(DEFAULTS.lens);
  const [ind, setInd] = useState(() => {
    const v = searchParams.get('ind');
    return OECD_CURATED_SLUGS.includes(v) ? v : DEFAULTS.ind;
  });
  const [a, setA] = useState(() => searchParams.get('a') || DEFAULTS.a);
  const [b, setB] = useState(() => searchParams.get('b') || DEFAULTS.b);
  const [pins, setPins] = useState(() => parsePins(searchParams.get('pins')));
  const [win, setWin] = useState(() => {
    const v = Number(searchParams.get('win'));
    return WINDOWS.includes(v) ? v : DEFAULTS.win;
  });
  const [showAll, setShowAll] = useState(() => searchParams.get('showAll') === '1');
  const [q, setQ] = useState(''); // matrix country filter (not URL-synced — ephemeral)
  const [mode, setMode] = useState(() => {
    const v = searchParams.get('mode');
    return MODES.includes(v) ? v : DEFAULTS.mode;
  });
  const [focus, setFocus] = useState(() => {
    const v = searchParams.get('focus');
    return FOCI.includes(v) ? v : DEFAULTS.focus;
  });

  // Clamp A/B to countries that actually exist in the payload (defaults CHN/USA
  // may be absent from a given EO vintage). Runs once the model is known.
  useEffect(() => {
    if (model.countries.length === 0) return;
    setA((cur) => (countryIsos.has(cur) ? cur : model.countries[0].iso));
    setB((cur) => (countryIsos.has(cur) ? cur : model.countries[1]?.iso || model.countries[0].iso));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, countryIsos]);

  // ── URL sync (shareable, scroll-preserving) ───────────────────────────────
  useEffect(() => {
    const p = new URLSearchParams();
    if (dim !== DEFAULT_DIM) p.set('dim', dim);
    if (ind !== DEFAULTS.ind) p.set('ind', ind);
    if (a !== DEFAULTS.a) p.set('a', a);
    if (b !== DEFAULTS.b) p.set('b', b);
    if (pins.length) p.set('pins', pins.join(','));
    if (win !== DEFAULTS.win) p.set('win', String(win));
    if (showAll) p.set('showAll', '1');
    if (mode !== DEFAULTS.mode) p.set('mode', mode);
    if (focus !== DEFAULTS.focus) p.set('focus', focus);
    const qs = p.toString();
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  }, [dim, ind, a, b, pins, win, showAll, mode, focus, router]);

  // ── Mode switch: entering empire mode clamps A/B into the intersection so both
  // selected countries carry empire scores. ────────────────────────────────────
  const onMode = useCallback(
    (next) => {
      setMode(next);
      if (next === 'empire' && empireCountries.length) {
        const isos = new Set(empireCountries.map((c) => c.iso));
        const pick = (want, idx) =>
          empireCountries.find((c) => c.iso === want)?.iso ||
          empireCountries[idx]?.iso ||
          empireCountries[0].iso;
        setA((cur) => (isos.has(cur) ? cur : pick('USA', 0)));
        setB((cur) => (isos.has(cur) ? cur : pick('CHN', 1)));
      }
    },
    [empireCountries],
  );

  // ── Lens switching: reset indicator when it leaves the lens ───────────────
  const onLens = useCallback((nextLens) => {
    setLens(nextLens);
    if (nextLens === 'all') return; // 'all' never resets the indicator
    setInd((cur) => {
      const set = allSlugsForLens(nextLens);
      return set.includes(cur) ? cur : set[0];
    });
  }, []);

  const togglePin = useCallback(
    (iso) => {
      setPins((cur) => {
        if (cur.includes(iso)) return cur.filter((p) => p !== iso);
        if (iso === a || iso === b) return cur; // A/B aren't pinnable
        const next = [...cur, iso];
        // Max 4 pins — oldest drops when a 5th is added.
        return next.length > 4 ? next.slice(next.length - 4) : next;
      });
    },
    [a, b],
  );

  // ── Fallback: no live data → the honest static sample ─────────────────────
  const isLive = Array.isArray(latest) && latest.length > 0 && model.countries.length > 0;
  if (!isLive) {
    return <OecdMacroClient latest={latest} />;
  }

  const series = OECD_SERIES_BY_SLUG[ind];
  const matrixSlugs = slugsForLens(lens);

  return (
    <div className="oecd-page">
      <CategoryBar active="lighthouse" activeItem="OECD Macro Data" />

      <header className="oecd-header">
        <div className="oecd-header-strip">
          <h1 className="oecd-title">OECD Economic Outlook</h1>
          <span className="oecd-header-stats oecd-num">
            {model.countries.length} COUNTRIES · {OECD_CURATED_SLUGS.length} INDICATORS · 1961–2025
          </span>
          <label className="oecd-search">
            <svg viewBox="0 0 16 16" className="oecd-search-icon" aria-hidden="true">
              <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <line x1="11" y1="11" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <input
              type="search"
              className="oecd-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter countries…"
              aria-label="Filter matrix countries"
            />
          </label>
        </div>
        <OecdAggregates model={model} slug={ind} />
      </header>

      {/* Page pills: 18 empire dimensions when the live matrix payload exists,
          otherwise the six OECD lenses (the fallback drives the OECD matrix). */}
      {hasDimMatrix ? (
        <OecdDimensionPills dimensions={empireMatrixModel.dimensions} dim={dim} onDim={setDim} />
      ) : (
        <OecdLensPills lens={lens} onLens={onLens} />
      )}

      <OecdMatrix
        model={model}
        slugs={matrixSlugs}
        lens={lens}
        ind={ind}
        selectedA={a}
        query={q}
        onPickIndicator={setInd}
        onPickCountry={setA}
        empireMatrix={empireMatrixModel}
        dim={dim}
        empireUnavailable={!hasDimMatrix}
      />

      {mode === 'empire' && !empireModel ? (
        // Honesty rule 5 — live-only surface, no mock fallback. The toggle stays
        // reachable so the user can return to OECD mode.
        <section className="oecd-card oecd-empire-unavailable">
          <div className="oecd-section-head">
            <div className="oecd-section-head-l">
              <span className="oecd-section-tag">EMPIRE DIMENSIONS</span>
              <h2 className="oecd-section-title">Head-to-head</h2>
            </div>
            <OecdModeToggle mode={mode} onMode={onMode} />
          </div>
          <p className="oecd-empire-empty">
            Empire dimension scores are temporarily unavailable. The OECD indicators above remain
            fully available.
          </p>
        </section>
      ) : (
        <>
          {mode === 'oecd' ? (
            <OecdRanking
              model={model}
              slug={ind}
              series={series}
              selectedA={a}
              showAll={showAll}
              onToggleShowAll={() => setShowAll((v) => !v)}
              onPickCountry={setA}
            />
          ) : (
            <OecdEmpireRanking
              model={empireModel}
              focus={focus}
              selectedA={a}
              onPickCountry={setA}
            />
          )}

          <section className="oecd-duo">
            <OecdRadar
              model={model}
              lens={lens}
              a={a}
              b={b}
              ind={ind}
              onChangeA={setA}
              onChangeB={setB}
              onPickIndicator={setInd}
              mode={mode}
              onMode={onMode}
              focus={focus}
              onFocus={setFocus}
              empireModel={empireModel}
              empireCountries={empireCountries}
              onLens={onLens}
              showLensChips={hasDimMatrix}
            />
            <OecdProfile
              model={model}
              a={a}
              ind={ind}
              onPickIndicator={setInd}
              mode={mode}
              empireModel={empireModel}
            />
          </section>
        </>
      )}

      <OecdHistory
        model={model}
        slug={ind}
        series={series}
        a={a}
        b={b}
        pins={pins}
        win={win}
        onChangeWin={setWin}
        onTogglePin={togglePin}
      />

      <OecdEras />
    </div>
  );
}

export default function OecdExplorerClient({ latest, empire = null, empireMatrix = null }) {
  return (
    <Suspense fallback={<div className="oecd-page oecd-suspense" aria-busy="true" />}>
      <ExplorerInner latest={latest} empire={empire} empireMatrix={empireMatrix} />
    </Suspense>
  );
}
