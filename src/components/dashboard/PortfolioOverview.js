'use client';

import { usePortfolio } from '@/hooks/usePortfolio';
import { PlaidLinkButton } from './PlaidLinkButton';
import '../../../app-legacy/components/dashboard/portfolio-overview.css';

export function PortfolioOverview() {
  const { data, loading, error, sync } = usePortfolio();

  const handleConnectionSuccess = (result) => {
    console.log('Connected:', result);
    sync();
  };

  if (error && !data) {
    return (
      <div className="portfolio-empty">
        <div className="empty-state">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={sync} className="sync-btn">Retry</button>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="portfolio-loading">
        <div className="animate-pulse">Loading portfolio...</div>
      </div>
    );
  }

  if (!data?.accounts?.length) {
    return (
      <div className="portfolio-empty">
        <div className="empty-state">
          <svg className="w-16 h-16 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">Connect Your Brokerage</h3>
          <p className="text-gray-400 mb-6">Link your investment accounts to see your real portfolio data</p>
          <PlaidLinkButton onSuccess={handleConnectionSuccess} />
        </div>
      </div>
    );
  }

  const { summary, topHoldings, recentTransactions } = data;

  return (
    <div className="portfolio-overview">
      <div className="portfolio-header">
        <div className="portfolio-value">
          <span className="label">Total Portfolio Value</span>
          <span className="value">${summary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          <span className={`change ${summary.totalGainLoss >= 0 ? 'positive' : 'negative'}`}>
            {summary.totalGainLoss >= 0 ? '+' : ''}
            ${summary.totalGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            ({summary.totalReturnPercent.toFixed(2)}%)
          </span>
        </div>
        <div className="portfolio-actions">
          <button onClick={sync} className="sync-btn">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync
          </button>
          <PlaidLinkButton onSuccess={handleConnectionSuccess} className="add-account-btn" />
        </div>
      </div>

      <div className="holdings-section">
        <h3>Top Holdings</h3>
        <div className="holdings-list">
          {topHoldings.map((holding) => (
            <div key={holding.id} className="holding-item">
              <div className="holding-info">
                <span className="ticker">{holding.ticker_symbol || 'N/A'}</span>
                <span className="name">{holding.name}</span>
              </div>
              <div className="holding-value">
                <span className="value">${holding.institution_value?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                <span className={`gain ${holding.unrealized_gain_loss >= 0 ? 'positive' : 'negative'}`}>
                  {holding.unrealized_gain_loss >= 0 ? '+' : ''}
                  {holding.unrealized_gain_loss_percent?.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="transactions-section">
        <h3>Recent Activity</h3>
        <div className="transactions-list">
          {recentTransactions?.slice(0, 5).map((tx) => (
            <div key={tx.id} className="transaction-item">
              <div className="tx-info">
                <span className={`tx-type ${tx.type}`}>{tx.type}</span>
                <span className="tx-name">{tx.name}</span>
              </div>
              <div className="tx-amount">
                <span className={tx.amount > 0 ? 'negative' : 'positive'}>
                  ${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="tx-date">{new Date(tx.date).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="accounts-section">
        <h3>Connected Accounts</h3>
        <div className="accounts-list">
          {data.accounts.map((account) => (
            <div key={account.id} className="account-item">
              <div className="account-info">
                <span className="institution">{account.plaid_items?.institution_name}</span>
                <span className="account-name">{account.name} (****{account.mask})</span>
              </div>
              <div className="account-balance">
                ${account.current_balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
