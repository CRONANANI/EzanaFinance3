'use client';

/**
 * Empire-dimension matrix (phase 5). Two views over the live Empire-Rankings
 * backbone (World Bank scoring):
 *  - dim === 'all': one column per LIVE dimension, cell = that country's
 *    normalized 0–100 score. Rows ordered by the mean score (compositeRanks,
 *    coverage floor). Scores are already direction-corrected — no inversion.
 *  - dim === <id>: a leading SCORE column (the dimension's score, emphasized)
 *    plus one column per contributing World Bank metric with raw value + unit.
 *    Rows ordered by the dimension score; countries without a score drop to the
 *    insufficient band. Metric columns tint by their own higher/lower-is-better
 *    direction, and a raw value older than the score vintage by >2y renders muted.
 *
 * LIVE-ONLY: no mock data. Column headers do NOT retarget anything (empire
 * metrics have no OECD ranking/history), so they are plain text, not buttons.
 * Rows still set country A (chains into the empire-mode radar/profile). Cell
 * hover/focus tooltip + row/column crosshair follow the OECD matrix grammar.
 */
import { useMemo, useRef, useState } from 'react';
import { columnQuantiles, compositeRanks, normalizeIndicator, toNum } from '@/lib/oecd-scales';
import { empireScore, empireMetric } from './oecd-empire-matrix-model';
import OecdTip, { tipFromEvent, tipFromElement } from './OecdTip';

const STALE_YEARS = 2;

function fmtScore(v) {
  return v == null ? '—' : Math.round(v).toString();
}
function fmtMetric(v, unit) {
  if (v == null) return '—';
  if (unit === 'US$') {
    const a = Math.abs(v);
    if (a >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
    if (a >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (a >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    return v.toFixed(0);
  }
  if (Math.abs(v) >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return v.toFixed(1);
}
function empireTint(n) {
  if (n == null) return 'transparent';
  const above = n >= 0.5;
  const mag = Math.min(1, Math.abs(n - 0.5) * 2);
  const alpha = (28 * mag).toFixed(1);
  return `color-mix(in srgb, var(${above ? '--emerald' : '--negative'}) ${alpha}%, transparent)`;
}

export default function OecdEmpireMatrix({ model, dim, selectedA, query, onPickCountry }) {
  const cardRef = useRef(null);
  const [tip, setTip] = useState(null);
  const [hover, setHover] = useState(null); // { iso, key }

  const isAll = dim === 'all' || !model.dimById.has(dim);
  const activeDim = isAll ? null : model.dimById.get(dim);

  // Display columns per view.
  const columns = useMemo(() => {
    if (isAll) {
      return model.liveDims.map((d) => ({
        key: d.id,
        label: d.name,
        short: d.short || d.name,
        kind: 'score',
        higherIsBetter: true,
        unit: '',
        valueOf: (iso) => empireScore(model, iso, d.id),
        yearOf: () => model.year,
      }));
    }
    const cols = [
      {
        key: '__score',
        label: `${activeDim.name} score`,
        short: 'SCORE',
        kind: 'score',
        emphasis: true,
        higherIsBetter: true,
        unit: '',
        valueOf: (iso) => empireScore(model, iso, activeDim.id),
        yearOf: () => model.year,
      },
    ];
    for (const mid of activeDim.metricIds || []) {
      const meta = model.metrics[mid] || { label: mid, unit: '', higherIsBetter: true };
      cols.push({
        key: mid,
        label: meta.label,
        short: meta.label,
        kind: 'metric',
        higherIsBetter: meta.higherIsBetter !== false,
        unit: meta.unit || '',
        valueOf: (iso) => empireMetric(model, iso, mid)?.value ?? null,
        yearOf: (iso) => empireMetric(model, iso, mid)?.year ?? null,
      });
    }
    return cols;
  }, [isAll, activeDim, model]);

  // Per-column normalization (direction-aware) + quantiles + rank map, memoized.
  const colState = useMemo(() => {
    const state = new Map();
    for (const c of columns) {
      const valuesObj = {};
      for (const { iso } of model.countries) {
        const v = toNum(c.valueOf(iso));
        if (v != null) valuesObj[iso] = v;
      }
      const norm = normalizeIndicator(valuesObj, { inv: !c.higherIsBetter });
      const q = columnQuantiles(Object.values(valuesObj));
      // Rank #1 = strongest (norm desc).
      const ordered = Object.entries(norm).sort((a, b) => b[1] - a[1]);
      const rankByIso = new Map();
      ordered.forEach(([iso], i) => rankByIso.set(iso, i + 1));
      state.set(c.key, { norm, q, rankByIso, n: ordered.length });
    }
    return state;
  }, [columns, model]);

  // Row order: mean score across shown score columns (compositeRanks). For a
  // single dimension, only the SCORE column drives order (metrics don't rank).
  const { rankByIso, rankedIsos } = useMemo(() => {
    const rankingCols = isAll ? columns : columns.filter((c) => c.key === '__score');
    const vbas = new Map();
    const series = {};
    for (const c of rankingCols) {
      const m = new Map();
      for (const { iso } of model.countries) {
        const v = toNum(c.valueOf(iso));
        if (v != null) m.set(iso, v);
      }
      vbas.set(c.key, m);
      series[c.key] = { inv: false }; // scores already higher = better
    }
    const { ranked } = compositeRanks(vbas, series, { minCoverage: 0.5 });
    return {
      rankByIso: new Map(ranked.map((r) => [r.area, r.rank])),
      rankedIsos: ranked.map((r) => r.area),
    };
  }, [isAll, columns, model]);

  const countryByIso = useMemo(
    () => new Map(model.countries.map((c) => [c.iso, c])),
    [model.countries],
  );

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

  const colCount = columns.length + 2;

  const payloadFor = (country, c) => {
    const v = toNum(c.valueOf(country.iso));
    const obsYear = c.yearOf(country.iso);
    const st = colState.get(c.key);
    const rk = st?.rankByIso.get(country.iso);
    const stale =
      c.kind === 'metric' && obsYear != null && Math.abs(obsYear - model.year) > STALE_YEARS;
    const lines = [
      {
        label: c.label,
        value:
          c.kind === 'score' ? fmtScore(v) : `${fmtMetric(v, c.unit)}${c.unit ? ` ${c.unit}` : ''}`,
      },
      { label: 'Year', value: obsYear != null ? String(obsYear) : '—' },
      { label: 'Rank', value: rk ? `#${rk}/${st.n}` : '—' },
    ];
    if (stale) lines.push({ label: 'Note', value: 'observation >2y older than score vintage' });
    return { title: country.name, lines };
  };

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
        const v = toNum(c.valueOf(country.iso));
        const st = colState.get(c.key);
        const bg = empireTint(st?.norm[country.iso] ?? null);
        const obsYear = c.yearOf(country.iso);
        const stale =
          c.kind === 'metric' && obsYear != null && Math.abs(obsYear - model.year) > STALE_YEARS;
        const disp = c.kind === 'score' ? fmtScore(v) : fmtMetric(v, c.unit);
        const isCross = hover?.key === c.key;
        return (
          <td
            key={c.key}
            className={`oecd-matrix-cell ${isCross ? 'is-hover-col' : ''} ${
              c.emphasis ? 'is-score-col' : ''
            }`}
          >
            <button
              type="button"
              className={`oecd-cell-btn oecd-num ${stale ? 'is-stale' : ''}`}
              style={{ background: bg }}
              onClick={() => onPickCountry(country.iso)}
              onMouseEnter={(e) => {
                setHover({ iso: country.iso, key: c.key });
                setTip(tipFromEvent(e, cardRef.current, payloadFor(country, c)));
              }}
              onMouseMove={(e) => setTip(tipFromEvent(e, cardRef.current, payloadFor(country, c)))}
              onMouseLeave={() => setTip(null)}
              onFocus={(e) => {
                setHover({ iso: country.iso, key: c.key });
                setTip(tipFromElement(e.currentTarget, cardRef.current, payloadFor(country, c)));
              }}
              onBlur={() => setTip(null)}
              aria-label={`${country.name}, ${c.label}: ${v == null ? 'no data' : disp}`}
            >
              {disp}
              {c.kind === 'metric' && c.unit && v != null ? (
                <span className="oecd-cell-unit"> {c.unit}</span>
              ) : null}
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
            {isAll ? 'Empire dimensions · by country' : `${activeDim.name} · metrics by country`}
          </h2>
          <span className="oecd-sort-note">
            ranked by {isAll ? 'mean live-dimension score' : 'dimension score'}
          </span>
        </div>
        <span className="oecd-wb-badge oecd-num" title="World Bank Open Data score vintage">
          {model.year} · WORLD BANK
        </span>
      </div>

      <div className="oecd-matrix-scroll">
        <table className="oecd-matrix" onMouseLeave={() => setHover(null)}>
          <colgroup>
            <col className="oecd-matrix-col-rank" />
            <col className="oecd-matrix-col-country" />
            {columns.map((c) => (
              <col key={c.key} />
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
                  key={c.key}
                  className={`oecd-matrix-colh is-static ${
                    hover?.key === c.key ? 'is-hover-col' : ''
                  } ${c.emphasis ? 'is-score-col' : ''}`}
                  title={`${c.label}${c.unit ? ` (${c.unit})` : ''}`}
                >
                  <span className="oecd-colh-static">{c.short}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rankedRows.map((country) => renderRow(country, rankByIso.get(country.iso)))}
            {insufficientRows.length > 0 ? (
              <tr className="oecd-matrix-divider">
                <td colSpan={colCount}>
                  NO LIVE SCORE · {insufficientTotal}{' '}
                  {insufficientTotal === 1 ? 'country' : 'countries'} without a score for this view
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

      <p className="oecd-matrix-attr">
        Source: World Bank Open Data via the Ezana Empire Rankings backbone · scores {model.year}
      </p>
      <OecdTip tip={tip} />
    </section>
  );
}
