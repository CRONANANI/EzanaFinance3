import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  PortfolioValueCard,
  ProfitLossCard,
  TopPerformersCard,
  RiskScoreCard,
  DividendsCard,
  AssetAllocationCard
} from '../components/PortfolioCards';

// Mock data - in a real app, this would come from API calls
const mockPortfolioData = {
  totalValue: 125750.50,
  changeAmount: 2840.25,
  changePercentage: 2.31,
  dailyPL: 1250.75,
  dailyPLPercentage: 1.01,
  topPerformers: [
    { symbol: 'AAPL', name: 'Apple Inc.', change: 15.25, changePercentage: 8.45, price: 195.75 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', change: 12.50, changePercentage: 3.22, price: 401.25 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', change: 8.75, changePercentage: 6.15, price: 150.30 },
    { symbol: 'TSLA', name: 'Tesla Inc.', change: 18.90, changePercentage: 12.45, price: 170.85 }
  ],
  riskScore: 65,
  riskLevel: 'Medium' as const,
  recommendation: 'Consider diversifying into bonds to reduce overall portfolio risk.',
  monthlyDividends: 485.50,
  yearlyProjection: 5826.00,
  dividendYield: 4.63,
  upcomingDividends: [
    { month: 'February', amount: 520.75, count: 8 },
    { month: 'March', amount: 445.25, count: 6 }
  ],
  assetAllocations: [
    { category: 'Stocks', percentage: 65.5, value: 82416.58, color: '#3B82F6' },
    { category: 'Bonds', percentage: 20.2, value: 25401.60, color: '#10B981' },
    { category: 'ETFs', percentage: 10.8, value: 13581.05, color: '#F59E0B' },
    { category: 'Cash', percentage: 2.5, value: 3143.76, color: '#6B7280' },
    { category: 'Crypto', percentage: 1.0, value: 1257.51, color: '#8B5CF6' }
  ],
  diversificationScore: 78
};

const UserHomePage: React.FC = () => {
  const { user } = useAuth();
  const [isLoading] = React.useState(false); // Set to true to see loading states

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.first_name || user?.username}! 👋
        </h1>
        <p className="text-blue-100">
          Here's your portfolio overview for {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Portfolio Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Portfolio Value Card - spans 2 columns on xl screens */}
        <div className="xl:col-span-2">
          <PortfolioValueCard
            totalValue={mockPortfolioData.totalValue}
            changeAmount={mockPortfolioData.changeAmount}
            changePercentage={mockPortfolioData.changePercentage}
            isLoading={isLoading}
          />
        </div>

        {/* Today's P&L Card */}
        <ProfitLossCard
          dailyPL={mockPortfolioData.dailyPL}
          dailyPLPercentage={mockPortfolioData.dailyPLPercentage}
          isLoading={isLoading}
        />

        {/* Top Performers Card */}
        <TopPerformersCard
          performers={mockPortfolioData.topPerformers}
          isLoading={isLoading}
        />

        {/* Risk Score Card */}
        <RiskScoreCard
          riskScore={mockPortfolioData.riskScore}
          riskLevel={mockPortfolioData.riskLevel}
          recommendation={mockPortfolioData.recommendation}
          isLoading={isLoading}
        />

        {/* Monthly Dividends Card */}
        <DividendsCard
          monthlyDividends={mockPortfolioData.monthlyDividends}
          yearlyProjection={mockPortfolioData.yearlyProjection}
          dividendYield={mockPortfolioData.dividendYield}
          upcomingDividends={mockPortfolioData.upcomingDividends}
          isLoading={isLoading}
        />

        {/* Asset Allocation Card - spans 2 columns on lg+ screens */}
        <div className="lg:col-span-2 xl:col-span-1">
          <AssetAllocationCard
            allocations={mockPortfolioData.assetAllocations}
            diversificationScore={mockPortfolioData.diversificationScore}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
            <span className="text-2xl mb-2">📈</span>
            <span className="text-sm font-medium text-blue-700">Buy Stocks</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
            <span className="text-2xl mb-2">💰</span>
            <span className="text-sm font-medium text-green-700">Add Funds</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
            <span className="text-2xl mb-2">📊</span>
            <span className="text-sm font-medium text-purple-700">View Reports</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
            <span className="text-2xl mb-2">⚙️</span>
            <span className="text-sm font-medium text-orange-700">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserHomePage;
