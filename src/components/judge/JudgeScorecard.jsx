'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Download, Lock, CheckCircle2, Loader2 } from 'lucide-react';
import { weightedTotal } from '@/lib/competitions/scoring';
import { JudgeShell } from './JudgeLanding';
import './judge.css';

export function JudgeScorecard({ token, teamId }) {
  const [state, setState] = useState('loading'); // loading | error | denied | ready
  const [data, setData] = useState(null);
  const [scores, setScores] = useState({});
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const timers = useRef({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/competitions/judge/team/${teamId}?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
        if (!alive) return;
        if (res.status === 401) return setState('denied');
        if (res.status === 403) return setState('denied');
        const json = await res.json().catch(() => ({}));
        if (!res.ok) return setState('error');
        setData(json);
        setScores(json.myScores || {});
        setComment(json.comment || '');
        setSubmitted(!!json.submitted);
        setState('ready');
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, teamId]);

  const criteria = useMemo(() => data?.criteria || [], [data]);
  const { total } = useMemo(() => weightedTotal(criteria, scores), [criteria, scores]);

  const saveScore = useCallback(
    async (criterionId, value) => {
      setSavingId(criterionId);
      try {
        await fetch('/api/competitions/judge/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-judge-token': token },
          body: JSON.stringify({ team_id: teamId, criterion_id: criterionId, score: value }),
        });
      } catch {
        /* autosave is best-effort; Submit re-persists */
      } finally {
        setSavingId((s) => (s === criterionId ? null : s));
      }
    },
    [token, teamId],
  );

  const onScore = (criterionId, value) => {
    setScores((s) => ({ ...s, [criterionId]: value }));
    clearTimeout(timers.current[criterionId]);
    timers.current[criterionId] = setTimeout(() => saveScore(criterionId, value), 450);
  };

  const submit = async () => {
    if (!window.confirm('Submit and lock your scorecard for this team? You won’t be able to edit it after.')) return;
    setSubmitting(true);
    setError('');
    try {
      // Flush any pending autosaves first.
      Object.values(timers.current).forEach(clearTimeout);
      await Promise.all(
        criteria.filter((c) => scores[c.id] != null).map((c) => saveScore(c.id, scores[c.id])),
      );
      const res = await fetch('/api/competitions/judge/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-judge-token': token },
        body: JSON.stringify({ team_id: teamId, comment }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Could not submit.');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Could not connect.');
    } finally {
      setSubmitting(false);
    }
  };

  if (state === 'loading') return <JudgeShell><div className="jx-loading">Loading materials…</div></JudgeShell>;
  if (state === 'denied')
    return (
      <JudgeShell>
        <div className="jx-denied">
          <Lock size={28} aria-hidden="true" />
          <h1>Not available</h1>
          <p>This team isn’t in your room, or your link is no longer valid.</p>
        </div>
      </JudgeShell>
    );
  if (state === 'error') return <JudgeShell><div className="jx-denied"><p>Something went wrong.</p></div></JudgeShell>;

  const { team, deliverables } = data;
  const deck = deliverables.find((d) => d.kind === 'deck');
  const thesis = deliverables.find((d) => d.kind === 'thesis');
  const model = deliverables.find((d) => d.kind === 'model');
  const exhibits = deliverables.filter((d) => d.kind === 'exhibit');
  const ro = submitted;

  return (
    <JudgeShell>
      <Link href={`/judge/${token}`} className="jx-back">
        <ArrowLeft size={15} /> All teams
      </Link>
      <header className="jx-head jx-head--team">
        <div>
          <h1 className="jx-title">{team.team_name}</h1>
          <p className="jx-sub">
            {team.ticker || ''}
            {team.ticker && team.side ? ' · ' : ''}
            {team.side || ''}
          </p>
        </div>
        {total != null ? (
          <div className="jx-total" aria-label="Your weighted total">
            <span className="jx-total-num">{total}</span>
            <span className="jx-total-label">/ 100</span>
          </div>
        ) : null}
      </header>

      {submitted ? (
        <div className="jx-submitted-banner">
          <CheckCircle2 size={16} aria-hidden="true" /> Your scorecard is submitted and locked.
        </div>
      ) : null}

      {/* Deliverables inline */}
      <section className="jx-materials">
        {deck?.signedUrl ? (
          <div className="jx-deck">
            <div className="jx-material-label"><FileText size={14} aria-hidden="true" /> Pitch deck</div>
            <iframe className="jx-pdf" src={deck.signedUrl} title="Pitch deck" />
          </div>
        ) : null}
        {thesis ? (
          <div className="jx-thesis">
            <div className="jx-material-label"><FileText size={14} aria-hidden="true" /> Thesis</div>
            {thesis.thesis_text ? (
              <p className="jx-thesis-text">{thesis.thesis_text}</p>
            ) : thesis.signedUrl ? (
              <a className="jx-dl" href={thesis.signedUrl} target="_blank" rel="noopener noreferrer">
                <Download size={14} aria-hidden="true" /> {thesis.file_name || 'Download thesis'}
              </a>
            ) : null}
          </div>
        ) : null}
        {(model || exhibits.length) ? (
          <div className="jx-files">
            {model?.signedUrl ? (
              <a className="jx-dl" href={model.signedUrl} target="_blank" rel="noopener noreferrer">
                <Download size={14} aria-hidden="true" /> {model.file_name || 'Valuation model'}
              </a>
            ) : null}
            {exhibits.map((e) =>
              e.signedUrl ? (
                <a key={e.id} className="jx-dl" href={e.signedUrl} target="_blank" rel="noopener noreferrer">
                  <Download size={14} aria-hidden="true" /> {e.file_name || 'Exhibit'}
                </a>
              ) : null,
            )}
          </div>
        ) : null}
      </section>

      {/* Rubric */}
      <section className="jx-rubric">
        <h2 className="jx-section">Score</h2>
        {criteria.map((c) => {
          const val = scores[c.id];
          return (
            <div className="jx-crit" key={c.id}>
              <div className="jx-crit-head">
                <span className="jx-crit-label">{c.label}</span>
                <span className="jx-crit-weight">×{c.weight}</span>
              </div>
              {c.description ? <p className="jx-crit-desc">{c.description}</p> : null}
              <div className="jx-crit-input">
                <input
                  type="range"
                  min="0"
                  max={c.max_score}
                  step="1"
                  value={val ?? 0}
                  onChange={(e) => onScore(c.id, Number(e.target.value))}
                  disabled={ro}
                  aria-label={`${c.label} score`}
                />
                <input
                  type="number"
                  className="jx-num"
                  min="0"
                  max={c.max_score}
                  value={val ?? ''}
                  onChange={(e) => onScore(c.id, e.target.value === '' ? null : Number(e.target.value))}
                  disabled={ro}
                  aria-label={`${c.label} score value`}
                />
                <span className="jx-crit-max">/ {c.max_score}</span>
                {savingId === c.id ? <Loader2 size={13} className="jx-spin" aria-hidden="true" /> : null}
              </div>
            </div>
          );
        })}
      </section>

      {/* Comment + submit */}
      <section className="jx-comment">
        <label className="jx-comment-label" htmlFor="jx-comment">
          Overall comment
        </label>
        <textarea
          id="jx-comment"
          className="jx-comment-box"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={ro}
          placeholder="Feedback for the team…"
        />
      </section>

      {error ? <p className="jx-error">{error}</p> : null}
      {!submitted ? (
        <button type="button" className="jx-submit" onClick={submit} disabled={submitting}>
          {submitting ? <Loader2 size={16} className="jx-spin" /> : <CheckCircle2 size={16} />} Submit & lock scorecard
        </button>
      ) : null}
    </JudgeShell>
  );
}
