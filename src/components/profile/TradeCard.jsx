'use client';

import { useState, useRef, useEffect } from 'react';
import { TradeSparkline } from './TradeSparkline';

function fmtContract(t) {
  if (t.trade_type !== 'option' || !t.expiry_date) {
    return `${t.ticker} @${Number(t.entry_price).toFixed(2)}`;
  }
  const exp = new Date(t.expiry_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
  const strike = t.strike_price != null ? String(t.strike_price) : '';
  const ot = t.option_type === 'put' ? 'p' : 'c';
  return `${exp} ${strike}${ot} @${Number(t.entry_price).toFixed(2)}`;
}

function hoursAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (diff < 24) return `${Math.max(1, Math.floor(diff))}H`;
  const d = Math.floor(diff / 24);
  return `${d}D`;
}

export function TradeCard({ trade, isOwner }) {
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  const pnl = trade.pnl_percent != null ? Number(trade.pnl_percent) : null;
  const pos = pnl == null || pnl >= 0;

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenu(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-[#1a1a24] dark:bg-[#111118] dark:hover:border-[#2a2a34]">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-[#f5f5f5]">{trade.ticker}</span>
            {trade.status === 'open' ? (
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                OPEN
              </span>
            ) : (
              <span className="rounded bg-zinc-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                CLOSED · UPD. {hoursAgo(trade.updated_at || trade.closed_at)}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-[#9ca3af]">{fmtContract(trade)}</p>
          {pnl != null && (
            <span
              className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                pos ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'
              }`}
            >
              {pos ? '↑' : '↓'}
              {Math.abs(pnl).toFixed(1)}%
            </span>
          )}
          <p className="mt-2 text-xs text-gray-500 dark:text-[#6b7280]">
            Risk:{' '}
            <span className="capitalize text-gray-600 dark:text-[#9ca3af]">{trade.risk_level || 'moderate'}</span>
            {trade.risk_reward_ratio != null && (
              <>
                {' '}
                · R/R: {Number(trade.risk_reward_ratio).toFixed(2)}
              </>
            )}
          </p>
          {(trade.tags || []).length > 0 && (
            <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-gray-500 dark:text-[#6b7280]">
              {(trade.tags || [])[0]}
            </p>
          )}
        </div>
        <div className="flex justify-start md:justify-end">
          <TradeSparkline seed={trade.id} positive={pos} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-200 pt-3 text-xs text-gray-500 dark:border-[#1a1a24] dark:text-[#6b7280]">
        <span>👍 {0}</span>
        <span>💬 {0}</span>
        <span>🔖</span>
        <span>↗</span>
        {isOwner && (
          <div className="relative ml-auto" ref={ref}>
            <button
              type="button"
              className="rounded px-2 py-1 text-gray-600 hover:bg-gray-200 dark:text-[#9ca3af] dark:hover:bg-[#1a1a24]"
              aria-label="Trade actions"
              onClick={() => setMenu(!menu)}
            >
              ···
            </button>
            {menu && (
              <div className="absolute bottom-full right-0 z-20 mb-1 min-w-[140px] rounded-lg border border-gray-200 bg-gray-50 py-1 shadow-xl dark:border-[#1a1a24] dark:bg-[#0d0d14]">
                {['Partial Exit', 'Full Exit', 'Average Down'].map((label) => (
                  <button
                    key={label}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-xs text-gray-800 hover:bg-gray-200 dark:text-[#e5e7eb] dark:hover:bg-[#1a1a24]"
                    onClick={() => setMenu(false)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
