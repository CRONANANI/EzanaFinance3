'use client';

import { useMemo, useState } from 'react';
import { ModelCardShell } from '@/components/research/ModelCardShell';
import { ModelVariableStrip } from '@/components/research/models/ModelVariableStrip';

/**
 * Black-Litterman combines the market's equilibrium returns with the user's
 * subjective views to produce a posterior allocation.
 *
 * This card is currently a structured-input stub: it collects the user's
 * views and an uncertainty weight, then applies a simple tilt on top of a
 * neutral baseline allocation.
 *
 * TODO: swap the tilt for the actual Black-Litterman posterior formula once
 * a covariance matrix and market-cap weights are available.
 */
const BASELINE = { 'US Large': 40, 'US Small': 10, 'Intl Dev': 15, 'EM': 10, Bonds: 20, 'REITs / Gold': 5 };

const COLORS = {
  'US Large': '#10b981',
  'US Small': '#22d3ee',
  'Intl Dev': '#3b82f6',
  EM: '#8b5cf6',
  Bonds: '#f59e0b',
  'REITs / Gold': '#ef4444',
};

function applyTilt(baseline, viewBullish, viewBearish, confidence) {
  const c = Math.max(0, Math.min(1, confidence / 100));
  const out = { ...baseline };
  if (viewBullish && out[viewBullish] != null) {
    out[viewBullish] = Math.min(60, out[viewBullish] + Math.round(10 * c));
  }
  if (viewBearish && out[viewBearish] != null && viewBearish !== viewBullish) {
    out[viewBearish] = Math.max(0, out[viewBearish] - Math.round(8 * c));
  }
  const sum = Object.values(out).reduce((a, b) => a + b, 0);
  const diff = 100 - sum;
  if (diff !== 0) {
    out.Bonds = Math.max(0, out.Bonds + diff);
  }
  return out;
}

export function BlackLittermanCard() {
  const [bullish, setBullish] = useState('US Large');
  const [bearish, setBearish] = useState('EM');
  const [confidence, setConfidence] = useState(50);
  const [result, setResult] = useState(null);

  const options = Object.keys(BASELINE);

  const run = () => {
    setResult(applyTilt(BASELINE, bullish, bearish, confidence));
  };

  const display = result ?? BASELINE;

  const stripVariables = useMemo(
    () => [
      { label: 'Risk-free rate', value: 0.04, format: 'percent' },
      { label: 'Market premium', value: 0.055, format: 'percent' },
      { label: 'Confidence', value: confidence / 100, format: 'percent' },
      { label: 'Rebal. frequency', value: 'Monthly', format: undefined },
      { label: 'Asset count', value: 6, format: 'number' },
      { label: 'Target return (tilt)', value: 0.07 + (confidence / 100) * 0.02, format: 'percent' },
    ],
    [confidence],
  );

  return (
    <ModelCardShell
      icon="bi-sliders"
      title="Black-Litterman Model"
      description="Blend market equilibrium with your views to tilt your allocation"
    >
      <ModelVariableStrip variables={stripVariables} className="mb-1" />
      <div className="stc-field-row">
        <label className="stc-field">
          <span className="stc-field-label">Bullish on</span>
          <select
            className="stc-select"
            value={bullish}
            onChange={(e) => setBullish(e.target.value)}
          >
            {options.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="stc-field">
          <span className="stc-field-label">Bearish on</span>
          <select
            className="stc-select"
            value={bearish}
            onChange={(e) => setBearish(e.target.value)}
          >
            {options.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="stc-field">
        <span className="stc-field-label">
          Confidence{' '}
          <span style={{ color: '#10b981', fontWeight: 800 }}>{confidence}%</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={confidence}
          onChange={(e) => setConfidence(Number(e.target.value))}
          className="stc-slider"
        />
      </label>

      <button type="button" className="stc-run-btn" onClick={run}>
        <i className="bi bi-graph-up" /> Run model
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

      <p className="mpv-body-text">
        Views shift the baseline by a weight proportional to confidence. A{' '}
        <strong>bullish</strong> view adds weight; a <strong>bearish</strong> view removes it.
        At 0% confidence you get the equilibrium mix back.
      </p>
    </ModelCardShell>
  );
}

export default BlackLittermanCard;
