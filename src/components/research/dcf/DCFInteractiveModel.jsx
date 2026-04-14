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
  const [headline, setHeadline] = useState(null);
  const [livePrice, setLivePrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const baselineHydratedRef = useRef(false);

  const fetchLivePrice = useCallback(async () => {
    if (!symbol) return;
    try {
      const res = await fetch(`/api/fmp/quote?symbol=${encodeURIComponent(symbol)}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      const px = data?.price != null ? Number(data.price) : NaN;
      if (Number.isFinite(px) && px > 0) {
        setLivePrice(px);
      }
    } catch (err) {
      console.warn('[dcf-interactive] live price fetch failed:', err?.message);
    }
  }, [symbol]);

  const fetchDCF = useCallback(
    async (currentAssumptions) => {
      if (!symbol) return;
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ symbol });
        for (const [k, v] of Object.entries(currentAssumptions)) {
          if (k === 'forecastYears') continue;
          if (v != null && Number.isFinite(v)) {
            params.set(k, String(v));
          }
        }

        const res = await fetch(`/api/fmp/dcf-advanced?${params.toString()}`, {
          cache: 'no-store',
        });
        const data = await res.json();

        if (data.error) {
          setError(data.error + (data.detail ? `: ${data.detail}` : ''));
          return;
        }

        if (data.headline) {
          setHeadline(data.headline);

          if (data.headline.baselineAssumptions && !baselineHydratedRef.current) {
            baselineHydratedRef.current = true;
            const baseline = data.headline.baselineAssumptions;
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
        }
      } catch (err) {
        setError(err?.message || 'fetch failed');
      } finally {
        setLoading(false);
      }
    },
    [symbol]
  );

  useEffect(() => {
    baselineHydratedRef.current = false;
    setHeadline(null);
    setAssumptions(DEFAULT_ASSUMPTIONS);
    fetchLivePrice();
    fetchDCF(DEFAULT_ASSUMPTIONS);
  }, [symbol, fetchLivePrice, fetchDCF]);

  const updateAssumption = (id, value) => {
    setAssumptions((prev) => ({ ...prev, [id]: value }));
  };

  const handleRecalculate = () => {
    fetchDCF(assumptions);
  };

  const grouped = DCF_ASSUMPTIONS.reduce((acc, a) => {
    if (!acc[a.section]) acc[a.section] = [];
    acc[a.section].push(a);
    return acc;
  }, {});

  const rawFair = headline?.equityValuePerShare;
  const fairValue =
    rawFair != null && Number.isFinite(Number(rawFair)) ? Number(rawFair) : null;

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

          <button type="button" className="dcf-recalc-btn" onClick={handleRecalculate} disabled={loading}>
            {loading ? 'Calculating…' : 'Recalculate'}
          </button>
        </div>

        <div className="dcf-chart-col">
          <PriceComparisonChart
            symbol={symbol}
            livePrice={livePrice}
            fairValue={fairValue}
            loading={loading}
            error={error}
          />
        </div>
      </div>

      {infoAssumption && (
        <DCFInfoModal assumption={infoAssumption} onClose={() => setInfoAssumption(null)} />
      )}
    </div>
  );
}
