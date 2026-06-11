'use client';

import { useEffect, useMemo, useState } from 'react';
import './academic.css';

const WORK_LABEL = {
  pitch: 'Pitch',
  research_note: 'Research note',
  coverage: 'Coverage',
  participation: 'Participation',
  overall: 'Overall',
};

/** Student-facing view — only the caller's own grades + feedback (RLS-enforced). */
export function MyGrades() {
  const [grades, setGrades] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/org/grades', { cache: 'no-store' });
        if (res.status === 403) {
          if (!cancelled) setError('This page is for organizational members only.');
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        setGrades(data.grades || []);
        setUserId(data.viewer?.userId || null);
      } catch {
        if (!cancelled) setError('Could not connect.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // RLS already limits non-executives to their own grades, but filter defensively.
  const mine = useMemo(
    () => grades.filter((g) => !userId || g.student_id === userId),
    [grades, userId],
  );

  const avg = useMemo(() => {
    const pcts = mine
      .filter((g) => g.score != null && g.max_score)
      .map((g) => (Number(g.score) / Number(g.max_score)) * 100);
    if (!pcts.length) return null;
    return pcts.reduce((a, b) => a + b, 0) / pcts.length;
  }, [mine]);

  if (loading) return <div className="ac3-state">Loading your grades…</div>;
  if (error) return <div className="ac3-state ac3-error">{error}</div>;

  return (
    <div className="ac3-root">
      <div className="ac3-header">
        <div>
          <p className="ac3-eyebrow">Academic</p>
          <h1 className="ac3-title">My Grades</h1>
          <p className="ac3-sub">Your scores and faculty feedback.</p>
        </div>
        {avg != null && (
          <div className="ac3-card" style={{ textAlign: 'center' }}>
            <div className="ac3-meta">Average</div>
            <div className="ac3-num ac3-strong" style={{ fontSize: '1.3rem' }}>
              {avg.toFixed(0)}%
            </div>
          </div>
        )}
      </div>

      {mine.length === 0 ? (
        <div className="ac3-state">No grades posted yet.</div>
      ) : (
        mine.map((g) => (
          <div key={g.id} className="ac3-card" style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem' }}>
              <span className="ac3-strong">{WORK_LABEL[g.work_type] || g.work_type}</span>
              <span className="ac3-num ac3-strong" style={{ fontSize: '1.05rem' }}>
                {g.score == null ? '—' : `${g.score}/${g.max_score ?? 100}`}
                {g.letter ? ` (${g.letter})` : ''}
              </span>
            </div>
            {g.feedback && (
              <p className="ac3-meta" style={{ marginTop: '0.4rem', lineHeight: 1.5 }}>
                {g.feedback}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
