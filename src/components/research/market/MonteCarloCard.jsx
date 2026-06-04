'use client';

import { useMemo, useState } from 'react';
import { ModelCardShell } from '@/components/research/ModelCardShell';
import { ModelVariableStrip } from '@/components/research/models/ModelVariableStrip';
import { useProGate } from '@/components/upgrade/ProGateContext';

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

const FAN_PATH_MEDIAN =
  'M0,72 C40,68 80,58 120,48 160,38 200,28 240,22 280,18 320,14 360,10 400,8 440,6 460,5';
const FAN_PATH_UPPER =
  'M0,48 C40,42 80,32 120,22 160,14 200,8 240,6 280,5 320,4 360,3 400,2 440,2 460,1';
const FAN_PATH_LOWER =
  'M0,88 C40,86 80,82 120,76 160,70 200,64 240,58 280,54 320,50 360,46 400,42 440,38 460,36';

function MonteCarloFanChart() {
  return (
    <div className="mc-fan-wrap" aria-hidden>
      <svg className="mc-fan-chart" viewBox="0 0 460 104" preserveAspectRatio="none">
        <defs>
          <linearGradient id="mc-fan-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--emerald)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--emerald)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${FAN_PATH_LOWER} L460,104 L0,104 Z`}
          fill="url(#mc-fan-fill)"
          className="mc-fan-area"
        />
        <path
          d={FAN_PATH_LOWER}
          fill="none"
          stroke="var(--emerald)"
          strokeOpacity="0.2"
          strokeWidth="1"
        />
        <path
          d={FAN_PATH_UPPER}
          fill="none"
          stroke="var(--emerald)"
          strokeOpacity="0.2"
          strokeWidth="1"
        />
        <path
          d={FAN_PATH_MEDIAN}
          fill="none"
          stroke="var(--emerald)"
          strokeWidth="2"
          className="mc-fan-median"
        />
      </svg>
    </div>
  );
}

export function MonteCarloCard() {
  const { openProGate } = useProGate();

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
      { label: 'Horizon', value: `${years}y`, format: undefined },
      { label: 'Volatility', value: 0.18, format: 'percent' },
      { label: 'Drift', value: 0.07, format: 'percent' },
      {
        label: 'P(hit)',
        value: result != null && Number.isFinite(result.probability) ? result.probability : '—',
        format: result != null && Number.isFinite(result.probability) ? 'percent' : undefined,
        emphasis: true,
      },
    ],
    [years, result],
  );

  // eslint-disable-next-line no-constant-condition -- dev toggle
  if (false) {
    return (
      <ModelCardShell
        icon="bi-activity"
        title="Monte Carlo Simulation"
        description="Probability of hitting your goal across thousands of simulated market paths"
        proBadge
      >
        <ModelVariableStrip variables={stripVariables} />
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

  // eslint-disable-next-line react-hooks/rules-of-hooks
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
      <ModelVariableStrip variables={stripVariables} />
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

      <MonteCarloFanChart />

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
        <i className="bi bi-lightning-charge" aria-hidden /> Run 2,000 simulations
      </button>

      {result && (
        <>
          <div className="mc-stat-strip lf-mono" aria-label="Simulation summary">
            <span>
              P(hit) <strong className="mc-stat-em">{Math.round(result.probability * 100)}%</strong>
            </span>
            <span>
              Median <strong>${Math.round(result.median).toLocaleString()}</strong>
            </span>
            <span>
              Goal <strong>${Number(goal).toLocaleString()}</strong>
            </span>
            <span>
              Horizon <strong>{years}y</strong>
            </span>
          </div>
          <div className="stc-result-card mpv-result">
            <span className="stc-result-label">Probability of hitting goal</span>
            <span className={`stc-result-value ${probabilityLabel.tone}`}>
              {Math.round(result.probability * 100)}%
            </span>
            <span className="stc-result-detail">
              {probabilityLabel.text} · Median terminal value ≈ $
              {Math.round(result.median).toLocaleString()}
            </span>
          </div>
        </>
      )}
    </ModelCardShell>
  );
}

export default MonteCarloCard;
