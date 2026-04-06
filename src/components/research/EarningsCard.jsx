'use client';

import { useEarnings } from '@/hooks/useFinnhub';
import { motion } from 'framer-motion';

function fmt(v) {
  if (v == null) return '--';
  const n = Number(v);
  return Number.isNaN(n) ? '--' : n.toFixed(2);
}

export function EarningsCard({ symbol }) {
  const { data, loading, error } = useEarnings(symbol);

  if (!symbol) return null;
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="research-card bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-700 rounded-xl p-6"
      >
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <div className="w-5 h-5 border-2 border-emerald-500/50 border-t-emerald-500 rounded-full animate-spin" />
          Loading earnings...
        </div>
      </motion.div>
    );
  }
  if (error || !data?.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="research-card bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-700 rounded-xl p-6"
      >
        <p className="text-gray-500 dark:text-gray-400">Earnings data unavailable (free tier: last 4 quarters).</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="research-card bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-700 rounded-xl p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Earnings History</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <th className="pb-2 pr-4">Period</th>
              <th className="pb-2 pr-4">Actual</th>
              <th className="pb-2 pr-4">Estimate</th>
              <th className="pb-2">Surprise %</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={`${row.period}-${row.year}`} className="border-b border-gray-200/80 dark:border-gray-700/50">
                <td className="py-2 pr-4 text-gray-900 dark:text-white">{row.period} {row.year}</td>
                <td className="py-2 pr-4 text-gray-900 dark:text-white">{fmt(row.actual)}</td>
                <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{fmt(row.estimate)}</td>
                <td className={`py-2 ${Number(row.surprisePercent) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {fmt(row.surprisePercent)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
