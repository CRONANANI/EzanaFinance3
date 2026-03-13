'use client';

import React, { useState } from 'react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { TrendingUp, TrendingDown, DollarSign, PieChart, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { PlaidLinkButton } from './PlaidLinkButton';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatPercent = (value) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

export default function PortfolioDashboard() {
  const { portfolio, isLoading, error, refetch } = usePortfolio();
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const [topPerformersExpanded, setTopPerformersExpanded] = useState(false);
  const [allocationExpanded, setAllocationExpanded] = useState(false);

  const toggleAccount = (accountId) => {
    setExpandedAccounts((prev) => ({ ...prev, [accountId]: !prev[accountId] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-gray-400">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return null;
  }

  const { summary, accounts, topPerformers, allocation } = portfolio;
  const isPositive = summary.totalGainLoss >= 0;

  if (summary.accountCount === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Portfolio Overview</h2>
        <div className="flex flex-col items-center justify-center min-h-[300px] bg-[#161b22] rounded-xl border border-gray-800 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <DollarSign className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Connect Your Brokerage</h3>
          <p className="text-gray-400 mb-6 max-w-md">
            Link your investment accounts via Plaid to see your real portfolio data, holdings, and performance.
          </p>
          <PlaidLinkButton onSuccess={() => refetch()} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Portfolio Overview</h2>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-[#161b22] rounded-lg border border-gray-700 hover:border-emerald-500/30 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Consolidated metrics card - same dimensions as quick actions bar */}
      <div className="portfolio-metrics-consolidated">
        <div className="metric-item">
          <div className="metric-icon-wrap">
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <span className="metric-label">Total Value</span>
          <span className="metric-value">{formatCurrency(summary.totalValue)}</span>
        </div>
        <div className="metric-item">
          <div className={`metric-icon-wrap ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
          </div>
          <span className="metric-label">Total Gain/Loss</span>
          <span className={`metric-value ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {formatCurrency(summary.totalGainLoss)}
          </span>
          <span className={`metric-sub ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {formatPercent(summary.totalGainLossPercent)}
          </span>
        </div>
        <div className="metric-item">
          <div className="metric-icon-wrap">
            <PieChart className="w-5 h-5 text-blue-500" />
          </div>
          <span className="metric-label">Accounts</span>
          <span className="metric-value">{summary.accountCount}</span>
          <span className="metric-sub text-gray-500">{summary.holdingsCount} holdings</span>
        </div>
        <div className="metric-item">
          <div className="metric-icon-wrap">
            <DollarSign className="w-5 h-5 text-purple-500" />
          </div>
          <span className="metric-label">Cost Basis</span>
          <span className="metric-value">{formatCurrency(summary.totalCostBasis)}</span>
        </div>
      </div>

      {/* Accounts - collapsed by default, expand on click */}
      <div className="bg-[#161b22] rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-5 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white">Accounts</h3>
        </div>
        <div className="divide-y divide-gray-800">
          {accounts.map((account) => {
            const isExpanded = expandedAccounts[account.id || account.account_id];
            return (
              <div key={account.id || account.account_id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleAccount(account.id || account.account_id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 flex-shrink-0">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </span>
                    <h4 className="font-medium text-white">{account.name}</h4>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">{formatCurrency(account.totalValue)}</p>
                    {isExpanded && (
                      <p className={`text-sm ${account.gainLoss >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {formatCurrency(account.gainLoss)} ({formatPercent(account.gainLossPercent)})
                      </p>
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-2 bg-gray-900/30">
                    {account.holdings?.map((holding) => {
                      const value = Number(holding.quantity) * Number(holding.institution_price || holding.institution_value || 0);
                      const gain = value - Number(holding.cost_basis || 0);
                      const gainPercent = Number(holding.cost_basis) > 0 ? (gain / Number(holding.cost_basis) * 100) : 0;
                      return (
                        <div
                          key={holding.id || `${holding.security_id}-${holding.account_id}`}
                          className="flex items-center justify-between py-2 px-3 bg-[#0d1117] rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                              <span className="text-xs font-bold text-emerald-500">
                                {(holding.ticker_symbol || '??').slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-white text-sm">{holding.ticker_symbol || 'N/A'}</p>
                              <p className="text-xs text-gray-500">{Number(holding.quantity)} shares</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-white text-sm">{formatCurrency(value)}</p>
                            <p className={`text-xs ${gain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {formatPercent(gainPercent)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Performers & Asset Allocation - side by side, collapsible */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#161b22] rounded-xl border border-gray-800 overflow-hidden">
          <button
            type="button"
            onClick={() => setTopPerformersExpanded(!topPerformersExpanded)}
            className="w-full p-5 border-b border-gray-800 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
          >
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Top Performers
            </h3>
            <span className="text-gray-500">
              {topPerformersExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </span>
          </button>
          <div className="p-5">
            {topPerformers[0] && (
              <div className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-5">1</span>
                  <div>
                    <p className="font-medium text-white">{topPerformers[0].ticker_symbol || 'N/A'}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[150px]">{topPerformers[0].name || topPerformers[0].ticker_symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-emerald-500">{formatPercent(topPerformers[0].gainLossPercent)}</p>
                  <p className="text-xs text-white font-medium">{formatCurrency(topPerformers[0].currentValue || (Number(topPerformers[0].quantity) * Number(topPerformers[0].institution_price || topPerformers[0].institution_value || 0)))}</p>
                </div>
              </div>
            )}
            {topPerformersExpanded && topPerformers.slice(1).map((holding, index) => (
              <div
                key={holding.id || `${holding.security_id}-${index}`}
                className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg mb-2 last:mb-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-5">{index + 2}</span>
                  <div>
                    <p className="font-medium text-white text-sm">{holding.ticker_symbol || 'N/A'}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[150px]">{holding.name || holding.ticker_symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-emerald-500 text-sm">{formatPercent(holding.gainLossPercent)}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(holding.gainLoss)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#161b22] rounded-xl border border-gray-800 overflow-hidden">
          <button
            type="button"
            onClick={() => setAllocationExpanded(!allocationExpanded)}
            className="w-full p-5 border-b border-gray-800 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
          >
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-500" />
              Asset Allocation
            </h3>
            <span className="text-gray-500">
              {allocationExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </span>
          </button>
          <div className="p-5 space-y-4">
            {Object.entries(allocation).slice(0, allocationExpanded ? undefined : 1).map(([type, value]) => {
              const percentage = summary.totalValue > 0 ? (value / summary.totalValue) * 100 : 0;
              const colors = { Stocks: 'bg-emerald-500', ETFs: 'bg-blue-500', Other: 'bg-purple-500' };
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300">{type}</span>
                    <span className="text-white font-medium">
                      {formatCurrency(value)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[type] || 'bg-gray-500'} rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
