'use client';

import { useMemo } from 'react';
import { PerformanceChart } from './PerformanceChart';
import { MetricsGrid } from './MetricsGrid';
import { AchievementsGrid } from './AchievementsGrid';
import { useProfileActivity } from '@/hooks/useProfileActivity';
import { computeProfileMetrics } from '@/lib/profile-metrics';

/**
 * Side-panel shown on the My Profile / Community profile page.
 * When viewing your **own** profile it pulls live data via
 * `useProfileActivity` and renders the full stack: chart + metrics +
 * achievements. When viewing someone else's profile it renders the chart
 * and metrics derived from the `trades` prop we were given (public data
 * only) and skips achievements (those are private).
 */
export function ProfilePerformancePanel({
  trades = [],
  ownProfile = false,
  profileSource = null,
}) {
  const activity = useProfileActivity();
  const isOwn = ownProfile;

  // Use the live feed for own profile; synthesize from `trades` prop
  // otherwise. `trades` here are the public rows from `user_trades`.
  const { positions, totalReturnPct, userSeries, platformAvgSeries, cohortSeries, platformAverages, benchmarkReturnPct } = useMemo(() => {
    if (isOwn) {
      return {
        positions: activity.positions,
        totalReturnPct: activity.totalReturnPct,
        userSeries: activity.userSeries,
        platformAvgSeries: activity.platformAvgSeries,
        cohortSeries: activity.cohortSeries,
        platformAverages: activity.platformAverages,
        benchmarkReturnPct: activity.benchmarkReturnPct,
      };
    }

    // Build a tiny positions-like shape from the `trades` prop for other
    // users. Total return is the mean of closed pnl_percent values.
    const closed = trades.filter((t) => t.status === 'closed' || t.status === 'partial_exit');
    const withPnl = closed.filter((t) => t.pnl_percent != null);
    const avgReturn = withPnl.length
      ? withPnl.reduce((s, t) => s + Number(t.pnl_percent), 0) / withPnl.length
      : 0;
    // Derive a one-position set so Total Return metric roughly matches.
    const pseudoPositions = [{
      symbol: 'PORTFOLIO',
      qty: 1,
      avgCost: 100,
      currentPrice: 100 * (1 + avgReturn / 100),
      costBasis: 100,
      marketValue: 100 * (1 + avgReturn / 100),
      sector: '',
    }];
    const today = new Date();
    const userSeries = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - (29 - i));
      const t = i / 29;
      return { date: d.toISOString().slice(0, 10), user: Number((avgReturn * t).toFixed(3)) };
    });
    return {
      positions: pseudoPositions,
      totalReturnPct: avgReturn,
      userSeries,
      platformAvgSeries: activity.platformAvgSeries,
      cohortSeries: activity.cohortSeries,
      platformAverages: activity.platformAverages,
      benchmarkReturnPct: activity.benchmarkReturnPct,
    };
  }, [isOwn, activity, trades]);

  const metrics = useMemo(
    () => computeProfileMetrics({
      positions,
      trades: isOwn ? activity.trades : trades,
      deposits: isOwn ? activity.deposits : [],
      benchmarkReturnPct,
      platformAverages,
    }),
    [positions, isOwn, activity.trades, activity.deposits, trades, benchmarkReturnPct, platformAverages],
  );

  const showSourceTag = isOwn && activity.source !== 'empty';
  const sourceTag = activity.sourceLabel;
  const isLive = activity.isLive;

  return (
    <div className="space-y-4">
      {showSourceTag && (
        <div className="flex items-center justify-end">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              isLive
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
                : 'border-gray-300/40 bg-gray-500/10 text-gray-500 dark:text-gray-400'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            {sourceTag}
          </span>
        </div>
      )}

      <PerformanceChart
        userSeries={userSeries}
        platformAvgSeries={platformAvgSeries}
        cohortSeries={cohortSeries}
      />

      <MetricsGrid metrics={metrics} />

      {isOwn && (
        <AchievementsGrid
          positions={positions}
          totalReturnPct={totalReturnPct}
        />
      )}

      {profileSource === 'empty-own' && (
        <p className="text-xs text-gray-500 dark:text-[#6b7280] text-center">
          Showing zeros while you have no holdings. Connect a brokerage or make trades in the Mock Trading page to populate this view.
        </p>
      )}
    </div>
  );
}
