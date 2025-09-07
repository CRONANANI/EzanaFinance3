import React from 'react';

interface TopPerformer {
  symbol: string;
  name: string;
  change: number;
  changePercentage: number;
  price: number;
}

interface TopPerformersCardProps {
  performers: TopPerformer[];
  isLoading?: boolean;
}

const TopPerformersCard: React.FC<TopPerformersCardProps> = ({
  performers,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
              <div className="text-right">
                <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-yellow-100 rounded-md mr-3">
          <span className="text-xl">🏆</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
      </div>
      
      <div className="space-y-3">
        {performers.length > 0 ? (
          performers.slice(0, 4).map((performer, index) => {
            const isPositive = performer.change >= 0;
            return (
              <div key={performer.symbol} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-xs font-bold text-blue-600">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{performer.symbol}</p>
                    <p className="text-xs text-gray-600 truncate max-w-24">{performer.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    ${performer.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className={`text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? '+' : ''}{performer.changePercentage.toFixed(2)}%
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-600 text-center py-4">No performance data available</p>
        )}
      </div>
    </div>
  );
};

export default TopPerformersCard;
