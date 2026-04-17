'use client';

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { METRIC_KEYS } from '@/lib/profile-metrics';
import './metrics-grid.css';

/**
 * Renders the 6 retail-friendly metrics in a 2×3 / 3×2 responsive grid.
 * Each card shows label, value, delta vs. platform average, and a
 * percentile bar.
 */
export function MetricsGrid({ metrics }) {
  if (!metrics) return null;
  return (
    <div className="mg-grid">
      {METRIC_KEYS.map((k) => {
        const m = metrics[k];
        if (!m) return null;
        const neutralDelta = Math.abs(m.vsAverage) < 0.05;
        const good = m.higherIsBetter ? m.vsAverage >= 0 : m.vsAverage <= 0;
        const deltaClass = neutralDelta ? 'neutral' : good ? 'good' : 'bad';
        const Icon = neutralDelta ? Minus : good ? ArrowUp : ArrowDown;
        const topPct = Math.max(1, 100 - (m.percentile || 0));
        return (
          <div className="mg-card" key={m.key}>
            <div className="mg-label">{m.label}</div>
            <div className="mg-value">{m.value}</div>
            <div className="mg-row">
              <span className={`mg-delta ${deltaClass}`}>
                <Icon size={11} aria-hidden />
                <span>{m.vsAverageFormatted} vs avg</span>
              </span>
              <span className="mg-rank">Top {topPct}%</span>
            </div>
            <div className="mg-bar">
              <div
                className="mg-bar-fill"
                style={{ width: `${Math.max(2, Math.min(100, m.percentile || 0))}%` }}
                aria-hidden
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
