'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { buildRadarPayload, computeUserStats } from '@/lib/userTradeStats';

function StatBox({ label, value, suffix = '%' }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-[#1a1a24] dark:bg-[#0d0d14]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-[#6b7280]">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-[#f5f5f5]">
        {typeof value === 'number' ? value.toFixed(2) : value}
        {suffix}
      </p>
    </div>
  );
}

export function ProfilePerformancePanel({ trades, benchmarkAverages, emptyCopyIsPortfolio = false }) {
  const [showAll, setShowAll] = useState(false);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light-mode'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const stats = useMemo(() => computeUserStats(trades), [trades]);
  const radarData = useMemo(() => {
    const axes = buildRadarPayload(stats, benchmarkAverages);
    return axes.map((a) => ({ subject: a.key, A: a.user, fullMark: 100 }));
  }, [stats, benchmarkAverages]);

  const emptyPerf = stats.totalTrades === 0;

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-[#1a1a24] dark:bg-[#111118]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500 dark:text-[#6b7280]">Compare with:</span>
        <select
          className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-800 dark:border-[#1a1a24] dark:bg-[#0d0d14] dark:text-[#e5e7eb]"
          disabled
        >
          <option>average user</option>
        </select>
      </div>

      {emptyPerf ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center dark:border-[#1a1a24] dark:bg-[#0d0d14]">
          <p className="text-sm text-gray-500 dark:text-[#9ca3af]">
            {emptyCopyIsPortfolio
              ? 'No portfolio data yet — add positions or connect a brokerage to see your performance shape.'
              : 'No trade performance data to show yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-[#1a1a24] dark:bg-[#0d0d14]">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-[#6b7280]">
              Performance shape
            </p>
            <div className="h-[245px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke={isLight ? '#e5e7eb' : '#2a2a34'} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: isLight ? '#374151' : '#6b7280', fontSize: 9 }}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="You" dataKey="A" stroke="#22c55e" fill="#22c55e" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Avg. Win" value={stats.avgGain} />
            <StatBox label="Avg. Loss" value={stats.avgLoss} />
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-[#1a1a24] dark:bg-[#0d0d14]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-[#6b7280]">
                Avg. Return
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-[#f5f5f5]">{stats.avgReturn.toFixed(2)}%</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-[#1a1a24]">
                <div
                  className="h-full rounded-full bg-emerald-500/80"
                  style={{ width: `${Math.min(100, Math.max(0, stats.avgReturn + 20))}%` }}
                />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-[#6b7280]">
                Win Rate
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-[#f5f5f5]">{stats.winRate.toFixed(2)}%</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-[#1a1a24]">
                <div
                  className="h-full rounded-full bg-emerald-500/90"
                  style={{ width: `${Math.min(100, stats.winRate)}%` }}
                />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-[#6b7280]">
                Total Trades
              </p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900 dark:text-[#f5f5f5]">{stats.totalTrades}</p>
                {stats.totalTrades >= 20 && (
                  <span className="rounded border border-gray-300 bg-gray-200 px-2 py-0.5 text-[10px] text-amber-600 dark:border-[#2a2a34] dark:bg-[#1a1a24] dark:text-amber-400">
                    SERIAL TRADER
                  </span>
                )}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-[#1a1a24]">
                <div
                  className="h-full rounded-full bg-indigo-500/70"
                  style={{ width: `${Math.min(100, stats.totalTrades * 2)}%` }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {!emptyPerf && showAll && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-[#1a1a24] dark:bg-[#0d0d14]">
            <p className="text-[10px] uppercase text-gray-500 dark:text-[#6b7280]">Break Even Rate</p>
            <p className="text-lg font-semibold text-gray-800 dark:text-[#e5e7eb]">{stats.breakEvenRate.toFixed(2)}%</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-[#1a1a24] dark:bg-[#0d0d14]">
            <p className="text-[10px] uppercase text-gray-500 dark:text-[#6b7280]">Sum Gain</p>
            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{stats.sumGain.toFixed(2)}%</p>
          </div>
        </div>
      )}

      {!emptyPerf && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-600 transition hover:bg-gray-100 dark:border-[#1a1a24] dark:text-[#9ca3af] dark:hover:bg-[#16161f]"
        >
          {showAll ? 'Hide extra stats' : 'Show All Stats'}
        </button>
      )}
    </div>
  );
}
