'use client';

import { useState, useEffect, useCallback } from 'react';

const SECTOR_DATA = {
  Technology: [
    { t: 'MSFT', mc: 3100, ch: 39.92 }, { t: 'AAPL', mc: 2900, ch: 47.82 },
    { t: 'NVDA', mc: 2800, ch: 184.01 }, { t: 'GOOGL', mc: 2100, ch: 34.42 },
    { t: 'META', mc: 1500, ch: 134.23 }, { t: 'AVGO', mc: 800, ch: 53.55 },
    { t: 'ADBE', mc: 250, ch: 44.12 }, { t: 'CRM', mc: 270, ch: 57.16 },
    { t: 'ORCL', mc: 390, ch: 45.33 }, { t: 'AMD', mc: 220, ch: -72.94 },
    { t: 'INTC', mc: 100, ch: -5.30 }, { t: 'CSCO', mc: 230, ch: 7.98 },
  ],
  Finance: [
    { t: 'BRK.B', mc: 880, ch: 9.89 }, { t: 'JPM', mc: 680, ch: 7.46 },
    { t: 'V', mc: 570, ch: 13.40 }, { t: 'MA', mc: 440, ch: 11.83 },
    { t: 'BAC', mc: 340, ch: -13.20 }, { t: 'WFC', mc: 220, ch: -2.80 },
    { t: 'GS', mc: 180, ch: 16.19 }, { t: 'MS', mc: 160, ch: 0.19 },
  ],
  Healthcare: [
    { t: 'LLY', mc: 720, ch: 28.06 }, { t: 'UNH', mc: 480, ch: -8.59 },
    { t: 'JNJ', mc: 400, ch: -6.28 }, { t: 'MRK', mc: 310, ch: 3.99 },
    { t: 'ABBV', mc: 300, ch: -16.82 }, { t: 'PFE', mc: 150, ch: -28.13 },
    { t: 'TMO', mc: 210, ch: -5.71 }, { t: 'ABT', mc: 195, ch: -1.47 },
  ],
  Consumer: [
    { t: 'AMZN', mc: 2000, ch: 52.38 }, { t: 'TSLA', mc: 800, ch: 122.59 },
    { t: 'WMT', mc: 500, ch: 9.72 }, { t: 'HD', mc: 370, ch: -2.43 },
    { t: 'COST', mc: 350, ch: 17.19 }, { t: 'MCD', mc: 210, ch: 12.78 },
    { t: 'NKE', mc: 120, ch: -6.62 }, { t: 'SBUX', mc: 110, ch: -0.11 },
    { t: 'DIS', mc: 180, ch: -0.11 }, { t: 'NFLX', mc: 280, ch: 80.91 },
  ],
  Energy: [
    { t: 'XOM', mc: 460, ch: -1.99 }, { t: 'CVX', mc: 300, ch: -8.22 },
    { t: 'COP', mc: 140, ch: -12.51 }, { t: 'SLB', mc: 70, ch: -18.40 },
  ],
  Industrials: [
    { t: 'CAT', mc: 170, ch: 2.24 }, { t: 'BA', mc: 130, ch: -67.09 },
    { t: 'UPS', mc: 100, ch: 1.52 }, { t: 'LMT', mc: 120, ch: -4.87 },
    { t: 'GE', mc: 190, ch: 44.44 },
  ],
};

function heatmapColor(changePct) {
  if (changePct > 50) return 'linear-gradient(135deg, #059669, #047857)';
  if (changePct > 20) return 'linear-gradient(135deg, #10b981, #059669)';
  if (changePct > 10) return 'linear-gradient(135deg, #34d399, #10b981)';
  if (changePct > 5) return 'linear-gradient(135deg, #4ade80, #22c55e)';
  if (changePct > 2) return 'linear-gradient(135deg, #6ee7b7, #34d399)';
  if (changePct > 0) return 'linear-gradient(135deg, #86efac, #4ade80)';
  if (changePct > -2) return 'linear-gradient(135deg, #fca5a5, #f87171)';
  if (changePct > -5) return 'linear-gradient(135deg, #f87171, #ef4444)';
  if (changePct > -10) return 'linear-gradient(135deg, #ef4444, #dc2626)';
  if (changePct > -20) return 'linear-gradient(135deg, #dc2626, #b91c1c)';
  return 'linear-gradient(135deg, #b91c1c, #991b1b)';
}

export function StockHeatmap({ onSelectStock }) {
  const [stocks, setStocks] = useState([]);

  useEffect(() => {
    const allStocks = [];
    for (const [sector, sectorStocks] of Object.entries(SECTOR_DATA)) {
      sectorStocks.forEach((s) => allStocks.push({ ...s, sector }));
    }
    allStocks.sort((a, b) => b.mc - a.mc);
    setStocks(allStocks);
  }, []);

  const totalMc = stocks.reduce((sum, s) => sum + s.mc, 0);

  return (
    <div className="heatmap-grid" style={{ display: 'flex', flexWrap: 'wrap', width: '100%', minHeight: 480 }}>
      {stocks.map((stock) => {
        const pct = totalMc > 0 ? (stock.mc / totalMc) * 100 : 0;
        const bg = heatmapColor(stock.ch);
        let sizeClass = 'small';
        if (pct > 5) sizeClass = 'large';
        else if (pct > 2) sizeClass = 'medium';
        else if (pct < 0.8) sizeClass = 'tiny';

        const w = Math.max(pct * 1.8, 3);
        const sign = stock.ch >= 0 ? '+' : '';

        return (
          <div
            key={`${stock.t}-${stock.sector}`}
            className={`heatmap-cell ${sizeClass}`}
            data-ticker={stock.t}
            style={{
              width: `${w}%`,
              flexGrow: Math.max(Math.round(pct * 10), 1),
              background: bg,
            }}
            title={`${stock.t} | ${stock.sector} | ${sign}${stock.ch.toFixed(2)}%`}
            onClick={() => onSelectStock?.(stock.t)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelectStock?.(stock.t)}
          >
            <span className="heatmap-cell-ticker">{stock.t}</span>
            <span className="heatmap-cell-change">{sign}{stock.ch.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}
