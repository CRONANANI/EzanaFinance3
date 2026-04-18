'use client';

import { useMemo, useState } from 'react';
import { ModelCardShell } from '@/components/research/ModelCardShell';

/**
 * Efficient-frontier slider stub.
 *
 * The output allocation is interpolated between a conservative anchor
 * (bond-heavy) and an aggressive anchor (equity-heavy) based on the risk
 * tolerance slider. This produces a smooth, visually convincing allocation
 * change as the user slides — good enough for the UI to take shape.
 *
 * TODO: replace with a proper Markowitz solver (mean/variance optimization)
 * once the covariance matrix + expected-return vectors are wired.
 */
const CONSERVATIVE = { Stocks: 25, Bonds: 55, 'Real Estate': 10, Commodities: 5, Cash: 5 };
const AGGRESSIVE   = { Stocks: 80, Bonds: 10, 'Real Estate': 5,  Commodities: 4, Cash: 1 };

const COLORS = {
  Stocks: '#10b981',
  Bonds: '#3b82f6',
  'Real Estate': '#8b5cf6',
  Commodities: '#f59e0b',
  Cash: '#6b7280',
};

function interpolate(risk) {
  const t = Math.max(0, Math.min(1, risk / 100));
  const out = {};
  for (const k of Object.keys(CONSERVATIVE)) {
    out[k] = Math.round(CONSERVATIVE[k] + (AGGRESSIVE[k] - CONSERVATIVE[k]) * t);
  }
  // Normalize rounding drift back to 100%.
  const sum = Object.values(out).reduce((a, b) => a + b, 0);
  const diff = 100 - sum;
  if (diff !== 0) out.Stocks = Math.max(0, out.Stocks + diff);
  return out;
}

export function MPTCard() {
  const [risk, setRisk] = useState(55);
  const [shown, setShown] = useState(null);

  const allocation = useMemo(() => interpolate(risk), [risk]);
  const display = shown ?? allocation;

  const verdict =
    risk < 30
      ? 'Capital preservation — bond-heavy mix with limited drawdowns.'
      : risk < 60
        ? 'Balanced growth — equities lead with a meaningful bond ballast.'
        : risk < 85
          ? 'Growth-oriented — higher expected return with larger drawdowns.'
          : 'Aggressive — near max equity, accept substantial short-term volatility.';

  return (
    <ModelCardShell
      icon="bi-pie-chart"
      title="Modern Portfolio Theory (MPT)"
      description="Find the optimal asset mix along the efficient frontier"
    >
      <label className="stc-field">
        <span className="stc-field-label">
          Risk tolerance{' '}
          <span style={{ color: '#10b981', fontWeight: 800 }}>{risk}/100</span>
        </span>
        <div className="stc-slider-row">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={risk}
            onChange={(e) => setRisk(Number(e.target.value))}
            className="stc-slider"
          />
        </div>
      </label>

      <button
        type="button"
        className="stc-run-btn"
        onClick={() => setShown(allocation)}
      >
        <i className="bi bi-lightning-charge" /> Run model
      </button>

      <div className="mpv-allocation-bar" aria-label="Recommended allocation">
        {Object.entries(display).map(([label, value]) => (
          <div
            key={label}
            className="mpv-allocation-segment"
            style={{ width: `${value}%`, background: COLORS[label] }}
            title={`${label} ${value}%`}
          />
        ))}
      </div>

      <div className="mpv-allocation-legend">
        {Object.entries(display).map(([label, value]) => (
          <span key={label}>
            <span className="mpv-allocation-dot" style={{ background: COLORS[label] }} />
            {label} · <strong>{value}%</strong>
          </span>
        ))}
      </div>

      <p className="mpv-body-text">{verdict}</p>
    </ModelCardShell>
  );
}

export default MPTCard;
