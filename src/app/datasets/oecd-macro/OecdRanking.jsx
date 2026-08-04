'use client';

/**
 * Ranking — countries ordered best-to-worst for the selected indicator, one bar
 * each. Geometry comes from `rankingBarGeometry`: signed indicators diverge
 * around a centered zero line; clamped indicators (gross debt) cap the bar and
 * flag `▸ off-scale` so one outlier can't collapse every other bar. The OECD
 * aggregate is drawn as a reference tick on the axis — never as a ranked row.
 * The footer states the active scaling rule in words (`scalingNote`).
 */
import { useMemo } from 'react';
import {
  rankingBarGeometry,
  scalingNote,
  formatValue,
  isProjected,
  toNum,
} from '@/lib/oecd-scales';
import { columnValues, aggregate } from './oecd-explorer-model';
import OecdProjBadge from './OecdProjBadge';

export default function OecdRanking({
  model,
  slug,
  series,
  selectedA,
  showAll,
  onToggleShowAll,
  onPickCountry,
}) {
  const { ranked, maxAbs, projYear } = useMemo(() => {
    const values = columnValues(model, slug);
    const rows = Object.entries(values)
      .map(([iso, v]) => ({ iso, value: toNum(v), name: model.bySlug[slug]?.[iso]?.name || iso }))
      .filter((r) => r.value != null);

    const inv = !!series?.inv && !series?.signed;
    rows.sort((a, b) => (inv ? a.value - b.value : b.value - a.value));

    // Denominator for unsigned/signed bar widths. Clamped indicators use their
    // clamp as the denom inside rankingBarGeometry, so maxAbs is only a fallback.
    let maxAbs = 0;
    for (const r of rows) maxAbs = Math.max(maxAbs, Math.abs(r.value));
    if (maxAbs === 0) maxAbs = 1;

    return { ranked: rows, maxAbs, projYear: model.latestYearBySlug[slug] };
  }, [model, slug, series]);

  const visible = showAll ? ranked : ranked.slice(0, 5);

  // OECD reference tick position on the same axis as the bars.
  const oecdCell = aggregate(model, slug, 'OECD');
  const tick = oecdCell ? tickPosition(oecdCell.value, series, maxAbs) : null;

  return (
    <section className="oecd-card oecd-ranking-card">
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
              <span className="oecd-rank-flag oecd-num">{geo.offScale ? '▸ off-scale' : ''}</span>
              <span className="oecd-rank-val oecd-num">{formatValue(r.value, series)}</span>
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
