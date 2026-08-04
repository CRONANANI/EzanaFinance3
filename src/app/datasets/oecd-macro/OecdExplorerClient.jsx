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
import { OECD_LENSES, OECD_SERIES_BY_SLUG, OECD_CURATED_SLUGS } from '@/lib/oecd-curated';
import OecdMacroClient from './OecdMacroClient';
import { buildModel, allSlugsForLens, slugsForLens, lensLabel } from './oecd-explorer-model';
import OecdAggregates from './OecdAggregates';
import OecdMatrix from './OecdMatrix';
import OecdRanking from './OecdRanking';
import OecdRadar from './OecdRadar';
import OecdProfile from './OecdProfile';
import OecdHistory from './OecdHistory';
import OecdEras from './OecdEras';
import './oecd-explorer.css';

const DEFAULTS = {
  lens: 'all',
  ind: 'eo-gdpv_annpct',
  a: 'USA',
  b: 'CHN',
  pins: [],
  win: 1961,
  showAll: false,
};

const WINDOWS = [1961, 1990, 2005];

const LENS_PILLS = [{ id: 'all', label: 'All' }, ...OECD_LENSES];

function parsePins(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 4);
}

function ExplorerInner({ latest }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const model = useMemo(() => buildModel(latest), [latest]);
  const countryIsos = useMemo(() => new Set(model.countries.map((c) => c.iso)), [model]);

  // ── State, hydrated from the URL on first render ──────────────────────────
  const [lens, setLens] = useState(() => {
    const v = searchParams.get('lens');
    return LENS_PILLS.some((l) => l.id === v) ? v : DEFAULTS.lens;
  });
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
    if (lens !== DEFAULTS.lens) p.set('lens', lens);
    if (ind !== DEFAULTS.ind) p.set('ind', ind);
    if (a !== DEFAULTS.a) p.set('a', a);
    if (b !== DEFAULTS.b) p.set('b', b);
    if (pins.length) p.set('pins', pins.join(','));
    if (win !== DEFAULTS.win) p.set('win', String(win));
    if (showAll) p.set('showAll', '1');
    const qs = p.toString();
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  }, [lens, ind, a, b, pins, win, showAll, router]);

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

      {/* Lens pills */}
      <nav className="oecd-lenses" aria-label="Indicator lens">
        {LENS_PILLS.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`oecd-lens-pill ${l.id === lens ? 'is-active' : ''}`}
            aria-pressed={l.id === lens}
            onClick={() => onLens(l.id)}
          >
            {l.label}
          </button>
        ))}
        <span className="oecd-lens-caption">{lensLabel(lens)}</span>
      </nav>

      <OecdMatrix
        model={model}
        slugs={matrixSlugs}
        lens={lens}
        ind={ind}
        selectedA={a}
        query={q}
        onPickIndicator={setInd}
        onPickCountry={setA}
      />

      <OecdRanking
        model={model}
        slug={ind}
        series={series}
        selectedA={a}
        showAll={showAll}
        onToggleShowAll={() => setShowAll((v) => !v)}
        onPickCountry={setA}
      />

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
        />
        <OecdProfile model={model} a={a} ind={ind} onPickIndicator={setInd} />
      </section>

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

export default function OecdExplorerClient({ latest }) {
  return (
    <Suspense fallback={<div className="oecd-page oecd-suspense" aria-busy="true" />}>
      <ExplorerInner latest={latest} />
    </Suspense>
  );
}
