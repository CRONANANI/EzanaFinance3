'use client';

import { useState, useMemo } from 'react';
import { AmSymbolChip } from './AmSymbolChip';
import { AmPct } from './AmPct';

const TIMEFRAMES = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y'];

export function AmPriceChart({
  assetName,
  assetTicker,
  accent = 'gold',
  currentPrice,
  delta,
  deltaAbs,
  series,
  ohlc,
  onAssetSelect,
}) {
  const [tf, setTf] = useState('3M');

  const path = useMemo(() => buildPath(series), [series]);
  const fillPath = useMemo(() => buildFillPath(series), [series]);

  return (
    <div className="am2-card">
      <div className="am2-card-head">
        <h3 className="am2-card-title">Price chart</h3>
        <button type="button" className="am2-asset-selector" onClick={onAssetSelect}>
          <AmSymbolChip accent={accent}>{assetTicker}</AmSymbolChip>
          <span>{assetName.replace(/\s*\(.+\)$/, '')} / USD</span>
          <span className="am2-asset-selector-chevron">▾</span>
        </button>
      </div>

      <div className="am2-chart-header-row">
        <div>
          <div className="am2-chart-big-value">{currentPrice}</div>
          <div className="am2-chart-delta">
            <AmPct ch={delta} signed />
            <span>{deltaAbs} · 24h</span>
          </div>
        </div>
        <div className="am2-seg" role="tablist" aria-label="Chart timeframe">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tf === t}
              className={`am2-seg-btn ${tf === t ? 'am2-seg-btn--active' : ''}`}
              onClick={() => setTf(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="am2-chart-area-wrap">
        <svg className="am2-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="am2-chart-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--emerald)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--emerald)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[20, 40, 60, 80].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="rgba(16, 185, 129, 0.06)"
              strokeWidth="0.3"
            />
          ))}
          <path d={fillPath} fill="url(#am2-chart-grad)" />
          <path
            d={path}
            fill="none"
            stroke="var(--emerald)"
            strokeWidth="0.6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        <div className="am2-chart-overlay">
          <div className="am2-chart-overlay-row">
            <span className="am2-chart-overlay-label">H</span>
            <span className="am2-chart-overlay-value">{formatMoney(ohlc.h)}</span>
          </div>
          <div className="am2-chart-overlay-row">
            <span className="am2-chart-overlay-label">L</span>
            <span className="am2-chart-overlay-value">{formatMoney(ohlc.l)}</span>
          </div>
          <div className="am2-chart-overlay-row">
            <span className="am2-chart-overlay-label">O</span>
            <span className="am2-chart-overlay-value">{formatMoney(ohlc.o)}</span>
          </div>
          <div className="am2-chart-overlay-row">
            <span className="am2-chart-overlay-label">V</span>
            <span className="am2-chart-overlay-value">{ohlc.v}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildPath(values) {
  if (!values || values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 80 - 10;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function buildFillPath(values) {
  const linePath = buildPath(values);
  if (!linePath) return '';
  return `${linePath} L 100 100 L 0 100 Z`;
}

function formatMoney(n) {
  if (n == null) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
