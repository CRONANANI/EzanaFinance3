'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import './competitions.css';

const STATUS_SECTIONS = [
  { key: 'active', label: 'Active', statuses: ['active'] },
  { key: 'upcoming', label: 'Upcoming', statuses: ['upcoming'] },
  { key: 'past', label: 'Past', statuses: ['ended', 'scored', 'cancelled'] },
];

function formatScope(rules) {
  const scope = rules?.scope;
  if (scope === 'friends') return 'Friends only';
  if (scope === 'platform') return 'Platform-wide';
  return null;
}

function formatPrizes(c) {
  const cash = c.rules?.cashPrizes;
  const parts = [`Top 1% +${c.elo_top1pct_award} ELO`, `Top 10% +${c.elo_top10pct_award} ELO`];
  if (cash?.first) parts.push(`$${cash.first} (1st)`);
  return parts.join(' · ');
}

export function CompetitionsPanel() {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch('/api/competitions')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then((d) => setCompetitions(d.competitions || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = { active: [], upcoming: [], past: [] };
    for (const c of competitions) {
      if (c.status === 'active') map.active.push(c);
      else if (c.status === 'upcoming') map.upcoming.push(c);
      else map.past.push(c);
    }
    return map;
  }, [competitions]);

  const handleJoin = async (competitionId) => {
    setJoiningId(competitionId);
    setError(null);
    try {
      const res = await fetch('/api/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competition_id: competitionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not join');
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setJoiningId(null);
    }
  };

  const renderList = (items, empty) =>
    items.length === 0 ? (
      <p className="comp-empty">{empty}</p>
    ) : (
      <ul className="comp-list">
        {items.map((c) => {
          const joined = Boolean(c.userParticipation);
          const canJoin = c.status === 'upcoming' || c.status === 'active';
          const scope = formatScope(c.rules);
          return (
            <li key={c.id} className="comp-card">
              <div className="comp-card-title">{c.name}</div>
              <div className="comp-card-meta">
                {scope ? `${scope} · ` : ''}
                {new Date(c.starts_at).toLocaleDateString()} –{' '}
                {new Date(c.ends_at).toLocaleDateString()}
                {joined ? ' · Joined' : ''}
              </div>
              {c.description ? <p className="comp-card-desc">{c.description}</p> : null}
              <div className="comp-prizes">{formatPrizes(c)}</div>
              {c.userParticipation?.rank != null ? (
                <div className="comp-card-meta">
                  Rank #{c.userParticipation.rank}
                  {c.userParticipation.return_pct != null
                    ? ` · ${Number(c.userParticipation.return_pct).toFixed(2)}% return`
                    : ''}
                </div>
              ) : null}
              {canJoin && !joined ? (
                <button
                  type="button"
                  className="comp-join-btn"
                  disabled={joiningId === c.id}
                  onClick={() => handleJoin(c.id)}
                >
                  {joiningId === c.id ? 'Joining…' : 'Join competition'}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    );

  return (
    <section className="comp-panel ez-card">
      <header className="comp-header">
        <h2 className="comp-title">Competitions</h2>
        <p className="comp-subtitle">
          Seasonal trading challenges with ELO prizes and leaderboard rankings.
        </p>
      </header>
      {error ? <p className="comp-error">{error}</p> : null}
      {loading ? (
        <p className="comp-empty">Loading competitions…</p>
      ) : (
        STATUS_SECTIONS.map(({ key, label }) => (
          <div key={key} className="comp-section">
            <h3>{label}</h3>
            {renderList(
              grouped[key],
              key === 'active'
                ? 'No active competitions right now.'
                : key === 'upcoming'
                  ? 'No upcoming competitions scheduled.'
                  : 'No past competitions yet.',
            )}
          </div>
        ))
      )}
      <p className="comp-footnote">
        Admins create competitions via the admin API. Cash prize payout integration is a follow-up.
      </p>
    </section>
  );
}
