import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountsAPI, transactionsAPI, budgetsAPI } from '../lib/api';

const Dashboard: React.FC = () => {
  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsAPI.getAccounts,
  });

  const { data: recentTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', { limit: 5 }],
    queryFn: () => transactionsAPI.getTransactions({ limit: 5 }),
  });

  const { data: budgetsOverview, isLoading: budgetsLoading } = useQuery({
    queryKey: ['budgets-overview'],
    queryFn: budgetsAPI.getBudgetsOverview,
  });

  const currentDate = new Date();
  const { data: monthlySummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['monthly-summary', currentDate.getFullYear(), currentDate.getMonth() + 1],
    queryFn: () => transactionsAPI.getMonthlySummary(currentDate.getFullYear(), currentDate.getMonth() + 1),
  });

  const totalBalance = accounts?.reduce((sum: number, account: any) => sum + account.balance, 0) || 0;

  if (accountsLoading || transactionsLoading || budgetsLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's an overview of your finances.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-md">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Balance</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-md">
              <span className="text-2xl">📈</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month Income</p>
              <p className="text-2xl font-semibold text-green-600">
                ${monthlySummary?.total_income?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-md">
              <span className="text-2xl">📉</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month Expenses</p>
              <p className="text-2xl font-semibold text-red-600">
                ${monthlySummary?.total_expenses?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-md">
              <span className="text-2xl">🏦</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Accounts</p>
              <p className="text-2xl font-semibold text-gray-900">
                {accounts?.length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          </div>
          <div className="p-6">
            {recentTransactions && recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {recentTransactions.map((transaction: any) => (
                  <div key={transaction.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-sm text-gray-600">{transaction.category}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.transaction_type === 'income' ? '+' : '-'}
                        ${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(transaction.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No recent transactions</p>
            )}
          </div>
        </div>

        {/* Budget Overview */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Budget Overview</h2>
          </div>
          <div className="p-6">
            {budgetsOverview?.budgets && budgetsOverview.budgets.length > 0 ? (
              <div className="space-y-4">
                {budgetsOverview.budgets.slice(0, 4).map((budget: any) => (
                  <div key={budget.id}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-900">{budget.name}</p>
                      <p className="text-sm text-gray-600">
                        ${budget.spent.toLocaleString('en-US', { minimumFractionDigits: 2 })} / 
                        ${budget.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          budget.status === 'over_budget' ? 'bg-red-500' :
                          budget.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(budget.percentage_used, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No active budgets</p>
            )}
          </div>
        </div>
      </div>

      {/* Accounts Overview */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Accounts Overview</h2>
        </div>
        <div className="p-6">
          {accounts && accounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account: any) => (
                <div key={account.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900">{account.name}</p>
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {account.account_type}
                    </span>
                  </div>
                  <p className="text-2xl font-semibold text-gray-900">
                    ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-600">{account.currency}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No accounts found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
