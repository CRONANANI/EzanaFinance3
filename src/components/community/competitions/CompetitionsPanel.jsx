'use client';

import { useEffect, useState } from 'react';
import './competitions.css';

export function CompetitionsPanel() {
  const [data, setData] = useState({ active: [], upcoming: [], past: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/competitions')
      .then((r) => (r.ok ? r.json() : { active: [], upcoming: [], past: [] }))
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const renderList = (items, empty) =>
    items.length === 0 ? (
      <p className="comp-empty">{empty}</p>
    ) : (
      <ul className="comp-list">
        {items.map((c) => (
          <li key={c.id} className="comp-card">
            <div className="comp-card-title">{c.title}</div>
            <div className="comp-card-meta">
              {c.visibility === 'friends' ? 'Friends only' : 'Platform-wide'} ·{' '}
              {new Date(c.starts_at).toLocaleDateString()} –{' '}
              {new Date(c.ends_at).toLocaleDateString()}
            </div>
            {c.description ? <p className="comp-card-desc">{c.description}</p> : null}
            <div className="comp-prizes">
              Prizes: <span className="comp-prize-elo">+{c.prize_elo_first} ELO</span> (1st) · Cash
              top 3 configured (payout follow-up)
            </div>
          </li>
        ))}
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
      {loading ? (
        <p className="comp-empty">Loading competitions…</p>
      ) : (
        <>
          <div className="comp-section">
            <h3>Active</h3>
            {renderList(data.active, 'No active competitions right now.')}
          </div>
          <div className="comp-section">
            <h3>Upcoming</h3>
            {renderList(data.upcoming, 'No upcoming competitions scheduled.')}
          </div>
          <div className="comp-section">
            <h3>Past</h3>
            {renderList(data.past, 'No past competitions yet.')}
          </div>
        </>
      )}
      <p className="comp-footnote">
        Create flow (friends vs platform, time window, sector filters) and entry leaderboard wire-up
        ship with the next iteration. Prize money payout integration is out of scope for this
        release.
      </p>
    </section>
  );
}
