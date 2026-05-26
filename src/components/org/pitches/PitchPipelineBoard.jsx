'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MOCK_TEAMS } from '@/lib/orgMockData';

function cardSubtitle(pitch) {
  if (pitch.stage === 'research_in_progress' || pitch.stage === 'research_approved') {
    const due = pitch.research_due_at
      ? `Due ${new Date(pitch.research_due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : 'In research';
    return `${due} · ${pitch.deliverable_count} file${pitch.deliverable_count === 1 ? '' : 's'}`;
  }
  if (pitch.stage === 'pm_review') {
    return `Awaiting ${pitch.pm_name || 'PM'}`;
  }
  if (pitch.stage === 'committee_scheduled') {
    const mtg = pitch.committee_meeting_at
      ? new Date(pitch.committee_meeting_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : 'TBD';
    return `Mtg ${mtg} · ${pitch.deliverable_count} deliverables`;
  }
  if (pitch.stage === 'committee_vote') {
    return `${pitch.vote_yes_count}y/${pitch.vote_no_count}n`;
  }
  return pitch.submitted_ago;
}

export function PitchPipelineBoard({ teamFilter = '' }) {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState(teamFilter);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (teamId) params.set('team_id', teamId);

    fetch(`/api/org/pitches/board?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setBoard(data);
      })
      .catch(() => {
        if (!cancelled) setBoard({ columns: [], total_active: 0 });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (loading) return <div className="op-loading">Loading pipeline…</div>;
  if (!board?.columns?.length) return <div className="op-empty">No pitches in the pipeline.</div>;

  return (
    <>
      <div className="op-filters">
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          aria-label="Filter by team"
        >
          <option value="">All teams</option>
          {MOCK_TEAMS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
          {board.total_active} active pitch{board.total_active === 1 ? '' : 'es'}
        </span>
      </div>

      <div className="op-board">
        {board.columns.map((col) => (
          <div key={col.id} className="op-column">
            <div className="op-column-header">
              {col.label} ({col.pitches.length})
            </div>
            <div className="op-column-body">
              {col.pitches.map((p) => (
                <Link key={p.id} href={`/org-team-hub/pitches/${p.id}`} className="op-card">
                  <div className="op-card-ticker">{p.ticker}</div>
                  <div className="op-card-meta">
                    {p.analyst_name?.split(' ')[0]} · {p.team_name?.split(',')[0] || p.team_name}
                    <br />
                    {p.pitch_type_label}, {p.horizon_label}
                  </div>
                  <div className="op-card-foot">{cardSubtitle(p)}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
