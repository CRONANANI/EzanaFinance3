'use client';

/**
 * SonarFinancialMetricCard (Nov 28 2026): one verified financial metric, adapted from the
 * 21st.dev "progress metric card". The source's progress-to-goal semantics are gone: a
 * financial metric has no goal bar. It shows the value with its unit and period, the change
 * over a stated base, a small sparkline when a real series exists, and the data flags.
 *
 * The change is coloured by what it means, not by its sign: rising revenue growth is
 * favourable, rising leverage is not, and rising inflation, rates, volatility, award values or
 * holder counts are neutral (contracts.changeTone). Colour never stands alone: the change
 * always carries its sign and a direction icon.
 *
 * payload.data: { value, change, changeUnit ('percent'|'pp'|unit), changeBase?, polarity?,
 *                 spark?: number[] }
 */
import { useId } from 'react';
import {
  formatFigure,
  formatChange,
  changeTone,
  flagLabels,
  num,
} from '@/lib/sonar/presentation/contracts';
import { Sparkline } from '../charts/Sparkline';
import '../charts/sonar-research-library.css';

export function SonarFinancialMetricCard({ payload }) {
  const id = useId();
  const p = payload || {};
  const d = p.data || {};
  const value = num(d.value);
  const change = num(d.change);
  const tone = changeTone(p.metric, change, d.polarity);
  const flags = flagLabels(p.flags);
  const icon =
    change === null || change === 0
      ? 'bi-dash'
      : change > 0
        ? 'bi-arrow-up-right'
        : 'bi-arrow-down-right';
  return (
    <section className="srl srl--metric" aria-labelledby={id}>
      <p id={id} className="srl-metric-label">
        {p.title || p.metric}
        {p.period?.label ? ` · ${p.period.label}` : ''}
      </p>
      <div className="srl-metric-row">
        <div>
          <div className="srl-metric-value">
            {formatFigure(value, p.unit, { currency: p.currency, compact: true })}
          </div>
          {change !== null ? (
            <span className={`srl-change is-${tone}`}>
              <i className={`bi ${icon}`} aria-hidden="true" />
              {formatChange(change, {
                unit: d.changeUnit === 'pp' ? 'percent' : d.changeUnit || 'percent',
                pp: d.changeUnit === 'pp',
              })}
              {d.changeBase ? <span> vs {d.changeBase}</span> : null}
            </span>
          ) : null}
        </div>
        {Array.isArray(d.spark) && d.spark.length > 1 ? (
          <Sparkline values={d.spark} tone={tone === 'favourable' ? 'emerald' : 'neutral'} />
        ) : null}
      </div>
      {flags.length || p.source ? (
        <p className="srl-labels">
          {flags.map((f) => (
            <span key={f.key} className="srl-flag">
              <i className="bi bi-exclamation-circle" aria-hidden="true" />
              {f.label}
            </span>
          ))}
          {p.source ? <span>{p.source}</span> : null}
        </p>
      ) : null}
    </section>
  );
}

export default SonarFinancialMetricCard;
