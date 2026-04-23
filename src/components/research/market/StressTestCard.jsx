'use client';

import { useMemo, useState } from 'react';
import { ModelCardShell } from '@/components/research/ModelCardShell';
import { ModelVariableStrip } from '@/components/research/models/ModelVariableStrip';
import { useStressPortfolio } from '@/hooks/useStressPortfolio';
import {
  GICS_SECTORS,
  SCENARIOS,
  runSensitivityAnalysis,
  runScenarioAnalysis,
  computeAllocationBuckets,
  formatUsd,
} from '@/lib/stress-test';

export function StressTestCard() {
  const { positions, isDemo, isLoading } = useStressPortfolio();
  const [mode, setMode] = useState('sensitivity'); // 'sensitivity' | 'scenario'
  const [sector, setSector] = useState('Technology');
  const [shockPct, setShockPct] = useState(-10);
  const [scenarioId, setScenarioId] = useState('2008');
  const [result, setResult] = useState(null);

  const awRows = useMemo(() => computeAllocationBuckets(positions), [positions]);

  const runSensitivity = () => {
    const r = runSensitivityAnalysis(positions, sector, shockPct);
    setResult({ kind: 'sensitivity', ...r, context: { sector, shockPct } });
  };

  const runScenario = () => {
    const r = runScenarioAnalysis(positions, scenarioId);
    const label = SCENARIOS.find((s) => s.id === scenarioId)?.label ?? scenarioId;
    setResult({ kind: 'scenario', ...r, context: { scenarioId, label } });
  };

  const stripVariables = useMemo(() => {
    if (mode === 'sensitivity') {
      return [
        { label: 'Scenario', value: 'Sector shock', format: undefined },
        { label: 'Shock mag.', value: shockPct / 100, format: 'percent' },
        { label: 'Correlation', value: '0.45 est.', format: undefined },
        { label: 'Time horizon', value: '1y', format: undefined },
        { label: 'Liquidity', value: 'T+2', format: undefined },
        { label: 'Sector', value: sector, format: undefined },
      ];
    }
    const label = SCENARIOS.find((s) => s.id === scenarioId)?.label ?? scenarioId;
    return [
      { label: 'Scenario', value: label, format: undefined },
      { label: 'Shock mag.', value: '—', format: undefined },
      { label: 'Correlation', value: '0.6 est.', format: undefined },
      { label: 'Time horizon', value: '1y', format: undefined },
      { label: 'Liquidity', value: 'T+2', format: undefined },
      { label: 'Recovery', value: '24m est.', format: undefined },
    ];
  }, [mode, sector, shockPct, scenarioId]);

  const tabControl = (
    <div className="stc-tabs" role="tablist" aria-label="Stress test mode">
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'sensitivity'}
        className={`stc-tab-btn ${mode === 'sensitivity' ? 'is-active' : ''}`}
        onClick={() => setMode('sensitivity')}
      >
        Sensitivity
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'scenario'}
        className={`stc-tab-btn ${mode === 'scenario' ? 'is-active' : ''}`}
        onClick={() => setMode('scenario')}
      >
        Scenario
      </button>
    </div>
  );

  return (
    <ModelCardShell
      icon="bi-shield-exclamation"
      title="Stress test & hedging"
      description="Simulate shocks across your positions and hedge toward an all-weather mix"
      actions={tabControl}
    >
      <ModelVariableStrip variables={stripVariables} className="mb-1" />
      {isDemo && !isLoading && (
        <div className="stc-demo-banner">
          <i className="bi bi-info-circle" />{' '}
          Showing a sample portfolio. Connect a brokerage account to stress-test your real
          positions.
        </div>
      )}

      {mode === 'sensitivity' ? (
        <>
          <div className="stc-field-row">
            <label className="stc-field">
              <span className="stc-field-label">Sector</span>
              <select
                className="stc-select"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
              >
                {GICS_SECTORS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>

            <label className="stc-field">
              <span className="stc-field-label">Shock magnitude</span>
              <div className="stc-slider-row">
                <input
                  type="range"
                  min={-30}
                  max={30}
                  step={1}
                  value={shockPct}
                  onChange={(e) => setShockPct(Number(e.target.value))}
                  className="stc-slider"
                />
                <span className="stc-slider-readout">{shockPct > 0 ? `+${shockPct}` : shockPct}%</span>
              </div>
            </label>
          </div>

          <button type="button" className="stc-run-btn" onClick={runSensitivity}>
            <i className="bi bi-lightning-charge" /> Run sensitivity
          </button>
        </>
      ) : (
        <>
          <label className="stc-field">
            <span className="stc-field-label">Scenario</span>
            <select
              className="stc-select"
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
            >
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({s.windowLabel})
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="stc-run-btn" onClick={runScenario}>
            <i className="bi bi-activity" /> Run scenario
          </button>
        </>
      )}

      {result && (
        <div className="stc-result-card">
          <span className="stc-result-label">Estimated portfolio impact</span>
          <span
            className={`stc-result-value ${result.deltaPct < 0 ? 'is-neg' : 'is-pos'}`}
          >
            {result.deltaPct >= 0 ? '+' : ''}
            {result.deltaPct.toFixed(2)}% ({formatUsd(result.deltaUsd)})
          </span>
          <span className="stc-result-detail">
            {result.kind === 'sensitivity'
              ? `A ${result.context.shockPct > 0 ? '+' : ''}${result.context.shockPct}% move in ${result.context.sector} across ${result.affectedCount} position${result.affectedCount === 1 ? '' : 's'}`
              : `Simulated ${result.context.label}${result.windowLabel ? ` · ${result.windowLabel}` : ''}`}
          </span>

          {result.kind === 'scenario' && Array.isArray(result.breakdown) && result.breakdown.length > 0 && (
            <ul className="stc-breakdown" aria-label="Top affected positions">
              {result.breakdown.slice(0, 4).map((row, idx) => (
                <li key={`${row.symbol ?? row.sector}-${idx}`}>
                  <span>
                    <span className="stc-breakdown-sym">{row.symbol ?? row.sector}</span>{' '}
                    <span style={{ color: 'var(--home-muted, #8b949e)' }}>· {row.sector}</span>
                  </span>
                  <span className={row.deltaUsd < 0 ? 'is-neg' : 'is-pos'}>
                    {formatUsd(row.deltaUsd)} ({(row.beta * 100).toFixed(0)}%)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="stc-aw-box">
        <div className="stc-aw-title">
          <i className="bi bi-shield-check" />
          Hedge to All Weather
        </div>
        <p className="stc-aw-copy">
          The Ray Dalio <strong>All Weather Portfolio</strong> targets consistent returns across
          growth, recession, inflation, and deflation regimes using risk parity — roughly{' '}
          <strong>30% stocks, 55% bonds, 15% commodities/gold</strong> — to limit drawdowns.
        </p>
        <div className="stc-aw-allocation">
          {awRows.map((row) => (
            <div className="stc-aw-row" key={row.label}>
              <span className="stc-aw-row-label">{row.label}</span>
              <span className="stc-aw-row-value">
                {(row.current * 100).toFixed(0)}% → {(row.weight * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="stc-aw-cta"
          onClick={() =>
            alert(
              'Hedge preview: we would generate rebalancing trades to shift your portfolio toward the All Weather target. Wire this to your brokerage integration when ready.',
            )
          }
        >
          <i className="bi bi-arrow-repeat" /> Apply hedge
        </button>
      </div>
    </ModelCardShell>
  );
}

export default StressTestCard;
