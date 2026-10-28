'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useOrg } from '@/contexts/OrgContext';

/* Signed one-decimal percent, or null when the number is unknown. */
function signedPct(n) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  const v = Number(n);
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function hindsightLine(pitch) {
  const h = pitch.hindsight;
  if (!h) return null;
  const ret = signedPct(h.return_pct);
  const bench = signedPct(h.benchmark_return_pct);
  const alpha = signedPct(h.alpha_pct);
  /* SPY over the same window, from the decision date (ORG-17). */
  const vsSpy = bench ? ` (vs SPY ${bench} over the same period)` : ' (SPY benchmark unavailable)';
  if (pitch.decision === 'accepted') {
    return (
      <div
        className={`op-hindsight ${h.alpha_pct >= 0 ? 'op-hindsight--pos' : 'op-hindsight--neg'}`}
      >
        Performance since accepted: {ret ?? 'n/a'}
        {vsSpy}
        {alpha ? `, alpha ${alpha}` : ''}
      </div>
    );
  }
  if (pitch.decision === 'rejected') {
    return (
      <div className="op-hindsight op-hindsight--neg">
        What happened: {pitch.ticker} {ret ?? 'n/a'} since rejection{vsSpy}
        {h.alpha_pct > 5 ? `; rejection cost about ${Number(h.alpha_pct).toFixed(0)}%` : ''}
      </div>
    );
  }
  return null;
}

export function ArchivePitchList() {
  const { orgData } = useOrg();
  const orgTeams = orgData?.teams || [];
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [decision, setDecision] = useState('');
  const [teamId, setTeamId] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (decision) params.set('decision', decision);
    if (teamId) params.set('team_id', teamId);

    fetch(`/api/org/archive?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setPitches(data.pitches || []);
      })
      .catch(() => {
        if (!cancelled) setPitches([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, decision, teamId]);

  return (
    <>
      <div className="op-filters">
        <input
          className="op-search ds-search-input"
          type="search"
          placeholder="Search by ticker, analyst, thesis keyword…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          aria-label="Decision filter"
        >
          <option value="">All decisions</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="watchlist">Watchlist</option>
          <option value="deferred">Deferred</option>
        </select>
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)} aria-label="Team filter">
          <option value="">All teams</option>
          {orgTeams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
        Showing {pitches.length} archived pitch{pitches.length === 1 ? '' : 'es'}
      </p>

      {loading ? (
        <div className="op-loading">Loading archive…</div>
      ) : pitches.length === 0 ? (
        <div className="op-empty">No archived pitches match your filters.</div>
      ) : (
        <div className="op-archive-list">
          {pitches.map((p) => (
            <Link key={p.id} href={`/org-team-hub/pitches/${p.id}`} className="op-archive-card">
              <div className="op-archive-top">
                <h2 className="op-archive-title">
                  {p.ticker} · {p.team_name} · {p.pitch_type_label}, {p.horizon_label} horizon
                </h2>
                <span className={`op-decision op-decision--${p.decision || p.status}`}>
                  {p.decision === 'accepted'
                    ? '✓ Accepted'
                    : p.decision === 'rejected'
                      ? '✗ Rejected'
                      : p.status_label}
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
                Pitched by {p.analyst_name}
                {p.pm_name ? ` · Approved by ${p.pm_name}` : ''}
                {p.decision_at
                  ? ` · ${new Date(p.decision_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : ''}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                Vote: {p.vote_yes_count} yes, {p.vote_no_count} no, {p.vote_abstain_count} abstain
              </p>
              <p className="op-archive-thesis">&ldquo;{p.thesis_short}&rdquo;</p>
              {p.decision === 'rejected' && p.decision_rationale && (
                <p className="op-archive-thesis" style={{ fontStyle: 'italic' }}>
                  Rejection reason: {p.decision_rationale}
                </p>
              )}
              {hindsightLine(p)}
              <div className="op-archive-actions">
                <span>View pitch</span>
                <span>View deliverables ({p.deliverable_count})</span>
                <span>View vote record</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
