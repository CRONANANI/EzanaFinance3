'use client';

/**
 * Head-to-head card — radar left, compare table right.
 *
 * Up to 4 countries, one polygon each, sharing the history line palette
 * (--oecd-line-1..4) so radar and table dots always agree; hovering a polygon or
 * chip dims the others.
 *
 * Two data modes: OECD indicators (min–max normalized across reporting
 * countries, `inv` → outward) or live empire dimensions (World Bank backbone; no
 * mock, pending dimensions disclosed). A Focus group with <3 live empire
 * dimensions renders a bar list instead of a radar.
 *
 * GEOMETRY: the viewBox is deliberately wider than tall (560×480). Axis labels
 * are horizontally anchored, so they need side room, not vertical room — a square
 * viewBox wastes ~37% of the drawn area on empty top/bottom margin. R is sized so
 * the plot fills its column instead of floating in it.
 *
 * INTERACTION: each axis carries a wide transparent hit line plus per-country
 * vertices, so hovering anywhere along a spoke opens the value tooltip — not just
 * the 9px label. Clicking an axis opens the persistent scoring explainer; in OECD
 * mode it additionally sets the active indicator, as before.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
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
import OecdAxisExplainer from './OecdAxisExplainer';
import { OECD_METHODOLOGY } from './oecd-methodology';
import { empireDimensionExplainer, oecdIndicatorExplainer } from './oecd-dimension-methodology';
import OecdTip, { tipFromEvent, tipFromElement } from './OecdTip';

/* ── Geometry ──────────────────────────────────────────────────────────────
 * VB_W > VB_H on purpose: side-anchored labels need horizontal room.
 * Side gutter  = CX - LABEL_R = 88px  (fits "Cur.acct" / "Markets & Fin" at 10.5px)
 * Top gutter   = CY - LABEL_R = 44px
 * Bottom gutter= VB_H - CY - LABEL_R = 52px
 * Previously R/half-extent was 0.625; it is now 0.72 with the labels given real room. */
const VB_W = 560;
const VB_H = 480;
const CX = VB_W / 2;
const CY = 236;
const R = 172;
const LABEL_R = R + 20;
const HIT_R = R + 14;
const FLOOR = 0.08;
const RINGS = [0.25, 0.5, 0.75, 1];

function point(angleDeg, radius) {
  const a = (angleDeg * Math.PI) / 180;
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
}
const radiusFor = (n) => (n == null ? FLOOR * R : (FLOOR + (1 - FLOOR) * n) * R);
function truncName(name) {
  return name.length > 14 ? `${name.slice(0, 13)}…` : name;
}
const lineColor = (i) => `var(--oecd-line-${i + 1})`;

export default function OecdRadar({
  model,
  lens,
  ind,
  onPickIndicator,
  selected,
  onChangeCountry,
  onAddCountry,
  onRemoveCountry,
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
  const [hoverCc, setHoverCc] = useState(null);
  const [explain, setExplain] = useState(null);

  const isEmpire = mode === 'empire' && empireModel;

  const options = isEmpire ? empireCountries || [] : model.countries;
  const nameOf = (iso) =>
    (isEmpire
      ? empireModel.nameByCode.get(iso)
      : model.countries.find((c) => c.iso === iso)?.name) || iso;

  const view = useMemo(() => {
    if (isEmpire) {
      const dims = empireAxesForFocus(empireModel, focus);
      const axes = dims.map((dim, i) => {
        const normByIso = {};
        for (const iso of selected)
          normByIso[iso] = normScore(dim, empireModel.scoreMap.get(iso)?.get(dim.id));
        // Prefer the curated short label from the matrix payload; fall back to a
        // truncation so a long dimension name can't overrun the side gutter.
        const short = empireMatrixModel?.dimById?.get(dim.id)?.short || truncName(dim.name);
        return {
          key: dim.id,
          short,
          angle: -90 + (360 * i) / dims.length,
          normByIso,
          explainer: () => empireDimensionExplainer(dim, empireMatrixModel),
          payload: {
            title: dim.name,
            note: 'Weighted blend of World Bank metrics · click for the formula',
            lines: selected.map((iso) => {
              const raw = empireModel.scoreMap.get(iso)?.get(dim.id);
              return { label: nameOf(iso), value: raw == null ? '—' : raw.toFixed(0) };
            }),
          },
        };
      });
      return {
        axes,
        clickable: true,
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
      const col = columnValues(model, slug);
      const reporting = Object.values(col).filter((v) => v != null).length;
      const norm = normalizeIndicator(col, { inv: series.inv });
      const normByIso = {};
      for (const iso of selected) normByIso[iso] = norm[iso] ?? null;
      const year = model.latestYearBySlug[slug];
      return {
        key: slug,
        short: series.short,
        angle: -90 + (360 * i) / slugs.length,
        normByIso,
        year,
        onClick: () => onPickIndicator(slug),
        explainer: () => oecdIndicatorExplainer(series, year, reporting),
        payload: {
          title: `${series.label} · ${series.unitLabel}`,
          note: 'Click for how this axis is normalized',
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
  }, [isEmpire, empireModel, empireMatrixModel, focus, lens, model, selected, onPickIndicator]);

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

  // Click = open the explainer. In OECD mode it ALSO drives the indicator
  // selection (unchanged existing behaviour that the history chart depends on).
  const onAxisActivate = useCallback((ax) => {
    if (ax.onClick) ax.onClick();
    setExplain({ key: ax.key, data: ax.explainer() });
  }, []);

  const closeExplain = useCallback(() => setExplain(null), []);

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
      <span className="oecd-radar-legend-hint">Click an axis to see how it&apos;s scored</span>
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

  const plot =
    isEmpire && axes.length > 0 && axes.length < 3 ? (
      <div className="oecd-dimbars">
        {axes.map((ax) => (
          <div className="oecd-dimbar" key={ax.key}>
            <button
              type="button"
              className="oecd-dimbar-label oecd-dimbar-btn"
              onClick={() => onAxisActivate(ax)}
            >
              {ax.short}
            </button>
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
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Radar comparing ${selected.map(nameOf).join(', ')} across ${axes.length} axes`}
      >
        {RINGS.map((f) => (
          <polygon
            key={f}
            className={`oecd-radar-ring ${f === 1 ? 'is-outer' : ''}`}
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
          const [lx, ly] = point(ax.angle, LABEL_R);
          const [hx, hy] = point(ax.angle, HIT_R);
          const active =
            ax.key === hoverAxis || ax.key === explain?.key || (!isEmpire && ax.key === ind);
          return (
            <g
              key={ax.key}
              className={`oecd-radar-axisg ${active ? 'is-active' : ''}`}
              onMouseEnter={(e) => onAxisEnter(e, ax)}
              onMouseMove={(e) => onAxisEnter(e, ax)}
              onMouseLeave={clearAxis}
            >
              <line
                className={`oecd-radar-spoke ${active ? 'is-active' : ''}`}
                x1={CX}
                y1={CY}
                x2={x2}
                y2={y2}
              />
              {/* Wide transparent hit line so the whole spoke is hoverable. */}
              <line
                className="oecd-radar-hit"
                x1={CX}
                y1={CY}
                x2={hx}
                y2={hy}
                onClick={() => onAxisActivate(ax)}
              />
              <text
                className={`oecd-radar-axis-label oecd-num ${active ? 'is-active' : ''}`}
                x={lx}
                y={ly}
                textAnchor={anchorFor(lx)}
                dominantBaseline="middle"
                role="button"
                tabIndex={0}
                aria-label={`${ax.payload.title} — open scoring explanation`}
                onClick={() => onAxisActivate(ax)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onAxisActivate(ax);
                  }
                }}
                onFocus={(e) => onAxisFocus(e, ax)}
                onBlur={clearAxis}
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
              fill: `color-mix(in srgb, ${lineColor(i)} 14%, transparent)`,
              opacity: hoverCc && hoverCc !== iso ? 0.14 : 1,
            }}
            onMouseEnter={() => setHoverCc(iso)}
            onMouseLeave={() => setHoverCc(null)}
          />
        ))}

        {/* Vertices last so they sit above every polygon fill. */}
        {selected.map((iso, i) =>
          axes.map((ax) => {
            const [vx, vy] = point(ax.angle, radiusFor(ax.normByIso[iso]));
            return (
              <circle
                key={`${iso}-${ax.key}`}
                className="oecd-radar-vertex"
                cx={vx}
                cy={vy}
                r={ax.key === hoverAxis ? 3.6 : 2.6}
                style={{
                  fill: lineColor(i),
                  opacity: hoverCc && hoverCc !== iso ? 0.14 : 1,
                }}
              />
            );
          }),
        )}
      </svg>
    );

  return (
    <section className="oecd-card oecd-hth-card" ref={cardRef}>
      {header}
      <div className="oecd-hth-body">
        <div className="oecd-hth-plot">
          {plot}
          {legend}
          <OecdAxisExplainer data={explain?.data} onClose={closeExplain} />
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
