'use client';

import dynamic from 'next/dynamic';

/* PerformanceChart pulls in Recharts — dynamic-import with a fixed-height
   placeholder so the panel doesn't reflow when the chart hydrates (keeps
   CLS at zero on the profile page). */
const PerformanceChart = dynamic(
  () => import('./PerformanceChart').then((m) => ({ default: m.PerformanceChart })),
  {
    ssr: false,
    loading: () => <div style={{ height: 280 }} aria-hidden />,
  },
);

/**
 * Performance chart panel for the right rail of the profile page.
 *
 * MetricsGrid + AchievementsGrid moved into the name card (ProfilePageClient).
 * This panel renders the source-tag (Live / Demo / etc.) + cumulative-return chart.
 *
 * @param {object} props
 * @param {Array} props.userSeriesFull - daily cumulative return points
 * @param {boolean} [props.isLive=false]
 * @param {string} [props.sourceTag] - "Live" / "Demo" / etc.
 * @param {boolean} [props.showSourceTag=false]
 * @param {string|null} [props.profileSource] - 'empty-own' if user has no holdings
 */
export function ProfilePerformancePanel({
  userSeriesFull = [],
  isLive = false,
  sourceTag,
  showSourceTag = false,
  profileSource = null,
}) {
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
            <span
              className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-gray-400'}`}
            />
            {sourceTag}
          </span>
        </div>
      )}

      <PerformanceChart userSeriesFull={userSeriesFull} />

      {profileSource === 'empty-own' && (
        <p className="text-xs text-gray-500 dark:text-[#6b7280] text-center">
          Showing zeros while you have no holdings. Connect a brokerage or make trades in the Mock
          Trading page to populate this view.
        </p>
      )}
    </div>
  );
}
