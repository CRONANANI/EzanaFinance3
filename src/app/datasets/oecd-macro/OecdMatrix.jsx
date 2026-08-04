'use client';

/**
 * Heatmap matrix — rows are countries (aggregates excluded), columns are the
 * active lens's indicators (headline set when lens === 'all'). Cell backgrounds
 * come from `heatmapCellStyle` (diverging for signed indicators, quantile tint
 * otherwise), so no single outlier blows out a column's ramp.
 *
 * Every navigable element is a real <button>: a column header sets the indicator,
 * a row's country name sets country A, a cell sets both. Hovering (or focusing) a
 * cell raises a tooltip (country · indicator · value · year/PROJ · rank) and
 * tints that cell's whole row and column — a terminal-style crosshair. The
 * crosshair is driven by a single hovered-cell id, not per-mousemove state.
 *
 * Normalization is memoized per column (keyed on the slug set + payload) so hover
 * never recomputes the scales.
 */
import { useMemo, useRef, useState } from 'react';
import { OECD_SERIES_BY_SLUG } from '@/lib/oecd-curated';
import {
  columnQuantiles,
  heatmapCellStyle,
  formatValue,
  isProjected,
  toNum,
} from '@/lib/oecd-scales';
import { columnValues, rankWithin } from './oecd-explorer-model';
import OecdProjBadge from './OecdProjBadge';
import OecdTip, { tipFromEvent, tipFromElement } from './OecdTip';

export default function OecdMatrix({
  model,
  slugs,
  lens,
  ind,
  selectedA,
  query,
  onPickIndicator,
  onPickCountry,
}) {
  const cardRef = useRef(null);
  const [tip, setTip] = useState(null);
  const [hover, setHover] = useState(null); // { iso, slug }

  const columns = useMemo(() => {
    return slugs.map((slug) => {
      const series = OECD_SERIES_BY_SLUG[slug];
      const values = columnValues(model, slug);
      const q = columnQuantiles(Object.values(values));
      return { slug, series, values, q, year: model.latestYearBySlug[slug] };
    });
  }, [slugs, model]);

  const rows = useMemo(() => {
    const needle = (query || '').trim().toLowerCase();
    if (!needle) return model.countries;
    return model.countries.filter(
      (c) => c.name.toLowerCase().includes(needle) || c.iso.toLowerCase().includes(needle),
    );
  }, [model.countries, query]);

  // Section-level projection badge only when EVERY column is one projected year.
  const sectionProjYear = useMemo(() => {
    const years = columns.map((c) => c.year).filter((y) => y != null);
    if (years.length === 0 || years.length !== columns.length) return null;
    const uniq = [...new Set(years)];
    if (uniq.length === 1 && isProjected(uniq[0])) return uniq[0];
    return null;
  }, [columns]);

  const payloadFor = (country, col) => {
    const v = toNum(col.values[country.iso]);
    const rk = rankWithin(model, col.slug, country.iso, { inv: col.series.inv });
    const projected = col.year != null && isProjected(col.year);
    return {
      title: country.name,
      lines: [
        { label: col.series.label, value: v == null ? '—' : formatValue(v, col.series) },
        { label: 'Unit', value: col.series.unitLabel },
        { label: 'Year', value: `${col.year ?? '—'}${projected ? ' · PROJ' : ''}` },
        { label: 'Rank', value: rk ? `#${rk.rank}/${rk.n}` : '—' },
      ],
    };
  };

  return (
    <section className="oecd-card oecd-matrix-card" ref={cardRef}>
      <div className="oecd-section-head">
        <div className="oecd-section-head-l">
          <span className="oecd-section-tag">MATRIX</span>
          <h2 className="oecd-section-title">
            {lens === 'all' ? 'Headline indicators' : 'Lens indicators'} · by country
          </h2>
        </div>
        {sectionProjYear ? (
          <span title="Actuals through 2023; 2024–25 are OECD Economic Outlook projections.">
            <OecdProjBadge year={sectionProjYear} />
          </span>
        ) : null}
      </div>

      <div className="oecd-matrix-scroll">
        <table className="oecd-matrix" onMouseLeave={() => setHover(null)}>
          <colgroup>
            <col className="oecd-matrix-col-country" />
            {columns.map((c) => (
              <col key={c.slug} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="oecd-matrix-corner">
                Country
              </th>
              {columns.map((c) => (
                <th
                  scope="col"
                  key={c.slug}
                  className={`oecd-matrix-colh ${hover?.slug === c.slug ? 'is-hover-col' : ''}`}
                >
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
            {rows.map((country) => (
              <tr
                key={country.iso}
                className={`${country.iso === selectedA ? 'is-selected' : ''} ${
                  hover?.iso === country.iso ? 'is-hover-row' : ''
                }`}
              >
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
                  const v = toNum(c.values[country.iso]);
                  const clampExceeded =
                    c.series.clamp != null && v != null && Math.abs(v) > c.series.clamp;
                  const bg = heatmapCellStyle(v, c.q, { signed: c.series.signed });
                  const isCross = hover?.slug === c.slug;
                  return (
                    <td
                      key={c.slug}
                      className={`oecd-matrix-cell ${isCross ? 'is-hover-col' : ''}`}
                    >
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
                        onMouseEnter={(e) => {
                          setHover({ iso: country.iso, slug: c.slug });
                          setTip(tipFromEvent(e, cardRef.current, payloadFor(country, c)));
                        }}
                        onMouseMove={(e) =>
                          setTip(tipFromEvent(e, cardRef.current, payloadFor(country, c)))
                        }
                        onMouseLeave={() => setTip(null)}
                        onFocus={(e) => {
                          setHover({ iso: country.iso, slug: c.slug });
                          setTip(
                            tipFromElement(
                              e.currentTarget,
                              cardRef.current,
                              payloadFor(country, c),
                            ),
                          );
                        }}
                        onBlur={() => setTip(null)}
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
        {rows.length === 0 ? (
          <p className="oecd-matrix-empty">No country matches “{query}”.</p>
        ) : null}
      </div>
      <OecdTip tip={tip} />
    </section>
  );
}
