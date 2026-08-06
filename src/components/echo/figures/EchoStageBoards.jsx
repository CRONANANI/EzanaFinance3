'use client';

import { useState } from 'react';
import { EchoFigureShell } from './EchoFigureShell';

/**
 * F28 · stage-boards — side-by-side power-cycle boards (one per power). Each is
 * a segmented stage strip with the current stage filled in the board's color and
 * a "▼ we are here now" marker; every stage cell is clickable to reveal its
 * record (one open per board). Stat mini-cards and a summary line close it out.
 */

export function EchoStageBoards({ figureLabel, kicker, hint, source, boards = [] }) {
  const [open, setOpen] = useState({}); // boardId -> stageIdx | undefined

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <div className="echo-boards">
        {boards.map((b) => (
          <div key={b.id} className="echo-board">
            <h5 className="echo-board-title" style={{ color: b.color }}>
              {b.title}
            </h5>
            <div
              className="echo-board-marker"
              style={{ left: `${((b.currentIndex + 0.5) / b.stages.length) * 100}%` }}
            >
              ▼ we are here now
            </div>
            <div className="echo-board-strip" role="tablist" aria-label={`${b.title} cycle stages`}>
              {b.stages.map((s, i) => {
                const cur = i === b.currentIndex;
                const sel = open[b.id] === i;
                return (
                  <button
                    key={s.label}
                    type="button"
                    role="tab"
                    aria-selected={sel}
                    className={`echo-board-stage${cur ? ' echo-board-stage-current' : ''}${
                      sel ? ' echo-board-stage-selected' : ''
                    }`}
                    style={cur ? { background: b.color } : undefined}
                    onClick={() => setOpen((o) => ({ ...o, [b.id]: sel ? undefined : i }))}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
            <div className="echo-board-subs">
              {b.stages.map((s) => (
                <span key={s.label} className="echo-fig-mono">
                  {s.sub}
                </span>
              ))}
            </div>
            {open[b.id] != null && (
              <div className="echo-fig-detail">
                <strong>{b.stages[open[b.id]].label}</strong> — {b.stages[open[b.id]].note}
              </div>
            )}
            <div className="echo-board-stats">
              {b.stats.map((st) => (
                <div key={st.label} className="echo-board-stat">
                  <span className="echo-board-stat-value echo-fig-mono" style={{ color: b.color }}>
                    {st.value}
                  </span>
                  <span className="echo-board-stat-label">{st.label}</span>
                  <span className="echo-board-stat-source echo-fig-mono">{st.source}</span>
                </div>
              ))}
            </div>
            <p className="echo-board-summary">{b.summary}</p>
          </div>
        ))}
      </div>
    </EchoFigureShell>
  );
}
