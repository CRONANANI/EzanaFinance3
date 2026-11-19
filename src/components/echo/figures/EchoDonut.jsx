'use client';

import { useState } from 'react';
import { EzDonut } from '@/components/charts/EzDonut';
import { EchoFigureShell } from './EchoFigureShell';

const PALETTE = [
  'var(--echo-chart-green)',
  'var(--echo-chart-blue)',
  'var(--echo-chart-orange)',
  'var(--echo-chart-purple)',
  'var(--echo-chart-red)',
  'color-mix(in srgb, var(--text-primary) 35%, transparent)',
];

/**
 * Donut (Nov 2026): parts of a whole, with the hovered slice's name, value
 * and share in the middle and a legend that lights with it.
 *   slices: [{ label, value, color?, detail? }]  detail: an extra line shown
 *   in the middle for that slice (e.g. velocity), so nothing is lost when a
 *   variable pie renders as a donut.
 */
export function EchoDonut({
  figureLabel,
  kicker,
  hint,
  source,
  slices = [],
  unit = '',
  totalLabel = 'Total',
}) {
  const [active, setActive] = useState(null);
  const segs = slices
    .filter((s) => Number(s.value) > 0)
    .map((s, i) => ({
      key: s.label,
      label: s.label,
      value: Number(s.value),
      detail: s.detail,
      color: s.color || PALETTE[i % PALETTE.length],
    }));
  const total = segs.reduce((a, s) => a + s.value, 0);
  const fmt = (v) => `${Number(v).toLocaleString('en-US', { maximumFractionDigits: 1 })}${unit}`;

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <div className="echo-donut">
        <EzDonut
          segments={segs}
          size={240}
          stroke={30}
          active={active}
          onActiveChange={setActive}
          ariaLabel={segs.map((s) => `${s.label} ${fmt(s.value)}`).join(', ')}
          renderCenter={(seg, shareOf) =>
            seg ? (
              <>
                <span className="echo-donut-c-label">{seg.label}</span>
                <span className="echo-donut-c-value">{fmt(seg.value)}</span>
                <span className="echo-donut-c-sub">
                  {Math.round(shareOf(seg))}%{seg.detail ? ` · ${seg.detail}` : ''}
                </span>
              </>
            ) : (
              <>
                <span className="echo-donut-c-label">{totalLabel}</span>
                <span className="echo-donut-c-value">{fmt(total)}</span>
              </>
            )
          }
        />
        <ul className="echo-donut-legend">
          {segs.map((s) => (
            <li
              key={s.key}
              className={active === s.key ? 'is-active' : undefined}
              onMouseEnter={() => setActive(s.key)}
              onMouseLeave={() => setActive(null)}
            >
              <span className="echo-donut-dot" style={{ background: s.color }} aria-hidden="true" />
              <span className="echo-donut-name">{s.label}</span>
              <span className="echo-donut-val">{fmt(s.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    </EchoFigureShell>
  );
}

export default EchoDonut;
