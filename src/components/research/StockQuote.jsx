'use client';

import { useQuote } from '@/hooks/useFinnhub';
import { motion } from 'framer-motion';

function formatPrice(v) {
  if (v == null) return '--';
  const n = Number(v);
  return n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`;
}

export function StockQuote({ symbol }) {
  const { data, loading, error } = useQuote(symbol);

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
          Loading quote...
        </div>
      </motion.div>
    );
  }
  if (error || !data) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="research-card bg-[#0d1117] border border-gray-700 rounded-xl p-6"
      >
        <p className="text-gray-400">Quote unavailable.</p>
      </motion.div>
    );
  }

  const price = data.c ?? data.pc;
  const change = data.d ?? 0;
  const changePct = data.dp ?? 0;
  const isPositive = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="research-card bg-[#0d1117] border border-gray-700 rounded-xl p-6"
    >
      <h3 className="text-sm font-medium text-gray-400 mb-2">Real-time Quote</h3>
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold text-white">{formatPrice(price)}</span>
        <span className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}{formatPrice(change)} ({isPositive ? '+' : ''}{Number(changePct).toFixed(2)}%)
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Open</span>
          <p className="text-white font-medium">{formatPrice(data.o)}</p>
        </div>
        <div>
          <span className="text-gray-500">High</span>
          <p className="text-white font-medium">{formatPrice(data.h)}</p>
        </div>
        <div>
          <span className="text-gray-500">Low</span>
          <p className="text-white font-medium">{formatPrice(data.l)}</p>
        </div>
        <div>
          <span className="text-gray-500">Prev Close</span>
          <p className="text-white font-medium">{formatPrice(data.pc)}</p>
        </div>
      </div>
    </motion.div>
  );
}
