'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, RefreshCw, Trophy, Loader2 } from 'lucide-react';
import './competitions.css';

export function ScoreboardClient({ competition }) {
  const [rows, setRows] = useState([]);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [state, setState] = useState('loading');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/org/pitch-competitions/${competition.id}/scoreboard`, { cache: 'no-store' });
      if (!res.ok) {
        setState('error');
        return;
      }
      const json = await res.json();
      setRows(json.teams || []);
      setResultsVisible(!!json.results_visible);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [competition.id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleReveal = async () => {
    if (resultsVisible && !window.confirm('Hide results from competitors again?')) return;
    setBusy(true);
    try {
      // Publish recomputes results then reveals; unpublish re-hides.
      const res = await fetch(`/api/org/pitch-competitions/${competition.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: resultsVisible ? 'unpublish' : 'publish' }),
      });
      if (res.ok) {
        setResultsVisible((v) => !v);
        load();
      }
    } finally {
      setBusy(false);
    }
  };

  const recompute = async () => {
    setBusy(true);
    try {
      await fetch(`/api/org/pitch-competitions/${competition.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'compute' }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pcx-page">
      <Link href={`/org-competitions/${competition.slug}`} className="pcx-back">
        <ArrowLeft size={15} /> {competition.name}
      </Link>
      <header className="pcx-cc-head pcx-cc-title-row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1 className="pcx-h1">Scoreboard</h1>
          <p className="pcx-lead">Live weighted totals across judges. Hidden from competitors until you reveal.</p>
        </div>
        <div className="pcx-cc-links">
          <button type="button" className="pcx-btn" onClick={load} disabled={busy}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button type="button" className="pcx-btn" onClick={recompute} disabled={busy}>
            Recompute
          </button>
          <Link href={`/org-competitions/${competition.slug}/results`} className="pcx-btn">
            Results view
          </Link>
          <button type="button" className={`pcx-btn ${resultsVisible ? '' : 'pcx-btn--primary'}`} onClick={toggleReveal} disabled={busy}>
            {resultsVisible ? <EyeOff size={14} /> : <Eye size={14} />} {resultsVisible ? 'Hide results' : 'Reveal results'}
          </button>
        </div>
      </header>

      <div className={`pcx-reveal-tag ${resultsVisible ? 'is-live' : ''}`}>
        {resultsVisible ? 'Results are revealed to participants.' : 'Results are hidden from participants.'}
      </div>

      {state === 'loading' ? (
        <div className="pcx-empty pcx-empty--sm"><Loader2 size={18} className="pcx-spin" /> Loading scores…</div>
      ) : state === 'error' ? (
        <div className="pcx-empty pcx-empty--sm">Could not load the scoreboard.</div>
      ) : rows.length === 0 ? (
        <div className="pcx-empty pcx-empty--sm"><Trophy size={22} aria-hidden="true" /><p>No teams yet.</p></div>
      ) : (
        <div className="mkt-ds-table-wrap" role="region" aria-label="Scoreboard" tabIndex={0}>
          <table className="mkt-ds-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>Ticker</th>
                <th style={{ textAlign: 'right' }}>Judges</th>
                <th style={{ textAlign: 'right' }}>Submitted</th>
                <th style={{ textAlign: 'right' }}>Weighted score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="mkt-ds-mono">{r.mean != null ? i + 1 : '—'}</td>
                  <td className="mkt-ds-entity">{r.team_name}</td>
                  <td>{r.ticker || '—'}</td>
                  <td className="mkt-ds-mono" style={{ textAlign: 'right' }}>{r.judgeCount}</td>
                  <td className="mkt-ds-mono" style={{ textAlign: 'right' }}>{r.submittedCount}</td>
                  <td className="mkt-ds-mono" style={{ textAlign: 'right' }}>
                    {r.mean != null ? <strong>{r.mean}</strong> : <span className="pcx-muted">pending</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
