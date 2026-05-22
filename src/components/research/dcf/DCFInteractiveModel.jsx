'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DCF_ASSUMPTIONS, DEFAULT_ASSUMPTIONS, formatAssumption } from './dcf-assumptions';
import DCFInfoModal from './DCFInfoModal';
import ReverseDCFPanel from './ReverseDCFPanel';
import './dcf-v5.css';
import './dcf-interactive.css';

/* Map of {section name from dcf-assumptions.js} → {column head in V5 layout}.
   Lets us reuse the existing 13 assumptions without renaming them in the
   data file. */
const SECTION_TO_COLUMN = {
  'Revenue Growth Assumptions': 'Revenue Growth',
  'Profitability Assumptions': 'Profitability',
  'Reinvestment Assumptions': 'Reinvestment',
  'Terminal Value Assumptions': 'Terminal Value',
  'Discount Rate Assumptions': 'Discount Rate',
  'Forecast Period': 'Forecast Period',
};

const COLUMN_ORDER = [
  'Revenue Growth',
  'Profitability',
  'Reinvestment',
  'Terminal Value',
  'Discount Rate',
  'Forecast Period',
];

function computeDelta(fairValue, livePrice) {
  if (!Number.isFinite(fairValue) || !Number.isFinite(livePrice) || livePrice <= 0) return null;
  return ((fairValue - livePrice) / livePrice) * 100;
}

function badgeVariant(deltaPct) {
  if (deltaPct == null) return { label: '—', cls: 'dcf-v5-badge--fair', arrow: '·' };
  if (deltaPct >= 5) return { label: 'Undervalued', cls: 'dcf-v5-badge--good', arrow: '↑' };
  if (deltaPct <= -5) return { label: 'Overvalued', cls: 'dcf-v5-badge--bad', arrow: '↓' };
  return { label: 'Fairly Valued', cls: 'dcf-v5-badge--fair', arrow: '≈' };
}

function PeerBar({ ticker, delta, isSelf }) {
  // Map -100..+100 → 0..100 of track. 0 sits at 50%.
  const clamped = Math.max(-100, Math.min(100, delta ?? 0));
  const widthPct = Math.abs(clamped) / 2; // half of 100 = 50% max width
  const leftPct = clamped >= 0 ? 50 : 50 - widthPct;

  const isGood = clamped > 0;
  const barCls = isGood ? 'dcf-v5-peer-bar--good' : 'dcf-v5-peer-bar--bad';
  const valCls = isGood ? 'dcf-v5-peer-val--good' : 'dcf-v5-peer-val--bad';
  const sign = clamped >= 0 ? '+' : '';

  return (
    <div className="dcf-v5-peer-row">
      <span className={`dcf-v5-peer-ticker${isSelf ? ' is-self' : ''}`}>{ticker}</span>
      <span className="dcf-v5-peer-bar-track">
        <span
          className={`dcf-v5-peer-bar ${barCls}`}
          style={{ '--w': `${widthPct}%`, '--left': `${leftPct}%` }}
        />
      </span>
      <span className={`dcf-v5-peer-val ${valCls}`}>
        {sign}
        {clamped.toFixed(1)}%
      </span>
    </div>
  );
}

export default function DCFInteractiveModel({ symbol, onClose }) {
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS);
  const [expandedId, setExpandedId] = useState(null);
  const [infoAssumption, setInfoAssumption] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [errorSelected, setErrorSelected] = useState(null);
  const [applyToPeers, setApplyToPeers] = useState(false);
  const [peerLoadComplete, setPeerLoadComplete] = useState(false);
  const [dcfMode, setDcfMode] = useState('forward');

  const baselineLoadedRef = useRef(false);

  const fetchSingleStock = useCallback(async (sym, isPrimary, assumptionsToUse) => {
    const entry = { symbol: sym, livePrice: null, fairValue: null, error: null, isPrimary };
    const params = new URLSearchParams({ symbol: sym });
    if (assumptionsToUse) {
      for (const [k, v] of Object.entries(assumptionsToUse)) {
        if (k === 'forecastYears') continue;
        if (v != null && Number.isFinite(v)) params.set(k, String(v));
      }
    }
    const [priceRes, dcfRes] = await Promise.allSettled([
      fetch(`/api/fmp/quote?symbol=${encodeURIComponent(sym)}`, { cache: 'no-store' }),
      fetch(`/api/fmp/dcf-advanced?${params.toString()}`, { cache: 'no-store' }),
    ]);
    if (priceRes.status === 'fulfilled' && priceRes.value.ok) {
      try {
        const pd = await priceRes.value.json();
        const px = pd?.price != null ? Number(pd.price) : NaN;
        if (Number.isFinite(px) && px > 0) entry.livePrice = px;
      } catch {
        /* ignore */
      }
    }
    if (dcfRes.status === 'fulfilled' && dcfRes.value.ok) {
      try {
        const dd = await dcfRes.value.json();
        if (dd?.error) {
          entry.error = dd.error;
        } else if (dd?.headline?.equityValuePerShare != null) {
          const ev = Number(dd.headline.equityValuePerShare);
          entry.fairValue = Number.isFinite(ev) ? ev : null;
          if (isPrimary && !baselineLoadedRef.current && dd.headline.baselineAssumptions) {
            const baseline = dd.headline.baselineAssumptions;
            baselineLoadedRef.current = true;
            setAssumptions((prev) => {
              const next = { ...prev };
              if (baseline.beta != null) next.beta = Number(baseline.beta);
              if (baseline.costOfDebt != null) next.costOfDebt = Number(baseline.costOfDebt) / 100;
              if (baseline.costOfEquity != null)
                next.costOfEquity = Number(baseline.costOfEquity) / 100;
              if (baseline.riskFreeRate != null)
                next.riskFreeRate = Number(baseline.riskFreeRate) / 100;
              if (baseline.marketRiskPremium != null) {
                next.marketRiskPremium = Number(baseline.marketRiskPremium) / 100;
              }
              if (baseline.taxRate != null) next.taxRate = Number(baseline.taxRate) / 100;
              if (baseline.longTermGrowthRate != null) {
                next.longTermGrowthRate = Number(baseline.longTermGrowthRate) / 100;
              }
              return next;
            });
          }
        } else {
          entry.error = 'no fair value returned';
        }
      } catch (err) {
        entry.error = err?.message || 'parse failed';
      }
    } else {
      entry.error = 'DCF fetch failed';
    }
    return entry;
  }, []);

  const loadInitial = useCallback(async () => {
    if (!symbol) return;
    setLoadingSelected(true);
    setErrorSelected(null);
    setPeerLoadComplete(false);
    baselineLoadedRef.current = false;
    setStocks([]);
    const primary = await fetchSingleStock(symbol, true, null);
    setStocks([primary]);
    setLoadingSelected(false);
    if (primary.error) {
      setErrorSelected(primary.error);
      setPeerLoadComplete(true);
      return;
    }
    try {
      const peerRes = await fetch(`/api/fmp/peers?symbol=${encodeURIComponent(symbol)}&limit=3`);
      const peerData = await peerRes.json();
      const peerSymbols = Array.isArray(peerData?.peers) ? peerData.peers : [];
      if (peerSymbols.length === 0) {
        setPeerLoadComplete(true);
        return;
      }
      const peerPromises = peerSymbols.map((peerSym) =>
        fetchSingleStock(peerSym, false, null).then((peerEntry) => {
          if (peerEntry.fairValue != null && peerEntry.livePrice != null) {
            setStocks((prev) => [...prev, peerEntry]);
          }
        }),
      );
      await Promise.all(peerPromises);
    } catch (err) {
      console.warn('[dcf-v5] peer fetch failed:', err?.message);
    } finally {
      setPeerLoadComplete(true);
    }
  }, [symbol, fetchSingleStock]);

  const handleRecalculate = useCallback(async () => {
    if (!symbol) return;
    setLoadingSelected(true);
    setErrorSelected(null);
    const newPrimary = await fetchSingleStock(symbol, true, assumptions);
    if (applyToPeers) {
      const existingPeerSyms = stocks.filter((s) => !s.isPrimary).map((s) => s.symbol);
      const newPeerEntries = await Promise.all(
        existingPeerSyms.map((symPeer) => fetchSingleStock(symPeer, false, assumptions)),
      );
      const validPeers = newPeerEntries.filter((e) => e.fairValue != null && e.livePrice != null);
      setStocks([newPrimary, ...validPeers]);
    } else {
      setStocks((prev) => {
        const peers = prev.filter((s) => !s.isPrimary);
        return [newPrimary, ...peers];
      });
    }
    setLoadingSelected(false);
    if (newPrimary.error) setErrorSelected(newPrimary.error);
  }, [symbol, stocks, assumptions, applyToPeers, fetchSingleStock]);

  useEffect(() => {
    loadInitial();
  }, [symbol, loadInitial]);

  const updateAssumption = (id, value) => {
    setAssumptions((prev) => ({ ...prev, [id]: value }));
  };

  // Group assumptions by V5 column name
  const assumptionsByColumn = useMemo(() => {
    const grouped = {};
    for (const col of COLUMN_ORDER) grouped[col] = [];
    for (const a of DCF_ASSUMPTIONS) {
      const col = SECTION_TO_COLUMN[a.section] || a.section;
      if (!grouped[col]) grouped[col] = [];
      grouped[col].push(a);
    }
    return grouped;
  }, []);

  const primaryStock = stocks.find((s) => s.isPrimary) || null;
  const peers = stocks.filter((s) => !s.isPrimary);

  const primaryDelta = primaryStock
    ? computeDelta(primaryStock.fairValue, primaryStock.livePrice)
    : null;
  const variant = badgeVariant(primaryDelta);

  const summaryClass = primaryDelta != null && primaryDelta < 0 ? 'dcf-v5-bad' : 'dcf-v5-good';
  const summaryWord = primaryDelta != null && primaryDelta < 0 ? 'premium' : 'discount';

  return (
    <article className="dcf-v5">
      <svg width="0" height="0" className="dcf-v5-defs" aria-hidden="true">
        <defs>
          <filter id="dcf-v5-sk-rough" x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="1.6" />
          </filter>
          <filter id="dcf-v5-sk-rough-strong" x="-3%" y="-3%" width="106%" height="106%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" />
            <feDisplacementMap in="SourceGraphic" scale="2.5" />
          </filter>
        </defs>
      </svg>

      {/* Title bar */}
      <header className="dcf-v5-title-bar">
        <h1 className="dcf-v5-title">
          DCF Valuation Model <span className="dcf-v5-muted">· {symbol}</span>
        </h1>
        <div className="dcf-v5-actions">
          <label className="dcf-v5-peer-toggle">
            <input
              type="checkbox"
              checked={applyToPeers}
              onChange={(e) => setApplyToPeers(e.target.checked)}
            />
            Apply to peers
          </label>
          <button
            type="button"
            className="dcf-v5-btn dcf-v5-btn-primary"
            onClick={handleRecalculate}
            disabled={loadingSelected}
          >
            {loadingSelected ? 'Calculating…' : 'Recalculate'}
          </button>
          <button type="button" className="dcf-v5-btn" onClick={onClose}>
            ✕ Close
          </button>
        </div>
        <svg
          className="dcf-v5-rule"
          viewBox="0 0 100 4"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 0.5 2 L 99.5 2"
            stroke="currentColor"
            strokeWidth="0.5"
            filter="url(#dcf-v5-sk-rough)"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </header>

      {/* Mode tabs */}
      <nav className="dcf-v5-mode-tabs">
        <button
          type="button"
          className={`dcf-v5-mode-tab${dcfMode === 'forward' ? ' is-active' : ''}`}
          onClick={() => setDcfMode('forward')}
        >
          <span className="dcf-v5-mode-tab-top">
            <span className="dcf-v5-mode-icon" aria-hidden>
              📈
            </span>
            <span className="dcf-v5-mode-name">Forward DCF</span>
          </span>
          <span className="dcf-v5-mode-sub">compute fair value</span>
        </button>
        <button
          type="button"
          className={`dcf-v5-mode-tab${dcfMode === 'reverse' ? ' is-active' : ''}`}
          onClick={() => setDcfMode('reverse')}
        >
          <span className="dcf-v5-mode-tab-top">
            <span className="dcf-v5-mode-icon" aria-hidden>
              ⇌
            </span>
            <span className="dcf-v5-mode-name">Reverse DCF</span>
          </span>
          <span className="dcf-v5-mode-sub">implied growth</span>
        </button>
      </nav>

      {dcfMode === 'reverse' ? (
        <ReverseDCFPanel
          symbol={symbol}
          baseAssumptions={assumptions}
          livePrice={primaryStock?.livePrice ?? null}
        />
      ) : (
        <>
          {/* Result band */}
          <section className="dcf-v5-result-band">
            {loadingSelected && !primaryStock && (
              <div className="dcf-v5-loading">Calculating DCF for {symbol}…</div>
            )}

            {errorSelected && !primaryStock && <div className="dcf-v5-error">{errorSelected}</div>}

            {primaryStock && primaryStock.fairValue != null && (
              <>
                <div className="dcf-v5-hero">
                  <div className="dcf-v5-hero-figure">
                    <div className="dcf-v5-hero-label">Fair value (DCF)</div>
                    <div className="dcf-v5-hero-fair">${primaryStock.fairValue.toFixed(2)}</div>
                  </div>
                  <div className="dcf-v5-hero-vs">vs</div>
                  <div className="dcf-v5-hero-figure">
                    <div className="dcf-v5-hero-label">Market price</div>
                    <div className="dcf-v5-hero-market">
                      ${(primaryStock.livePrice ?? 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="dcf-v5-hero-badge">
                    <span className={`dcf-v5-badge ${variant.cls}`}>
                      <span className="dcf-v5-badge-arrow" aria-hidden>
                        {variant.arrow}
                      </span>
                      {variant.label}
                      <span className="dcf-v5-badge-pct">
                        {primaryDelta != null
                          ? `${primaryDelta >= 0 ? '+' : ''}${primaryDelta.toFixed(1)}%`
                          : '—'}
                      </span>
                    </span>
                  </div>
                </div>

                <svg
                  className="dcf-v5-rule"
                  viewBox="0 0 100 4"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M 0.5 2 L 99.5 2"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    filter="url(#dcf-v5-sk-rough)"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>

                {peers.length > 0 && (
                  <div className="dcf-v5-peer-chart">
                    <div className="dcf-v5-peer-axis">
                      <span>−100%</span>
                      <span>0% (fairly valued)</span>
                      <span>+100%</span>
                    </div>
                    <div className="dcf-v5-peer-rows">
                      <div className="dcf-v5-peer-zone" aria-hidden />
                      <div className="dcf-v5-peer-center" aria-hidden />
                      <PeerBar ticker={primaryStock.symbol} delta={primaryDelta} isSelf />
                      {peers.map((p) => (
                        <PeerBar
                          key={p.symbol}
                          ticker={p.symbol}
                          delta={computeDelta(p.fairValue, p.livePrice)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {peerLoadComplete && peers.length === 0 && (
                  <p className="dcf-v5-summary">Peer DCF data unavailable for this stock.</p>
                )}

                {primaryDelta != null && (
                  <p className="dcf-v5-summary">
                    The DCF model values <strong>{primaryStock.symbol}</strong> at{' '}
                    <strong className="dcf-v5-mono">${primaryStock.fairValue.toFixed(2)}</strong>{' '}
                    per share, a{' '}
                    <strong className={`dcf-v5-mono ${summaryClass}`}>
                      {Math.abs(primaryDelta).toFixed(1)}% {summaryWord}
                    </strong>{' '}
                    {primaryDelta < 0 ? 'over' : 'to'} the current market price of{' '}
                    <strong className="dcf-v5-mono">
                      ${(primaryStock.livePrice ?? 0).toFixed(2)}
                    </strong>
                    .
                    {peers.length > 0 && (
                      <>
                        {' '}
                        Compared against {peers.length} sector peers (
                        {peers.map((p) => p.symbol).join(', ')}), {primaryStock.symbol} is{' '}
                        {primaryDelta < 0 ? 'less attractively priced' : 'more attractively priced'}{' '}
                        on a DCF basis.
                      </>
                    )}
                  </p>
                )}
              </>
            )}
          </section>

          {/* Inputs band */}
          <section className="dcf-v5-inputs-band">
            {COLUMN_ORDER.map((colName) => {
              const items = assumptionsByColumn[colName] || [];
              return (
                <div key={colName} className="dcf-v5-input-col">
                  <h2 className="dcf-v5-col-head">{colName}</h2>
                  {items.map((a) => {
                    const value = assumptions[a.id];
                    const isExpanded = expandedId === a.id;
                    return (
                      <div key={a.id} style={{ position: 'relative' }}>
                        <button
                          type="button"
                          className={`dcf-v5-input${isExpanded ? ' is-active' : ''}`}
                          onClick={() => setExpandedId(isExpanded ? null : a.id)}
                          aria-expanded={isExpanded}
                        >
                          <span className="dcf-v5-input-label">{a.label}</span>
                          <span className="dcf-v5-input-value">
                            {formatAssumption(value, a.unit)}
                          </span>
                          <span className="dcf-v5-caret" aria-hidden>
                            ▾
                          </span>
                        </button>

                        {isExpanded && (
                          <div
                            className="dcf-v5-popover"
                            role="dialog"
                            aria-label={`${a.label} slider`}
                          >
                            <div className="dcf-v5-popover-header">
                              <span className="dcf-v5-popover-title">{a.label}</span>
                              <button
                                type="button"
                                className="dcf-v5-popover-info"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInfoAssumption(a);
                                }}
                                aria-label={`About ${a.label}`}
                              >
                                ⓘ
                              </button>
                            </div>
                            <input
                              type="range"
                              min={a.min}
                              max={a.max}
                              step={a.step}
                              value={value}
                              onChange={(e) => updateAssumption(a.id, Number(e.target.value))}
                              className="dcf-v5-slider"
                              aria-label={a.label}
                            />
                            <div className="dcf-v5-popover-bounds">
                              <span>{formatAssumption(a.min, a.unit)}</span>
                              <span className="dcf-v5-popover-current">
                                {formatAssumption(value, a.unit)}
                              </span>
                              <span>{formatAssumption(a.max, a.unit)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </section>

          {infoAssumption && (
            <DCFInfoModal assumption={infoAssumption} onClose={() => setInfoAssumption(null)} />
          )}
        </>
      )}
    </article>
  );
}
