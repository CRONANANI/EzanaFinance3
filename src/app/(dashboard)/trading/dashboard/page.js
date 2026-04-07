'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import '../trading.css';

export default function TradingDashboardPlaceholderPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/trading/portfolio');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load');
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="trd-page trd-dash-placeholder dashboard-page-inset">
      <div className="trd-dash-header">
        <h1 className="trd-dash-title">Trading</h1>
        <p className="trd-dash-lead">
          Your brokerage account is active. The full trading workspace (order entry, advanced charts,
          and copy-trading controls) ships in a later release.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <Link href="/trading/mock" className="trd-mock-btn">
            <i className="bi bi-controller" />
            Try Mock Trading — $100,000 Paper Account
          </Link>
        </div>
      </div>

      {loading && <div className="trd-loading">Loading account…</div>}
      {error && (
        <div className="trd-error trd-dash-error" role="alert">
          <i className="bi bi-exclamation-triangle" /> {error}
        </div>
      )}

      {data?.account && (
        <div className="trd-dash-summary db-card">
          <h2 className="trd-dash-h2">Account snapshot</h2>
          <div className="trd-dash-metrics">
            <div>
              <span className="trd-dash-metric-label">Equity</span>
              <span className="trd-dash-metric-val">
                ${Number(data.account.equity ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="trd-dash-metric-label">Buying power</span>
              <span className="trd-dash-metric-val">
                ${Number(data.account.buying_power ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="trd-dash-metric-label">Cash</span>
              <span className="trd-dash-metric-val">
                ${Number(data.account.cash ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <p className="trd-dash-pos-hint">
            Open positions:{' '}
            <strong>{Array.isArray(data.positions) ? data.positions.length : 0}</strong>
          </p>
        </div>
      )}

      <div className="trd-dash-links">
        <Link href="/home-dashboard" className="trd-btn-secondary">
          Back to dashboard
        </Link>
        <Link href="/trading" className="trd-btn-secondary">
          Trading overview
        </Link>
      </div>

      <p className="trd-cta-legal">
        Brokerage services provided by Alpaca Securities LLC, member FINRA/SIPC. Investments involve
        risk.
      </p>
    </div>
  );
}
