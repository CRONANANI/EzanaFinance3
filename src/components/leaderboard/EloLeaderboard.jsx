'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import './elo-leaderboard.css';

const TIER_COLORS = {
  novice: '#94a3b8',
  apprentice: '#60a5fa',
  strategist: '#a78bfa',
  tactician: '#10b981',
  master: '#f59e0b',
  grandmaster: '#D4AF37',
};

const TIER_LABELS = {
  all: 'All Tiers',
  novice: 'Novice',
  apprentice: 'Apprentice',
  strategist: 'Strategist',
  tactician: 'Tactician',
  master: 'Master',
  grandmaster: 'Grandmaster',
};

const PAGE_SIZE = 50;
const INACTIVE_MS = 90 * 24 * 60 * 60 * 1000;

export default function EloLeaderboard() {
  const [rows, setRows] = useState([]);
  const [tierFilter, setTierFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));
    if (tierFilter !== 'all') params.set('tier', tierFilter);

    fetch(`/api/leaderboard/elo?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setRows(data.rows || []);
        setTotal(data.pagination?.total || 0);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tierFilter, offset]);

  const filteredRows = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        (r.username || '').toLowerCase().includes(s) ||
        (r.display_name || '').toLowerCase().includes(s)
    );
  }, [rows, search]);

  const hasNext = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  return (
    <div className="elo-lb-container">
      <header className="elo-lb-header">
        <div>
          <h1 className="elo-lb-title">ELO Leaderboard</h1>
          <p className="elo-lb-subtitle">
            Platform-wide skill rankings · {total.toLocaleString()} ranked users
          </p>
        </div>
      </header>

      <div className="elo-lb-controls">
        <div className="elo-lb-tier-pills">
          {Object.entries(TIER_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`elo-lb-tier-pill ${tierFilter === key ? 'is-active' : ''}`}
              onClick={() => {
                setTierFilter(key);
                setOffset(0);
              }}
              style={
                key !== 'all' && tierFilter === key ?
                  { borderColor: TIER_COLORS[key], color: TIER_COLORS[key] }
                : undefined
              }
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by name or username…"
          className="elo-lb-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="elo-lb-table-wrap">
        {loading ? (
          <div className="elo-lb-loading">Loading rankings…</div>
        ) : filteredRows.length === 0 ? (
          <div className="elo-lb-empty">No users match these filters</div>
        ) : (
          <table className="elo-lb-table">
            <thead>
              <tr>
                <th className="elo-lb-th-rank">Rank</th>
                <th>User</th>
                <th className="elo-lb-th-tier">Tier</th>
                <th className="elo-lb-th-num">Rating</th>
                <th className="elo-lb-th-num">Peak</th>
                <th className="elo-lb-th-status">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => {
                const tierKey = r.tier || 'novice';
                const tierColor = TIER_COLORS[tierKey] || '#94a3b8';
                const tierLabel = TIER_LABELS[tierKey] || tierKey;
                const isInactive =
                  r.last_activity_at &&
                  Date.now() - new Date(r.last_activity_at).getTime() > INACTIVE_MS;
                return (
                  <tr key={r.user_id} className="elo-lb-row">
                    <td className="elo-lb-rank">
                      {r.rank <= 3 ? (
                        <span className={`elo-lb-medal elo-lb-medal-${r.rank}`}>{r.rank}</span>
                      ) : (
                        <span>{r.rank}</span>
                      )}
                    </td>
                    <td>
                      <Link
                        href={r.username ? `/profile/${r.username}` : '#'}
                        className="elo-lb-user-link"
                      >
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt="" className="elo-lb-avatar" />
                        ) : (
                          <span className="elo-lb-avatar elo-lb-avatar-placeholder">
                            {(r.display_name || '?').charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="elo-lb-user-name">{r.display_name}</span>
                        {r.username && <span className="elo-lb-user-handle">@{r.username}</span>}
                      </Link>
                    </td>
                    <td>
                      <span
                        className="elo-lb-tier-badge"
                        style={{ color: tierColor, borderColor: `${tierColor}40` }}
                      >
                        {tierLabel}
                      </span>
                    </td>
                    <td className="elo-lb-rating" style={{ color: tierColor }}>
                      {r.current_rating.toLocaleString()}
                    </td>
                    <td className="elo-lb-peak">{r.peak_rating.toLocaleString()}</td>
                    <td>
                      {r.partner_eligible && (
                        <span className="elo-lb-flag elo-lb-flag-partner">Partner-eligible</span>
                      )}
                      {isInactive && <span className="elo-lb-flag elo-lb-flag-inactive">Inactive</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <footer className="elo-lb-pagination">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          className="elo-lb-page-btn"
        >
          ← Previous
        </button>
        <span className="elo-lb-page-info">
          {total === 0 ? '0' : `${offset + 1}–${Math.min(offset + PAGE_SIZE, total)}`} of{' '}
          {total.toLocaleString()}
        </span>
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => setOffset(offset + PAGE_SIZE)}
          className="elo-lb-page-btn"
        >
          Next →
        </button>
      </footer>
    </div>
  );
}
