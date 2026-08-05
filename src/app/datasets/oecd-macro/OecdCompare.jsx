'use client';

/**
 * Compare table (phase 6) — replaces the single-country profile. Up to 4 selected
 * countries side by side on the underlying values of the current selection:
 *  - OECD mode: the lens chips' indicators (all 20 grouped by lens header when
 *    the local filter is 'all'). Row click sets `ind` (preserves profile chaining).
 *  - Empire mode: the Focus group's dimension SCOREs; clicking a dimension drills
 *    into its contributing World Bank metrics (a local back-link returns).
 *
 * Columns: one per selected country (colour dot + ISO3). Exactly 2 countries add
 * a direction-aware `Δ A−B`; 3–4 mark the best value per row with an emerald ring
 * instead. Every value keeps a `#n/N` rank chip. Missing → em-dash (excluded from
 * best-of); stale empire metrics (>2y off vintage) render muted.
 */
import { useMemo, useState } from 'react';
import { OECD_LENSES, OECD_CURATED_SERIES } from '@/lib/oecd-curated';
import { formatValue, toNum } from '@/lib/oecd-scales';
import { rankWithin } from './oecd-explorer-model';
import { dimensionIdsForFocus } from '@/lib/empire-dimension-groups';

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

/** Rank of `iso` (#1 strongest) across a value map keyed by iso, direction-aware. */
function rankIn(valueByIso, iso, { inv = false } = {}) {
  const present = Object.entries(valueByIso).filter(([, v]) => v != null);
  const mine = valueByIso[iso];
  if (mine == null) return null;
  const sorted = present.map(([, v]) => v).sort((a, b) => (inv ? a - b : b - a));
  return { rank: sorted.indexOf(mine) + 1, n: sorted.length };
}

export default function OecdCompare({
  mode,
  selected,
  colors,
  names,
  model,
  empireMatrixModel,
  lens,
  ind,
  onPickIndicator,
  focus,
}) {
  const isEmpire = mode === 'empire' && empireMatrixModel;
  const [drillDim, setDrillDim] = useState(null);

  // ── Build the row list per mode/selection ──────────────────────────────────
  const rows = useMemo(() => {
    if (isEmpire) {
      const m = empireMatrixModel;
      if (drillDim && m.dimById.has(drillDim)) {
        const d = m.dimById.get(drillDim);
        const out = [
          { kind: 'score', key: '__score', label: `${d.name} score`, dim: d, emphasis: true },
        ];
        for (const mid of d.metricIds || []) {
          const meta = m.metrics[mid] || { label: mid, unit: '', higherIsBetter: true };
          out.push({ kind: 'metric', key: mid, label: meta.label, metricId: mid, meta });
        }
        return out;
      }
      const ids = dimensionIdsForFocus(focus); // null = all
      const dims = ids ? m.liveDims.filter((d) => ids.has(d.id)) : m.liveDims;
      return dims.map((d) => ({ kind: 'dimScore', key: d.id, label: d.name, dim: d }));
    }

    // OECD
    if (lens === 'all') {
      const out = [];
      for (const l of OECD_LENSES) {
        out.push({ kind: 'group', key: `g-${l.id}`, label: l.label });
        for (const s of OECD_CURATED_SERIES.filter((x) => x.lens === l.id)) {
          out.push({ kind: 'ind', key: s.slug, label: s.label, series: s });
        }
      }
      return out;
    }
    return OECD_CURATED_SERIES.filter((s) => s.lens === lens).map((s) => ({
      kind: 'ind',
      key: s.slug,
      label: s.label,
      series: s,
    }));
  }, [isEmpire, empireMatrixModel, drillDim, focus, lens]);

  const twoUp = selected.length === 2;

  // Resolve a row's per-country value/rank/direction + stale flag.
  const resolveRow = (row) => {
    const valueByIso = {};
    let inv = false;
    let unit = '';
    const meta = { stale: {}, year: {} };

    if (row.kind === 'ind') {
      inv = !!row.series.inv;
      unit = row.series.unitLabel;
      for (const iso of selected)
        valueByIso[iso] = toNum(model.bySlug[row.series.slug]?.[iso]?.value);
      const ranks = {};
      for (const iso of selected) ranks[iso] = rankWithin(model, row.series.slug, iso, { inv });
      return { valueByIso, inv, unit, ranks, fmt: (v) => formatValue(v, row.series), meta };
    }

    // Empire score/dimScore
    if (row.kind === 'score' || row.kind === 'dimScore') {
      const dimId = row.dim.id;
      for (const iso of selected) {
        const v = empireMatrixModel.scoreMap.get(iso)?.get(dimId);
        valueByIso[iso] = v == null ? null : v;
      }
      const all = {};
      for (const [iso, m] of empireMatrixModel.scoreMap) all[iso] = m.get(dimId) ?? null;
      const ranks = {};
      for (const iso of selected) ranks[iso] = rankIn(all, iso, { inv: false });
      return { valueByIso, inv: false, unit: '', ranks, fmt: (v) => fmtScore(v), meta };
    }

    // Empire metric
    inv = !(row.meta.higherIsBetter !== false);
    unit = row.meta.unit || '';
    const all = {};
    for (const [iso, mm] of empireMatrixModel.metricValueMap)
      all[iso] = mm.get(row.metricId)?.value ?? null;
    for (const iso of selected) {
      const cell = empireMatrixModel.metricValueMap.get(iso)?.get(row.metricId);
      valueByIso[iso] = cell?.value ?? null;
      meta.year[iso] = cell?.year ?? null;
      meta.stale[iso] =
        cell?.year != null && Math.abs(cell.year - empireMatrixModel.year) > STALE_YEARS;
    }
    const ranks = {};
    for (const iso of selected) ranks[iso] = rankIn(all, iso, { inv });
    return { valueByIso, inv, unit, ranks, fmt: (v) => fmtMetric(v, unit), meta };
  };

  const bestIso = (valueByIso, inv) => {
    let best = null;
    let bestV = null;
    for (const iso of selected) {
      const v = valueByIso[iso];
      if (v == null) continue;
      if (bestV == null || (inv ? v < bestV : v > bestV)) {
        bestV = v;
        best = iso;
      }
    }
    return best;
  };

  const onRowClick = (row) => {
    if (row.kind === 'ind') onPickIndicator(row.series.slug);
    else if (row.kind === 'dimScore') setDrillDim(row.dim.id);
  };

  return (
    <div className="oecd-compare">
      {isEmpire && drillDim ? (
        <button type="button" className="oecd-compare-back" onClick={() => setDrillDim(null)}>
          ← all dimensions
        </button>
      ) : null}

      <div className="oecd-compare-scroll">
        <table className="oecd-compare-table">
          <thead>
            <tr>
              <th className="oecd-compare-rowh-corner" scope="col" />
              {selected.map((iso, i) => (
                <th key={iso} scope="col" className="oecd-compare-ch oecd-num">
                  <span
                    className="oecd-compare-dot"
                    style={{ background: colors[i] }}
                    aria-hidden="true"
                  />
                  {iso}
                </th>
              ))}
              {twoUp ? (
                <th scope="col" className="oecd-compare-ch oecd-num">
                  Δ A−B
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              if (row.kind === 'group') {
                return (
                  <tr key={row.key} className="oecd-compare-group">
                    <td colSpan={selected.length + 1 + (twoUp ? 1 : 0)}>{row.label}</td>
                  </tr>
                );
              }
              const r = resolveRow(row);
              const best = !twoUp ? bestIso(r.valueByIso, r.inv) : null;
              const clickable = row.kind === 'ind' || row.kind === 'dimScore';
              const active = row.kind === 'ind' && row.series.slug === ind;
              const va = r.valueByIso[selected[0]];
              const vb = r.valueByIso[selected[1]];
              let delta = null;
              if (twoUp && va != null && vb != null) {
                const diff = va - vb;
                const dec =
                  row.kind === 'ind' ? (row.series.decimals ?? 1) : row.kind === 'metric' ? 1 : 0;
                const favorable = r.inv ? va < vb : va > vb;
                delta = {
                  text: `${diff >= 0 ? '+' : ''}${diff.toFixed(dec)}`,
                  tone: diff === 0 ? '' : favorable ? 'pos' : 'neg',
                };
              }
              return (
                <tr key={row.key} className={active ? 'is-active' : ''}>
                  <th scope="row" className={`oecd-compare-rowh ${row.emphasis ? 'is-score' : ''}`}>
                    {clickable ? (
                      <button
                        type="button"
                        className="oecd-compare-rowbtn"
                        onClick={() => onRowClick(row)}
                      >
                        {row.label}
                      </button>
                    ) : (
                      <span className="oecd-compare-rowlabel">{row.label}</span>
                    )}
                  </th>
                  {selected.map((iso) => {
                    const v = r.valueByIso[iso];
                    const rk = r.ranks[iso];
                    return (
                      <td
                        key={iso}
                        className={`oecd-compare-cell oecd-num ${best === iso ? 'is-best' : ''} ${
                          r.meta.stale?.[iso] ? 'is-stale' : ''
                        }`}
                      >
                        <span className="oecd-compare-val">{v == null ? '—' : r.fmt(v)}</span>
                        {rk ? (
                          <span className="oecd-compare-rank">
                            #{rk.rank}/{rk.n}
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                  {twoUp ? (
                    <td
                      className={`oecd-compare-cell oecd-compare-delta oecd-num ${delta?.tone ? `is-${delta.tone}` : ''}`}
                    >
                      {delta ? delta.text : '—'}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="oecd-compare-foot">
        {isEmpire ? (
          <>
            Scores are the live Empire-Rankings backbone (0–100). Rank chips read #n/N; #1 is
            strongest across countries with data.
          </>
        ) : (
          <>
            Rank chips read #n/N where #1 is the best outcome — lowest for unemployment, inflation,
            rates and debt. N is the number of countries reporting that indicator.
          </>
        )}
      </p>
    </div>
  );
}
