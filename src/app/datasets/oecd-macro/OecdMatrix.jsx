'use client';

/**
 * Heatmap matrix — rows are countries (aggregates excluded), columns are the
 * active lens's indicators (headline set when lens === 'all'). Cell backgrounds
 * come from `heatmapCellStyle` (diverging for signed indicators, quantile tint
 * otherwise), so no single outlier blows out a column's ramp.
 *
 * Rows are ordered by COMPOSITE RANK across the visible columns — each indicator
 * is rank-normalized (inv respected), a country's composite is the mean over the
 * columns it has data for, and the table lists strongest first, re-ranking on
 * every lens change. Countries with data for fewer than half the columns are
 * pulled into a separate, disclosed "insufficient coverage" band rather than
 * ranked on partial data.
 *
 * Every navigable element is a real <button>: a column header sets the indicator,
 * a row's country name sets country A, a cell sets both. Hovering (or focusing) a
 * cell raises a tooltip and tints that cell's whole row and column — a terminal
 * crosshair driven by a single hovered-cell id, not per-mousemove state.
 */
import { useMemo, useRef, useState } from 'react';
import { OECD_SERIES_BY_SLUG } from '@/lib/oecd-curated';
import {
  columnQuantiles,
  compositeRanks,
  heatmapCellStyle,
  formatValue,
  isProjected,
  toNum,
} from '@/lib/oecd-scales';
import { columnValues, rankWithin } from './oecd-explorer-model';
import OecdProjBadge from './OecdProjBadge';
import OecdEmpireMatrix from './OecdEmpireMatrix';
import OecdTip, { tipFromEvent, tipFromElement } from './OecdTip';

const SORT_NOTE =
  'Countries are rank-normalized per indicator (inverted where lower is better) and ordered by the mean across the columns shown; countries with data for fewer than half the columns are listed separately.';

export default function OecdMatrix({
  model,
  slugs,
  lens,
  ind,
  selectedA,
  query,
  onPickIndicator,
  onPickCountry,
  // phase 5 — empire-dimension matrix (null → OECD-lens fallback below)
  empireMatrix = null,
  dim = 'all',
  empireUnavailable = false,
}) {
  // Empire-dimension view when the live backbone payload is present. The OECD
  // path below is retained as the null-payload fallback.
  if (empireMatrix) {
    return (
      <OecdEmpireMatrix
        model={empireMatrix}
        dim={dim}
        selectedA={selectedA}
        query={query}
        onPickCountry={onPickCountry}
      />
    );
  }

  return (
    <OecdLensMatrix
      model={model}
      slugs={slugs}
      lens={lens}
      ind={ind}
      selectedA={selectedA}
      query={query}
      onPickIndicator={onPickIndicator}
      onPickCountry={onPickCountry}
      empireUnavailable={empireUnavailable}
    />
  );
}

function OecdLensMatrix({
  model,
  slugs,
  lens,
  ind,
  selectedA,
  query,
  onPickIndicator,
  onPickCountry,
  empireUnavailable,
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

  // Composite rank across the visible columns — re-ranks whenever the lens (and
  // thus `columns`) changes. Ordinal only: the raw composite is never displayed.
  const { rankByIso, rankedIsos } = useMemo(() => {
    const vbas = new Map();
    for (const c of columns) vbas.set(c.slug, new Map(Object.entries(c.values)));
    const { ranked } = compositeRanks(vbas, OECD_SERIES_BY_SLUG, { minCoverage: 0.5 });
    return {
      rankByIso: new Map(ranked.map((r) => [r.area, r.rank])),
      rankedIsos: ranked.map((r) => r.area),
    };
  }, [columns]);

  const countryByIso = useMemo(
    () => new Map(model.countries.map((c) => [c.iso, c])),
    [model.countries],
  );

  // Display order: ranked (by rank) then the insufficient band (everything not
  // ranked — <half coverage or no data in these columns — alphabetical by name,
  // which model.countries already is). Query filters which rows are shown.
  const { rankedRows, insufficientRows, insufficientTotal } = useMemo(() => {
    const rankedList = rankedIsos.map((iso) => countryByIso.get(iso)).filter(Boolean);
    const insufficientList = model.countries.filter((c) => !rankByIso.has(c.iso));
    const needle = (query || '').trim().toLowerCase();
    const match = (c) =>
      !needle || c.name.toLowerCase().includes(needle) || c.iso.toLowerCase().includes(needle);
    return {
      rankedRows: rankedList.filter(match),
      insufficientRows: insufficientList.filter(match),
      insufficientTotal: insufficientList.length,
    };
  }, [rankedIsos, rankByIso, countryByIso, model.countries, query]);

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

  const colCount = columns.length + 2; // rank + country + indicators

  const renderRow = (country, rankCell) => (
    <tr
      key={country.iso}
      className={`${country.iso === selectedA ? 'is-selected' : ''} ${
        hover?.iso === country.iso ? 'is-hover-row' : ''
      }`}
    >
      <td className="oecd-matrix-rank oecd-num">{rankCell}</td>
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
        const clampExceeded = c.series.clamp != null && v != null && Math.abs(v) > c.series.clamp;
        const bg = heatmapCellStyle(v, c.q, { signed: c.series.signed });
        const isCross = hover?.slug === c.slug;
        return (
          <td key={c.slug} className={`oecd-matrix-cell ${isCross ? 'is-hover-col' : ''}`}>
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
              onMouseMove={(e) => setTip(tipFromEvent(e, cardRef.current, payloadFor(country, c)))}
              onMouseLeave={() => setTip(null)}
              onFocus={(e) => {
                setHover({ iso: country.iso, slug: c.slug });
                setTip(tipFromElement(e.currentTarget, cardRef.current, payloadFor(country, c)));
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
  );

  return (
    <section className="oecd-card oecd-matrix-card" ref={cardRef}>
      <div className="oecd-section-head">
        <div className="oecd-section-head-l">
          <span className="oecd-section-tag">MATRIX</span>
          <h2 className="oecd-section-title">
            {lens === 'all' ? 'Headline indicators' : 'Lens indicators'} · by country
          </h2>
          <span
            className="oecd-sort-note"
            tabIndex={0}
            role="note"
            onMouseEnter={(e) =>
              setTip(
                tipFromEvent(e, cardRef.current, { title: 'Composite ranking', note: SORT_NOTE }),
              )
            }
            onMouseMove={(e) =>
              setTip(
                tipFromEvent(e, cardRef.current, { title: 'Composite ranking', note: SORT_NOTE }),
              )
            }
            onMouseLeave={() => setTip(null)}
            onFocus={(e) =>
              setTip(
                tipFromElement(e.currentTarget, cardRef.current, {
                  title: 'Composite ranking',
                  note: SORT_NOTE,
                }),
              )
            }
            onBlur={() => setTip(null)}
          >
            ranked by composite of visible indicators
          </span>
        </div>
        {sectionProjYear ? (
          <span title="Actuals through 2023; 2024–25 are OECD Economic Outlook projections.">
            <OecdProjBadge year={sectionProjYear} />
          </span>
        ) : null}
      </div>

      {empireUnavailable ? (
        <p className="oecd-matrix-notice">
          Empire-dimension scores are temporarily unavailable — showing the OECD indicator matrix.
        </p>
      ) : null}

      <div className="oecd-matrix-scroll">
        <table className="oecd-matrix" onMouseLeave={() => setHover(null)}>
          <colgroup>
            <col className="oecd-matrix-col-rank" />
            <col className="oecd-matrix-col-country" />
            {columns.map((c) => (
              <col key={c.slug} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                scope="col"
                className="oecd-matrix-corner oecd-matrix-corner--rank"
                aria-label="Rank"
              >
                #
              </th>
              <th scope="col" className="oecd-matrix-corner oecd-matrix-corner--country">
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
            {rankedRows.map((country) => renderRow(country, rankByIso.get(country.iso)))}

            {insufficientRows.length > 0 ? (
              <tr className="oecd-matrix-divider">
                <td colSpan={colCount}>
                  INSUFFICIENT COVERAGE · {insufficientTotal}{' '}
                  {insufficientTotal === 1 ? 'country' : 'countries'} with data for fewer than half
                  of these indicators
                </td>
              </tr>
            ) : null}

            {insufficientRows.map((country) => renderRow(country, '·'))}
          </tbody>
        </table>
        {rankedRows.length === 0 && insufficientRows.length === 0 ? (
          <p className="oecd-matrix-empty">No country matches “{query}”.</p>
        ) : null}
      </div>
      <OecdTip tip={tip} />
    </section>
  );
}
