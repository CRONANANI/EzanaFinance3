'use client';

import { useCompanyNews } from '@/hooks/useFinnhub';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function CompanyNews({ symbol, className = '' }) {
  const { data, loading, error } = useCompanyNews(symbol, 30);

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
          Loading news...
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
        <p className="text-gray-400">No news available.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`research-card bg-[#0d1117] border border-gray-700 rounded-xl p-6 ${className}`}
    >
      <h3 className="text-lg font-semibold text-white mb-4">Company News</h3>
      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {data.map((item) => (
          <a
            key={item.id ?? item.url}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg bg-[#161b22] hover:bg-[#1c2128] transition-colors group"
          >
            <div className="flex gap-3">
              {item.image && (
                <img src={item.image} alt="" className="w-16 h-16 rounded object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium group-hover:text-emerald-400 line-clamp-2">
                  {item.headline}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <span>{item.source}</span>
                  <span>{formatDate(item.datetime)}</span>
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </motion.div>
  );
}
