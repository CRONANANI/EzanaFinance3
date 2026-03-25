'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getInitials } from '@/lib/community-utils';

const PERIOD_LABEL = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  all: 'All-Time',
};

export function LeaderboardModal({ isOpen, onClose, period }) {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/community/leaderboard?limit=50&period=${encodeURIComponent(period || 'weekly')}`);
        const data = await res.json();
        if (!cancelled) setRankings(data.rankings || []);
      } catch {
        if (!cancelled) setRankings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, period]);

  if (!isOpen) return null;

  const label = PERIOD_LABEL[period] || period || 'Weekly';

  return (
    <>
      <div className="comm-modal-backdrop" role="presentation" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()} />
      <div className="comm-modal" role="dialog" aria-modal="true" aria-labelledby="comm-lb-modal-title">
        <div className="comm-modal-header">
          <h2 id="comm-lb-modal-title" className="comm-modal-title">
            🏆 Full Rankings — {label}
          </h2>
          <button type="button" className="comm-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="comm-modal-body">
          {loading ? (
            <p className="comm-empty" style={{ padding: '1rem 0' }}>
              Loading…
            </p>
          ) : (
            rankings.map((entry, i) => (
              <Link
                key={entry.id}
                href={`/community/profile/${entry.id}`}
                className="comm-modal-row"
                onClick={onClose}
              >
                <span
                  style={{
                    width: 32,
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    color: i < 3 ? '#fbbf24' : '#8b949e',
                  }}
                >
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : entry.rank}
                </span>
                <div className="comm-avatar" aria-hidden>
                  {getInitials(entry.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#f0f6fc', fontSize: '0.8125rem', fontWeight: 700, margin: 0 }}>
                    {entry.name}
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '0.5625rem', margin: '0.15rem 0 0' }}>
                    {entry.trades} trades · {entry.winRate}% win rate
                  </p>
                </div>
                <span
                  style={{
                    color: entry.return >= 0 ? '#10b981' : '#ef4444',
                    fontWeight: 800,
                    fontSize: '0.8125rem',
                  }}
                >
                  {entry.return >= 0 ? '+' : ''}
                  {entry.return}%
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  );
}
