'use client';

/**
 * Reverse DCF Panel — solves for the revenue growth rate that would justify
 * the current market price, given other DCF assumptions (margin, WACC,
 * terminal growth) held constant at user's current values.
 *
 * Method: iterative binary search against the existing DCF API. Convergence
 * tolerance: $0.50 per share or 6 iterations max (whichever comes first).
 * Cost: typically 6-10 API calls per reverse-DCF run.
 */

import { useState, useCallback } from 'react';
import { solveImpliedGrowth } from '@/lib/research/reverse-dcf';
import { formatAssumption } from './dcf-assumptions';

export default function ReverseDCFPanel({ symbol, baseAssumptions, livePrice }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  const handleRun = useCallback(async () => {
    if (!symbol || !livePrice || livePrice <= 0) {
      setError('No live price available, try refreshing or check the ticker.');
      return;
    }
    setRunning(true);
    setError(null);
    setResult(null);
    setProgress({ iteration: 0, growth: null, fairValue: null });

    const r = await solveImpliedGrowth(symbol, baseAssumptions, livePrice, (p) => setProgress(p));
    setRunning(false);

    if (r.error) {
      setError(r.error);
      return;
    }
    setResult(r);
  }, [symbol, baseAssumptions, livePrice]);

  const currentGrowth = baseAssumptions?.revenueGrowthPct ?? 0;

  return (
    <div className="rdcf-panel">
      <div className="rdcf-head">
        <div>
          <h4 className="rdcf-title">Reverse DCF Model</h4>
          <p className="rdcf-sub">
            Solve for the revenue growth rate that would justify {symbol}&apos;s current market
            price.
          </p>
        </div>
      </div>

      <div className="rdcf-inputs" role="group" aria-label="Reverse DCF target and solution">
        <div className="rdcf-input-card">
          <div className="rdcf-input-label">Market Price (Target)</div>
          <div className="rdcf-input-value">{livePrice ? `$${livePrice.toFixed(2)}` : 'n/a'}</div>
          <div className="rdcf-input-hint">From live quote</div>
        </div>
        <div className="rdcf-input-arrow" aria-hidden="true">
          <i className="bi bi-arrow-right" />
        </div>
        <div className="rdcf-input-card rdcf-input-card--solve">
          <div className="rdcf-input-label">Implied Revenue Growth</div>
          <div className="rdcf-input-value">
            {result?.impliedGrowth != null ? (
              `${(result.impliedGrowth * 100).toFixed(1)}%`
            ) : running ? (
              <span className="rdcf-skel" aria-label="Solving" />
            ) : (
              '?'
            )}
          </div>
          <div className="rdcf-input-hint">Solved by reverse DCF</div>
        </div>
      </div>

      <div className="rdcf-fixed-assumptions">
        <div className="rdcf-fixed-label">Held constant at current values:</div>
        <div className="rdcf-fixed-list">
          <span>EBIT margin {formatAssumption(baseAssumptions?.ebitPct, 'pct')}</span>
          <span>·</span>
          <span>Tax rate {formatAssumption(baseAssumptions?.taxRate, 'pct')}</span>
          <span>·</span>
          <span>WACC ≈ {formatAssumption(baseAssumptions?.costOfEquity, 'pct')}</span>
          <span>·</span>
          <span>
            Terminal growth {formatAssumption(baseAssumptions?.longTermGrowthRate, 'pct')}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="rdcf-run-btn"
        onClick={handleRun}
        disabled={running || !livePrice}
      >
        {running ? (
          <>
            <i className="bi bi-hourglass-split" aria-hidden="true" />
            Solving... iteration {progress?.iteration || 0}
          </>
        ) : (
          <>
            <i className="bi bi-calculator" aria-hidden="true" />
            {result ? 'Re-run reverse DCF' : 'Run reverse DCF'}
          </>
        )}
      </button>

      {error && (
        <div className="rdcf-error" role="alert">
          {error}
        </div>
      )}

      {result && result.impliedGrowth != null && (
        <div className="rdcf-result">
          <ResultVerdict result={result} currentGrowth={currentGrowth} />

          <div className="rdcf-comparison">
            <div className="rdcf-comparison-row">
              <span className="rdcf-comparison-label">Your forecast (Forward DCF)</span>
              <span className="rdcf-comparison-value">
                {(currentGrowth * 100).toFixed(1)}% revenue growth
              </span>
            </div>
            <div className="rdcf-comparison-row rdcf-comparison-row--implied">
              <span className="rdcf-comparison-label">Market-implied (Reverse DCF)</span>
              <span className="rdcf-comparison-value">
                {(result.impliedGrowth * 100).toFixed(1)}% revenue growth
              </span>
            </div>
            <div className="rdcf-comparison-row">
              <span className="rdcf-comparison-label">Difference</span>
              <span
                className={`rdcf-comparison-value ${result.impliedGrowth > currentGrowth ? 'rdcf-up' : 'rdcf-down'}`}
              >
                {result.impliedGrowth > currentGrowth ? '+' : ''}
                {((result.impliedGrowth - currentGrowth) * 100).toFixed(1)} pp
              </span>
            </div>
          </div>

          {result.history.length > 0 && (
            <details className="rdcf-history">
              <summary>Convergence trace ({result.iterations} iterations)</summary>
              <div className="rdcf-history-list">
                {result.history.map((h, i) => (
                  <div key={i} className="rdcf-history-row">
                    <span className="rdcf-history-i">#{i + 1}</span>
                    <span className="rdcf-history-growth">
                      Growth: {(h.growth * 100).toFixed(2)}%
                    </span>
                    <span className="rdcf-history-fv">Fair value: ${h.fairValue.toFixed(2)}</span>
                    <span className="rdcf-history-delta">
                      vs target: {h.fairValue >= livePrice ? '+' : ''}$
                      {(h.fairValue - livePrice).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function ResultVerdict({ result, currentGrowth }) {
  if (result.verdict === 'unjustifiable') {
    return (
      <div className="rdcf-verdict rdcf-verdict--bear">
        <div className="rdcf-verdict-label">
          <i className="bi bi-exclamation-triangle-fill" /> Market price unjustifiable
        </div>
        <p>{result.message}</p>
      </div>
    );
  }
  if (result.verdict === 'undervalued') {
    return (
      <div className="rdcf-verdict rdcf-verdict--bull">
        <div className="rdcf-verdict-label">
          <i className="bi bi-arrow-up-circle-fill" /> Deep value signal
        </div>
        <p>{result.message}</p>
      </div>
    );
  }

  /* Converged result — interpret implied vs current */
  const delta = result.impliedGrowth - currentGrowth;
  const deltaPp = delta * 100;

  if (Math.abs(deltaPp) < 1) {
    return (
      <div className="rdcf-verdict rdcf-verdict--neutral">
        <div className="rdcf-verdict-label">
          <i className="bi bi-check-circle-fill" /> Aligned with market
        </div>
        <p>
          The market&apos;s implied growth of {(result.impliedGrowth * 100).toFixed(1)}% is in line
          with your forecast of {(currentGrowth * 100).toFixed(1)}%. Your DCF and the market broadly
          agree.
        </p>
      </div>
    );
  }

  if (delta > 0) {
    return (
      <div className="rdcf-verdict rdcf-verdict--bear">
        <div className="rdcf-verdict-label">
          <i className="bi bi-graph-up-arrow" /> Market expects more
        </div>
        <p>
          The market is pricing in <strong>{(result.impliedGrowth * 100).toFixed(1)}%</strong>{' '}
          annual revenue growth: {deltaPp.toFixed(1)} percentage points HIGHER than your forecast.
          If you believe growth will only hit {(currentGrowth * 100).toFixed(1)}%, the stock is
          overvalued on your assumptions.
        </p>
      </div>
    );
  }

  return (
    <div className="rdcf-verdict rdcf-verdict--bull">
      <div className="rdcf-verdict-label">
        <i className="bi bi-graph-down-arrow" /> Market expects less
      </div>
      <p>
        The market is pricing in <strong>{(result.impliedGrowth * 100).toFixed(1)}%</strong> annual
        revenue growth: {Math.abs(deltaPp).toFixed(1)} percentage points LOWER than your forecast.
        If your {(currentGrowth * 100).toFixed(1)}% growth view is correct, the stock is
        undervalued.
      </p>
    </div>
  );
}
