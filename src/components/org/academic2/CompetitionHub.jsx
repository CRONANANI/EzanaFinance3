'use client';

import { useCallback, useEffect, useState } from 'react';
import './academic.css';

function pct(n) {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`;
}

export function CompetitionHub() {
  const [competitions, setCompetitions] = useState([]);
  const [viewer, setViewer] = useState({ canEnter: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [board, setBoard] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/org/competitions', { cache: 'no-store' });
      if (res.status === 403) {
        setError('This page is for organizational members only.');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to load competitions.');
        return;
      }
      setCompetitions(data.competitions || []);
      setViewer(data.viewer || {});
      setError('');
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openBoard = async (id) => {
    setOpenId(id);
    setBoard(null);
    const res = await fetch(`/api/org/competitions/${id}/leaderboard`, { cache: 'no-store' });
    if (res.ok) setBoard(await res.json());
  };

  const enter = async (id) => {
    setBusy(true);
    try {
      const res = await fetch('/api/org/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competition_id: id }),
      });
      if (res.ok) {
        await load();
        openBoard(id);
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="ac3-state">Loading competitions…</div>;
  if (error) return <div className="ac3-state ac3-error">{error}</div>;

  return (
    <div className="ac3-root">
      <div className="ac3-header">
        <div>
          <p className="ac3-eyebrow">Academic</p>
          <h1 className="ac3-title">Inter-University Competitions</h1>
          <p className="ac3-sub">Compete school-vs-school on fund performance.</p>
        </div>
      </div>

      {competitions.length === 0 ? (
        <div className="ac3-state">No inter-university competitions open right now.</div>
      ) : (
        competitions.map((c) => (
          <div key={c.id} className="ac3-row">
            <div>
              <span className="ac3-strong">{c.name}</span>
              {c.myEntry && <span className="ac3-pill ac3-pill--current" style={{ marginLeft: 6 }}>entered</span>}
              <div className="ac3-meta">{c.description || c.status}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button type="button" className="ac3-btn" onClick={() => openBoard(c.id)}>
                Leaderboard
              </button>
              {viewer.canEnter && !c.myEntry && (
                <button type="button" className="ac3-btn ac3-btn--primary" onClick={() => enter(c.id)} disabled={busy}>
                  Enter
                </button>
              )}
            </div>
          </div>
        ))
      )}

      {openId && board && (
        <div className="ac3-card" style={{ marginTop: '1.25rem' }}>
          <div className="ac3-label">{board.competition?.name} — standings</div>
          <div className="ac3-table-wrap">
            <table className="ac3-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>University</th>
                  <th>Return</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {board.standings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="ac3-meta">No entries yet.</td>
                  </tr>
                ) : (
                  board.standings.map((s) => (
                    <tr key={s.org_id} className={s.isMine ? 'is-mine' : ''}>
                      <td className="ac3-rank">{s.rank}</td>
                      <td className="ac3-strong">
                        {s.university}
                        {s.isMine && <span className="ac3-pill ac3-pill--current" style={{ marginLeft: 6 }}>you</span>}
                      </td>
                      <td className={`ac3-num ${(s.return_pct ?? 0) >= 0 ? 'ac3-pos' : 'ac3-neg'}`}>
                        {pct(s.return_pct)}
                      </td>
                      <td className="ac3-num">
                        {s.current_value == null ? '—' : `$${Math.round(s.current_value).toLocaleString()}`}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
