'use client';

import { useCompanyProfile } from '@/hooks/useFinnhub';
import { motion } from 'framer-motion';

function formatMarketCap(val) {
  if (val == null || val === 0) return '--';
  const n = Number(val);
  const cap = n >= 1e3 && n < 1e9 ? n * 1e6 : n;
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  return `$${cap.toLocaleString()}`;
}

export function CompanyOverview({ symbol }) {
  const { data, loading, error } = useCompanyProfile(symbol);

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
          Loading company profile...
        </div>
      </motion.div>
    );
  }
  if (error || !data) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="research-card bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-700 rounded-xl p-6"
      >
        <p className="text-gray-500 dark:text-gray-400">Unable to load company profile.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="research-card bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-700 rounded-xl p-6"
    >
      <div className="flex items-start gap-4">
        {data.logo && (
          <img src={data.logo} alt="" className="w-14 h-14 rounded-lg object-contain bg-gray-100 dark:bg-[#161b22]" />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{data.name || symbol}</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {data.finnhubIndustry && (
              <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                {data.finnhubIndustry}
              </span>
            )}
            {data.exchange && (
              <span className="px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {data.exchange}
              </span>
            )}
            {data.country && (
              <span className="px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {data.country}
              </span>
            )}
          </div>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {data.weburl && (
              <a href={data.weburl} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">
                {data.weburl}
              </a>
            )}
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <div>
              <span className="text-xs text-gray-500">Market Cap</span>
              <p className="text-gray-900 dark:text-white font-medium">{formatMarketCap(data.marketCapitalization)}</p>
            </div>
            {data.ipo && (
              <div>
                <span className="text-xs text-gray-500">IPO</span>
                <p className="text-gray-900 dark:text-white font-medium">{data.ipo}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
