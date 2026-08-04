'use client';

/**
 * Head-to-head radar — two modes on one card (phase 4):
 *  - OECD: country A vs B on the active lens's indicator axes (all 20 when the
 *    lens is 'all'), rank-normalized across countries so outward = stronger
 *    (`inv` handled in normalizeIndicator). Clicking an axis sets the indicator.
 *  - EMPIRE: A vs B on the live Dalio power dimensions in the selected Focus
 *    group. LIVE-ONLY — dimensions without data never become axes; there is no
 *    mock fallback. Scores (0–100) normalize to radius, inverted for
 *    higher_is_better===false so outward = stronger. Axis click is a no-op.
 *    Below the chart: a pending-dimensions disclosure and the coverage badge.
 *    A Focus group with <3 live dimensions renders a compact bar list (a 2-axis
 *    radar is meaningless).
 *
 * One hand-rolled SVG, no chart dependency. Phase-3 interactions (axis/vertex
 * hover tooltip, polygon dim-the-other) apply in both modes.
 */
import { useMemo, useRef, useState } from 'react';
import { OECD_SERIES_BY_SLUG } from '@/lib/oecd-curated';
import { normalizeIndicator, isProjected, formatValue, toNum } from '@/lib/oecd-scales';
import { DIMENSION_OPTIONS } from '@/lib/empire-dimension-groups';
import { allSlugsForLens, columnValues, lensLabel, rankWithin } from './oecd-explorer-model';
import { empireAxesForFocus, normScore } from './oecd-empire-model';
import OecdProjBadge from './OecdProjBadge';
import OecdModeToggle from './OecdModeToggle';
import OecdTip, { tipFromEvent, tipFromElement } from './OecdTip';

const SIZE = 420;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 150;
const MARGIN = 30;
const FLOOR = 0.08;

function point(angleDeg, radius) {
  const a = (angleDeg * Math.PI) / 180;
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
}
const radiusFor = (n) => (n == null ? FLOOR * R : (FLOOR + (1 - FLOOR) * n) * R);
function truncName(name) {
  return name.length > 16 ? `${name.slice(0, 14)}…` : name;
}

export default function OecdRadar({
  model,
  lens,
  a,
  b,
  ind,
  onChangeA,
  onChangeB,
  onPickIndicator,
  // phase-4 additions
  mode = 'oecd',
  onMode,
  focus = 'all',
  onFocus,
  empireModel = null,
  empireCountries = null,
}) {
  const cardRef = useRef(null);
  const [tip, setTip] = useState(null);
  const [hoverAxis, setHoverAxis] = useState(null); // axis key
  const [hoverPoly, setHoverPoly] = useState(null); // 'a' | 'b'

  const isEmpire = mode === 'empire';

  // ── Unified view: axes + colours + selects, computed per mode ──────────────
  const view = useMemo(() => {
    if (isEmpire && empireModel) {
      const dims = empireAxesForFocus(empireModel, focus);
      const scoreOf = (iso, dim) => empireModel.scoreMap.get(iso)?.get(dim.id);
      const axes = dims.map((dim, i) => {
        const rawA = scoreOf(a, dim);
        const rawB = scoreOf(b, dim);
        return {
          key: dim.id,
          short: truncName(dim.name),
          angle: -90 + (360 * i) / dims.length,
          rA: normScore(dim, rawA),
          rB: normScore(dim, rawB),
          payload: {
            title: dim.name,
            lines: [
              { label: nameFor(empireModel, a), value: rawA == null ? '—' : rawA.toFixed(0) },
              { label: nameFor(empireModel, b), value: rawB == null ? '—' : rawB.toFixed(0) },
              { label: 'Category', value: dim.category || '—' },
              {
                label: 'Direction',
                value: dim.higher_is_better === false ? 'lower = stronger' : 'higher = stronger',
              },
            ],
          },
        };
      });
      return {
        axes,
        clickable: false,
        title: 'Empire dimensions',
        options: empireCountries || [],
        nameA: nameFor(empireModel, a),
        nameB: nameFor(empireModel, b),
        polyA: 'oecd-radar-poly--empire-a',
        polyB: 'oecd-radar-poly--empire-b',
        chipA: 'oecd-radar-chip--empire-a',
        chipB: 'oecd-radar-chip--empire-b',
        vertexA: 'oecd-radar-vertex--empire-a',
        vertexB: 'oecd-radar-vertex--empire-b',
        coverage: {
          covered: empireModel.liveDims.length,
          total: empireModel.totalDims,
          year: empireModel.year,
        },
        pending: empireModel.pendingDims.map((d) => d.name),
        projYear: null,
      };
    }

    // OECD mode (phase-3 behaviour, unchanged)
    const slugs = allSlugsForLens(lens);
    const axes = slugs.map((slug, i) => {
      const series = OECD_SERIES_BY_SLUG[slug];
      const norm = normalizeIndicator(columnValues(model, slug), { inv: series.inv });
      const rawA = toNum(model.bySlug[slug]?.[a]?.value);
      const rawB = toNum(model.bySlug[slug]?.[b]?.value);
      const rkA = rankWithin(model, slug, a, { inv: series.inv });
      const rkB = rankWithin(model, slug, b, { inv: series.inv });
      return {
        key: slug,
        short: series.short,
        angle: -90 + (360 * i) / slugs.length,
        rA: norm[a] ?? null,
        rB: norm[b] ?? null,
        year: model.latestYearBySlug[slug],
        onClick: () => onPickIndicator(slug),
        payload: {
          title: `${series.label} · ${series.unitLabel}`,
          lines: [
            {
              label: nameForOecd(model, a),
              value: `${formatValue(rawA, series)}${rkA ? ` · #${rkA.rank}/${rkA.n}` : ''}`,
            },
            {
              label: nameForOecd(model, b),
              value: `${formatValue(rawB, series)}${rkB ? ` · #${rkB.rank}/${rkB.n}` : ''}`,
            },
          ],
        },
      };
    });
    const years = axes.map((ax) => ax.year).filter((y) => y != null && isProjected(y));
    return {
      axes,
      clickable: true,
      title: lensLabel(lens),
      options: model.countries,
      nameA: nameForOecd(model, a),
      nameB: nameForOecd(model, b),
      polyA: 'oecd-radar-poly--a',
      polyB: 'oecd-radar-poly--b',
      chipA: 'oecd-radar-chip--a',
      chipB: 'oecd-radar-chip--b',
      vertexA: 'oecd-radar-vertex--a',
      vertexB: 'oecd-radar-vertex--b',
      coverage: null,
      pending: null,
      projYear: years.length ? Math.max(...years) : null,
    };
  }, [isEmpire, empireModel, empireCountries, focus, lens, model, a, b, onPickIndicator]);

  const axes = view.axes;

  const onAxisEnter = (e, ax) => {
    setHoverAxis(ax.key);
    setTip(tipFromEvent(e, cardRef.current, ax.payload));
  };
  const onAxisFocus = (e, ax) => {
    setHoverAxis(ax.key);
    setTip(tipFromElement(e.currentTarget, cardRef.current, ax.payload));
  };
  const clearAxis = () => {
    setHoverAxis(null);
    setTip(null);
  };

  const polygon = (which) =>
    axes
      .map((ax) =>
        point(ax.angle, radiusFor(which === 'a' ? ax.rA : ax.rB))
          .map((v) => v.toFixed(1))
          .join(','),
      )
      .join(' ');

  const header = (
    <div className="oecd-section-head">
      <div className="oecd-section-head-l">
        <span className="oecd-section-tag">HEAD-TO-HEAD</span>
        <h2 className="oecd-section-title">{view.title}</h2>
        {view.projYear ? <OecdProjBadge year={view.projYear} /> : null}
        {view.coverage ? <CoverageBadge coverage={view.coverage} /> : null}
      </div>
      {onMode ? <OecdModeToggle mode={mode} onMode={onMode} /> : null}
    </div>
  );

  const selects = (
    <div className="oecd-radar-selects">
      {isEmpire ? (
        <div className="oecd-focus-chips" role="group" aria-label="Dimension focus">
          {DIMENSION_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`oecd-focus-chip ${focus === o.value ? 'is-active' : ''}`}
              aria-pressed={focus === o.value}
              onClick={() => onFocus && onFocus(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="oecd-radar-ab">
        <label className="oecd-select-wrap">
          <span className={`oecd-radar-chip ${view.chipA}`} aria-hidden="true" />
          <select
            className="oecd-select oecd-num"
            value={a}
            onChange={(e) => onChangeA(e.target.value)}
            aria-label="Country A"
          >
            {view.options.map((c) => (
              <option key={c.iso} value={c.iso}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <span className="oecd-radar-vs">vs</span>
        <label className="oecd-select-wrap">
          <span className={`oecd-radar-chip ${view.chipB}`} aria-hidden="true" />
          <select
            className="oecd-select oecd-num"
            value={b}
            onChange={(e) => onChangeB(e.target.value)}
            aria-label="Country B"
          >
            {view.options.map((c) => (
              <option key={c.iso} value={c.iso}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );

  const disclosure = isEmpire ? (
    <div className="oecd-radar-disclosure">
      {view.pending && view.pending.length ? (
        <p className="oecd-pending">
          Pending data sources:{' '}
          <span className="oecd-pending-names">{view.pending.join(' · ')}</span>
        </p>
      ) : null}
      <span className="oecd-radar-legend-note">Outward = stronger · live scores only</span>
    </div>
  ) : (
    <div className="oecd-radar-legend">
      <span className="oecd-radar-legend-item">
        <span className={`oecd-radar-chip ${view.chipA}`} aria-hidden="true" /> {view.nameA}
      </span>
      <span className="oecd-radar-legend-item">
        <span className={`oecd-radar-chip ${view.chipB}`} aria-hidden="true" /> {view.nameB}
      </span>
      <span className="oecd-radar-legend-note">Outward = stronger · click an axis to focus it</span>
    </div>
  );

  // Empire Focus group with <3 live axes → compact bar list, not a radar.
  if (isEmpire && axes.length > 0 && axes.length < 3) {
    return (
      <section className="oecd-card oecd-radar-card" ref={cardRef}>
        {header}
        {selects}
        <div className="oecd-dimbars">
          {axes.map((ax) => (
            <div className="oecd-dimbar" key={ax.key}>
              <span className="oecd-dimbar-label">{ax.short}</span>
              <span className="oecd-dimbar-track">
                <span
                  className="oecd-dimbar-fill is-a"
                  style={{ width: `${(ax.rA ?? 0) * 100}%` }}
                />
                <span
                  className="oecd-dimbar-mark is-b"
                  style={{ left: `${(ax.rB ?? 0) * 100}%` }}
                />
              </span>
            </div>
          ))}
        </div>
        <div className="oecd-radar-legend">
          <span className="oecd-radar-legend-item">
            <span className={`oecd-radar-chip ${view.chipA}`} aria-hidden="true" /> {view.nameA}
          </span>
          <span className="oecd-radar-legend-item">
            <span className={`oecd-radar-chip ${view.chipB}`} aria-hidden="true" /> {view.nameB}
          </span>
        </div>
        {disclosure}
        <OecdTip tip={tip} />
      </section>
    );
  }

  // Empire mode with zero live axes in this focus (all pending) — disclose it.
  if (isEmpire && axes.length === 0) {
    return (
      <section className="oecd-card oecd-radar-card" ref={cardRef}>
        {header}
        {selects}
        <p className="oecd-empire-empty">
          No live-scored dimensions in this focus group yet — every dimension here is awaiting data
          sources.
        </p>
        {disclosure}
      </section>
    );
  }

  return (
    <section className="oecd-card oecd-radar-card" ref={cardRef}>
      {header}
      {selects}
      <div className="oecd-radar-plot">
        <svg
          className="oecd-radar-svg"
          viewBox={`${-MARGIN} ${-MARGIN} ${SIZE + MARGIN * 2} ${SIZE + MARGIN * 2}`}
          role="img"
          aria-label={`Radar comparing ${view.nameA} and ${view.nameB} across ${axes.length} ${
            isEmpire ? 'dimensions' : 'indicators'
          }`}
        >
          {[1 / 3, 2 / 3, 1].map((f) => (
            <polygon
              key={f}
              className="oecd-radar-ring"
              points={axes
                .map((ax) =>
                  point(ax.angle, R * f)
                    .map((v) => v.toFixed(1))
                    .join(','),
                )
                .join(' ')}
            />
          ))}
          {axes.map((ax) => {
            const [x2, y2] = point(ax.angle, R);
            const [lx, ly] = point(ax.angle, R + 18);
            const active = ax.key === hoverAxis || (!isEmpire && ax.key === ind);
            return (
              <g key={ax.key}>
                <line
                  className={`oecd-radar-spoke ${active ? 'is-active' : ''}`}
                  x1={CX}
                  y1={CY}
                  x2={x2}
                  y2={y2}
                />
                <text
                  className={`oecd-radar-axis-label oecd-num ${active ? 'is-active' : ''} ${
                    view.clickable ? '' : 'is-static'
                  }`}
                  x={lx}
                  y={ly}
                  textAnchor={anchorFor(lx)}
                  dominantBaseline="middle"
                  role={view.clickable ? 'button' : undefined}
                  tabIndex={view.clickable ? 0 : undefined}
                  onClick={view.clickable ? ax.onClick : undefined}
                  onKeyDown={
                    view.clickable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            ax.onClick();
                          }
                        }
                      : undefined
                  }
                  onMouseEnter={(e) => onAxisEnter(e, ax)}
                  onMouseMove={(e) => onAxisEnter(e, ax)}
                  onMouseLeave={clearAxis}
                  onFocus={view.clickable ? (e) => onAxisFocus(e, ax) : undefined}
                  onBlur={view.clickable ? clearAxis : undefined}
                >
                  {ax.short}
                </text>
              </g>
            );
          })}
          <polygon
            className={`oecd-radar-poly ${view.polyB} ${hoverPoly === 'a' ? 'is-dim' : ''}`}
            points={polygon('b')}
            onMouseEnter={() => setHoverPoly('b')}
            onMouseLeave={() => setHoverPoly(null)}
          />
          <polygon
            className={`oecd-radar-poly ${view.polyA} ${hoverPoly === 'b' ? 'is-dim' : ''}`}
            points={polygon('a')}
            onMouseEnter={() => setHoverPoly('a')}
            onMouseLeave={() => setHoverPoly(null)}
          />
          {axes.map((ax) => {
            const [ax_, ay_] = point(ax.angle, radiusFor(ax.rA));
            const [bx_, by_] = point(ax.angle, radiusFor(ax.rB));
            return (
              <g key={`v-${ax.key}`}>
                <circle
                  className={`oecd-radar-vertex ${view.vertexB}`}
                  cx={bx_}
                  cy={by_}
                  r={3}
                  onMouseEnter={(e) => onAxisEnter(e, ax)}
                  onMouseMove={(e) => onAxisEnter(e, ax)}
                  onMouseLeave={clearAxis}
                />
                <circle
                  className={`oecd-radar-vertex ${view.vertexA}`}
                  cx={ax_}
                  cy={ay_}
                  r={3}
                  onMouseEnter={(e) => onAxisEnter(e, ax)}
                  onMouseMove={(e) => onAxisEnter(e, ax)}
                  onMouseLeave={clearAxis}
                />
              </g>
            );
          })}
        </svg>
      </div>
      {disclosure}
      <OecdTip tip={tip} />
    </section>
  );
}

function nameForOecd(model, iso) {
  return model.countries.find((c) => c.iso === iso)?.name || iso;
}
function nameFor(empireModel, iso) {
  return empireModel.nameByCode.get(iso) || iso;
}
function anchorFor(x) {
  if (x < CX - 6) return 'end';
  if (x > CX + 6) return 'start';
  return 'middle';
}

function CoverageBadge({ coverage }) {
  return (
    <span className="oecd-cov-badge oecd-num" title="Live Empire-Rankings backbone data">
      LIVE DATA · {coverage.covered}/{coverage.total} DIMENSIONS · {coverage.year}
    </span>
  );
}
