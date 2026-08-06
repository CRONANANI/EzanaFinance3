'use client';

import { useState } from 'react';
import { EchoFigureShell } from './EchoFigureShell';

/**
 * F22 · revision-ledger — before→after "dumbbell" rows on a shared √-scale (or
 * linear) so large moves don't flatten small ones. Each row: label + mono
 * sub-label, a plot with a hollow BEFORE marker and a filled AFTER marker joined
 * by a bar, then the AFTER value and a signed delta colored by whether the move
 * ran in the row's favorable direction. When a row has no before/after pair
 * (delta-only mode) it renders a single filled marker positioned by |delta|.
 * Click a row for its record. Verdict line closes the figure.
 */

function pctFor(v, domainMax, scale) {
  if (!domainMax) return 6;
  const norm =
    scale === 'linear' ? Math.abs(v) / domainMax : Math.sqrt(Math.abs(v)) / Math.sqrt(domainMax);
  return 6 + Math.min(1, norm) * 88;
}

export function EchoRevisionLedger({
  figureLabel,
  kicker,
  hint,
  source,
  scale = 'sqrt',
  unit = '',
  rows = [],
  verdict,
}) {
  const [open, setOpen] = useState(null);

  const domainMax = Math.max(
    1,
    ...rows.flatMap((r) => {
      const vals = [];
      if (Number.isFinite(r.before)) vals.push(Math.abs(r.before));
      if (Number.isFinite(r.after)) vals.push(Math.abs(r.after));
      if (!Number.isFinite(r.before) && !Number.isFinite(r.after) && Number.isFinite(r.delta))
        vals.push(Math.abs(r.delta));
      return vals;
    }),
  );

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <div className="echo-fig-ledger">
        {rows.map((r, i) => {
          const hasBoth = Number.isFinite(r.before) && Number.isFinite(r.after);
          const deltaNum = Number.isFinite(r.delta) ? r.delta : hasBoth ? r.after - r.before : 0;
          const favorable = r.favorable || 'up';
          const favorableMove =
            (deltaNum > 0 && favorable === 'up') || (deltaNum < 0 && favorable === 'down');
          const deltaColor =
            deltaNum === 0
              ? 'var(--text-muted)'
              : favorableMove
                ? 'var(--echo-chart-green)'
                : 'var(--echo-chart-red)';
          const deltaText =
            r.deltaDisplay ||
            (Number.isFinite(r.delta) ? `${r.delta > 0 ? '+' : ''}${r.delta}${unit}` : '');

          const beforePct = hasBoth ? pctFor(r.before, domainMax, scale) : null;
          const afterPct = hasBoth
            ? pctFor(r.after, domainMax, scale)
            : pctFor(Number.isFinite(r.delta) ? r.delta : 0, domainMax, scale);
          const barLeft = hasBoth ? Math.min(beforePct, afterPct) : 6;
          const barWidth = hasBoth ? Math.abs(afterPct - beforePct) : Math.max(0, afterPct - 6);
          const active = open === i;

          return (
            <div
              key={r.label}
              className="echo-fig-ledger-row"
              style={{ cursor: r.record ? 'pointer' : 'default' }}
              onClick={() => r.record && setOpen(active ? null : i)}
            >
              <div className="echo-fig-ledger-head">
                <span className="echo-fig-ledger-label">{r.label}</span>
                {r.sub && <span className="echo-fig-ledger-sub">{r.sub}</span>}
              </div>
              <div className="echo-fig-ledger-track">
                <span className="echo-fig-ledger-baseline" />
                <span
                  className="echo-fig-ledger-bar"
                  style={{ left: `${barLeft}%`, width: `${barWidth}%`, background: deltaColor }}
                />
                {hasBoth && (
                  <span
                    className="echo-fig-ledger-dot echo-fig-ledger-dot-hollow"
                    style={{ left: `${beforePct}%` }}
                    title={r.beforeDisplay || String(r.before)}
                  />
                )}
                <span
                  className="echo-fig-ledger-dot"
                  style={{ left: `${afterPct}%`, background: deltaColor, borderColor: deltaColor }}
                />
              </div>
              <div className="echo-fig-ledger-val">
                {r.afterDisplay && <span className="echo-fig-ledger-after">{r.afterDisplay}</span>}
                {deltaText && (
                  <span className="echo-fig-ledger-delta" style={{ color: deltaColor }}>
                    {deltaText}
                  </span>
                )}
              </div>
              {active && r.record && (
                <div className="echo-fig-detail echo-fig-ledger-record">
                  <strong>{r.label}</strong> — {r.record}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {verdict && <p className="echo-fig-ledger-verdict">{verdict}</p>}
    </EchoFigureShell>
  );
}
