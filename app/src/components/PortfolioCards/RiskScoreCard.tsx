import React from 'react';

interface RiskScoreCardProps {
  riskScore: number; // 0-100 scale
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  recommendation?: string;
  isLoading?: boolean;
}

const RiskScoreCard: React.FC<RiskScoreCardProps> = ({
  riskScore,
  riskLevel,
  recommendation,
  isLoading = false
}) => {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-orange-600 bg-orange-100';
      case 'Very High': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'Low': return '🛡️';
      case 'Medium': return '⚖️';
      case 'High': return '⚠️';
      case 'Very High': return '🚨';
      default: return '📊';
    }
  };

  const getProgressBarColor = (score: number) => {
    if (score <= 25) return 'bg-green-500';
    if (score <= 50) return 'bg-yellow-500';
    if (score <= 75) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-16 mb-3"></div>
        <div className="h-2 bg-gray-200 rounded w-full mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Risk Score</h3>
        <div className="p-2 bg-blue-100 rounded-full">
          <span className="text-xl">{getRiskIcon(riskLevel)}</span>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-gray-900">{riskScore}</span>
          <span className="text-sm text-gray-600">/ 100</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Risk Level</span>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRiskColor(riskLevel)}`}>
            {riskLevel}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(riskScore)}`}
            style={{ width: `${riskScore}%` }}
          ></div>
        </div>
      </div>

      {recommendation && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-700">{recommendation}</p>
        </div>
      )}
    </div>
  );
};

export default RiskScoreCard;
