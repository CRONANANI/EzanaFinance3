/**
 * PortfolioSummaryCard — Dashboard widget showing the user's
 * real portfolio from their connected brokerage(s).
 *
 * Shows: total value, gain/loss, top holdings, connected accounts.
 * If no brokerage connected, shows a CTA to connect via Plaid.
 */
'use client';

import { usePortfolio } from '@/contexts/PortfolioContext';
import { usePlaidConnect } from '@/hooks/usePlaidConnect';

export function PortfolioSummaryCard() {
  const {
    connected, summary, aggregated, institutions,
    isLoading, error, refresh, lastSynced,
  } = usePortfolio();

  const { openPlaid, isReady, isLoading: isConnecting } = usePlaidConnect();

  if (!connected && !isLoading) {
    return (
      <div className="component-card">
        <div className="card-header">
          <h3>Your Portfolio</h3>
        </div>
        <div className="card-body" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <i className="bi bi-bank" style={{ fontSize: '2.5rem', color: '#10b981', display: 'block', marginBottom: '1rem' }} />
          <h4 style={{ color: '#f0f6fc', marginBottom: '0.5rem', fontSize: '1rem' }}>Connect Your Brokerage</h4>
          <p style={{ color: '#6b7280', fontSize: '0.8125rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Link your brokerage account to see your real portfolio data,
            holdings, and personalized analysis across the entire platform.
          </p>
          <button
            onClick={openPlaid}
            disabled={!isReady || isConnecting}
            style={{
              padding: '0.625rem 1.5rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: isReady ? 'pointer' : 'not-allowed',
              opacity: isReady ? 1 : 0.5,
            }}
          >
            {isConnecting ? 'Connecting...' : 'Connect Brokerage'}
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && !summary) {
    return (
      <div className="component-card">
        <div className="card-header"><h3>Your Portfolio</h3></div>
        <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ color: '#6b7280', fontSize: '0.8125rem' }}>Loading portfolio...</div>
        </div>
      </div>
    );
  }

  const topHoldings = (aggregated || []).slice(0, 8);
  const gainColor = (summary?.totalGainLoss || 0) >= 0 ? '#10b981' : '#ef4444';

  return (
    <div className="component-card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Your Portfolio</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {institutions?.map((inst) => (
            <span key={inst.item_id} style={{
              fontSize: '0.5625rem', fontWeight: 700, color: '#10b981',
              background: 'rgba(16,185,129,0.1)', padding: '0.2rem 0.5rem',
              borderRadius: '4px', textTransform: 'uppercase',
            }}>
              {inst.institution_name}
            </span>
          ))}
          <button
            onClick={refresh}
            disabled={isLoading}
            title="Sync latest data"
            style={{
              background: 'transparent', border: 'none', color: '#6b7280',
              cursor: 'pointer', fontSize: '0.875rem', padding: '0.25rem',
            }}
          >
            <i className={`bi bi-arrow-clockwise ${isLoading ? 'spin-icon' : ''}`} />
          </button>
        </div>
      </div>
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(16,185,129,0.06)' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f0f6fc' }}>
              ${summary?.totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
              {summary?.positionCount || 0} positions · {summary?.accountCount || 0} accounts
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: gainColor }}>
              {(summary?.totalGainLoss || 0) >= 0 ? '+' : ''}${summary?.totalGainLoss?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </div>
            <div style={{ fontSize: '0.6875rem', color: gainColor }}>
              {(summary?.totalGainLossPercent || 0) >= 0 ? '+' : ''}{summary?.totalGainLossPercent?.toFixed(2) || '0.00'}%
            </div>
          </div>
        </div>

        {topHoldings.map((h) => (
          <div key={h.ticker || h.name} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.5rem 0', borderBottom: '1px solid rgba(16,185,129,0.03)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#f0f6fc', minWidth: '48px' }}>
                {h.ticker || '—'}
              </span>
              <span style={{ fontSize: '0.6875rem', color: '#6b7280', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {h.name || ''}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#e2e8f0' }}>
                ${h.totalValue?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '—'}
              </div>
              <div style={{
                fontSize: '0.625rem', fontWeight: 600,
                color: (h.gainLossPercent || 0) >= 0 ? '#10b981' : '#ef4444',
              }}>
                {(h.gainLossPercent || 0) >= 0 ? '+' : ''}{h.gainLossPercent?.toFixed(1) || '0.0'}%
                <span style={{ color: '#4b5563', marginLeft: '0.375rem' }}>
                  {h.portfolioWeight?.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ))}

        {lastSynced && (
          <div style={{ fontSize: '0.5625rem', color: '#4b5563', textAlign: 'right', marginTop: '0.75rem' }}>
            Last synced: {new Date(lastSynced).toLocaleString()}
          </div>
        )}

        {error && (
          <div style={{ fontSize: '0.6875rem', color: '#f87171', marginTop: '0.5rem' }}>
            <i className="bi bi-exclamation-triangle" style={{ marginRight: '0.25rem' }} />{error}
          </div>
        )}
      </div>
    </div>
  );
}

export default PortfolioSummaryCard;
