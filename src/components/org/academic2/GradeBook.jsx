'use client';

import { useCallback, useEffect, useState } from 'react';
import './academic.css';

const WORK_LABEL = {
  pitch: 'Pitch',
  research_note: 'Research note',
  coverage: 'Coverage',
  participation: 'Participation',
  overall: 'Overall',
};

export function GradeBook() {
  const [grades, setGrades] = useState([]);
  const [roster, setRoster] = useState([]);
  const [workTypes, setWorkTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ student_id: '', work_type: 'pitch', score: '', max_score: '100', feedback: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/org/grades', { cache: 'no-store' });
      if (res.status === 403) {
        setError('This page is for organizational members only.');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to load grades.');
        return;
      }
      setGrades(data.grades || []);
      setRoster(data.roster || []);
      setWorkTypes(data.workTypes || []);
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

  const submit = async () => {
    if (!form.student_id || form.score === '' || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/org/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: form.student_id,
          work_type: form.work_type,
          score: Number(form.score),
          max_score: Number(form.max_score) || 100,
          feedback: form.feedback || null,
        }),
      });
      if (res.ok) {
        setForm({ student_id: '', work_type: 'pitch', score: '', max_score: '100', feedback: '' });
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="ac3-state">Loading grade book…</div>;
  if (error) return <div className="ac3-state ac3-error">{error}</div>;

  return (
    <div className="ac3-root">
      <div className="ac3-header">
        <div>
          <p className="ac3-eyebrow">Academic</p>
          <h1 className="ac3-title">Grade Book</h1>
          <p className="ac3-sub">Score analyst work and leave feedback. Students see only their own.</p>
        </div>
      </div>

      <div className="ac3-card" style={{ marginBottom: '1.25rem' }}>
        <div className="ac3-label">Enter a grade</div>
        <div className="ac3-2col" style={{ flexWrap: 'wrap' }}>
          <select
            className="ac3-select"
            value={form.student_id}
            onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}
          >
            <option value="">Student…</option>
            {roster.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name}
              </option>
            ))}
          </select>
          <select
            className="ac3-select"
            value={form.work_type}
            onChange={(e) => setForm((f) => ({ ...f, work_type: e.target.value }))}
          >
            {(workTypes.length ? workTypes : Object.keys(WORK_LABEL)).map((w) => (
              <option key={w} value={w}>
                {WORK_LABEL[w] || w}
              </option>
            ))}
          </select>
        </div>
        <div className="ac3-2col" style={{ marginTop: '0.6rem' }}>
          <input
            className="ac3-input"
            type="number"
            placeholder="Score"
            value={form.score}
            onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))}
          />
          <input
            className="ac3-input"
            type="number"
            placeholder="Out of"
            value={form.max_score}
            onChange={(e) => setForm((f) => ({ ...f, max_score: e.target.value }))}
          />
        </div>
        <textarea
          className="ac3-textarea"
          style={{ marginTop: '0.6rem' }}
          placeholder="Feedback (optional)"
          value={form.feedback}
          onChange={(e) => setForm((f) => ({ ...f, feedback: e.target.value }))}
          rows={2}
        />
        <div style={{ marginTop: '0.7rem', textAlign: 'right' }}>
          <button type="button" className="ac3-btn ac3-btn--primary" onClick={submit} disabled={busy}>
            Save grade
          </button>
        </div>
      </div>

      <div className="ac3-table-wrap">
        <table className="ac3-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Work</th>
              <th>Score</th>
              <th>Feedback</th>
            </tr>
          </thead>
          <tbody>
            {grades.length === 0 ? (
              <tr>
                <td colSpan={4} className="ac3-meta">No grades yet.</td>
              </tr>
            ) : (
              grades.map((g) => (
                <tr key={g.id}>
                  <td className="ac3-strong">{g.student_name}</td>
                  <td>{WORK_LABEL[g.work_type] || g.work_type}</td>
                  <td className="ac3-num">
                    {g.score == null ? '—' : `${g.score}/${g.max_score ?? 100}`}
                  </td>
                  <td className="ac3-meta">{g.feedback || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
