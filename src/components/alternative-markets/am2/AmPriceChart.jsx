'use client';

import { useMemo } from 'react';
import { AmPct } from './AmPct';

/*
 * The selected asset's price and 24 hour change, with an illustrative line
 * drawn from that change. The page has no price history, so there is no
 * timeframe to choose and the line is labelled as illustrative. The asset
 * picker lists the prices table's rows; clicking a row there selects it too.
 * `actions` holds the council's Start a pitch and Send to team (members only).
 */
export function AmPriceChart({
  assetName,
  assetTicker,
  currentPrice,
  delta,
  deltaAbs,
  series,
  ohlc,
  assets = [],
  onAssetSelect,
  actions = null,
}) {
  const path = useMemo(() => buildPath(series), [series]);
  const fillPath = useMemo(() => buildFillPath(series), [series]);

  return (
    <div className="am2-card">
      <div className="am2-card-head">
        <h3 className="am2-card-title">Price chart</h3>
        <div className="am2-chart-head-right">
          {actions}
          <label>
            <span className="am2-sr-only">Asset shown in the chart</span>
            <select
              className="am2-asset-select"
              value={assetTicker}
              onChange={(e) => onAssetSelect?.(e.target.value)}
            >
              {assets.map((a) => (
                <option key={a.ticker} value={a.ticker}>
                  {a.name.replace(/\s*\(.+\)$/, '')} / USD ({a.ticker})
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="am2-chart-header-row">
        <div>
          <div className="am2-chart-big-value">{currentPrice}</div>
          <div className="am2-chart-delta">
            <AmPct ch={delta} signed />
            <span>
              {deltaAbs} · 24h ({assetName.replace(/\s*\(.+\)$/, '')})
            </span>
          </div>
        </div>
        <span className="am2-chart-note">Illustrative line, not price history</span>
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
              stroke="var(--border-secondary)"
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
  if (n == null) return 'N/A';
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
