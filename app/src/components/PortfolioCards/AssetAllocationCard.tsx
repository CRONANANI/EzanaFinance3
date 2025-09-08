import React from 'react';

interface AssetAllocation {
  category: string;
  percentage: number;
  value: number;
  color: string;
}

interface AssetAllocationCardProps {
  allocations: AssetAllocation[];
  diversificationScore: number; // 0-100 scale
  isLoading?: boolean;
}

const AssetAllocationCard: React.FC<AssetAllocationCardProps> = ({
  allocations,
  diversificationScore,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-200 rounded w-40"></div>
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getDiversificationColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDiversificationLabel = (score: number) => {
    if (score >= 80) return 'Well Diversified';
    if (score >= 60) return 'Moderately Diversified';
    return 'Needs Diversification';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Asset Allocation</h3>
        <div className="p-2 bg-indigo-100 rounded-full">
          <span className="text-xl">🥧</span>
        </div>
      </div>
      
      {/* Diversification Score */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Diversification Score</span>
          <span className={`text-sm font-semibold ${getDiversificationColor(diversificationScore)}`}>
            {diversificationScore}/100
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              diversificationScore >= 80 ? 'bg-green-500' :
              diversificationScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${diversificationScore}%` }}
          ></div>
        </div>
        <span className={`text-xs ${getDiversificationColor(diversificationScore)}`}>
          {getDiversificationLabel(diversificationScore)}
        </span>
      </div>

      {/* Asset Breakdown */}
      <div className="space-y-3">
        {allocations.length > 0 ? (
          allocations.map((allocation, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: allocation.color }}
                ></div>
                <span className="text-sm font-medium text-gray-700">
                  {allocation.category}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900">
                  {allocation.percentage.toFixed(1)}%
                </span>
                <div className="text-xs text-gray-500">
                  ${allocation.value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-600 text-center py-4">No allocation data available</p>
        )}
      </div>

      {allocations.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Assets</span>
            <span className="font-semibold text-gray-900">
              ${allocations.reduce((sum, a) => sum + a.value, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetAllocationCard;
