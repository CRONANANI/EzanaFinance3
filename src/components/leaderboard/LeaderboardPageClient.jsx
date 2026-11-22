'use client';

/**
 * /leaderboard (Nov 22 2026): the Ezana Social leaderboard on the LeaderboardCard: the
 * period selector in the card header, a podium for the top three, then the full ranking ten
 * to a page with the reader's own row marked (and pinned under the page when it is on
 * another one). Every figure comes from /api/leaderboard; nothing is invented.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getPeriodStartIso, scoreTooltipText } from '@/lib/userTradeStats';
import { LeaderboardCard } from './LeaderboardCard';
import './leaderboard-page.css';
import '@/styles/home-canvas.css';

const PERIODS = [
  { id: 'all_time', label: 'All time' },
  { id: 'year', label: 'Past year' },
  { id: 'month', label: 'Past month' },
  { id: 'week', label: 'Past week' },
];

const day = (d) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(d);

/** The window a period covers, as the card's date range. */
export function rangeLabelFor(period, now = new Date()) {
  const start = getPeriodStartIso(period);
  return start ? `${day(new Date(start))} to ${day(now)}` : `All time to ${day(now)}`;
}

const pct = (n, digits = 1) =>
  Number.isFinite(Number(n)) ? `${Number(n).toFixed(digits)}%` : 'N/A';

export function LeaderboardPageClient() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('all_time');
  const [includeRising, setIncludeRising] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        `/api/leaderboard?period=${period}&includeRising=${includeRising ? '1' : '0'}&limit=100&offset=0&persist=1`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'failed');
      setRows(data.rows || []);
      setTotal(data.meta?.total ?? (data.rows || []).length);
    } catch {
      setRows([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [period, includeRising]);

  useEffect(() => {
    load();
  }, [load]);

  const toItem = useCallback(
    (r) => ({
      userId: r.userId,
      rank: r.rank,
      userName: r.username || r.displayName || 'Member',
      avatarUrl: r.avatarUrl || null,
      href: r.username ? `/profile/${encodeURIComponent(r.username)}` : null,
      byline: `${pct(r.winRate)} win rate · ${r.totalTrades} trades · ${pct(r.avgReturn, 2)} avg return${r.isPartner ? ' · Partner' : ''}`,
      value: r.score,
      change: r.rankChange,
    }),
    [],
  );

  const all = useMemo(() => rows.map(toItem), [rows, toItem]);
  const podium = useMemo(() => all.filter((r) => r.rank <= 3), [all]);
  const rankings = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s ? all.filter((r) => r.userName.toLowerCase().includes(s)) : all;
  }, [all, search]);
  const mine = user?.id ? all.find((r) => r.userId === user.id) : null;

  return (
    <div className="dashboard-page-inset ez-canvas lbp">
      <Link href="/community" className="lbp-back">
        <i className="bi bi-arrow-left" aria-hidden="true" /> Back to Community
      </Link>

      <LeaderboardCard
        title="Leaderboard"
        rangeLabel={rangeLabelFor(period)}
        runOptions={PERIODS}
        selectedRunId={period}
        onRunChange={setPeriod}
        podium={search.trim() ? [] : podium}
        rankings={rankings}
        currentUserId={user?.id || null}
        valueLabel="Score"
        formatValue={(v) => (Number.isFinite(Number(v)) ? Number(v).toFixed(0) : 'N/A')}
        loading={loading}
        error={error}
        onRetry={load}
        emptyText={
          search.trim()
            ? `No member matches "${search.trim()}".`
            : 'No rankings yet for this period.'
        }
        tools={
          <>
            <div className="lbp-tools-left">
              <label className="lbp-search">
                <i className="bi bi-search" aria-hidden="true" />
                <span className="lbc-sr">Search by username</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by username"
                  autoComplete="off"
                />
              </label>
              <label className="lbp-check">
                <input
                  type="checkbox"
                  checked={includeRising}
                  onChange={(e) => setIncludeRising(e.target.checked)}
                />
                Include rising traders
              </label>
            </div>
            <p className="lbp-meta">
              {mine ? (
                <>
                  You are <strong>#{mine.rank}</strong> of {total}
                </>
              ) : (
                <>{total} ranked</>
              )}
              <i
                className="bi bi-info-circle lbp-info"
                title={scoreTooltipText()}
                role="img"
                aria-label={`How the score works: ${scoreTooltipText()}`}
              />
            </p>
          </>
        }
      />
    </div>
  );
}
