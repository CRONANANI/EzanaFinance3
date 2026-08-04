'use client';

/**
 * Heatmap matrix — rows are countries (aggregates excluded), columns are the
 * active lens's indicators (headline set when lens === 'all'). Cell backgrounds
 * come from `heatmapCellStyle` (diverging for signed indicators, quantile tint
 * otherwise), so no single outlier blows out a column's ramp.
 *
 * Every navigable element is a real <button>: a column header sets the indicator,
 * a row's country name sets country A, a cell sets both. This matrix is the
 * primary navigation control on a public page, so keyboard/ARIA parity matters.
 *
 * Normalization is memoized per column (keyed on the slug set + payload) so hover
 * never recomputes the scales.
 */
import { useMemo } from 'react';
import { OECD_SERIES_BY_SLUG } from '@/lib/oecd-curated';
import {
  columnQuantiles,
  heatmapCellStyle,
  formatValue,
  isProjected,
  toNum,
} from '@/lib/oecd-scales';
import { columnValues } from './oecd-explorer-model';
import OecdProjBadge from './OecdProjBadge';

export default function OecdMatrix({
  model,
  slugs,
  lens,
  ind,
  selectedA,
  onPickIndicator,
  onPickCountry,
}) {
  const columns = useMemo(() => {
    return slugs.map((slug) => {
      const series = OECD_SERIES_BY_SLUG[slug];
      const values = columnValues(model, slug);
      const q = columnQuantiles(Object.values(values));
      return {
        slug,
        series,
        values,
        q,
        year: model.latestYearBySlug[slug],
      };
    });
  }, [slugs, model]);

  // Section-level projection badge only when EVERY column is one projected year.
  const sectionProjYear = useMemo(() => {
    const years = columns.map((c) => c.year).filter((y) => y != null);
    if (years.length === 0 || years.length !== columns.length) return null;
    const uniq = [...new Set(years)];
    if (uniq.length === 1 && isProjected(uniq[0])) return uniq[0];
    return null;
  }, [columns]);

  return (
    <section className="oecd-card oecd-matrix-card">
      <div className="oecd-section-head">
        <div className="oecd-section-head-l">
          <span className="oecd-section-tag">MATRIX</span>
          <h2 className="oecd-section-title">
            {lens === 'all' ? 'Headline indicators' : 'Lens indicators'} · by country
          </h2>
        </div>
        {sectionProjYear ? <OecdProjBadge year={sectionProjYear} /> : null}
      </div>

      <div className="oecd-matrix-scroll">
        <table className="oecd-matrix">
          <thead>
            <tr>
              <th scope="col" className="oecd-matrix-corner">
                Country
              </th>
              {columns.map((c) => (
                <th scope="col" key={c.slug} className="oecd-matrix-colh">
                  <button
                    type="button"
                    className={`oecd-colh-btn ${c.slug === ind ? 'is-active' : ''}`}
                    onClick={() => onPickIndicator(c.slug)}
                    title={`${c.series.label} (${c.series.unitLabel})`}
                    aria-pressed={c.slug === ind}
                  >
                    {c.series.short}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.countries.map((country) => (
              <tr key={country.iso} className={country.iso === selectedA ? 'is-selected' : ''}>
                <th scope="row" className="oecd-matrix-rowh">
                  <button
                    type="button"
                    className={`oecd-rowh-btn ${country.iso === selectedA ? 'is-active' : ''}`}
                    onClick={() => onPickCountry(country.iso)}
                    aria-pressed={country.iso === selectedA}
                  >
                    {country.name}
                  </button>
                </th>
                {columns.map((c) => {
                  const raw = c.values[country.iso];
                  const v = toNum(raw);
                  const clampExceeded =
                    c.series.clamp != null && v != null && Math.abs(v) > c.series.clamp;
                  const bg = heatmapCellStyle(v, c.q, { signed: c.series.signed });
                  return (
                    <td key={c.slug} className="oecd-matrix-cell">
                      <button
                        type="button"
                        className={`oecd-cell-btn oecd-num ${clampExceeded ? 'is-offscale' : ''} ${
                          c.slug === ind && country.iso === selectedA ? 'is-focus' : ''
                        }`}
                        style={{ background: bg }}
                        onClick={() => {
                          onPickIndicator(c.slug);
                          onPickCountry(country.iso);
                        }}
                        aria-label={`${country.name}, ${c.series.label}: ${
                          v == null ? 'no data' : formatValue(v, c.series)
                        }`}
                      >
                        {v == null ? '—' : formatValue(v, c.series)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
