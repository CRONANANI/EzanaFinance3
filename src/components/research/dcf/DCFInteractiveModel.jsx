'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DCF_ASSUMPTIONS, DEFAULT_ASSUMPTIONS, formatAssumption } from './dcf-assumptions';
import DCFInfoModal from './DCFInfoModal';
import PriceComparisonChart from './PriceComparisonChart';
import './dcf-interactive.css';

export default function DCFInteractiveModel({ symbol, onClose }) {
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS);
  const [expandedId, setExpandedId] = useState(null);
  const [infoAssumption, setInfoAssumption] = useState(null);

  const [stocks, setStocks] = useState([]);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [errorSelected, setErrorSelected] = useState(null);
  const [applyToPeers, setApplyToPeers] = useState(false);
  const [peerLoadComplete, setPeerLoadComplete] = useState(false);

  const baselineLoadedRef = useRef(false);

  const fetchSingleStock = useCallback(async (sym, isPrimary, assumptionsToUse) => {
    const entry = {
      symbol: sym,
      livePrice: null,
      fairValue: null,
      error: null,
      isPrimary,
    };

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
        if (Number.isFinite(px) && px > 0) {
          entry.livePrice = px;
        }
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
              if (baseline.costOfEquity != null) next.costOfEquity = Number(baseline.costOfEquity) / 100;
              if (baseline.riskFreeRate != null) next.riskFreeRate = Number(baseline.riskFreeRate) / 100;
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
          } else {
            console.log(
              `[dcf-interactive] skipping peer ${peerSym}:`,
              peerEntry.error || 'missing data',
            );
          }
        }),
      );

      await Promise.all(peerPromises);
    } catch (err) {
      console.warn('[dcf-interactive] peer fetch failed:', err?.message);
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
      const validPeers = newPeerEntries.filter(
        (e) => e.fairValue != null && e.livePrice != null,
      );
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

  const grouped = DCF_ASSUMPTIONS.reduce((acc, a) => {
    if (!acc[a.section]) acc[a.section] = [];
    acc[a.section].push(a);
    return acc;
  }, {});

  return (
    <div className="dcf-interactive-root">
      <div className="dcf-interactive-header">
        <h3>DCF Valuation Model · {symbol}</h3>
        <button type="button" className="dcf-close-btn" onClick={onClose} aria-label="Close">
          <i className="bi bi-x-lg" /> Close
        </button>
      </div>

      <div className="dcf-interactive-body">
        <div className="dcf-assumptions-col">
          {Object.entries(grouped).map(([section, items]) => (
            <div key={section} className="dcf-assumption-section">
              <h4 className="dcf-section-title">{section}</h4>
              {items.map((a) => {
                const value = assumptions[a.id];
                const isExpanded = expandedId === a.id;
                return (
                  <div key={a.id} className={`dcf-assumption-row ${isExpanded ? 'expanded' : ''}`}>
                    <div className="dcf-assumption-row-top">
                      <button
                        type="button"
                        className="dcf-info-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInfoAssumption(a);
                        }}
                        aria-label={`About ${a.label}`}
                      >
                        <i className="bi bi-info-circle" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="dcf-assumption-label-btn"
                      onClick={() => setExpandedId(isExpanded ? null : a.id)}
                    >
                      <span className="dcf-assumption-label">{a.label}</span>
                      <span className="dcf-assumption-value">
                        [ {formatAssumption(value, a.unit)} ]
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="dcf-slider-wrap">
                        <input
                          type="range"
                          min={a.min}
                          max={a.max}
                          step={a.step}
                          value={value}
                          onChange={(e) => updateAssumption(a.id, Number(e.target.value))}
                          className="dcf-slider"
                        />
                        <div className="dcf-slider-bounds">
                          <span>{formatAssumption(a.min, a.unit)}</span>
                          <span>{formatAssumption(a.max, a.unit)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          <div className="dcf-recalc-area">
            <label className="dcf-peer-toggle">
              <input
                type="checkbox"
                checked={applyToPeers}
                onChange={(e) => setApplyToPeers(e.target.checked)}
              />
              <span>Apply to peers</span>
            </label>
            <button
              type="button"
              className="dcf-recalc-btn"
              onClick={handleRecalculate}
              disabled={loadingSelected}
            >
              {loadingSelected ? 'Calculating…' : 'Recalculate'}
            </button>
          </div>
        </div>

        <div className="dcf-chart-col">
          <PriceComparisonChart
            stocks={stocks}
            loadingSelected={loadingSelected}
            errorSelected={errorSelected}
            peerLoadComplete={peerLoadComplete}
          />
        </div>
      </div>

      {infoAssumption && (
        <DCFInfoModal assumption={infoAssumption} onClose={() => setInfoAssumption(null)} />
      )}
    </div>
  );
}
