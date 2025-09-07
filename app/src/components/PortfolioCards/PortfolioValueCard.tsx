import React from 'react';

interface PortfolioValueCardProps {
  totalValue: number;
  changeAmount: number;
  changePercentage: number;
  isLoading?: boolean;
}

const PortfolioValueCard: React.FC<PortfolioValueCardProps> = ({
  totalValue,
  changeAmount,
  changePercentage,
  isLoading = false
}) => {
  const isPositive = changeAmount >= 0;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-40 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
          <div className="p-3 bg-gray-200 rounded-full w-16 h-16"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Portfolio Value</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-2">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center">
            <span className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}${changeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className={`text-sm font-semibold ml-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              ({isPositive ? '+' : ''}{changePercentage.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className={`p-3 rounded-full ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
          <span className="text-2xl">{isPositive ? '📈' : '📉'}</span>
        </div>
      </div>
    </div>
  );
};

export default PortfolioValueCard;
