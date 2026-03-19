'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

const ALLOCATION_COLORS = ['#10b981', '#3b82f6', '#a78bfa', '#f59e0b', '#ef4444', '#06b6d4'];

function PositionsDonut({ positions, totalValue }) {
  const segments = useMemo(() => {
    if (!totalValue || totalValue <= 0) return [];
    return positions.slice(0, 6).map((p, i) => ({
      name: p.symbol,
      pct: (p.marketValue / totalValue) * 100,
      color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length],
    })).filter((s) => s.pct > 0);
  }, [positions, totalValue]);

  if (segments.length === 0) return null;

  const size = 140;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="trd-positions-donut">
      <svg viewBox={`0 0 ${size} ${size}`} className="trd-donut-svg">
        {segments.map((seg, i) => {
          const dash = (seg.pct / 100) * circumference;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke={seg.color} strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="trd-donut-center">
        <span className="trd-donut-value">{positions.length}</span>
        <span className="trd-donut-label">positions</span>
      </div>
      <div className="trd-donut-legend">
        {segments.map((s) => (
          <div key={s.name} className="trd-donut-legend-item">
            <span className="trd-legend-dot" style={{ background: s.color }} />
            <span>{s.name}</span>
            <span className="trd-legend-pct">{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PositionsDashboard({ getToken }) {
  const [positions, setPositions] = useState([]);
  const [account, setAccount] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('symbol');
  const [sortDir, setSortDir] = useState('asc');

  const fetchPositions = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/alpaca/positions', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch positions');
      const data = await res.json();
      setPositions(data.positions || []);
      setAccount(data.account);
      setSummary(data.summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchPositions(); }, [fetchPositions]);

  const sortedPositions = useMemo(() => {
    const arr = [...positions];
    const mult = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (typeof va === 'string') return mult * (va.localeCompare(vb));
      return mult * ((va ?? 0) - (vb ?? 0));
    });
    return arr;
  }, [positions, sortBy, sortDir]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('asc'); }
  };

  const closePosition = async (symbol) => {
    if (!confirm(`Close your entire ${symbol} position?`)) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/alpaca/positions?symbol=${symbol}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to close position');
      fetchPositions();
    } catch (err) {
      alert(err.message);
    }
  };

  const totalValue = summary?.totalMarketValue || 0;
  const totalDayChange = positions.reduce((s, p) => s + (p.changeToday ?? 0) * (p.marketValue ?? 0) / 100, 0);

  if (loading) return <div className="trd-loading">Loading positions...</div>;

  return (
    <div className="trd-positions">
      {account && (
        <div className="trd-account-row">
          <div className="trd-account-card">
            <span className="trd-account-label">Portfolio Value</span>
            <span className="trd-account-value">${account.portfolioValue?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</span>
          </div>
          <div className="trd-account-card">
            <span className="trd-account-label">Cash</span>
            <span className="trd-account-value">${account.cash?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</span>
          </div>
          <div className="trd-account-card">
            <span className="trd-account-label">Buying Power</span>
            <span className="trd-account-value">${account.buyingPower?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</span>
          </div>
          <div className="trd-account-card">
            <span className="trd-account-label">Unrealized P&L</span>
            <span className={`trd-account-value ${(summary?.totalUnrealizedPL || 0) >= 0 ? 'positive' : 'negative'}`}>
              {(summary?.totalUnrealizedPL || 0) >= 0 ? '+' : ''}${summary?.totalUnrealizedPL?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
            </span>
          </div>
          <div className="trd-account-card">
            <span className="trd-account-label">Today&apos;s Change</span>
            <span className={`trd-account-value ${totalDayChange >= 0 ? 'positive' : 'negative'}`}>
              {totalDayChange >= 0 ? '+' : ''}${totalDayChange.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      <div className="trd-form-card trd-positions-card">
        <div className="trd-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Positions ({positions.length})</h2>
          <button className="trd-btn-sm" onClick={fetchPositions}><i className="bi bi-arrow-clockwise" /> Refresh</button>
        </div>

        {error && <div className="trd-error"><i className="bi bi-exclamation-triangle" /> {error}</div>}

        {positions.length === 0 ? (
          <div className="trd-empty"><i className="bi bi-inbox" /><p>No open positions. Place a trade to get started.</p></div>
        ) : (
          <div className="trd-positions-with-chart">
            <PositionsDonut positions={positions} totalValue={totalValue} />
            <div className="trd-positions-table-wrap">
              <div className="trd-positions-table-header">
                <button className={`trd-sort-col ${sortBy === 'symbol' ? 'active' : ''}`} onClick={() => toggleSort('symbol')}>
                  Symbol {sortBy === 'symbol' && <i className={`bi bi-caret-${sortDir === 'asc' ? 'up' : 'down'}-fill`} />}
                </button>
                <button className={`trd-sort-col ${sortBy === 'marketValue' ? 'active' : ''}`} onClick={() => toggleSort('marketValue')}>
                  Value {sortBy === 'marketValue' && <i className={`bi bi-caret-${sortDir === 'asc' ? 'up' : 'down'}-fill`} />}
                </button>
                <button className={`trd-sort-col ${sortBy === 'unrealizedPL' ? 'active' : ''}`} onClick={() => toggleSort('unrealizedPL')}>
                  P&L {sortBy === 'unrealizedPL' && <i className={`bi bi-caret-${sortDir === 'asc' ? 'up' : 'down'}-fill`} />}
                </button>
                <button className={`trd-sort-col ${sortBy === 'changeToday' ? 'active' : ''}`} onClick={() => toggleSort('changeToday')}>
                  Today&apos;s Change {sortBy === 'changeToday' && <i className={`bi bi-caret-${sortDir === 'asc' ? 'up' : 'down'}-fill`} />}
                </button>
                <span className="trd-sort-col-placeholder" />
              </div>
              <div className="trd-positions-list">
                {sortedPositions.map((p) => (
                  <div key={p.symbol} className="trd-position-row">
                    <div className="trd-position-left">
                      <span className="trd-position-symbol">{p.symbol}</span>
                      <span className="trd-position-qty">{p.qty} shares @ ${p.avgEntryPrice?.toFixed(2)}</span>
                    </div>
                    <div className="trd-position-mid">
                      <span className="trd-position-value">${p.marketValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      <span className="trd-position-price">Current: ${p.currentPrice?.toFixed(2)}</span>
                    </div>
                    <div className="trd-position-right">
                      <span className={`trd-position-pl ${p.unrealizedPL >= 0 ? 'positive' : 'negative'}`}>
                        {p.unrealizedPL >= 0 ? '+' : ''}${p.unrealizedPL?.toFixed(2)}
                      </span>
                      <span className={`trd-position-plpct ${p.unrealizedPLPercent >= 0 ? 'positive' : 'negative'}`}>
                        {p.unrealizedPLPercent >= 0 ? '+' : ''}{p.unrealizedPLPercent?.toFixed(2)}%
                      </span>
                    </div>
                    <div className="trd-position-today">
                      <span className={`trd-position-plpct ${(p.changeToday ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                        {(p.changeToday ?? 0) >= 0 ? '+' : ''}{(p.changeToday ?? 0).toFixed(2)}%
                      </span>
                    </div>
                    <button className="trd-btn-close" onClick={() => closePosition(p.symbol)} title="Close position">
                      <i className="bi bi-x-circle" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
