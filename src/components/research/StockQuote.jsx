'use client';

import { useQuote } from '@/hooks/useFinnhub';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, RefreshCw } from 'lucide-react';

function formatPrice(v) {
  if (v == null) return '--';
  const n = Number(v);
  return n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`;
}

export function StockQuote({ symbol }) {
  const { data, loading, error, refetch } = useQuote(symbol);

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
  if (error || !data || data.c === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="research-card bg-[#0d1117] border border-gray-700 rounded-xl p-6"
      >
        <div className="text-center py-8">
          <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Quote data not available</p>
          <button
            type="button"
            onClick={refetch}
            className="mt-3 text-sm text-emerald-500 hover:text-emerald-400 flex items-center gap-1 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </motion.div>
    );
  }

  const price = data.c ?? data.pc;
  const change = data.d ?? 0;
  const changePct = data.dp ?? 0;
  const isPositive = change >= 0;

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts * 1000);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="research-card bg-[#0d1117] border border-gray-700 rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Stock Quote</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refetch}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {formatTime(data.t)}
          </div>
        </div>
      </div>
      <div className="mb-6">
        <p className="text-4xl font-bold text-white tracking-tight">{formatPrice(price)}</p>
        <div className={`flex items-center gap-2 mt-2 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          <span className="font-semibold text-lg">
            {isPositive ? '+' : ''}{formatPrice(change)} ({isPositive ? '+' : ''}{Number(changePct).toFixed(2)}%)
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#161b22] rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Open</p>
          <p className="text-white font-semibold">{formatPrice(data.o)}</p>
        </div>
        <div className="bg-[#161b22] rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Previous Close</p>
          <p className="text-white font-semibold">{formatPrice(data.pc)}</p>
        </div>
        <div className="bg-[#161b22] rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Day High</p>
          <p className="text-emerald-400 font-semibold">{formatPrice(data.h)}</p>
        </div>
        <div className="bg-[#161b22] rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Day Low</p>
          <p className="text-red-400 font-semibold">{formatPrice(data.l)}</p>
        </div>
      </div>
      {data.h !== data.l && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Day Range</span>
            <span>{formatPrice(data.l)} - {formatPrice(data.h)}</span>
          </div>
          <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="absolute h-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 rounded-full w-full" />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg border-2 border-gray-800"
              style={{
                left: `${((price - data.l) / (data.h - data.l)) * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
