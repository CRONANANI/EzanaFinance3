'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { LeagueHeader } from './LeagueHeader';
import { HeroCard } from './HeroCard';
import { DailyQuests } from './DailyQuests';
import { FilterBar } from './FilterBar';
import { StatsStrip } from './StatsStrip';
import { LeaderboardTable } from './LeaderboardTable';
import { LeaderboardSkeleton } from './LeaderboardSkeleton';
import { page } from './elo-design-tokens';
import { MOCK_LEAGUE, MOCK_STATS, MOCK_QUESTS } from './mock-data';
import './elo-redesign.css';

const PAGE_LIMIT = 100;

function normalizeUser(row) {
  return {
    id: row.id || row.user_id,
    username: row.username,
    rank: row.rank,
    name: row.name || row.display_name || 'Member',
    initials: row.initials || '—',
    title: row.title || '',
    tier: row.tier,
    rating: row.rating ?? row.current_rating ?? 0,
    peak: row.peak ?? row.peak_rating ?? 0,
    delta7d: row.delta7d ?? 0,
    delta30d: row.delta30d ?? 0,
    sparkline: row.sparkline || [],
    active: row.active || '—',
  };
}

export default function EloLeaderboardPage() {
  const [query, setQuery] = useState('');
  const [range, setRange] = useState('1W');
  const [activeTier, setActiveTier] = useState('all');
  const [sort, setSort] = useState('rating');
  const [sortDir, setSortDir] = useState('desc');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [league, setLeague] = useState(MOCK_LEAGUE);
  const [stats, setStats] = useState(MOCK_STATS);
  const [quests, setQuests] = useState(MOCK_QUESTS);
  const [refreshesAt, setRefreshesAt] = useState('—');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const searchRef = useRef(null);
  const rowRefs = useRef([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const tierParam = activeTier !== 'all' ? `&tier=${activeTier}` : '';
      const searchParam = query.trim() ? `&search=${encodeURIComponent(query.trim())}` : '';

      try {
        const [eloRes, meRes, leagueRes, statsRes, questsRes] = await Promise.all([
          fetch(`/api/leaderboard/elo?limit=${PAGE_LIMIT}${tierParam}${searchParam}`),
          fetch('/api/leaderboard/me'),
          fetch('/api/leaderboard/league'),
          fetch('/api/leaderboard/stats'),
          fetch('/api/quests/daily'),
        ]);

        if (cancelled) return;

        const [eloData, meData, leagueData, statsData, questsData] = await Promise.all([
          eloRes.json(),
          meRes.ok ? meRes.json() : null,
          leagueRes.json(),
          statsRes.json(),
          questsRes.json(),
        ]);

        if (eloData.error) throw new Error(eloData.error);

        setUsers((eloData.rows || []).map(normalizeUser));
        if (meData && !meData.error) setMe(meData);
        if (leagueData && !leagueData.error) setLeague(leagueData);
        if (statsData && !statsData.error) setStats(statsData);
        if (questsData?.quests) {
          setQuests(questsData.quests);
          setRefreshesAt(questsData.refreshesIn || '—');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeTier, query]);

  const onSortChange = useCallback(
    (key) => {
      if (sort === key) {
        setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
      } else {
        setSort(key);
        setSortDir('desc');
      }
    },
    [sort],
  );

  const rows = useMemo(() => {
    let filtered = users;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      filtered = filtered.filter((u) => u.name.toLowerCase().includes(q));
    }

    const sortKey =
      { rating: 'rating', d7: 'delta7d', d30: 'delta30d', peak: 'peak', rank: 'rank' }[sort] ||
      'rating';

    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });

    return sorted.map((u, i) => ({ ...u, rank: i + 1 }));
  }, [users, query, sort, sortDir]);

  useEffect(() => {
    rowRefs.current = rows.map(() => null);
    setFocusedIndex(-1);
  }, [rows]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (e.key === 'Escape') {
        if (document.activeElement === searchRef.current) {
          setQuery('');
          searchRef.current?.blur();
        }
        setFocusedIndex(-1);
        return;
      }

      if (!rows.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => {
          const next = i < rows.length - 1 ? i + 1 : 0;
          rowRefs.current[next]?.focus();
          return next;
        });
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) => {
          const next = i > 0 ? i - 1 : rows.length - 1;
          rowRefs.current[next]?.focus();
          return next;
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [rows]);

  if (loading && users.length === 0) {
    return <LeaderboardSkeleton />;
  }

  const currentUserId = me?.id;
  const heroUser = me
    ? { ...me, totalTraders: stats?.totalTraders }
    : rows[0]
      ? { ...rows[0], globalRank: rows[0].rank, progressToNext: 0, nextTier: null }
      : null;

  return (
    <div
      className="elo-page-wrap"
      style={{
        background: page.bg,
        minHeight: '100vh',
        padding: '20px 28px 40px',
      }}
    >
      {error && (
        <p
          role="alert"
          style={{
            background: '#fef2f2',
            color: '#b91c1c',
            padding: '10px 14px',
            borderRadius: 10,
            marginBottom: 14,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {error}
        </p>
      )}

      <LeagueHeader league={league} />

      <div
        className="elo-hero-row"
        style={{
          display: 'flex',
          gap: 14,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        {heroUser && (
          <HeroCard
            user={heroUser}
            weeklyDelta={me?.delta7d ?? 0}
            streakDays={me?.streakDays ?? 0}
          />
        )}
        <DailyQuests quests={quests} refreshesAt={refreshesAt} />
      </div>

      <FilterBar
        ref={searchRef}
        query={query}
        onQueryChange={setQuery}
        range={range}
        onRangeChange={setRange}
        activeTier={activeTier}
        onTierChange={setActiveTier}
      />

      <StatsStrip stats={stats} />

      <LeaderboardTable
        rows={rows}
        currentUserId={currentUserId}
        league={league}
        sort={sort}
        sortDir={sortDir}
        onSortChange={onSortChange}
        focusedIndex={focusedIndex}
        rowRefs={rowRefs}
      />
    </div>
  );
}
