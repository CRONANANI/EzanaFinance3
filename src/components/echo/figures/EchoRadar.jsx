'use client';

import { EzRadar } from '@/components/charts/EzRadar';
import { EchoFigureShell } from './EchoFigureShell';

const PALETTE = [
  'var(--echo-chart-green)',
  'var(--echo-chart-blue)',
  'var(--echo-chart-orange)',
  'var(--echo-chart-purple)',
];

/**
 * Radar (Nov 2026), on the house EzRadar.
 *   axes: ['China', 'Poland', ...]
 *   series: [{ label, values: [..one per axis..], color? }]
 *   variant: 'filled' | 'lines'; max: top of the scale (default: data max)
 */
export function EchoRadar({
  figureLabel,
  kicker,
  hint,
  source,
  axes = [],
  series = [],
  unit = '',
  variant = 'filled',
  max,
}) {
  const keyed = series.map((s, i) => ({
    key: `s${i}`,
    label: s.label,
    color: s.color || PALETTE[i % PALETTE.length],
    values: s.values || [],
  }));
  const data = axes.map((a, i) => {
    const r = { axis: a };
    keyed.forEach((s) => {
      r[s.key] = Number(s.values[i]) || 0;
    });
    return r;
  });
  const top = max ?? Math.max(1, ...keyed.flatMap((s) => s.values.map((v) => Number(v) || 0)));
  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <EzRadar
        className="echo-radar"
        data={data}
        axisKey="axis"
        series={keyed}
        domain={[0, top]}
        variant={variant}
        height={340}
        formatValue={(v) =>
          v == null
            ? 'N/A'
            : `${Number(v).toLocaleString('en-US', { maximumFractionDigits: 1 })}${unit}`
        }
      />
    </EchoFigureShell>
  );
}

export default EchoRadar;
