'use client';

/**
 * Interactive council leaderboard table. Data is fetched server-side and passed
 * in as plain rows; this component adds two things the static table couldn't:
 *   - a rank-by toggle (overall / competition / fund) that re-sorts client-side,
 *     so a viewer can see who wins on judged results vs on fund ratios;
 *   - an inline competition-vs-fund contribution bar per row, so the split is
 *     legible without opening the detail page.
 * Ratios only — never dollars.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { WEIGHTS } from '@/lib/council-elo/model';

const TIER_LABEL = {
  emerging: 'Emerging',
  competitive: 'Competitive',
  established: 'Established',
  elite: 'Elite',
  dynasty: 'Dynasty',
};
const fmtRatio = (v, suffix = '') =>
  v == null ? '—' : `${Number(v).toFixed(suffix === '%' ? 1 : 2)}${suffix}`;

const SORTS = [
  { key: 'overall', label: 'Overall', field: 'rating' },
  { key: 'competition', label: 'Competition', field: 'comp' },
  { key: 'fund', label: 'Fund', field: 'fund' },
];

/** Weighted contribution of each engine to the overall rating (blend weights). */
function contributionSplit(comp, fund) {
  const c = WEIGHTS.blend.competition * (comp ?? WEIGHTS.elo.base);
  const f = WEIGHTS.blend.fund * (fund ?? WEIGHTS.fund.ratingBase);
  const total = c + f || 1;
  return { compPct: (c / total) * 100, fundPct: (f / total) * 100 };
}

export default function RankingsTable({ rows }) {
  const [sortKey, setSortKey] = useState('overall');

  const sorted = useMemo(() => {
    const field = SORTS.find((s) => s.key === sortKey)?.field || 'rating';
    return [...rows].sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0));
  }, [rows, sortKey]);

  return (
    <>
      <div className="crx-toolbar" role="group" aria-label="Rank councils by">
        <span className="crx-toolbar-label">Rank by</span>
        {SORTS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`crx-toggle ${sortKey === s.key ? 'is-active' : ''}`}
            aria-pressed={sortKey === s.key}
            onClick={() => setSortKey(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="crx-table-wrap">
        <table className="crx-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Council</th>
              <th>Tier</th>
              <th className="crx-num">Rating</th>
              <th className="crx-split-col">Comp / Fund split</th>
              <th className="crx-num">Comp</th>
              <th className="crx-num">Fund</th>
              <th className="crx-num">ROI</th>
              <th className="crx-num">Sharpe</th>
              <th className="crx-num">Move</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const { compPct, fundPct } = contributionSplit(r.comp, r.fund);
              return (
                <tr key={r.orgId}>
                  <td className="crx-rank">{i + 1}</td>
                  <td>
                    <Link href={`/council-rankings/${r.orgId}`} className="crx-council">
                      {r.name}
                    </Link>
                    {r.selfReported ? (
                      <span className="crx-flag" title="Fund ratios are self-reported">
                        self-reported
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <span className={`crx-tier crx-tier--${r.tier}`}>
                      {TIER_LABEL[r.tier] || r.tier}
                    </span>
                  </td>
                  <td className="crx-num crx-strong">{r.rating}</td>
                  <td className="crx-split-col">
                    <div
                      className="crx-cbar"
                      role="img"
                      aria-label={`Competition ${Math.round(compPct)}%, fund ${Math.round(
                        fundPct,
                      )}% of rating`}
                      title={`Competition ${Math.round(compPct)}% · Fund ${Math.round(fundPct)}%`}
                    >
                      <span className="crx-cbar-comp" style={{ width: `${compPct}%` }} />
                      <span className="crx-cbar-fund" style={{ width: `${fundPct}%` }} />
                    </div>
                  </td>
                  <td className="crx-num">{r.comp}</td>
                  <td className="crx-num">{r.fund}</td>
                  <td className="crx-num">{fmtRatio(r.roi, '%')}</td>
                  <td className="crx-num">{fmtRatio(r.sharpe)}</td>
                  <td className={`crx-num ${r.move > 0 ? 'crx-up' : r.move < 0 ? 'crx-down' : ''}`}>
                    {r.move > 0 ? `+${r.move}` : r.move || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="crx-legend" aria-hidden="true">
        <span className="crx-legend-item">
          <span className="crx-legend-swatch crx-legend-swatch--comp" /> Competition (judged)
        </span>
        <span className="crx-legend-item">
          <span className="crx-legend-swatch crx-legend-swatch--fund" /> Fund (ratios)
        </span>
      </div>
    </>
  );
}
