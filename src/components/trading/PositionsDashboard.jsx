'use client';

import { useState, useEffect, useCallback } from 'react';

export function PositionsDashboard({ getToken }) {
  const [positions, setPositions] = useState([]);
  const [account, setAccount] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        </div>
      )}

      <div className="trd-form-card">
        <div className="trd-form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Positions ({positions.length})</h2>
          <button className="trd-btn-sm" onClick={fetchPositions}><i className="bi bi-arrow-clockwise" /> Refresh</button>
        </div>

        {error && <div className="trd-error"><i className="bi bi-exclamation-triangle" /> {error}</div>}

        {positions.length === 0 ? (
          <div className="trd-empty"><i className="bi bi-inbox" /><p>No open positions. Place a trade to get started.</p></div>
        ) : (
          <div className="trd-positions-list">
            {positions.map((p) => (
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
                <button className="trd-btn-close" onClick={() => closePosition(p.symbol)} title="Close position">
                  <i className="bi bi-x-circle" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
