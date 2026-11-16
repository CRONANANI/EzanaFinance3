'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { orgRequest } from '@/lib/org-request';
import { NA, fmtScore } from '@/lib/org-competitions-model';
import { ConfirmDialog } from './landing/Dialogs';
import { HostToolsNav } from './WorkspaceParts';
import './competitions.css';

/**
 * Host managers' scoreboard: each team's weighted score of 100 across the
 * judges who submitted, with Refresh, Recompute and Reveal results (which
 * recomputes, awards trophies, reveals, and refreshes the council rating) or
 * Hide results, confirmed in a dialog.
 */
export function ScoreboardClient({ competition }) {
  const [rows, setRows] = useState([]);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [state, setState] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/org/pitch-competitions/${competition.id}/scoreboard`, {
        cache: 'no-store',
      });
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

  const run = async (action, fallback) => {
    setBusy(true);
    setActionError('');
    try {
      await orgRequest(`/api/org/pitch-competitions/${competition.id}/results`, {
        method: 'POST',
        json: { action },
      });
      if (action === 'publish') setResultsVisible(true);
      if (action === 'unpublish') setResultsVisible(false);
      await load();
      return { ok: true };
    } catch (err) {
      const msg = err.message || fallback;
      setActionError(msg);
      return { ok: false, error: msg };
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pcx-scoreboard">
      <HostToolsNav slug={competition.slug} active="scoreboard" />
      <div className="pcx-sec__head">
        <h2 className="pcx-h2">
          Scores
          <span className="pcx-muted pcx-h2__aside">Weighted to a score of 100</span>
        </h2>
        <div className="pcx-linkrow">
          <button type="button" className="tcc-textbtn" onClick={load} disabled={busy}>
            <i className="bi bi-arrow-clockwise" aria-hidden="true" />
            Refresh
          </button>
          <button
            type="button"
            className="tcc-textbtn"
            onClick={() => run('compute', 'Could not recompute the scores.')}
            disabled={busy}
          >
            Recompute
          </button>
          <Link href={`/org-competitions/${competition.slug}/results`} className="tcc-textbtn">
            Breakdowns
          </Link>
          {resultsVisible ? (
            <button
              type="button"
              className="tcc-textbtn"
              onClick={() => setConfirm('hide')}
              disabled={busy}
            >
              <i className="bi bi-eye-slash" aria-hidden="true" />
              Hide results
            </button>
          ) : (
            <button
              type="button"
              className="pcx-btn pcx-btn--primary"
              onClick={() => setConfirm('reveal')}
              disabled={busy}
            >
              <i className="bi bi-eye" aria-hidden="true" />
              Reveal results
            </button>
          )}
        </div>
      </div>

      <p className="pcx-reveal-tag">
        <i className={`bi ${resultsVisible ? 'bi-eye' : 'bi-eye-slash'}`} aria-hidden="true" />
        {resultsVisible ? 'Results are revealed to entrants.' : 'Results are hidden from entrants.'}
      </p>

      {actionError ? (
        <p className="tcc-state tcc-state--error" role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          <span>{actionError}</span>
        </p>
      ) : null}

      {state === 'loading' ? (
        <div className="pcx-skel" aria-hidden="true">
          {[80, 72, 64, 58].map((w) => (
            <span key={w} className="tcc-skel" style={{ width: `${w}%`, height: 12 }} />
          ))}
        </div>
      ) : state === 'error' ? (
        <p className="tcc-state tcc-state--error" role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          <span>Could not load the scores.</span>
          <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={load}>
            Retry
          </button>
        </p>
      ) : rows.length === 0 ? (
        <p className="tcc-state">
          <span>No teams yet.</span>
          <Link className="tcc-link" href={`/org-competitions/${competition.slug}?tab=invitations`}>
            Invite a team
          </Link>
        </p>
      ) : (
        <div className="pcx-tablewrap" role="region" aria-label="Scores" tabIndex={0}>
          <table className="pcx-table">
            <thead>
              <tr>
                <th scope="col" className="pcx-num">
                  Rank
                </th>
                <th scope="col">Team</th>
                <th scope="col">Ticker</th>
                <th scope="col" className="pcx-num">
                  Judges
                </th>
                <th scope="col" className="pcx-num">
                  Submitted
                </th>
                <th scope="col" className="pcx-num">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="pcx-num tcc-mono">{r.mean != null ? i + 1 : NA}</td>
                  <td className="pcx-strong">{r.team_name}</td>
                  <td className="tcc-mono">{r.ticker || NA}</td>
                  <td className="pcx-num tcc-mono">{r.judgeCount}</td>
                  <td className="pcx-num tcc-mono">{r.submittedCount}</td>
                  <td className={`pcx-num tcc-mono pcx-strong${r.mean == null ? ' tcc-na' : ''}`}>
                    {r.mean != null ? fmtScore(r.mean) : 'Pending'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirm === 'reveal' && (
        <ConfirmDialog
          title="Reveal results?"
          confirmLabel="Reveal results"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            const res = await run('publish', 'Could not reveal the results.');
            if (res.ok) setConfirm(null);
            return res;
          }}
        >
          Scores are recomputed first. Each entrant then sees its own rank, criterion breakdown and
          anonymous feedback, trophies go to the teams&apos; members and portfolio managers, and
          council ratings are refreshed.
        </ConfirmDialog>
      )}
      {confirm === 'hide' && (
        <ConfirmDialog
          title="Hide results?"
          confirmLabel="Hide results"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            const res = await run('unpublish', 'Could not hide the results.');
            if (res.ok) setConfirm(null);
            return res;
          }}
        >
          Entrants will no longer see ranks, scores or feedback for {competition.name}. Trophies
          already awarded stay. You can reveal the results again later.
        </ConfirmDialog>
      )}
    </div>
  );
}
