'use client';

import { useCallback, useEffect, useState } from 'react';
import './academic.css';

function fmtDue(iso) {
  if (!iso) return 'No due date';
  return `Due ${new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export function AssignmentBoard() {
  const [assignments, setAssignments] = useState([]);
  const [roster, setRoster] = useState([]);
  const [viewer, setViewer] = useState({ canAssign: false, userId: null, types: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ assigned_to: '', title: '', assignment_type: 'pitch', due_date: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/org/assignments', { cache: 'no-store' });
      if (res.status === 403) {
        setError('This page is for organizational members only.');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to load assignments.');
        return;
      }
      setAssignments(data.assignments || []);
      setRoster(data.roster || []);
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

  const assign = async () => {
    if (!form.assigned_to || !form.title.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/org/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, due_date: form.due_date || null }),
      });
      if (res.ok) {
        setForm({ assigned_to: '', title: '', assignment_type: 'pitch', due_date: '' });
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (a, status) => {
    await fetch('/api/org/assignments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id, status }),
    });
    load();
  };

  if (loading) return <div className="ac3-state">Loading assignments…</div>;
  if (error) return <div className="ac3-state ac3-error">{error}</div>;

  const mine = assignments.filter((a) => a.mine);
  const others = assignments.filter((a) => !a.mine);

  const Row = ({ a }) => (
    <div className="ac3-row">
      <div>
        <span className="ac3-strong">{a.title}</span>
        <div className="ac3-meta" style={{ textTransform: 'capitalize' }}>
          {a.assignment_type}
          {viewer.canAssign && !a.mine ? ` · ${a.assignee_name}` : ''} · {fmtDue(a.due_date)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <span className={`ac3-pill ac3-pill--${a.status}`}>{a.status}</span>
        {a.mine && a.status === 'assigned' && (
          <button type="button" className="ac3-btn ac3-btn--ghost" onClick={() => setStatus(a, 'submitted')}>
            Mark submitted
          </button>
        )}
        {viewer.canAssign && a.status === 'submitted' && (
          <button type="button" className="ac3-btn ac3-btn--ghost" onClick={() => setStatus(a, 'graded')}>
            Mark graded
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="ac3-root">
      <div className="ac3-header">
        <div>
          <p className="ac3-eyebrow">Academic</p>
          <h1 className="ac3-title">Assignments</h1>
          <p className="ac3-sub">Faculty-assigned work — pitches, research, coverage, readings.</p>
        </div>
      </div>

      {viewer.canAssign && (
        <div className="ac3-card" style={{ marginBottom: '1.25rem' }}>
          <div className="ac3-label">Assign work</div>
          <div className="ac3-2col" style={{ flexWrap: 'wrap' }}>
            <select
              className="ac3-select"
              value={form.assigned_to}
              onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
            >
              <option value="">Assign to…</option>
              {roster.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name} ({(m.role || '').replace('_', ' ')})
                </option>
              ))}
            </select>
            <select
              className="ac3-select"
              value={form.assignment_type}
              onChange={(e) => setForm((f) => ({ ...f, assignment_type: e.target.value }))}
            >
              {(viewer.types || ['pitch', 'research', 'coverage', 'reading', 'other']).map((t) => (
                <option key={t} value={t} style={{ textTransform: 'capitalize' }}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="ac3-2col" style={{ marginTop: '0.6rem' }}>
            <input
              className="ac3-input"
              placeholder="Title, e.g. Pitch a healthcare name"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <input
              className="ac3-input"
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
            />
          </div>
          <div style={{ marginTop: '0.7rem', textAlign: 'right' }}>
            <button type="button" className="ac3-btn ac3-btn--primary" onClick={assign} disabled={busy}>
              Assign
            </button>
          </div>
        </div>
      )}

      <h3 className="ac3-title" style={{ fontSize: '1rem', margin: '0 0 0.6rem' }}>
        My Assignments
      </h3>
      {mine.length === 0 ? (
        <div className="ac3-state" style={{ padding: '1.25rem' }}>Nothing assigned to you.</div>
      ) : (
        mine.map((a) => <Row key={a.id} a={a} />)
      )}

      {viewer.canAssign && others.length > 0 && (
        <>
          <h3 className="ac3-title" style={{ fontSize: '1rem', margin: '1.5rem 0 0.6rem' }}>
            Team Assignments
          </h3>
          {others.map((a) => (
            <Row key={a.id} a={a} />
          ))}
        </>
      )}
    </div>
  );
}
