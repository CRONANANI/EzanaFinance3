/**
 * Reverse DCF solver: the revenue growth rate that makes the DCF fair value
 * equal the market price, holding every other assumption at the caller's
 * values. Iterative binary search against /api/fmp/dcf-advanced.
 * Convergence: $0.50 per share or 12 calls, whichever comes first.
 *
 * Moved out of components/research/dcf/ReverseDCFPanel.jsx (Nov 2026) so the
 * Company view's DCF workbench and the panel share one implementation.
 * Pass `signal` (AbortSignal) to stop a stale run between calls.
 */

const MAX_GROWTH_PCT = 0.3; // 30% upper bound on revenue growth search
const MIN_GROWTH_PCT = -0.05; // -5% lower bound (allow modest decline)
const PRICE_TOLERANCE = 0.5; // $0.50 per share convergence tolerance
const MAX_ITERATIONS = 12;

/**
 * Run a single DCF computation with a specific revenue growth rate.
 * Returns equityValuePerShare or null on failure.
 */
export async function runDcfWithGrowth(symbol, baseAssumptions, growthRate, signal) {
  const params = new URLSearchParams({ symbol });
  for (const [k, v] of Object.entries(baseAssumptions)) {
    if (k === 'forecastYears') continue;
    if (v != null && Number.isFinite(v)) params.set(k, String(v));
  }
  params.set('revenueGrowthPct', String(growthRate));

  try {
    const res = await fetch(`/api/fmp/dcf-advanced?${params.toString()}`, {
      cache: 'no-store',
      signal,
    });
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
export async function solveImpliedGrowth(symbol, baseAssumptions, targetPrice, onProgress, signal) {
  let lo = MIN_GROWTH_PCT;
  let hi = MAX_GROWTH_PCT;
  const history = [];

  /* First, check the bounds. If even at max growth the fair value is BELOW market price,
     the stock is overvalued at any reasonable growth rate. If even at min growth the fair value
     is ABOVE market price, the stock is undervalued at any reasonable growth rate. */
  const fvAtMax = await runDcfWithGrowth(symbol, baseAssumptions, hi, signal);
  if (fvAtMax == null) {
    return {
      error:
        'DCF API returned no valid fair value at upper bound. Try adjusting other assumptions.',
    };
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
      message: `Even at ${(hi * 100).toFixed(0)}% revenue growth, the DCF fair value of $${fvAtMax.toFixed(2)} is below the market price of $${targetPrice.toFixed(2)}. The market is pricing in growth assumptions outside the typical range, the stock may be significantly overvalued.`,
    };
  }

  const fvAtMin = await runDcfWithGrowth(symbol, baseAssumptions, lo, signal);
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
      message: `Even with ${(lo * 100).toFixed(0)}% revenue decline, the DCF fair value of $${fvAtMin.toFixed(2)} exceeds the market price of $${targetPrice.toFixed(2)}. The market is pricing in significantly more pessimism than the model, the stock may be significantly undervalued.`,
    };
  }

  /* Binary search */
  let lastMid = null;
  let lastFv = null;
  for (let i = 0; i < MAX_ITERATIONS - 2; i++) {
    const mid = (lo + hi) / 2;
    const fv = await runDcfWithGrowth(symbol, baseAssumptions, mid, signal);
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
