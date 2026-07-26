'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, MessageSquareQuote, Loader2 } from 'lucide-react';
import './competitions.css';

export function ResultsClient({ competition, isHost }) {
  const [state, setState] = useState('loading'); // loading | error | ready | hidden
  const [summary, setSummary] = useState({ teams: [], revealed: false });
  const [detail, setDetail] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);

  const loadDetail = useCallback(
    async (teamId) => {
      setDetailBusy(true);
      try {
        const res = await fetch(`/api/org/pitch-competitions/${competition.id}/results?team_id=${teamId}`, { cache: 'no-store' });
        if (res.ok) setDetail(await res.json());
      } finally {
        setDetailBusy(false);
      }
    },
    [competition.id],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/org/pitch-competitions/${competition.id}/results`, { cache: 'no-store' });
        if (!alive) return;
        const json = await res.json().catch(() => ({}));
        if (!res.ok) return setState('error');
        if (!json.isHost && !json.revealed) return setState('hidden');
        setSummary(json);
        setState('ready');
        // A competitor typically has one team — open it straight away.
        if (!json.isHost && (json.teams || []).length) loadDetail(json.teams[0].team_id);
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [competition.id, loadDetail]);

  return (
    <div className="pcx-page">
      <Link href={`/org-competitions/${competition.slug}`} className="pcx-back">
        <ArrowLeft size={15} /> {competition.name}
      </Link>
      <header className="pcx-cc-head">
        <div className="pcx-cc-title-row">
          <h1 className="pcx-h1">Results</h1>
          {isHost && !summary.revealed ? <span className="pcx-pill pcx-pill--warn">Not published</span> : null}
          {summary.revealed ? <span className="pcx-pill pcx-pill--pos">Published</span> : null}
        </div>
      </header>

      {state === 'loading' && <div className="pcx-empty pcx-empty--sm"><Loader2 size={18} className="pcx-spin" /> Loading…</div>}
      {state === 'error' && <div className="pcx-empty pcx-empty--sm">Could not load results.</div>}
      {state === 'hidden' && (
        <div className="pcx-empty">
          <Trophy size={24} aria-hidden="true" />
          <p>Results haven’t been published yet.</p>
          <p className="pcx-muted">Your standings and judge feedback will appear here once the host reveals them.</p>
        </div>
      )}

      {state === 'ready' && (
        <div className={isHost ? 'pcx-two-col' : ''}>
          {isHost ? (
            <section className="pcx-card-block">
              <h2 className="pcx-block-title">Standings</h2>
              {summary.teams.length === 0 ? (
                <p className="pcx-muted">No results computed yet — run “Recompute” on the scoreboard.</p>
              ) : (
                <ol className="pcx-standings">
                  {summary.teams.map((t) => (
                    <li key={t.team_id}>
                      <button type="button" className={`pcx-standing ${detail?.team?.id === t.team_id ? 'is-active' : ''}`} onClick={() => loadDetail(t.team_id)}>
                        <span className="pcx-standing-rank">{t.rank ?? '—'}</span>
                        <span className="pcx-standing-name">{t.team_name}</span>
                        <span className="pcx-standing-total gcx-mono">{t.weighted_total ?? '—'}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ) : null}

          <section className="pcx-card-block">
            {detailBusy ? (
              <div className="pcx-empty pcx-empty--sm"><Loader2 size={16} className="pcx-spin" /> Loading…</div>
            ) : detail ? (
              <ResultDetail detail={detail} />
            ) : (
              <p className="pcx-muted">{isHost ? 'Select a team to see its breakdown and feedback.' : 'No result for your team yet.'}</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ResultDetail({ detail }) {
  const { team, result, breakdown, feedback } = detail;
  return (
    <>
      <div className="pcx-result-head">
        <div>
          <h2 className="pcx-block-title" style={{ marginBottom: 2 }}>{team?.team_name}</h2>
          {team?.ticker ? <span className="pcx-muted">{team.ticker}{team.side ? ` · ${team.side}` : ''}</span> : null}
        </div>
        {result ? (
          <div className="pcx-result-score">
            <span className="pcx-result-rank">#{result.rank ?? '—'}</span>
            <span className="pcx-result-total gcx-mono">{result.weighted_total ?? '—'}</span>
            <span className="pcx-muted">
              {result.judge_count} judge{result.judge_count === 1 ? '' : 's'} scored
            </span>
          </div>
        ) : null}
      </div>

      <h3 className="pcx-mini-title">By criterion</h3>
      <div className="pcx-breakdown">
        {breakdown.map((c) => (
          <div className="pcx-bd-row" key={c.id}>
            <span className="pcx-bd-label">{c.label}</span>
            <span className="pcx-bd-bar" aria-hidden="true">
              <span className="pcx-bd-fill" style={{ width: `${c.pct ?? 0}%` }} />
            </span>
            <span className="pcx-bd-val gcx-mono">{c.avg == null ? '—' : `${c.avg.toFixed(1)}/${c.max_score}`}</span>
          </div>
        ))}
      </div>

      <h3 className="pcx-mini-title"><MessageSquareQuote size={14} aria-hidden="true" /> Judge feedback</h3>
      {feedback.length === 0 ? (
        <p className="pcx-muted">No written feedback was submitted.</p>
      ) : (
        <ul className="pcx-feedback">
          {feedback.map((f, i) => (
            <li key={i} className="pcx-fb">
              <div className="pcx-fb-by">{f.label}</div>
              <p className="pcx-fb-text">{f.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
