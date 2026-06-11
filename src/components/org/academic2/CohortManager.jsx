'use client';

import { useCallback, useEffect, useState } from 'react';
import { CohortArchiveView } from './CohortArchiveView';
import './academic.css';

export function CohortManager() {
  const [cohorts, setCohorts] = useState([]);
  const [viewer, setViewer] = useState({ isExecutive: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [termType, setTermType] = useState('semester');
  const [busy, setBusy] = useState(false);
  const [viewArchive, setViewArchive] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/org/cohorts', { cache: 'no-store' });
      if (res.status === 403) {
        setError('This page is for organizational members only.');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to load cohorts.');
        return;
      }
      setCohorts(data.cohorts || []);
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

  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/org/cohorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, term_type: termType, is_current: cohorts.length === 0 }),
      });
      if (res.ok) {
        setName('');
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  const setCurrent = async (cohort) => {
    await fetch('/api/org/cohorts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cohort_id: cohort.id, is_current: true }),
    });
    load();
  };

  const archive = async (cohort) => {
    const ok = window.confirm(
      `Archive "${cohort.name}"?\n\nThis snapshots the fund's current track record (roster, positions, pitch outcomes) for the historical record and graduates members flagged as graduating (they become inactive). This cannot be undone.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/org/cohorts/${cohort.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graduate: true }),
      });
      if (res.ok) await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="ac3-state">Loading cohorts…</div>;
  if (error) return <div className="ac3-state ac3-error">{error}</div>;

  const active = cohorts.filter((c) => !c.archived);
  const archived = cohorts.filter((c) => c.archived);

  return (
    <div className="ac3-root">
      <div className="ac3-header">
        <div>
          <p className="ac3-eyebrow">Academic</p>
          <h1 className="ac3-title">Cohorts</h1>
          <p className="ac3-sub">Academic terms — archive on graduation to preserve track record.</p>
        </div>
      </div>

      {viewer.isExecutive && (
        <div className="ac3-toolbar">
          <input
            className="ac3-input"
            style={{ maxWidth: 260 }}
            placeholder="New cohort, e.g. Fall 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select className="ac3-select" style={{ maxWidth: 150 }} value={termType} onChange={(e) => setTermType(e.target.value)}>
            <option value="semester">Semester</option>
            <option value="quarter">Quarter</option>
            <option value="year">Year</option>
          </select>
          <button type="button" className="ac3-btn ac3-btn--primary" onClick={create} disabled={busy}>
            <i className="bi bi-plus-lg" aria-hidden /> Create cohort
          </button>
        </div>
      )}

      {active.length === 0 ? (
        <div className="ac3-state">No active cohorts yet.</div>
      ) : (
        active.map((c) => (
          <div key={c.id} className="ac3-row">
            <div>
              <span className="ac3-strong">{c.name}</span>{' '}
              {c.is_current && <span className="ac3-pill ac3-pill--current">current</span>}
              <div className="ac3-meta" style={{ textTransform: 'capitalize' }}>
                {c.term_type}
                {c.starts_on ? ` · starts ${c.starts_on}` : ''}
              </div>
            </div>
            {viewer.isExecutive && (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {!c.is_current && (
                  <button type="button" className="ac3-btn ac3-btn--ghost" onClick={() => setCurrent(c)}>
                    Set current
                  </button>
                )}
                <button type="button" className="ac3-btn ac3-btn--danger" onClick={() => archive(c)} disabled={busy}>
                  <i className="bi bi-archive" aria-hidden /> Archive
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {archived.length > 0 && (
        <>
          <h3 className="ac3-title" style={{ fontSize: '1.1rem', margin: '1.5rem 0 0.75rem' }}>
            Archived
          </h3>
          {archived.map((c) => (
            <div key={c.id} className="ac3-row">
              <div>
                <span className="ac3-strong">{c.name}</span>{' '}
                <span className="ac3-pill ac3-pill--archived">archived</span>
                <div className="ac3-meta">
                  {c.archived_at ? new Date(c.archived_at).toLocaleDateString() : ''}
                </div>
              </div>
              <button type="button" className="ac3-btn" onClick={() => setViewArchive(c)}>
                View track record
              </button>
            </div>
          ))}
        </>
      )}

      {viewArchive && <CohortArchiveView cohort={viewArchive} onClose={() => setViewArchive(null)} />}
    </div>
  );
}
