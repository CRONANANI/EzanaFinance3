'use client';

/**
 * ValuationMethodSelector: Company Research model card.
 *
 * Classifies the selected ticker into a valuation archetype (industry plus a
 * transparent financial screen), names the primary method and cross checks,
 * and routes the user into the matching Ezana model. Includes an inline
 * Gordon growth DDM calculator for dividend-led archetypes (banks, utilities),
 * since Ezana has no standalone DDM model yet.
 *
 * Data: the existing authed Finnhub proxy (stock/profile2, stock/metric).
 * No new API route. No invented numbers: missing fields render as a dash.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ModelCardShell } from '@/components/research/ModelCardShell';
import {
  VALUATION_ARCHETYPES,
  SCREEN_RULES,
  classifyValuationArchetype,
  gordonGrowthValue,
} from '@/lib/valuation/valuation-method-map';
import './valuation-method-selector.css';

const COURSE_HREF = '/learning-center/course/stocks-intermediate-9';
const MODEL_LABELS = { dcf: 'DCF Valuation', comps: 'Comparable Company Analysis' };
const DDM_ARCHETYPES = new Set(['financials', 'utilities']);

function pick(obj, keys) {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

function fmtPct(v) {
  return v == null ? '-' : `${v.toFixed(1)}%`;
}
function fmtRatio(v) {
  return v == null ? '-' : v.toFixed(2);
}
function fmtUsd(v) {
  return v == null ? '-' : `$${v.toFixed(2)}`;
}

export function ValuationMethodSelector({ symbol, onClose, onOpenModel }) {
  const [state, setState] = useState({ loading: true, error: null, profile: null, metric: null });
  const panelRef = useRef(null);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [symbol]);

  useEffect(() => {
    if (!symbol) return undefined;
    let cancelled = false;
    setState({ loading: true, error: null, profile: null, metric: null });
    const q = encodeURIComponent(symbol);
    Promise.all([
      fetch(`/api/finnhub/stock/profile2?symbol=${q}`, { cache: 'no-store' }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(`/api/finnhub/stock/metric?symbol=${q}&metric=all`, { cache: 'no-store' }).then((r) =>
        r.ok ? r.json() : null,
      ),
    ])
      .then(([profile, metricRes]) => {
        if (cancelled) return;
        if (!profile && !metricRes) {
          setState({
            loading: false,
            error: 'Company data is unavailable right now.',
            profile: null,
            metric: null,
          });
          return;
        }
        setState({ loading: false, error: null, profile, metric: metricRes?.metric || null });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            loading: false,
            error: 'Company data is unavailable right now.',
            profile: null,
            metric: null,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const inputs = useMemo(() => {
    const m = state.metric;
    return {
      industry: state.profile?.finnhubIndustry || null,
      revenueGrowthPct: pick(m, ['revenueGrowthTTMYoy', 'revenueGrowthQuarterlyYoy']),
      netMarginPct: pick(m, ['netProfitMarginTTM', 'netProfitMarginAnnual']),
      debtToEquity: pick(m, ['totalDebt/totalEquityQuarterly', 'totalDebt/totalEquityAnnual']),
      currentRatio: pick(m, ['currentRatioQuarterly', 'currentRatioAnnual']),
      dividendPerShare: pick(m, ['dividendPerShareAnnual', 'dividendPerShareTTM']),
    };
  }, [state.profile, state.metric]);

  const result = useMemo(
    () => (state.loading || state.error ? null : classifyValuationArchetype(inputs)),
    [state.loading, state.error, inputs],
  );

  const arch = result?.archetype;
  const showDdm =
    arch && (DDM_ARCHETYPES.has(arch.id) || DDM_ARCHETYPES.has(result.sectorArchetype.id));

  return (
    <div ref={panelRef} className="ai-analysis-panel">
      <ModelCardShell
        icon="bi-signpost-split"
        title="Valuation Method Selector"
        description={`Which valuation method fits ${symbol}, and why`}
        className="vms-card"
        actions={
          <button
            type="button"
            className="vms-close"
            onClick={onClose}
            aria-label="Close valuation method selector"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        }
      >
        {state.loading && (
          <div className="vms-skeleton" aria-busy="true" aria-label="Loading company profile">
            <div className="vms-skeleton-line vms-skeleton-line--wide" />
            <div className="vms-skeleton-line" />
            <div className="vms-skeleton-line" />
          </div>
        )}

        {state.error && <p className="vms-error">{state.error}</p>}

        {result && (
          <>
            <section className="vms-verdict" aria-label="Recommended method">
              <div className="vms-verdict-icon" aria-hidden="true">
                <i className={`bi ${arch.icon}`} />
              </div>
              <div className="vms-verdict-body">
                <span className="vms-eyebrow">{arch.label}</span>
                <h4 className="vms-verdict-method">{arch.primaryLong}</h4>
                <p className="vms-verdict-why">{arch.why}</p>
              </div>
            </section>

            {result.distressFlag && (
              <p className="vms-flag" role="note">
                <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                Distress screen triggered. Liquidation value is shown as the primary method; the
                sector method ({result.sectorArchetype.primary}) remains the going-concern view.
              </p>
            )}

            <dl className="vms-inputs" aria-label="Screening inputs">
              <div>
                <dt>Industry</dt>
                <dd>{inputs.industry || '-'}</dd>
              </div>
              <div>
                <dt>Revenue growth</dt>
                <dd className="vms-num">{fmtPct(inputs.revenueGrowthPct)}</dd>
              </div>
              <div>
                <dt>Net margin</dt>
                <dd className="vms-num">{fmtPct(inputs.netMarginPct)}</dd>
              </div>
              <div>
                <dt>Debt / equity</dt>
                <dd className="vms-num">{fmtRatio(inputs.debtToEquity)}</dd>
              </div>
              <div>
                <dt>Current ratio</dt>
                <dd className="vms-num">{fmtRatio(inputs.currentRatio)}</dd>
              </div>
            </dl>

            <div className="vms-grid">
              <section className="vms-panel" aria-label="Why this classification">
                <h5 className="vms-panel-title">Why this classification</h5>
                <ul className="vms-list">
                  {result.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <p className="vms-rules">
                  Screens: high growth at revenue growth of {SCREEN_RULES.highGrowthRevenuePct}% or
                  more; distress at net margin of {SCREEN_RULES.distressNetMarginPct}% or lower with
                  debt to equity above {SCREEN_RULES.distressDebtToEquity} or a current ratio below{' '}
                  {SCREEN_RULES.distressCurrentRatio}.
                </p>
              </section>

              <section className="vms-panel" aria-label="Cross checks and inputs">
                <h5 className="vms-panel-title">Cross check with</h5>
                <ul className="vms-list">
                  {arch.crossChecks.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                <h5 className="vms-panel-title">Inputs that drive it</h5>
                <div className="vms-chips">
                  {arch.keyInputs.map((k) => (
                    <span key={k} className="vms-chip">
                      {k}
                    </span>
                  ))}
                </div>
              </section>
            </div>

            {showDdm && <DdmCalculator dividendPerShare={inputs.dividendPerShare} />}

            <div className="vms-actions">
              {[arch.ezanaModel, arch.secondaryModel].filter(Boolean).map((id, i) => (
                <button
                  key={id}
                  type="button"
                  className={i === 0 ? 'vms-btn vms-btn--primary' : 'vms-btn'}
                  onClick={() => onOpenModel?.(id)}
                >
                  <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
                  Open {MODEL_LABELS[id] || id}
                </button>
              ))}
              <Link href={COURSE_HREF} className="vms-btn vms-btn--ghost">
                <i className="bi bi-mortarboard" aria-hidden="true" />
                Learn the methods
              </Link>
            </div>
          </>
        )}

        <details className="vms-matrix">
          <summary>All company types and their methods</summary>
          <table className="vms-table">
            <thead>
              <tr>
                <th scope="col">Company type</th>
                <th scope="col">Primary method</th>
                <th scope="col">Cross check</th>
              </tr>
            </thead>
            <tbody>
              {VALUATION_ARCHETYPES.map((a) => (
                <tr key={a.id} className={arch?.id === a.id ? 'is-match' : undefined}>
                  <th scope="row">
                    <i className={`bi ${a.icon}`} aria-hidden="true" /> {a.label}
                    {a.privateOnly && <span className="vms-tag">Private only</span>}
                  </th>
                  <td>{a.primary}</td>
                  <td>{a.crossChecks[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>

        <p className="vms-disclaimer">For educational purposes only. Not financial advice.</p>
      </ModelCardShell>
    </div>
  );
}

function DdmCalculator({ dividendPerShare }) {
  const [d0, setD0] = useState(dividendPerShare != null ? dividendPerShare.toFixed(2) : '');
  const [k, setK] = useState('9');
  const [g, setG] = useState('3');

  useEffect(() => {
    if (dividendPerShare != null) setD0(dividendPerShare.toFixed(2));
  }, [dividendPerShare]);

  const value = gordonGrowthValue(Number(d0), Number(k) / 100, Number(g) / 100);
  const invalid = d0 !== '' && Number(k) <= Number(g);

  return (
    <section className="vms-ddm" aria-label="Dividend discount calculator">
      <h5 className="vms-panel-title">Dividend discount check (Gordon growth)</h5>
      <p className="vms-ddm-formula">V = D0 x (1 + g) / (k - g)</p>
      <div className="vms-ddm-row">
        <label>
          <span>D0, annual dividend</span>
          <input
            className="vms-input"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={d0}
            onChange={(e) => setD0(e.target.value)}
          />
          <small>
            {dividendPerShare != null ? 'Latest reported, editable' : 'Not reported, enter it'}
          </small>
        </label>
        <label>
          <span>k, required return %</span>
          <input
            className="vms-input"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={k}
            onChange={(e) => setK(e.target.value)}
          />
          <small>Your assumption</small>
        </label>
        <label>
          <span>g, growth forever %</span>
          <input
            className="vms-input"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={g}
            onChange={(e) => setG(e.target.value)}
          />
          <small>Your assumption</small>
        </label>
        <div className="vms-ddm-out" aria-live="polite">
          <span>Value per share</span>
          <strong className="vms-num">{invalid ? 'k must exceed g' : fmtUsd(value)}</strong>
        </div>
      </div>
    </section>
  );
}

export default ValuationMethodSelector;
