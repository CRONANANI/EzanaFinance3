'use client';

/**
 * Head-to-head card (phase 6) — compact, Power-Dimension-Comparison footprint:
 * controls inline in the header, radar chart left (≤360px), compare table right.
 * Up to 4 countries, one polygon each, sharing the history line palette
 * (--oecd-line-1..4) so radar and table dots always agree; hovering a polygon or
 * chip dims the others.
 *
 * Two data modes (Phase 4): OECD indicators (rank-normalized across countries,
 * inv → outward) or live empire dimensions (World Bank backbone; no mock, pending
 * dimensions disclosed). A Focus group with <3 live empire dimensions renders a
 * bar list instead of a radar. Axis click sets the indicator in OECD mode; empire
 * axes are static.
 */
import { useMemo, useRef, useState } from 'react';
import { OECD_SERIES_BY_SLUG } from '@/lib/oecd-curated';
import { normalizeIndicator, isProjected, formatValue, toNum } from '@/lib/oecd-scales';
import { DIMENSION_OPTIONS } from '@/lib/empire-dimension-groups';
import { allSlugsForLens, columnValues, lensLabel, rankWithin } from './oecd-explorer-model';
import { empireAxesForFocus, normScore } from './oecd-empire-model';
import OecdProjBadge from './OecdProjBadge';
import OecdModeToggle from './OecdModeToggle';
import OecdLensPills from './OecdLensPills';
import OecdInfoButton from './OecdInfoButton';
import OecdCompare from './OecdCompare';
import { OECD_METHODOLOGY } from './oecd-methodology';
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
const lineColor = (i) => `var(--oecd-line-${i + 1})`;

export default function OecdRadar({
  model,
  lens,
  ind,
  onPickIndicator,
  // multi-country selection (2–4)
  selected,
  onChangeCountry,
  onAddCountry,
  onRemoveCountry,
  // mode / filters
  mode = 'oecd',
  onMode,
  focus = 'all',
  onFocus,
  empireModel = null,
  empireCountries = null,
  empireMatrixModel = null,
  onLens,
  showLensChips = false,
}) {
  const cardRef = useRef(null);
  const [tip, setTip] = useState(null);
  const [hoverAxis, setHoverAxis] = useState(null);
  const [hoverCc, setHoverCc] = useState(null); // iso being emphasized

  const isEmpire = mode === 'empire' && empireModel;

  const options = isEmpire ? empireCountries || [] : model.countries;
  const nameOf = (iso) =>
    (isEmpire
      ? empireModel.nameByCode.get(iso)
      : model.countries.find((c) => c.iso === iso)?.name) || iso;

  // Unified axes with a per-country normalized radius map.
  const view = useMemo(() => {
    if (isEmpire) {
      const dims = empireAxesForFocus(empireModel, focus);
      const axes = dims.map((dim, i) => {
        const normByIso = {};
        for (const iso of selected)
          normByIso[iso] = normScore(dim, empireModel.scoreMap.get(iso)?.get(dim.id));
        return {
          key: dim.id,
          short: truncName(dim.name),
          angle: -90 + (360 * i) / dims.length,
          normByIso,
          payload: {
            title: dim.name,
            lines: selected.map((iso) => {
              const raw = empireModel.scoreMap.get(iso)?.get(dim.id);
              return { label: nameOf(iso), value: raw == null ? '—' : raw.toFixed(0) };
            }),
          },
        };
      });
      return {
        axes,
        clickable: false,
        title: 'Empire dimensions',
        coverage: {
          covered: empireModel.liveDims.length,
          total: empireModel.totalDims,
          year: empireModel.year,
        },
        pending: empireModel.pendingDims.map((d) => d.name),
        projYear: null,
      };
    }

    const slugs = allSlugsForLens(lens);
    const axes = slugs.map((slug, i) => {
      const series = OECD_SERIES_BY_SLUG[slug];
      const norm = normalizeIndicator(columnValues(model, slug), { inv: series.inv });
      const normByIso = {};
      for (const iso of selected) normByIso[iso] = norm[iso] ?? null;
      return {
        key: slug,
        short: series.short,
        angle: -90 + (360 * i) / slugs.length,
        normByIso,
        year: model.latestYearBySlug[slug],
        onClick: () => onPickIndicator(slug),
        payload: {
          title: `${series.label} · ${series.unitLabel}`,
          lines: selected.map((iso) => {
            const raw = toNum(model.bySlug[slug]?.[iso]?.value);
            const rk = rankWithin(model, slug, iso, { inv: series.inv });
            return {
              label: nameOf(iso),
              value: `${formatValue(raw, series)}${rk ? ` · #${rk.rank}/${rk.n}` : ''}`,
            };
          }),
        },
      };
    });
    const years = axes.map((ax) => ax.year).filter((y) => y != null && isProjected(y));
    return {
      axes,
      clickable: true,
      title: lensLabel(lens),
      coverage: null,
      pending: null,
      projYear: years.length ? Math.max(...years) : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmpire, empireModel, focus, lens, model, selected, onPickIndicator]);

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
  const polygon = (iso) =>
    axes
      .map((ax) =>
        point(ax.angle, radiusFor(ax.normByIso[iso]))
          .map((v) => v.toFixed(1))
          .join(','),
      )
      .join(' ');

  const header = (
    <div className="oecd-hth-head">
      <div className="oecd-section-head-l">
        <span className="oecd-section-tag">HEAD-TO-HEAD</span>
        <h2 className="oecd-section-title">{view.title}</h2>
        {view.projYear ? <OecdProjBadge year={view.projYear} /> : null}
        {view.coverage ? (
          <span className="oecd-cov-badge oecd-num" title="Live Empire-Rankings backbone data">
            LIVE DATA · {view.coverage.covered}/{view.coverage.total} DIMENSIONS ·{' '}
            {view.coverage.year}
          </span>
        ) : null}
      </div>
      <div className="oecd-hth-controls">
        <div className="oecd-hth-chips">
          {selected.map((iso, i) => (
            <span
              key={iso}
              className={`oecd-hth-chip ${hoverCc && hoverCc !== iso ? 'is-dim' : ''}`}
              onMouseEnter={() => setHoverCc(iso)}
              onMouseLeave={() => setHoverCc(null)}
            >
              <span
                className="oecd-hth-chip-dot"
                style={{ background: lineColor(i) }}
                aria-hidden="true"
              />
              <select
                className="oecd-hth-chip-select oecd-num"
                value={iso}
                onChange={(e) => onChangeCountry(i, e.target.value)}
                aria-label={`Country ${i + 1}`}
              >
                {options.map((c) => (
                  <option key={c.iso} value={c.iso}>
                    {c.name}
                  </option>
                ))}
              </select>
              {i >= 2 ? (
                <button
                  type="button"
                  className="oecd-hth-chip-x"
                  onClick={() => onRemoveCountry(i)}
                  aria-label={`Remove ${nameOf(iso)}`}
                >
                  ✕
                </button>
              ) : null}
            </span>
          ))}
          {selected.length < 4 ? (
            <select
              className="oecd-hth-add oecd-num"
              value=""
              onChange={(e) => e.target.value && onAddCountry(e.target.value)}
              aria-label="Add a country to compare"
            >
              <option value="">+ Add</option>
              {options
                .filter((c) => !selected.includes(c.iso))
                .map((c) => (
                  <option key={c.iso} value={c.iso}>
                    {c.name}
                  </option>
                ))}
            </select>
          ) : null}
        </div>
        {onMode ? <OecdModeToggle mode={mode} onMode={onMode} /> : null}
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
        ) : showLensChips && onLens ? (
          <OecdLensPills lens={lens} onLens={onLens} showCaption={false} compact />
        ) : null}
      </div>
      <OecdInfoButton entry={OECD_METHODOLOGY.headToHead} />
    </div>
  );

  const legend = (
    <div className="oecd-hth-legend">
      {selected.map((iso, i) => (
        <span
          key={iso}
          className={`oecd-radar-legend-item ${hoverCc && hoverCc !== iso ? 'is-dim' : ''}`}
          onMouseEnter={() => setHoverCc(iso)}
          onMouseLeave={() => setHoverCc(null)}
        >
          <span
            className="oecd-radar-chip"
            style={{ background: lineColor(i) }}
            aria-hidden="true"
          />{' '}
          {nameOf(iso)}
        </span>
      ))}
      {isEmpire && view.pending?.length ? (
        <span className="oecd-pending">Pending: {view.pending.join(' · ')}</span>
      ) : (
        <span className="oecd-radar-legend-note">Outward = stronger</span>
      )}
    </div>
  );

  const compare = (
    <OecdCompare
      mode={mode}
      selected={selected}
      colors={selected.map((_, i) => lineColor(i))}
      names={selected.map((iso) => nameOf(iso))}
      model={model}
      empireMatrixModel={empireMatrixModel}
      lens={lens}
      ind={ind}
      onPickIndicator={onPickIndicator}
      focus={focus}
    />
  );

  // Empire Focus group with <3 live axes → bar list (radar meaningless).
  const plot =
    isEmpire && axes.length > 0 && axes.length < 3 ? (
      <div className="oecd-dimbars">
        {axes.map((ax) => (
          <div className="oecd-dimbar" key={ax.key}>
            <span className="oecd-dimbar-label">{ax.short}</span>
            <span className="oecd-dimbar-track">
              {selected.map((iso, i) => (
                <span
                  key={iso}
                  className="oecd-dimbar-fill"
                  style={{
                    width: `${(ax.normByIso[iso] ?? 0) * 100}%`,
                    background: lineColor(i),
                    opacity: 0.5,
                  }}
                />
              ))}
            </span>
          </div>
        ))}
      </div>
    ) : isEmpire && axes.length === 0 ? (
      <p className="oecd-empire-empty">No live-scored dimensions in this focus group yet.</p>
    ) : (
      <svg
        className="oecd-radar-svg"
        viewBox={`${-MARGIN} ${-MARGIN} ${SIZE + MARGIN * 2} ${SIZE + MARGIN * 2}`}
        role="img"
        aria-label={`Radar comparing ${selected.map(nameOf).join(', ')} across ${axes.length} axes`}
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
                className={`oecd-radar-axis-label oecd-num ${active ? 'is-active' : ''} ${view.clickable ? '' : 'is-static'}`}
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
        {selected.map((iso, i) => (
          <polygon
            key={iso}
            className="oecd-radar-poly"
            points={polygon(iso)}
            style={{
              stroke: lineColor(i),
              fill: `color-mix(in srgb, ${lineColor(i)} 15%, transparent)`,
              opacity: hoverCc && hoverCc !== iso ? 0.15 : 1,
            }}
            onMouseEnter={() => setHoverCc(iso)}
            onMouseLeave={() => setHoverCc(null)}
          />
        ))}
      </svg>
    );

  return (
    <section className="oecd-card oecd-hth-card" ref={cardRef}>
      {header}
      <div className="oecd-hth-body">
        <div className="oecd-hth-plot">
          {plot}
          {legend}
        </div>
        {compare}
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
