'use client';

import { useMemo, useState } from 'react';
import { ModelCardShell } from '@/components/research/ModelCardShell';
import { ModelVariableStrip } from '@/components/research/models/ModelVariableStrip';
import { useProGate } from '@/components/upgrade/ProGateContext';

/**
 * Minimal Monte Carlo goal-probability estimate using geometric-brownian-
 * motion-style path sampling. Each path compounds monthly with a random
 * normal return drawn from the annual mean/volatility. The probability
 * estimate is the fraction of terminal values that meet or exceed the goal.
 *
 * TODO: replace with a proper GBM + bootstrapped historical returns engine
 * and surface p10/p50/p90 fan charts.
 */
function randomNormal() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function simulate({ current, monthlyContrib, years, meanAnnual, volAnnual, goal, runs }) {
  const months = Math.max(1, Math.round(years * 12));
  const m = meanAnnual / 12;
  const s = volAnnual / Math.sqrt(12);
  let hit = 0;
  let terminalSum = 0;

  for (let i = 0; i < runs; i++) {
    let v = current;
    for (let k = 0; k < months; k++) {
      const r = m + s * randomNormal();
      v = v * (1 + r) + monthlyContrib;
    }
    terminalSum += v;
    if (v >= goal) hit++;
  }

  return {
    probability: runs > 0 ? hit / runs : 0,
    median: runs > 0 ? terminalSum / runs : 0,
  };
}

export function MonteCarloCard() {
  const { isProUser, openProGate } = useProGate();

  const [current, setCurrent] = useState(50000);
  const [monthlyContrib, setMonthly] = useState(1000);
  const [years, setYears] = useState(20);
  const [goal, setGoal] = useState(1000000);
  const [result, setResult] = useState(null);

  const run = () => {
    const r = simulate({
      current: Number(current),
      monthlyContrib: Number(monthlyContrib),
      years: Number(years),
      meanAnnual: 0.07,
      volAnnual: 0.18,
      goal: Number(goal),
      runs: 2000,
    });
    setResult(r);
  };

  const stripVariables = useMemo(
    () => [
      { label: 'Iterations', value: '2,000', format: undefined },
      { label: 'Time horizon', value: `${years}y`, format: undefined },
      { label: 'Volatility', value: 0.18, format: 'percent' },
      { label: 'Drift', value: 0.07, format: 'percent' },
      {
        label: 'Conf. (p hit)',
        value: result != null && Number.isFinite(result.probability) ? result.probability : '—',
        format: result != null && Number.isFinite(result.probability) ? 'percent' : undefined,
      },
      {
        label: 'Expected return',
        value: 0.07,
        format: 'percent',
      },
    ],
    [years, result],
  );

  // Even for non-Pro users we render the ModelCardShell; the body shows a
  // locked preview instead of the simulation UI.
  if (!isProUser) {
    return (
      <ModelCardShell
        icon="bi-activity"
        title="Monte Carlo Simulation"
        description="Probability of hitting your goal across thousands of simulated market paths"
        proBadge
      >
        <ModelVariableStrip variables={stripVariables} className="mb-1" />
        <div className="mc-lock-wrap">
          <div className="mc-lock-preview" aria-hidden="true">
            <div className="mc-lock-preview-bar" />
            <div className="mc-lock-preview-main" />
            <div className="mc-lock-preview-thin" />
            <div className="mc-lock-preview-bar" />
          </div>
          <div className="mc-lock-overlay">
            <div className="mc-lock-circle">
              <i className="bi bi-lock-fill" />
            </div>
            <div className="mc-lock-title">Advanced Pro membership</div>
            <p className="mc-lock-copy">
              Monte Carlo simulation runs thousands of market scenarios to estimate the probability
              of hitting your financial goals.
            </p>
            <button type="button" className="mc-lock-cta" onClick={openProGate}>
              <i className="bi bi-stars" /> Upgrade to Pro
            </button>
          </div>
        </div>
      </ModelCardShell>
    );
  }

  const probabilityLabel = useMemo(() => {
    if (!result) return null;
    const pct = Math.round(result.probability * 100);
    if (pct >= 80) return { tone: 'is-pos', text: 'High confidence' };
    if (pct >= 50) return { tone: 'is-pos', text: 'Plausible path' };
    if (pct >= 25) return { tone: 'is-neg', text: 'Stretch goal — consider adjusting' };
    return { tone: 'is-neg', text: 'Unlikely at current inputs' };
  }, [result]);

  return (
    <ModelCardShell
      icon="bi-activity"
      title="Monte Carlo Simulation"
      description="Probability of hitting your goal across thousands of simulated market paths"
      proBadge
    >
      <ModelVariableStrip variables={stripVariables} className="mb-1" />
      <div className="stc-field-row">
        <label className="stc-field">
          <span className="stc-field-label">Starting balance ($)</span>
          <input
            type="number"
            className="stc-input"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            min={0}
          />
        </label>
        <label className="stc-field">
          <span className="stc-field-label">Monthly contribution ($)</span>
          <input
            type="number"
            className="stc-input"
            value={monthlyContrib}
            onChange={(e) => setMonthly(e.target.value)}
            min={0}
          />
        </label>
      </div>

      <div className="stc-field-row">
        <label className="stc-field">
          <span className="stc-field-label">Horizon (years)</span>
          <input
            type="number"
            className="stc-input"
            value={years}
            onChange={(e) => setYears(e.target.value)}
            min={1}
            max={60}
          />
        </label>
        <label className="stc-field">
          <span className="stc-field-label">Goal ($)</span>
          <input
            type="number"
            className="stc-input"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            min={0}
          />
        </label>
      </div>

      <button type="button" className="stc-run-btn" onClick={run}>
        <i className="bi bi-shuffle" /> Run 2,000 simulations
      </button>

      {result && (
        <div className="stc-result-card">
          <span className="stc-result-label">Probability of hitting goal</span>
          <span className={`stc-result-value ${probabilityLabel.tone}`}>
            {Math.round(result.probability * 100)}%
          </span>
          <span className="stc-result-detail">
            {probabilityLabel.text} · Median terminal value ≈ $
            {Math.round(result.median).toLocaleString()}
          </span>
        </div>
      )}
    </ModelCardShell>
  );
}

export default MonteCarloCard;
