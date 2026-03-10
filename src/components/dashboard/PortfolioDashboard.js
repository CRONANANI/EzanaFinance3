'use client';

import React from 'react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { TrendingUp, TrendingDown, DollarSign, PieChart, RefreshCw } from 'lucide-react';
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

  const { summary, accounts, holdings, topPerformers, allocation } = portfolio;
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#161b22] rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-gray-400 text-sm">Total Value</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(summary.totalValue)}
          </p>
        </div>

        <div className="bg-[#161b22] rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'
            }`}>
              {isPositive ? (
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
            </div>
            <span className="text-gray-400 text-sm">Total Gain/Loss</span>
          </div>
          <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {formatCurrency(summary.totalGainLoss)}
          </p>
          <p className={`text-sm ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {formatPercent(summary.totalGainLossPercent)}
          </p>
        </div>

        <div className="bg-[#161b22] rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-gray-400 text-sm">Accounts</span>
          </div>
          <p className="text-2xl font-bold text-white">{summary.accountCount}</p>
          <p className="text-sm text-gray-500">{summary.holdingsCount} holdings</p>
        </div>

        <div className="bg-[#161b22] rounded-xl p-5 border border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-gray-400 text-sm">Cost Basis</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(summary.totalCostBasis)}
          </p>
        </div>
      </div>

      <div className="bg-[#161b22] rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-5 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white">Accounts</h3>
        </div>
        <div className="divide-y divide-gray-800">
          {accounts.map((account) => (
            <div key={account.id} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium text-white">{account.name}</h4>
                  <p className="text-sm text-gray-500 capitalize">{account.subtype} • ****{account.mask}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">{formatCurrency(account.totalValue)}</p>
                  <p className={`text-sm ${account.gainLoss >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {formatCurrency(account.gainLoss)} ({formatPercent(account.gainLossPercent)})
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {account.holdings.map((holding) => {
                  const value = Number(holding.quantity) * Number(holding.institution_price || holding.institution_value || 0);
                  const gain = value - Number(holding.cost_basis || 0);
                  const gainPercent = Number(holding.cost_basis) > 0
                    ? (gain / Number(holding.cost_basis) * 100)
                    : 0;

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
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#161b22] rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-5 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Top Performers
            </h3>
          </div>
          <div className="p-5 space-y-3">
            {topPerformers.map((holding, index) => (
              <div
                key={holding.id || `${holding.security_id}-${index}`}
                className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-5">{index + 1}</span>
                  <div>
                    <p className="font-medium text-white">{holding.ticker_symbol || 'N/A'}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[150px]">{holding.name || holding.ticker_symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-emerald-500">
                    {formatPercent(holding.gainLossPercent)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(holding.gainLoss)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#161b22] rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-5 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-500" />
              Asset Allocation
            </h3>
          </div>
          <div className="p-5 space-y-4">
            {Object.entries(allocation).map(([type, value]) => {
              const percentage = summary.totalValue > 0 ? (value / summary.totalValue) * 100 : 0;
              const colors = {
                Stocks: 'bg-emerald-500',
                ETFs: 'bg-blue-500',
                Other: 'bg-purple-500',
              };

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
