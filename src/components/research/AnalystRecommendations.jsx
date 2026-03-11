'use client';

import { useRecommendation } from '@/hooks/useFinnhub';
import { motion } from 'framer-motion';

export function AnalystRecommendations({ symbol }) {
  const { data, loading, error } = useRecommendation(symbol);

  if (!symbol) return null;
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="research-card bg-[#0d1117] border border-gray-700 rounded-xl p-6"
      >
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-emerald-500/50 border-t-emerald-500 rounded-full animate-spin" />
          Loading analyst data...
        </div>
      </motion.div>
    );
  }
  if (error || !data?.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="research-card bg-[#0d1117] border border-gray-700 rounded-xl p-6"
      >
        <p className="text-gray-400">Analyst recommendations unavailable.</p>
      </motion.div>
    );
  }

  const latest = data[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="research-card bg-[#0d1117] border border-gray-700 rounded-xl p-6"
    >
      <h3 className="text-lg font-semibold text-white mb-4">Analyst Recommendations</h3>
      <div className="space-y-4">
        <div className="bg-[#161b22] rounded-lg p-4">
          <p className="text-xs text-gray-500">Latest ({latest.period})</p>
          <div className="mt-2 flex flex-wrap gap-4">
            <div><span className="text-emerald-400 font-medium">Strong Buy</span> {latest.strongBuy ?? 0}</div>
            <div><span className="text-emerald-500 font-medium">Buy</span> {latest.buy ?? 0}</div>
            <div><span className="text-gray-400 font-medium">Hold</span> {latest.hold ?? 0}</div>
            <div><span className="text-amber-500 font-medium">Sell</span> {latest.sell ?? 0}</div>
            <div><span className="text-red-400 font-medium">Strong Sell</span> {latest.strongSell ?? 0}</div>
          </div>
        </div>
        {data.length > 1 && (
          <div className="text-sm text-gray-400">
            {data.length} period(s) of data available
          </div>
        )}
      </div>
    </motion.div>
  );
}
