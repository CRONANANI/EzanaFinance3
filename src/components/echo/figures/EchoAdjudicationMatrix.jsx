'use client';

import { useState } from 'react';
import { EchoFigureShell } from './EchoFigureShell';

export function EchoAdjudicationMatrix({
  figureLabel,
  kicker,
  hint,
  source,
  cols = [],
  rows = [],
}) {
  const [selected, setSelected] = useState(null); // [rowIdx, colIdx]

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      {/* Contained scroll with the row-label column pinned: at 320px the matrix
          is ~640px wide, and without the pin the reader loses which transition
          a cell belongs to as soon as they swipe. */}
      <div className="echo-fig-tablescroll">
        <table className="echo-fig-matrix">
          <thead>
            <tr>
              <th className="echo-fig-matrix-rowhead">Transition \ Dimension</th>
              {cols.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={r.label}>
                <td className="echo-fig-matrix-rowhead">{r.label}</td>
                {r.cells.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`echo-fig-cell echo-fig-cell-${cell.value}`}
                    onClick={() =>
                      setSelected(selected?.[0] === ri && selected?.[1] === ci ? null : [ri, ci])
                    }
                  >
                    {cell.value === 'same' ? 'SAME' : cell.value === 'part' ? 'PART' : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="echo-fig-matrix-legend">
        <span>
          <span
            className="echo-fig-legend-swatch"
            style={{ background: 'var(--echo-chart-blue)' }}
          />{' '}
          same — the pattern held
        </span>
        <span>
          <span className="echo-fig-legend-swatch echo-fig-cell-part" /> partial — held with an
          asterisk
        </span>
        <span>
          <span className="echo-fig-legend-swatch" style={{ background: 'var(--bg-tertiary)' }} />{' '}
          none — did not hold
        </span>
      </div>
      {selected && rows[selected[0]]?.cells[selected[1]]?.note && (
        <div className="echo-fig-detail">
          <strong>
            {rows[selected[0]].label} × {cols[selected[1]]}
          </strong>{' '}
          — {rows[selected[0]].cells[selected[1]].note}
        </div>
      )}
    </EchoFigureShell>
  );
}
