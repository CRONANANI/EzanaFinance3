'use client';

/**
 * DCF workbench state for the Company view (Nov 2026 redesign): the four
 * headline assumptions, the fair value they produce, and the reverse DCF
 * implied growth at the current price. Uses the existing DCF route
 * (/api/fmp/dcf-advanced) and the shared reverse DCF solver; no new maths.
 *
 * Integrity: the first call fetches the provider baseline (beta, costs of
 * capital, tax, terminal growth) and merges it into the assumptions; the fair
 * value shown is always computed from the exact assumption set on screen, so
 * the inputs, the fair value, the gap, the reverse DCF and the findings agree.
 *
 * Edits recompute after 300ms. Each recompute cancels the one before it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_ASSUMPTIONS } from '@/components/research/dcf/dcf-assumptions';
import { solveImpliedGrowth } from '@/lib/research/reverse-dcf';
import { isNum, shiftWacc, waccToDecimal } from '@/lib/research/company-research';

const DEBOUNCE_MS = 300;

function toParams(symbol, assumptions) {
  const params = new URLSearchParams({ symbol });
  if (assumptions) {
    for (const [k, v] of Object.entries(assumptions)) {
      if (k === 'forecastYears') continue;
      if (v != null && Number.isFinite(v)) params.set(k, String(v));
    }
  }
  return params;
}

async function runDcf(symbol, assumptions, signal) {
  const res = await fetch(`/api/fmp/dcf-advanced?${toParams(symbol, assumptions)}`, {
    cache: 'no-store',
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error || !isNum(Number(data?.headline?.equityValuePerShare))) {
    throw new Error(data?.error || 'DCF unavailable');
  }
  return data.headline;
}

/** Provider baseline (percent numbers) -> decimals, merged over the defaults. */
function mergeBaseline(prev, baseline) {
  if (!baseline) return prev;
  const next = { ...prev };
  const pct = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v) / 100);
  if (baseline.beta != null && Number.isFinite(Number(baseline.beta)))
    next.beta = Number(baseline.beta);
  for (const k of [
    'costOfDebt',
    'costOfEquity',
    'riskFreeRate',
    'marketRiskPremium',
    'taxRate',
    'longTermGrowthRate',
  ]) {
    const v = pct(baseline[k]);
    if (v != null) next[k] = v;
  }
  return next;
}

/**
 * @param {string|null} symbol
 * @param {number|null} price  the page's single current price
 */
export function useDcfWorkbench(symbol, price) {
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS);
  const [result, setResult] = useState({
    status: 'idle',
    fairValue: null,
    wacc: null,
    error: null,
  });
  const [reverse, setReverse] = useState({ status: 'idle', impliedGrowth: null, verdict: null });
  const [ready, setReady] = useState(false); // baseline merged
  const [nonce, setNonce] = useState(0);
  const baseRef = useRef(DEFAULT_ASSUMPTIONS);
  const ctlRef = useRef(null);

  /* 1. New symbol: fetch the provider baseline, then compute on it. */
  useEffect(() => {
    setReady(false);
    setResult({ status: symbol ? 'loading' : 'idle', fairValue: null, wacc: null, error: null });
    setReverse({ status: 'idle', impliedGrowth: null, verdict: null });
    if (!symbol) return undefined;
    const ctl = new AbortController();
    runDcf(symbol, null, ctl.signal)
      .then((headline) => {
        const merged = mergeBaseline(DEFAULT_ASSUMPTIONS, headline.baselineAssumptions);
        baseRef.current = merged;
        setAssumptions(merged);
        setReady(true);
      })
      .catch((err) => {
        if (ctl.signal.aborted) return;
        setResult({
          status: 'error',
          fairValue: null,
          wacc: null,
          error: err?.message || 'DCF unavailable',
        });
      });
    return () => ctl.abort();
  }, [symbol, nonce]);

  /* 2. Compute fair value (and then the reverse DCF) from the assumptions on screen. */
  useEffect(() => {
    if (!symbol || !ready) return undefined;
    ctlRef.current?.abort();
    const ctl = new AbortController();
    ctlRef.current = ctl;
    const t = setTimeout(async () => {
      setResult((r) => ({ ...r, status: 'loading', error: null }));
      try {
        const headline = await runDcf(symbol, assumptions, ctl.signal);
        if (ctl.signal.aborted) return;
        setResult({
          status: 'ready',
          fairValue: Number(headline.equityValuePerShare),
          wacc: waccToDecimal(headline.wacc),
          error: null,
        });
        if (!isNum(price) || price <= 0) {
          setReverse({ status: 'error', impliedGrowth: null, verdict: null });
          return;
        }
        setReverse({ status: 'loading', impliedGrowth: null, verdict: null });
        const r = await solveImpliedGrowth(symbol, assumptions, price, null, ctl.signal);
        if (ctl.signal.aborted) return;
        if (r?.error || !isNum(r?.impliedGrowth)) {
          setReverse({ status: 'error', impliedGrowth: null, verdict: null });
        } else {
          setReverse({
            status: 'ready',
            impliedGrowth: r.impliedGrowth,
            verdict: r.verdict || null,
          });
        }
      } catch (err) {
        if (ctl.signal.aborted) return;
        setResult({
          status: 'error',
          fairValue: null,
          wacc: null,
          error: err?.message || 'DCF unavailable',
        });
        setReverse({ status: 'idle', impliedGrowth: null, verdict: null });
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [symbol, ready, assumptions, price]);

  /** Set one of the four headline inputs. `pct` is in percent units (34 = 34%). */
  const setInput = useCallback(
    (key, pct) => {
      if (!isNum(pct)) return;
      const v = pct / 100;
      setAssumptions((prev) => {
        if (key === 'wacc') {
          const current = result.wacc;
          if (!isNum(current)) return prev;
          return shiftWacc(prev, v - current);
        }
        return { ...prev, [key]: v };
      });
    },
    [result.wacc],
  );

  const reset = useCallback(() => setAssumptions(baseRef.current), []);
  const retry = useCallback(() => setNonce((n) => n + 1), []);

  /* The four inputs the panel shows, in percent units. */
  const inputs = useMemo(
    () => ({
      revenueGrowthPct: isNum(assumptions.revenueGrowthPct)
        ? assumptions.revenueGrowthPct * 100
        : null,
      ebitPct: isNum(assumptions.ebitPct) ? assumptions.ebitPct * 100 : null,
      wacc: isNum(result.wacc) ? result.wacc * 100 : null,
      longTermGrowthRate: isNum(assumptions.longTermGrowthRate)
        ? assumptions.longTermGrowthRate * 100
        : null,
    }),
    [assumptions, result.wacc],
  );

  return {
    assumptions,
    inputs,
    setInput,
    reset,
    retry,
    fairValue: result.fairValue,
    status: ready ? result.status : result.status === 'error' ? 'error' : 'loading',
    error: result.error,
    impliedGrowthPct: isNum(reverse.impliedGrowth) ? reverse.impliedGrowth * 100 : null,
    reverseStatus: reverse.status,
    reverseVerdict: reverse.verdict,
  };
}

export default useDcfWorkbench;
