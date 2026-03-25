'use client';

import { usePeers } from '@/hooks/useFinnhub';
import { motion } from 'framer-motion';

export function CompetitorsCard({ symbol, onSelectPeer }) {
  const { data, loading, error } = usePeers(symbol);

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
          Loading peers...
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
        <p className="text-gray-400">Peer companies unavailable.</p>
      </motion.div>
    );
  }

  const peers = data.filter((p) => p && p !== symbol).slice(0, 12);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="research-card bg-[#0d1117] border border-gray-700 rounded-xl p-6"
    >
      <h3 className="text-lg font-semibold text-white mb-4">Peer Companies</h3>
      <div className="flex flex-wrap gap-2">
        {peers.map((peer, pi) => (
          <button
            key={peer}
            type="button"
            onClick={() => onSelectPeer?.(peer)}
            className="px-3 py-1.5 rounded-lg bg-[#161b22] hover:bg-emerald-500/20 text-gray-300 hover:text-emerald-400 transition-colors text-sm font-medium"
            data-task-target={pi === 0 ? 'research-compare-button' : undefined}
          >
            {peer}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
