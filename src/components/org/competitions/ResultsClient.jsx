'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { NA, fmtScore } from '@/lib/org-competitions-model';
import { FeedbackList, ResultSummary } from './WorkspaceParts';
import './competitions.css';

/**
 * Results. Host managers: every team's rank and score, and any team's
 * breakdown and feedback (with the judge labels the host may see). Entrants:
 * only their own team, only after the host reveals, with feedback as the
 * comment text alone (the server strips anything that says who wrote it).
 */
export function ResultsClient({ competition, isHost }) {
  const [state, setState] = useState('loading'); // loading | error | ready | hidden
  const [summary, setSummary] = useState({ teams: [], revealed: false });
  const [detail, setDetail] = useState(null);
  const [detailState, setDetailState] = useState('idle');

  const loadDetail = useCallback(
    async (teamId) => {
      setDetailState('loading');
      try {
        const res = await fetch(
          `/api/org/pitch-competitions/${competition.id}/results?team_id=${encodeURIComponent(teamId)}`,
          { cache: 'no-store' },
        );
        if (!res.ok) return setDetailState('error');
        setDetail(await res.json());
        setDetailState('ready');
      } catch {
        setDetailState('error');
      }
    },
    [competition.id],
  );

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch(`/api/org/pitch-competitions/${competition.id}/results`, {
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return setState('error');
      if (!json.isHost && !json.revealed) return setState('hidden');
      setSummary(json);
      setState('ready');
      // An entrant has one team: open it straight away.
      if (!json.isHost && (json.teams || []).length) loadDetail(json.teams[0].team_id);
    } catch {
      setState('error');
    }
  }, [competition.id, loadDetail]);

  useEffect(() => {
    load();
  }, [load]);

  const skel = (
    <div className="pcx-skel" aria-hidden="true">
      {[70, 60, 80, 50].map((w) => (
        <span key={w} className="tcc-skel" style={{ width: `${w}%`, height: 12 }} />
      ))}
    </div>
  );

  return (
    <div className="pcx-results">
      {isHost ? (
        <p className="pcx-reveal-tag">
          <i className={`bi ${summary.revealed ? 'bi-eye' : 'bi-eye-slash'}`} aria-hidden="true" />
          {summary.revealed ? 'Revealed to entrants.' : 'Hidden from entrants.'}{' '}
          <Link className="tcc-link" href={`/org-competitions/${competition.slug}/scoreboard`}>
            Scoreboard
          </Link>
        </p>
      ) : null}

      {state === 'loading' && skel}
      {state === 'error' && (
        <p className="tcc-state tcc-state--error" role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          <span>Could not load results.</span>
          <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={load}>
            Retry
          </button>
        </p>
      )}
      {state === 'hidden' && (
        <p className="tcc-state">
          <span>
            Results have not been revealed. Your rank, breakdown and feedback appear here once the
            host reveals them.
          </span>
          <Link className="tcc-link" href={`/org-competitions/${competition.slug}/live`}>
            View live board
          </Link>
        </p>
      )}

      {state === 'ready' && (
        <div className={isHost ? 'pcx-split' : ''}>
          {isHost ? (
            <>
              <section className="pcx-sec pcx-col" aria-labelledby="pcx-stand-title">
                <h2 className="pcx-h2" id="pcx-stand-title">
                  Standings
                </h2>
                {summary.teams.length === 0 ? (
                  <p className="tcc-state">
                    <span>No results computed yet.</span>
                    <Link
                      className="tcc-link"
                      href={`/org-competitions/${competition.slug}/scoreboard`}
                    >
                      Recompute on the scoreboard
                    </Link>
                  </p>
                ) : (
                  <ol className="pcx-standings">
                    {summary.teams.map((t) => (
                      <li key={t.team_id}>
                        <button
                          type="button"
                          className={`pcx-standing${detail?.team?.id === t.team_id ? ' is-active' : ''}`}
                          aria-pressed={detail?.team?.id === t.team_id}
                          onClick={() => loadDetail(t.team_id)}
                        >
                          <span className="pcx-standing-rank tcc-mono">{t.rank ?? NA}</span>
                          <span className="pcx-standing-name">{t.team_name}</span>
                          <span className="pcx-standing-total tcc-mono">
                            {fmtScore(t.weighted_total)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
              <span className="tcc-vrule pcx-split__rule" aria-hidden="true" />
            </>
          ) : null}

          <section className="pcx-sec pcx-col" aria-live="polite">
            {detailState === 'loading' ? (
              skel
            ) : detailState === 'error' ? (
              <p className="tcc-state tcc-state--error" role="alert">
                <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                <span>Could not load this team&apos;s result.</span>
              </p>
            ) : detail ? (
              <>
                <h2 className="pcx-h2">
                  {detail.team?.team_name}
                  {detail.team?.ticker ? (
                    <span className="tcc-mono pcx-h2__aside">{detail.team.ticker}</span>
                  ) : null}
                </h2>
                {detail.result ? (
                  <ResultSummary result={detail.result} breakdown={detail.breakdown} />
                ) : (
                  <p className="tcc-state">No score for this team yet.</p>
                )}
                <h3 className="pcx-mini-title">
                  {isHost ? 'Judge feedback' : 'Anonymous feedback'}{' '}
                  <span className="tcc-mono">{(detail.feedback || []).length}</span>
                </h3>
                <FeedbackList items={detail.feedback || []} />
              </>
            ) : (
              <p className="tcc-state">
                {isHost
                  ? 'Choose a team to see its breakdown and feedback.'
                  : 'No result for your team yet.'}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
