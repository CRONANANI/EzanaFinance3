'use client';

/**
 * Head-to-head radar — country A vs B on the active lens's axes (all 20 when the
 * lens is 'all'). Each axis is rank-normalized 0–100 across ALL countries via
 * `normalizeIndicator`, which already flips `inv` indicators, so outward always
 * means "stronger" (lower unemployment, lower debt sit further out). Hand-rolled
 * SVG — no chart dependency.
 *
 * A radar needs ≥3 axes to mean anything; if a lens ever has fewer, this renders
 * nothing and the profile card carries that lens.
 */
import { useMemo } from 'react';
import { OECD_SERIES_BY_SLUG } from '@/lib/oecd-curated';
import { normalizeIndicator, isProjected } from '@/lib/oecd-scales';
import { allSlugsForLens, columnValues, lensLabel } from './oecd-explorer-model';
import OecdProjBadge from './OecdProjBadge';

const SIZE = 320;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 118;
const FLOOR = 0.08; // normalized 0 maps here, so a bottom rank is still a shape

function point(angleDeg, radius) {
  const a = (angleDeg * Math.PI) / 180;
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
}

export default function OecdRadar({ model, lens, a, b, onChangeA, onChangeB }) {
  const slugs = useMemo(() => allSlugsForLens(lens), [lens]);

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

  if (axes.length < 3) return null;

  const polygon = (iso) =>
    axes
      .map((ax) => {
        const n = ax.norm[iso];
        const r = n == null ? FLOOR * R : (FLOOR + (1 - FLOOR) * n) * R;
        return point(ax.angle, r)
          .map((v) => v.toFixed(1))
          .join(',');
      })
      .join(' ');

  const nameOf = (iso) => model.bySlug[axes[0]?.slug]?.[iso]?.name || iso;

  return (
    <section className="oecd-card oecd-radar-card">
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

      <svg
        className="oecd-radar-svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
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
        {/* radial gridlines + axis labels */}
        {axes.map((ax) => {
          const [x2, y2] = point(ax.angle, R);
          const [lx, ly] = point(ax.angle, R + 16);
          return (
            <g key={ax.slug}>
              <line className="oecd-radar-spoke" x1={CX} y1={CY} x2={x2} y2={y2} />
              <text
                className="oecd-radar-axis-label oecd-num"
                x={lx}
                y={ly}
                textAnchor={anchorFor(lx)}
                dominantBaseline="middle"
              >
                {ax.series.short}
              </text>
            </g>
          );
        })}
        {/* polygon B first (under A) */}
        <polygon className="oecd-radar-poly oecd-radar-poly--b" points={polygon(b)} />
        <polygon className="oecd-radar-poly oecd-radar-poly--a" points={polygon(a)} />
      </svg>

      <div className="oecd-radar-legend">
        <span className="oecd-radar-legend-item">
          <span className="oecd-radar-chip oecd-radar-chip--a" aria-hidden="true" /> {nameOf(a)}
        </span>
        <span className="oecd-radar-legend-item">
          <span className="oecd-radar-chip oecd-radar-chip--b" aria-hidden="true" /> {nameOf(b)}
        </span>
        <span className="oecd-radar-legend-note">
          Outward = stronger · rank-normalized across countries
        </span>
      </div>
    </section>
  );
}

function anchorFor(x) {
  if (x < CX - 6) return 'end';
  if (x > CX + 6) return 'start';
  return 'middle';
}
