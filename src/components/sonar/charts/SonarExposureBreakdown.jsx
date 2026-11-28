'use client';

/**
 * SonarExposureBreakdown (Nov 28 2026): sector allocation, portfolio concentration, revenue
 * by segment, awards by agency, holder categories, geographic and asset-class exposure.
 * Adapted from the 21st.dev donut ("c-chart-20") onto Ezana's own EzDonut, so the app keeps
 * one donut implementation.
 *
 * A donut only when the data layer marks the categories mutually exclusive and they fit the
 * stated denominator (contracts.isMutuallyExclusive). Overlapping categories (a company in
 * two sectors, revenue tagged to several regions) are drawn as ranked bars with their values,
 * and are never forced to total 100%. The denominator and the reporting period are always
 * stated under the chart.
 *
 * payload.data: { parts: [{ key, label, value }], exclusive, total?, denominatorLabel? }
 */
import { useState } from 'react';
import { EzDonut } from '@/components/charts/EzDonut';
import { formatFigure, isMutuallyExclusive, num } from '@/lib/sonar/presentation/contracts';
import './sonar-research-library.css';

const SWATCH = ['srl-c1', 'srl-c2', 'srl-c3', 'srl-c4', 'srl-c6', 'srl-c5'];

export function SonarExposureBreakdown({ payload }) {
  const p = payload || {};
  const d = p.data || {};
  const parts = (d.parts || [])
    .map((x) => ({ ...x, value: num(x.value) }))
    .filter((x) => x.value !== null)
    .sort((a, b) => b.value - a.value);
  const exclusive = isMutuallyExclusive(parts, { exclusive: d.exclusive, total: d.total });
  const sum = parts.reduce((a, x) => a + x.value, 0);
  const total = num(d.total) ?? sum;
  const [active, setActive] = useState(null);
  const fmt = (v) => formatFigure(v, p.unit, { currency: p.currency, compact: true });
  const denominator = d.denominatorLabel || (num(d.total) !== null ? `${fmt(total)} total` : null);

  if (!exclusive) {
    const max = Math.max(...parts.map((x) => x.value), 0) || 1;
    return (
      <div>
        <ol className="srl-bars">
          {parts.map((x) => (
            <li key={x.key} className="srl-bar-row">
              <span className="srl-bar-label" title={x.label}>
                {x.label}
              </span>
              <span className="srl-bar-track" aria-hidden="true">
                <span className="srl-bar-fill" style={{ width: `${(x.value / max) * 100}%` }} />
              </span>
              <span className="srl-bar-val">{fmt(x.value)}</span>
            </li>
          ))}
        </ol>
        <p className="srl-labels" style={{ marginTop: 10 }}>
          <span>Categories overlap, so values are not shares of one total.</span>
          {denominator ? <span>{denominator}</span> : null}
        </p>
      </div>
    );
  }

  const segments = parts.slice(0, 6).map((x, i) => ({
    key: x.key,
    label: x.label,
    value: x.value,
    className: SWATCH[i],
  }));
  if (parts.length > 6) {
    const rest = parts.slice(6).reduce((a, x) => a + x.value, 0);
    segments[5] = {
      key: 'other',
      label: `Other (${parts.length - 5})`,
      value: segments[5].value + rest,
      className: SWATCH[5],
    };
  }
  return (
    <div className="srl-donut">
      <EzDonut
        segments={segments}
        size={176}
        stroke={20}
        active={active}
        onActiveChange={setActive}
        ariaLabel={`${p.title || 'Breakdown'}${p.period?.label ? `, ${p.period.label}` : ''}`}
        renderCenter={(seg, shareOf) => (
          <span className="srl-donut-center">
            <strong>{seg ? `${shareOf(seg).toFixed(1)}%` : fmt(total)}</strong>
            <span>{seg ? seg.label : 'Total'}</span>
          </span>
        )}
      />
      <ul className="srl-legend">
        {segments.map((s) => (
          <li
            key={s.key}
            className={s.className}
            onMouseEnter={() => setActive(s.key)}
            onMouseLeave={() => setActive(null)}
          >
            <span className="srl-swatch" aria-hidden="true" />
            <span style={{ color: 'var(--srl-text)' }}>{s.label}</span>
            <span className="is-num">{fmt(s.value)}</span>
            <span className="is-num">
              {total ? `${((s.value / total) * 100).toFixed(1)}%` : 'N/A'}
            </span>
          </li>
        ))}
      </ul>
      {denominator ? <p className="srl-labels">Share of {denominator}</p> : null}
    </div>
  );
}

export default SonarExposureBreakdown;
