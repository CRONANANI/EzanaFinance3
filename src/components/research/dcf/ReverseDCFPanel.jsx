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
import { formatAssumption } from './dcf-assumptions';

const MAX_GROWTH_PCT = 0.30; // 30% upper bound on revenue growth search
const MIN_GROWTH_PCT = -0.05; // -5% lower bound (allow modest decline)
const PRICE_TOLERANCE = 0.5; // $0.50 per share convergence tolerance
const MAX_ITERATIONS = 12;

/**
 * Run a single DCF computation with a specific revenue growth rate.
 * Returns equityValuePerShare or null on failure.
 */
async function runDcfWithGrowth(symbol, baseAssumptions, growthRate) {
  const params = new URLSearchParams({ symbol });
  for (const [k, v] of Object.entries(baseAssumptions)) {
    if (k === 'forecastYears') continue;
    if (v != null && Number.isFinite(v)) params.set(k, String(v));
  }
  params.set('revenueGrowthPct', String(growthRate));

  try {
    const res = await fetch(`/api/fmp/dcf-advanced?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const headline = data?.headline;
    if (!headline || !Number.isFinite(headline.equityValuePerShare)) return null;
    return Number(headline.equityValuePerShare);
  } catch {
    return null;
  }
}

/**
 * Binary search for the growth rate where DCF fair value matches market price.
 * Returns: { impliedGrowth, iterations, converged, finalFairValue, history }
 */
async function solveImpliedGrowth(symbol, baseAssumptions, targetPrice, onProgress) {
  let lo = MIN_GROWTH_PCT;
  let hi = MAX_GROWTH_PCT;
  const history = [];

  /* First, check the bounds. If even at max growth the fair value is BELOW market price,
     the stock is overvalued at any reasonable growth rate. If even at min growth the fair value
     is ABOVE market price, the stock is undervalued at any reasonable growth rate. */
  const fvAtMax = await runDcfWithGrowth(symbol, baseAssumptions, hi);
  if (fvAtMax == null) {
    return { error: 'DCF API returned no valid fair value at upper bound. Try adjusting other assumptions.' };
  }
  history.push({ growth: hi, fairValue: fvAtMax });
  onProgress?.({ iteration: 1, growth: hi, fairValue: fvAtMax });

  if (fvAtMax < targetPrice) {
    return {
      impliedGrowth: hi,
      iterations: 1,
      converged: false,
      finalFairValue: fvAtMax,
      history,
      verdict: 'unjustifiable',
      message: `Even at ${(hi * 100).toFixed(0)}% revenue growth, the DCF fair value of $${fvAtMax.toFixed(2)} is below the market price of $${targetPrice.toFixed(2)}. The market is pricing in growth assumptions outside the typical range — the stock may be significantly overvalued.`,
    };
  }

  const fvAtMin = await runDcfWithGrowth(symbol, baseAssumptions, lo);
  if (fvAtMin == null) {
    return { error: 'DCF API returned no valid fair value at lower bound.' };
  }
  history.push({ growth: lo, fairValue: fvAtMin });
  onProgress?.({ iteration: 2, growth: lo, fairValue: fvAtMin });

  if (fvAtMin > targetPrice) {
    return {
      impliedGrowth: lo,
      iterations: 2,
      converged: false,
      finalFairValue: fvAtMin,
      history,
      verdict: 'undervalued',
      message: `Even with ${(lo * 100).toFixed(0)}% revenue decline, the DCF fair value of $${fvAtMin.toFixed(2)} exceeds the market price of $${targetPrice.toFixed(2)}. The market is pricing in significantly more pessimism than the model — the stock may be significantly undervalued.`,
    };
  }

  /* Binary search */
  let lastMid = null;
  let lastFv = null;
  for (let i = 0; i < MAX_ITERATIONS - 2; i++) {
    const mid = (lo + hi) / 2;
    const fv = await runDcfWithGrowth(symbol, baseAssumptions, mid);
    if (fv == null) break;

    history.push({ growth: mid, fairValue: fv });
    onProgress?.({ iteration: i + 3, growth: mid, fairValue: fv });

    lastMid = mid;
    lastFv = fv;

    if (Math.abs(fv - targetPrice) <= PRICE_TOLERANCE) {
      return {
        impliedGrowth: mid,
        iterations: i + 3,
        converged: true,
        finalFairValue: fv,
        history,
        verdict: 'converged',
      };
    }

    if (fv < targetPrice) {
      lo = mid; // need higher growth
    } else {
      hi = mid; // need lower growth
    }
  }

  return {
    impliedGrowth: lastMid,
    iterations: history.length,
    converged: false,
    finalFairValue: lastFv,
    history,
    verdict: 'partial',
    message: `Did not fully converge in ${MAX_ITERATIONS} iterations. Best estimate shown.`,
  };
}

export default function ReverseDCFPanel({ symbol, baseAssumptions, livePrice }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  const handleRun = useCallback(async () => {
    if (!symbol || !livePrice || livePrice <= 0) {
      setError('No live price available — try refreshing or check the ticker.');
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
        <div className="rdcf-icon">
          <i className="bi bi-arrow-left-right" />
        </div>
        <div>
          <h3 className="rdcf-title">Reverse DCF Model</h3>
          <p className="rdcf-sub">
            Solve for the revenue growth rate that would justify {symbol}&apos;s current market price.
          </p>
        </div>
      </div>

      <div className="rdcf-inputs">
        <div className="rdcf-input-card">
          <div className="rdcf-input-label">Market Price (Target)</div>
          <div className="rdcf-input-value">
            {livePrice ? `$${livePrice.toFixed(2)}` : '—'}
          </div>
          <div className="rdcf-input-hint">From live quote</div>
        </div>
        <div className="rdcf-input-arrow"><i className="bi bi-arrow-right" /></div>
        <div className="rdcf-input-card rdcf-input-card--solve">
          <div className="rdcf-input-label">Implied Revenue Growth</div>
          <div className="rdcf-input-value">
            {result?.impliedGrowth != null
              ? `${(result.impliedGrowth * 100).toFixed(1)}%`
              : running ? '...' : '?'}
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
          <span>Terminal growth {formatAssumption(baseAssumptions?.longTermGrowthRate, 'pct')}</span>
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
            <i className="bi bi-arrow-repeat rdcf-spin" />
            Solving... iteration {progress?.iteration || 0}
          </>
        ) : (
          <>
            <i className="bi bi-calculator" />
            {result ? 'Re-run reverse DCF' : 'Run reverse DCF'}
          </>
        )}
      </button>

      {error && <div className="rdcf-error">{error}</div>}

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
              <span className={`rdcf-comparison-value ${result.impliedGrowth > currentGrowth ? 'rdcf-up' : 'rdcf-down'}`}>
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
                    <span className="rdcf-history-fv">
                      Fair value: ${h.fairValue.toFixed(2)}
                    </span>
                    <span className="rdcf-history-delta">
                      vs target: {h.fairValue >= livePrice ? '+' : ''}
                      ${(h.fairValue - livePrice).toFixed(2)}
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
          The market&apos;s implied growth of {(result.impliedGrowth * 100).toFixed(1)}% is in line with your
          forecast of {(currentGrowth * 100).toFixed(1)}%. Your DCF and the market broadly agree.
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
          The market is pricing in <strong>{(result.impliedGrowth * 100).toFixed(1)}%</strong> annual
          revenue growth — {deltaPp.toFixed(1)} percentage points HIGHER than your forecast. If you
          believe growth will only hit {(currentGrowth * 100).toFixed(1)}%, the stock is overvalued
          on your assumptions.
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
        revenue growth — {Math.abs(deltaPp).toFixed(1)} percentage points LOWER than your forecast.
        If your {(currentGrowth * 100).toFixed(1)}% growth view is correct, the stock is undervalued.
      </p>
    </div>
  );
}
