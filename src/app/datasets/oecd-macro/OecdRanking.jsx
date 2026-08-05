'use client';

/**
 * Ranking — countries ordered best-to-worst for the selected indicator, one bar
 * each. Geometry comes from `rankingBarGeometry`: signed indicators diverge
 * around a centered zero line; clamped indicators (gross debt) cap the bar and
 * flag `▸ off-scale` so one outlier can't collapse every other bar. The OECD
 * aggregate is drawn as a reference tick on the axis — never as a ranked row.
 * The footer states the active scaling rule in words (`scalingNote`).
 *
 * Hovering (or focusing) a row raises a tooltip with the value, its YoY change
 * from the latest payload, and the true value when a bar is clamped off-scale.
 * Bars animate width/left on indicator change (CSS; reduced-motion honoured).
 */
import { useMemo, useRef, useState } from 'react';
import {
  rankingBarGeometry,
  scalingNote,
  formatValue,
  isProjected,
  toNum,
} from '@/lib/oecd-scales';
import { columnValues, aggregate } from './oecd-explorer-model';
import OecdProjBadge from './OecdProjBadge';
import OecdInfoButton from './OecdInfoButton';
import { OECD_METHODOLOGY } from './oecd-methodology';
import OecdTip, { tipFromEvent, tipFromElement } from './OecdTip';

export default function OecdRanking({
  model,
  slug,
  series,
  selectedA,
  showAll,
  onToggleShowAll,
  onPickCountry,
}) {
  const cardRef = useRef(null);
  const [tip, setTip] = useState(null);

  const { ranked, maxAbs, projYear } = useMemo(() => {
    const values = columnValues(model, slug);
    const rows = Object.entries(values)
      .map(([iso, v]) => ({ iso, value: toNum(v), name: model.bySlug[slug]?.[iso]?.name || iso }))
      .filter((r) => r.value != null);

    const inv = !!series?.inv && !series?.signed;
    rows.sort((a, b) => (inv ? a.value - b.value : b.value - a.value));

    let maxAbs = 0;
    for (const r of rows) maxAbs = Math.max(maxAbs, Math.abs(r.value));
    if (maxAbs === 0) maxAbs = 1;

    return { ranked: rows, maxAbs, projYear: model.latestYearBySlug[slug] };
  }, [model, slug, series]);

  const visible = showAll ? ranked : ranked.slice(0, 5);

  const oecdCell = aggregate(model, slug, 'OECD');
  const tick = oecdCell ? tickPosition(oecdCell.value, series, maxAbs) : null;

  const payloadFor = (r, geo) => {
    const cell = model.bySlug[slug]?.[r.iso];
    const change = cell?.prior != null && cell?.value != null ? cell.value - cell.prior : null;
    const lines = [{ label: series?.unitLabel || 'Value', value: formatValue(r.value, series) }];
    if (change != null) {
      lines.push({
        label: 'YoY',
        value: `${change >= 0 ? '+' : ''}${change.toFixed(series?.decimals ?? 1)}`,
        tone: change >= 0 ? 'pos' : 'neg',
      });
    }
    if (geo.offScale) {
      lines.push({ label: 'Off-scale', value: `actual ${formatValue(r.value, series)}` });
    }
    return { title: r.name, lines };
  };

  return (
    <section className="oecd-card oecd-ranking-card" ref={cardRef}>
      <OecdInfoButton entry={OECD_METHODOLOGY.ranking} />
      <div className="oecd-section-head">
        <div className="oecd-section-head-l">
          <span className="oecd-section-tag">RANKING</span>
          <h2 className="oecd-section-title">{series?.label}</h2>
          <span className="oecd-section-unit">{series?.unitLabel}</span>
          {projYear != null && isProjected(projYear) ? <OecdProjBadge year={projYear} /> : null}
        </div>
        <div className="oecd-seg" role="group" aria-label="Ranking length">
          <button
            type="button"
            className={!showAll ? 'is-active' : ''}
            aria-pressed={!showAll}
            onClick={() => showAll && onToggleShowAll()}
          >
            Top 5
          </button>
          <button
            type="button"
            className={showAll ? 'is-active' : ''}
            aria-pressed={showAll}
            onClick={() => !showAll && onToggleShowAll()}
          >
            All
          </button>
        </div>
      </div>

      <div className="oecd-rank-rows">
        {visible.map((r, i) => {
          const geo = rankingBarGeometry(r.value, {
            signed: series?.signed,
            clamp: series?.clamp ?? null,
            maxAbs,
          });
          const isSel = r.iso === selectedA;
          return (
            <button
              type="button"
              key={r.iso}
              className={`oecd-rank-row ${isSel ? 'is-selected' : ''}`}
              onClick={() => onPickCountry(r.iso)}
              onMouseEnter={(e) => setTip(tipFromEvent(e, cardRef.current, payloadFor(r, geo)))}
              onMouseMove={(e) => setTip(tipFromEvent(e, cardRef.current, payloadFor(r, geo)))}
              onMouseLeave={() => setTip(null)}
              onFocus={(e) =>
                setTip(tipFromElement(e.currentTarget, cardRef.current, payloadFor(r, geo)))
              }
              onBlur={() => setTip(null)}
              aria-pressed={isSel}
            >
              <span className="oecd-rank-num oecd-num">{i + 1}</span>
              <span className="oecd-rank-name oecd-num">{r.name}</span>
              <span className="oecd-rank-track">
                {series?.signed ? <span className="oecd-rank-zero" aria-hidden="true" /> : null}
                {tick != null ? (
                  <span
                    className="oecd-rank-tick"
                    style={{ left: `${tick}%` }}
                    title={`OECD: ${formatValue(oecdCell.value, series)}`}
                    aria-hidden="true"
                  />
                ) : null}
                <span
                  className={`oecd-rank-bar ${r.value < 0 ? 'is-neg' : ''}`}
                  style={{ left: `${geo.left}%`, width: `${geo.width}%` }}
                />
              </span>
              <span className="oecd-rank-val oecd-num">{formatValue(r.value, series)}</span>
              <span className="oecd-rank-flag oecd-num">{geo.offScale ? '▸ off-scale' : ''}</span>
            </button>
          );
        })}
      </div>

      <p className="oecd-rank-foot">
        {tick != null ? (
          <span className="oecd-rank-foot-tick">
            <span className="oecd-rank-tick oecd-rank-tick--legend" aria-hidden="true" /> OECD
            reference
          </span>
        ) : null}
        <span className="oecd-rank-note">{scalingNote(series)}</span>
      </p>
      <OecdTip tip={tip} />
    </section>
  );
}

/** X position (%) of a value on the ranking axis, mirroring bar geometry. */
function tickPosition(value, series, maxAbs) {
  const v = toNum(value);
  if (v == null) return null;
  const clamp = series?.clamp ?? null;
  const cap = clamp != null ? clamp : Infinity;
  const capped = Math.max(-cap, Math.min(cap, v));
  const denom = clamp != null ? cap : maxAbs || 1;
  const frac = Math.min(1, Math.abs(capped) / (denom || 1));
  if (series?.signed) return 50 + Math.sign(capped) * frac * 50;
  return frac * 100;
}
