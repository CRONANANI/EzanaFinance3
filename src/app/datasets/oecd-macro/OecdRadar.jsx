'use client';

/**
 * Head-to-head radar — country A vs B on the active lens's axes (all 20 when the
 * lens is 'all'). Each axis is rank-normalized 0–100 across ALL countries via
 * `normalizeIndicator`, which already flips `inv` indicators, so outward always
 * means "stronger" (lower unemployment, lower debt sit further out). Hand-rolled
 * SVG — no chart dependency.
 *
 * Interactions: hovering an axis label or a vertex highlights that spoke and
 * shows both countries' RAW values + ranks (the polygon only shows rank-space, so
 * the raw numbers matter); clicking an axis sets the indicator (same chaining as
 * matrix column headers); hovering one polygon dims the other. A radar needs ≥3
 * axes — below that it renders nothing and the profile card carries the lens.
 */
import { useMemo, useRef, useState } from 'react';
import { OECD_SERIES_BY_SLUG } from '@/lib/oecd-curated';
import { normalizeIndicator, isProjected, formatValue, toNum } from '@/lib/oecd-scales';
import { allSlugsForLens, columnValues, lensLabel, rankWithin } from './oecd-explorer-model';
import OecdProjBadge from './OecdProjBadge';
import OecdTip, { tipFromEvent, tipFromElement } from './OecdTip';

const SIZE = 420;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 150;
const MARGIN = 30; // viewBox padding so 20-axis labels don't clip at the new scale
const FLOOR = 0.08; // normalized 0 maps here, so a bottom rank is still a shape

function point(angleDeg, radius) {
  const a = (angleDeg * Math.PI) / 180;
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
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
}) {
  const slugs = useMemo(() => allSlugsForLens(lens), [lens]);
  const cardRef = useRef(null);
  const [tip, setTip] = useState(null);
  const [hoverAxis, setHoverAxis] = useState(null); // slug
  const [hoverPoly, setHoverPoly] = useState(null); // 'a' | 'b'

  const axes = useMemo(() => {
    return slugs.map((slug, i) => {
      const series = OECD_SERIES_BY_SLUG[slug];
      const norm = normalizeIndicator(columnValues(model, slug), { inv: series.inv });
      const angle = -90 + (360 * i) / slugs.length;
      return { slug, series, norm, angle, year: model.latestYearBySlug[slug] };
    });
  }, [slugs, model]);

  const projYear = useMemo(() => {
    const years = axes.map((ax) => ax.year).filter((y) => y != null && isProjected(y));
    return years.length ? Math.max(...years) : null;
  }, [axes]);

  const nameOf = (iso) => model.bySlug[axes[0]?.slug]?.[iso]?.name || iso;

  if (axes.length < 3) return null;

  const radiusFor = (n) => (n == null ? FLOOR * R : (FLOOR + (1 - FLOOR) * n) * R);
  const polygon = (iso) =>
    axes
      .map((ax) =>
        point(ax.angle, radiusFor(ax.norm[iso]))
          .map((v) => v.toFixed(1))
          .join(','),
      )
      .join(' ');

  const axisPayload = (ax) => {
    const rawA = toNum(model.bySlug[ax.slug]?.[a]?.value);
    const rawB = toNum(model.bySlug[ax.slug]?.[b]?.value);
    const rkA = rankWithin(model, ax.slug, a, { inv: ax.series.inv });
    const rkB = rankWithin(model, ax.slug, b, { inv: ax.series.inv });
    return {
      title: `${ax.series.label} · ${ax.series.unitLabel}`,
      lines: [
        {
          label: nameOf(a),
          value: `${formatValue(rawA, ax.series)}${rkA ? ` · #${rkA.rank}/${rkA.n}` : ''}`,
        },
        {
          label: nameOf(b),
          value: `${formatValue(rawB, ax.series)}${rkB ? ` · #${rkB.rank}/${rkB.n}` : ''}`,
        },
      ],
    };
  };

  const onAxisEnter = (e, ax) => {
    setHoverAxis(ax.slug);
    setTip(tipFromEvent(e, cardRef.current, axisPayload(ax)));
  };
  const onAxisFocus = (e, ax) => {
    setHoverAxis(ax.slug);
    setTip(tipFromElement(e.currentTarget, cardRef.current, axisPayload(ax)));
  };
  const clearAxis = () => {
    setHoverAxis(null);
    setTip(null);
  };

  return (
    <section className="oecd-card oecd-radar-card" ref={cardRef}>
      <div className="oecd-section-head">
        <div className="oecd-section-head-l">
          <span className="oecd-section-tag">HEAD-TO-HEAD</span>
          <h2 className="oecd-section-title">{lensLabel(lens)}</h2>
          {projYear ? <OecdProjBadge year={projYear} /> : null}
        </div>
      </div>

      <div className="oecd-radar-selects">
        <label className="oecd-select-wrap">
          <span className="oecd-radar-chip oecd-radar-chip--a" aria-hidden="true" />
          <select
            className="oecd-select oecd-num"
            value={a}
            onChange={(e) => onChangeA(e.target.value)}
            aria-label="Country A"
          >
            {model.countries.map((c) => (
              <option key={c.iso} value={c.iso}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <span className="oecd-radar-vs">vs</span>
        <label className="oecd-select-wrap">
          <span className="oecd-radar-chip oecd-radar-chip--b" aria-hidden="true" />
          <select
            className="oecd-select oecd-num"
            value={b}
            onChange={(e) => onChangeB(e.target.value)}
            aria-label="Country B"
          >
            {model.countries.map((c) => (
              <option key={c.iso} value={c.iso}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="oecd-radar-plot">
        <svg
          className="oecd-radar-svg"
          viewBox={`${-MARGIN} ${-MARGIN} ${SIZE + MARGIN * 2} ${SIZE + MARGIN * 2}`}
          role="img"
          aria-label={`Radar comparing ${nameOf(a)} and ${nameOf(b)} across ${axes.length} indicators`}
        >
          {/* grid rings */}
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
          {/* radial gridlines + axis labels (clickable → set indicator) */}
          {axes.map((ax) => {
            const [x2, y2] = point(ax.angle, R);
            const [lx, ly] = point(ax.angle, R + 18);
            const active = ax.slug === hoverAxis || ax.slug === ind;
            return (
              <g key={ax.slug}>
                <line
                  className={`oecd-radar-spoke ${active ? 'is-active' : ''}`}
                  x1={CX}
                  y1={CY}
                  x2={x2}
                  y2={y2}
                />
                <text
                  className={`oecd-radar-axis-label oecd-num ${active ? 'is-active' : ''}`}
                  x={lx}
                  y={ly}
                  textAnchor={anchorFor(lx)}
                  dominantBaseline="middle"
                  role="button"
                  tabIndex={0}
                  onClick={() => onPickIndicator(ax.slug)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onPickIndicator(ax.slug);
                    }
                  }}
                  onMouseEnter={(e) => onAxisEnter(e, ax)}
                  onMouseMove={(e) => onAxisEnter(e, ax)}
                  onMouseLeave={clearAxis}
                  onFocus={(e) => onAxisFocus(e, ax)}
                  onBlur={clearAxis}
                >
                  {ax.series.short}
                </text>
              </g>
            );
          })}
          {/* polygons (B under A); hovering one dims the other */}
          <polygon
            className={`oecd-radar-poly oecd-radar-poly--b ${hoverPoly === 'a' ? 'is-dim' : ''}`}
            points={polygon(b)}
            onMouseEnter={() => setHoverPoly('b')}
            onMouseLeave={() => setHoverPoly(null)}
          />
          <polygon
            className={`oecd-radar-poly oecd-radar-poly--a ${hoverPoly === 'b' ? 'is-dim' : ''}`}
            points={polygon(a)}
            onMouseEnter={() => setHoverPoly('a')}
            onMouseLeave={() => setHoverPoly(null)}
          />
          {/* vertices — hover targets that surface the raw values per axis */}
          {axes.map((ax) => {
            const [ax_, ay_] = point(ax.angle, radiusFor(ax.norm[a]));
            const [bx_, by_] = point(ax.angle, radiusFor(ax.norm[b]));
            return (
              <g key={`v-${ax.slug}`}>
                <circle
                  className="oecd-radar-vertex oecd-radar-vertex--b"
                  cx={bx_}
                  cy={by_}
                  r={3}
                  onMouseEnter={(e) => onAxisEnter(e, ax)}
                  onMouseMove={(e) => onAxisEnter(e, ax)}
                  onMouseLeave={clearAxis}
                />
                <circle
                  className="oecd-radar-vertex oecd-radar-vertex--a"
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

      <div className="oecd-radar-legend">
        <span className="oecd-radar-legend-item">
          <span className="oecd-radar-chip oecd-radar-chip--a" aria-hidden="true" /> {nameOf(a)}
        </span>
        <span className="oecd-radar-legend-item">
          <span className="oecd-radar-chip oecd-radar-chip--b" aria-hidden="true" /> {nameOf(b)}
        </span>
        <span className="oecd-radar-legend-note">
          Outward = stronger · click an axis to focus it
        </span>
      </div>
      <OecdTip tip={tip} />
    </section>
  );
}

function anchorFor(x) {
  if (x < CX - 6) return 'end';
  if (x > CX + 6) return 'start';
  return 'middle';
}
