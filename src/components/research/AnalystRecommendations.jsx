'use client';

import { useRecommendation, usePriceTarget } from '@/hooks/useFinnhub';
import { motion } from 'framer-motion';
import { TrendingUp, Minus, TrendingDown, Users } from 'lucide-react';

export function AnalystRecommendations({ symbol }) {
  const { data: recommendations, loading: recsLoading } = useRecommendation(symbol);
  const { data: priceTarget, loading: ptLoading } = usePriceTarget(symbol);

  const isLoading = recsLoading || ptLoading;

  if (!symbol) return null;
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="research-card bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-700 rounded-xl p-6"
      >
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <div className="w-5 h-5 border-2 border-emerald-500/50 border-t-emerald-500 rounded-full animate-spin" />
          Loading analyst data...
        </div>
      </motion.div>
    );
  }
  if ((!recommendations || recommendations.length === 0) && !priceTarget?.targetMean) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="research-card bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-700 rounded-xl p-6"
      >
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Analyst data not available</p>
        </div>
      </motion.div>
    );
  }

  const latest = recommendations?.[0];
  const total = latest
    ? latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell
    : 0;

  const recommendationData = latest
    ? [
        { label: 'Strong Buy', value: latest.strongBuy, color: '#10b981' },
        { label: 'Buy', value: latest.buy, color: '#34d399' },
        { label: 'Hold', value: latest.hold, color: '#fbbf24' },
        { label: 'Sell', value: latest.sell, color: '#f87171' },
        { label: 'Strong Sell', value: latest.strongSell, color: '#ef4444' },
      ]
    : [];

  let consensus = 'Hold';
  let consensusColor = 'text-yellow-600 dark:text-yellow-500';
  let consensusBg = 'bg-yellow-500/10 border-yellow-500/30';
  let ConsensusIcon = Minus;

  if (latest) {
    const buyTotal = latest.strongBuy + latest.buy;
    const sellTotal = latest.sell + latest.strongSell;
    if (buyTotal > sellTotal + latest.hold) {
      consensus = 'Buy';
      consensusColor = 'text-emerald-600 dark:text-emerald-500';
      consensusBg = 'bg-emerald-500/10 border-emerald-500/30';
      ConsensusIcon = TrendingUp;
    } else if (sellTotal > buyTotal + latest.hold) {
      consensus = 'Sell';
      consensusColor = 'text-red-600 dark:text-red-500';
      consensusBg = 'bg-red-500/10 border-red-500/30';
      ConsensusIcon = TrendingDown;
    }
  }

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="research-card bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-700 rounded-xl p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <Users className="w-4 h-4 text-emerald-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Analyst Ratings</h3>
      </div>

      {latest && (
        <div className="flex justify-center mb-6">
          <div className={`px-8 py-4 rounded-2xl border ${consensusBg} flex flex-col items-center`}>
            <ConsensusIcon className={`w-8 h-8 ${consensusColor} mb-1`} />
            <span className={`font-bold text-2xl ${consensusColor}`}>{consensus}</span>
            <span className="text-xs text-gray-500 mt-1">
              {total} Analyst{total !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {latest && (
        <div className="space-y-3 mb-6">
          {recommendationData.map((rec) => (
            <div key={rec.label} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400 w-24 flex-shrink-0">{rec.label}</span>
              <div className="flex-1 bg-gray-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${total > 0 ? (rec.value / total) * 100 : 0}%`,
                    backgroundColor: rec.color,
                  }}
                />
              </div>
              <span className="text-gray-900 dark:text-white font-semibold w-6 text-right">{rec.value}</span>
            </div>
          ))}
        </div>
      )}

      {priceTarget?.targetMean && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
            Price Target ({priceTarget.numberAnalysts ?? 0} Analysts)
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-100 dark:bg-[#161b22] rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Low</p>
              <p className="text-red-600 dark:text-red-400 font-semibold">{formatPrice(priceTarget.targetLow)}</p>
            </div>
            <div className="bg-emerald-500/10 rounded-xl p-3 text-center border border-emerald-500/20">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Mean</p>
              <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                {formatPrice(priceTarget.targetMean)}
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-[#161b22] rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">High</p>
              <p className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatPrice(priceTarget.targetHigh)}</p>
            </div>
          </div>
        </div>
      )}

      {latest && (
        <p className="text-xs text-gray-500 text-center mt-4">Last updated: {latest.period}</p>
      )}
    </motion.div>
  );
}
