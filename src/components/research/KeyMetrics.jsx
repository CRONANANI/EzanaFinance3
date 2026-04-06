'use client';

import { useStockMetric } from '@/hooks/useFinnhub';
import { motion } from 'framer-motion';

function fmt(v) {
  if (v == null || v === '' || v === undefined) return '--';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  if (n < 1 && n > 0) return n.toFixed(2);
  return n.toFixed(2);
}

const METRIC_LABELS = {
  peBasicExclExtraTTM: 'P/E (TTM)',
  pbAnnual: 'P/B',
  psAnnual: 'P/S',
  dividendYieldIndicatedAnnual: 'Div Yield',
  revenuePerShareTTM: 'Revenue/Share',
  netProfitMarginTTM: 'Net Margin',
  roeTTM: 'ROE',
  roaTTM: 'ROA',
  currentRatioQuarterly: 'Current Ratio',
  longTermDebtEquityQuarterly: 'Debt/Equity',
  marketCapitalization: 'Market Cap',
  '52WeekHigh': '52W High',
  '52WeekLow': '52W Low',
};

export function KeyMetrics({ symbol }) {
  const { data, loading, error } = useStockMetric(symbol);

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
          Loading metrics...
        </div>
      </motion.div>
    );
  }
  if (error || !data?.metric) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="research-card bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-700 rounded-xl p-6"
      >
        <p className="text-gray-500 dark:text-gray-400">Key metrics unavailable.</p>
      </motion.div>
    );
  }

  const metric = data.metric || {};
  const entries = Object.entries(metric).filter(([, v]) => v != null && v !== '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="research-card bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-700 rounded-xl p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Financial Metrics</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {entries.slice(0, 12).map(([key, value]) => (
          <div key={key} className="bg-gray-100 dark:bg-[#161b22] rounded-lg p-3">
            <span className="text-xs text-gray-500 block">
              {METRIC_LABELS[key] || key.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <p className="text-gray-900 dark:text-white font-medium mt-1">{fmt(value)}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
