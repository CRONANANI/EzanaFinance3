import React from 'react';

interface DividendData {
  month: string;
  amount: number;
  count: number; // number of dividend payments
}

interface DividendsCardProps {
  monthlyDividends: number;
  yearlyProjection: number;
  dividendYield: number;
  upcomingDividends: DividendData[];
  isLoading?: boolean;
}

const DividendsCard: React.FC<DividendsCardProps> = ({
  monthlyDividends,
  yearlyProjection,
  dividendYield,
  upcomingDividends,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-20 mb-4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' });

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Monthly Dividends</h3>
        <div className="p-2 bg-purple-100 rounded-full">
          <span className="text-xl">💎</span>
        </div>
      </div>
      
      <div className="mb-4">
        <p className="text-3xl font-bold text-purple-600 mb-1">
          ${monthlyDividends.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-sm text-gray-600">{currentMonth} dividends</p>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Yearly Projection</span>
          <span className="font-semibold text-gray-900">
            ${yearlyProjection.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Dividend Yield</span>
          <span className="font-semibold text-green-600">{dividendYield.toFixed(2)}%</span>
        </div>
      </div>

      {upcomingDividends.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Upcoming Payments</h4>
          <div className="space-y-2">
            {upcomingDividends.slice(0, 2).map((dividend, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-gray-600">{dividend.month}</span>
                <div className="text-right">
                  <span className="font-medium text-gray-900">
                    ${dividend.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">
                    ({dividend.count} payments)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DividendsCard;
