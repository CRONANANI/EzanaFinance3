'use client';

import { useState, useMemo } from 'react';

/* ── Static sector data — tickers with YTD change % ─────────────────── */
const SECTOR_DATA = {
  Technology: [
    { t: 'MSFT', ch: 39.92 }, { t: 'AAPL', ch: 47.82 },
    { t: 'NVDA', ch: 184.01 }, { t: 'GOOGL', ch: 34.42 },
    { t: 'META', ch: 134.23 }, { t: 'AVGO', ch: 53.55 },
    { t: 'ADBE', ch: 44.12 }, { t: 'CRM', ch: 57.16 },
    { t: 'ORCL', ch: 45.33 }, { t: 'AMD', ch: -72.94 },
    { t: 'INTC', ch: -5.30 }, { t: 'CSCO', ch: 7.98 },
  ],
  Finance: [
    { t: 'BRK.B', ch: 9.89 }, { t: 'JPM', ch: 7.46 },
    { t: 'V', ch: 13.40 }, { t: 'MA', ch: 11.83 },
    { t: 'BAC', ch: -13.20 }, { t: 'WFC', ch: -2.80 },
    { t: 'GS', ch: 16.19 }, { t: 'MS', ch: 0.19 },
  ],
  Healthcare: [
    { t: 'LLY', ch: 28.06 }, { t: 'UNH', ch: -8.59 },
    { t: 'JNJ', ch: -6.28 }, { t: 'MRK', ch: 3.99 },
    { t: 'ABBV', ch: -16.82 }, { t: 'PFE', ch: -28.13 },
    { t: 'TMO', ch: -5.71 }, { t: 'ABT', ch: -1.47 },
  ],
  Consumer: [
    { t: 'AMZN', ch: 52.38 }, { t: 'TSLA', ch: 122.59 },
    { t: 'WMT', ch: 9.72 }, { t: 'HD', ch: -2.43 },
    { t: 'COST', ch: 17.19 }, { t: 'MCD', ch: 12.78 },
    { t: 'NKE', ch: -6.62 }, { t: 'SBUX', ch: -0.11 },
    { t: 'DIS', ch: -0.11 }, { t: 'NFLX', ch: 80.91 },
  ],
  Energy: [
    { t: 'XOM', ch: -1.99 }, { t: 'CVX', ch: -8.22 },
    { t: 'COP', ch: -12.51 }, { t: 'SLB', ch: -18.40 },
  ],
  Industrials: [
    { t: 'CAT', ch: 2.24 }, { t: 'BA', ch: -67.09 },
    { t: 'UPS', ch: 1.52 }, { t: 'LMT', ch: -4.87 },
    { t: 'GE', ch: 44.44 },
  ],
};

/* ── Color scale — green for gains, red for losses ──────────────────── */
function heatmapColor(pct) {
  if (pct > 50) return 'linear-gradient(135deg, #059669, #047857)';
  if (pct > 20) return 'linear-gradient(135deg, #10b981, #059669)';
  if (pct > 10) return 'linear-gradient(135deg, #34d399, #10b981)';
  if (pct > 5) return 'linear-gradient(135deg, #4ade80, #22c55e)';
  if (pct > 2) return 'linear-gradient(135deg, #6ee7b7, #34d399)';
  if (pct > 0) return 'linear-gradient(135deg, #86efac, #4ade80)';
  if (pct > -2) return 'linear-gradient(135deg, #fca5a5, #f87171)';
  if (pct > -5) return 'linear-gradient(135deg, #f87171, #ef4444)';
  if (pct > -10) return 'linear-gradient(135deg, #ef4444, #dc2626)';
  if (pct > -20) return 'linear-gradient(135deg, #dc2626, #b91c1c)';
  return 'linear-gradient(135deg, #b91c1c, #991b1b)';
}

/* ── Sector accent colors (match sector distribution pie) ──────────── */
const SECTOR_ACCENT = {
  Technology: '#3b82f6',
  Finance: '#a78bfa',
  Healthcare: '#10b981',
  Consumer: '#ec4899',
  Energy: '#f97316',
  Industrials: '#f59e0b',
};

/* ── Tile size class based on absolute return magnitude ─────────────── */
function sizeClass(absPct) {
  if (absPct > 80) return 'large';
  if (absPct > 30) return 'medium';
  if (absPct > 10) return 'small';
  return 'tiny';
}

export function StockHeatmap({ onSelectStock }) {
  const [hoveredTicker, setHoveredTicker] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  /* Build sector groups — sort stocks within each sector by |return| descending */
  const sectorGroups = useMemo(() => {
    return Object.entries(SECTOR_DATA).map(([sectorName, stocks]) => {
      const sorted = [...stocks]
        .map((s) => ({ ...s, absReturn: Math.abs(s.ch), sector: sectorName }))
        .sort((a, b) => b.absReturn - a.absReturn);

      /* Total absolute return for this sector — used to proportion tile widths */
      const totalAbsReturn = sorted.reduce((sum, s) => sum + s.absReturn, 0);

      return { sectorName, stocks: sorted, totalAbsReturn };
    });
  }, []);

  /* Grand total for sector width proportions */
  const grandTotal = sectorGroups.reduce((sum, g) => sum + g.stocks.length, 0);

  return (
    <div className="heatmap-container">
      <div
        className="heatmap-grid"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          width: '100%',
          minHeight: 480,
          gap: 2,
        }}
      >
        {sectorGroups.map(({ sectorName, stocks, totalAbsReturn }) => {
          /* Sector takes width proportional to its stock count */
          const sectorWidthPct = (stocks.length / grandTotal) * 100;

          return (
            <div
              key={sectorName}
              className="heatmap-sector"
              style={{
                width: `calc(${sectorWidthPct}% - 2px)`,
                minWidth: 100,
                flexGrow: stocks.length,
                flexShrink: 1,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Sector label */}
              <div
                className="heatmap-sector-label"
                style={{
                  borderLeft: `3px solid ${SECTOR_ACCENT[sectorName] || '#6b7280'}`,
                }}
              >
                {sectorName}
              </div>

              {/* Stocks grid within sector */}
              <div className="heatmap-sector-stocks">
                {stocks.map((stock) => {
                  /* Tile size proportional to absolute YTD return within its sector */
                  const returnPct = totalAbsReturn > 0
                    ? (stock.absReturn / totalAbsReturn) * 100
                    : 100 / stocks.length;

                  const cls = sizeClass(stock.absReturn);
                  const bg = heatmapColor(stock.ch);
                  const sign = stock.ch >= 0 ? '+' : '';

                  return (
                    <div
                      key={`${stock.t}-${sectorName}`}
                      className={`heatmap-cell ${cls}`}
                      data-ticker={stock.t}
                      style={{
                        width: `${Math.max(returnPct, 8)}%`,
                        flexGrow: Math.max(Math.round(stock.absReturn), 1),
                        background: bg,
                      }}
                      title={`${stock.t} | ${sectorName} | ${sign}${stock.ch.toFixed(2)}% YTD`}
                      onClick={() => onSelectStock?.(stock.t)}
                      onMouseEnter={(e) => {
                        setHoveredTicker(stock.t);
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
                      }}
                      onMouseLeave={() => setHoveredTicker(null)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && onSelectStock?.(stock.t)}
                    >
                      <span className="heatmap-cell-ticker">{stock.t}</span>
                      <span className="heatmap-cell-change">{sign}{stock.ch.toFixed(1)}%</span>

                      {hoveredTicker === stock.t && (
                        <div
                          style={{
                            position: 'fixed',
                            left: tooltipPos.x,
                            top: tooltipPos.y,
                            transform: 'translate(-50%, -100%)',
                            zIndex: 9999,
                            background: '#0d1117',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f0f6fc' }}>{stock.t}</span>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: stock.ch >= 0 ? '#10b981' : '#ef4444',
                              }}
                            >
                              {sign}{stock.ch.toFixed(2)}%
                            </span>
                          </div>
                          <span style={{ fontSize: '0.6rem', color: '#8b949e' }}>
                            {sectorName} · YTD Return
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StockHeatmap;
