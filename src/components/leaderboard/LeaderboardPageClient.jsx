'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { scoreTooltipText } from '@/lib/userTradeStats';

const PERIODS = [
  { id: 'all_time', label: 'All Time' },
  { id: 'year', label: 'Year' },
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
];

function formatChange(c) {
  if (c == null || Number.isNaN(c)) return '—';
  if (c === 0) return '—';
  if (c > 0) return <span className="text-emerald-600 dark:text-emerald-400">↑{c}</span>;
  return <span className="text-red-600 dark:text-red-400">↓{Math.abs(c)}</span>;
}

export function LeaderboardPageClient() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('all_time');
  const [includeRising, setIncludeRising] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [myRanks, setMyRanks] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = `/api/leaderboard?period=${period}&includeRising=${includeRising ? '1' : '0'}&limit=80&offset=0&persist=1`;
      const res = await fetch(q);
      const data = await res.json();
      setRows(data.rows || []);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [period, includeRising]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user?.id) {
      setMyRanks(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const periods = ['all_time', 'year', 'month', 'week'];
      const out = {};
      await Promise.all(
        periods.map(async (p) => {
          const res = await fetch(`/api/leaderboard?period=${p}&includeRising=1&limit=2000&offset=0&persist=0`);
          const data = await res.json();
          const row = (data.rows || []).find((r) => r.userId === user.id);
          if (row) out[p] = { rank: row.rank, change: row.rankChange };
        }),
      );
      if (!cancelled) setMyRanks(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => (r.username || '').toLowerCase().includes(s));
  }, [rows, search]);

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 pb-24 text-gray-700 dark:text-[#e5e7eb]">
      <Link href="/community" className="mb-4 inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline">
        ← Back to Community
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Leaderboard</h1>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                period === p.id ? 'bg-gray-200 dark:bg-[#1a1a24] text-gray-900 dark:text-white' : 'text-[#6b7280] hover:text-[#9ca3af]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#9ca3af]">
            <input
              type="checkbox"
              checked={includeRising}
              onChange={(e) => setIncludeRising(e.target.checked)}
              className="rounded border-gray-300 dark:border-[#1a1a24] bg-white dark:bg-[#0d0d14]"
            />
            Include rising traders
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]">⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username"
              className="w-56 rounded-lg border border-gray-300 dark:border-[#1a1a24] bg-white dark:bg-[#0d0d14] py-2 pl-9 pr-3 text-sm text-gray-900 dark:text-white placeholder:text-[#6b7280]"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-gray-200 dark:border-[#1a1a24] bg-white dark:bg-[#0d0d14]">
        {loading ? (
          <div className="animate-pulse p-8 text-[#6b7280]">Loading…</div>
        ) : (
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-[#1a1a24] text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
                <th className="px-4 py-3">#</th>
                <th className="px-2 py-3">Δ</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Win rate</th>
                <th className="px-4 py-3">Avg gain</th>
                <th className="px-4 py-3">Avg return</th>
                <th className="px-4 py-3">Avg max</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Trades</th>
                <th className="px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    Score
                    <span className="cursor-help text-emerald-500" title={scoreTooltipText()}>
                      ℹ️
                    </span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const isSelf = user?.id && r.userId === user.id;
                const top = r.rank <= 3;
                return (
                  <tr
                    key={r.userId}
                    className={`border-b border-gray-200/80 dark:border-[#1a1a24]/80 transition ${
                      isSelf ? 'bg-emerald-500/10' : ''
                    } ${top ? 'bg-amber-500/[0.04]' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono text-[#9ca3af]">{r.rank}</td>
                    <td className="px-2 py-3 text-xs">{formatChange(r.rankChange)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/profile/${encodeURIComponent(r.username)}`}
                        className="inline-flex items-center gap-2 font-semibold text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400"
                        title={`${r.username} — ${r.winRate.toFixed(1)}% win · ${r.totalTrades} trades`}
                      >
                        {r.rank === 1 && '👑 '}
                        {r.rank === 2 && '👑 '}
                        {r.rank === 3 && '👑 '}
                        {r.rank > 3 && r.isPartner && '⚡ '}
                        {r.rank > 3 && !r.isPartner && '⭐ '}
                        <span>{r.username}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400/90">{r.winRate.toFixed(1)}%</td>
                    <td className="px-4 py-3">{r.avgGain.toFixed(2)}%</td>
                    <td className="px-4 py-3">{r.avgReturn.toFixed(2)}%</td>
                    <td className="px-4 py-3">{r.avgMax.toFixed(2)}%</td>
                    <td className="px-4 py-3">{r.activeTrades}</td>
                    <td className="px-4 py-3">{r.totalTrades}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{r.score.toFixed(0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {user?.id && myRanks && (
        <div className="fixed bottom-4 left-4 z-40 flex flex-wrap gap-2 rounded-xl border border-gray-200 dark:border-[#1a1a24] bg-white/95 dark:bg-[#0d0d14]/95 p-3 text-xs backdrop-blur">
          {['all_time', 'year', 'month', 'week'].map((p) => {
            const x = myRanks[p];
            if (!x) return null;
            const lbl = p === 'all_time' ? 'ALL TIME' : p.toUpperCase();
            return (
              <span key={p} className="text-[#9ca3af]">
                {formatChange(x.change)} #{x.rank} {lbl}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
