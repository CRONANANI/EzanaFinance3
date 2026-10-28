'use client';

import { useCallback, useEffect, useState } from 'react';
import { orgRequest } from '@/lib/org-request';
import { NA } from '@/lib/org-display';
import './cohort2.css';

function StatStrip({ stats }) {
  const tiles = [
    { label: 'Enrolled', value: stats?.enrolled ?? NA },
    {
      label: 'Avg completion',
      value: stats?.avg_completion_pct == null ? NA : `${stats.avg_completion_pct}%`,
    },
    { label: 'Fully onboarded', value: stats?.fully_onboarded ?? NA },
    { label: 'Blocked', value: stats?.blocked ?? NA, warn: (stats?.blocked ?? 0) > 0 },
  ];
  return (
    <div className="c2-stats">
      {tiles.map((t) => (
        <div key={t.label} className={`c2-stat ${t.warn ? 'c2-stat--warn' : ''}`}>
          <div className="c2-stat-label">{t.label}</div>
          <div className="c2-stat-value">{t.value}</div>
        </div>
      ))}
    </div>
  );
}

export function OnboardingChecklist({ cohortId, canManage, onCount }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openTask, setOpenTask] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newGate, setNewGate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    if (!cohortId) return;
    try {
      const res = await fetch(`/api/org/cohorts/${cohortId}/onboarding`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Failed to load onboarding.');
        return;
      }
      setData(json);
      setError('');
      onCount?.(json.members?.length || 0);
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, [cohortId, onCount]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const addTask = async () => {
    if (!newTitle.trim() || busy) return;
    setBusy(true);
    setActionError('');
    try {
      await orgRequest(`/api/org/cohorts/${cohortId}/onboarding`, {
        method: 'POST',
        json: { title: newTitle, is_gate: newGate },
      });
      // Only clear the inputs once the write actually persisted.
      setNewTitle('');
      setNewGate(false);
      await load();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteTask = async (taskId) => {
    if (busy) return;
    if (!window.confirm('Remove this onboarding task?')) return;
    setBusy(true);
    setActionError('');
    try {
      await orgRequest(`/api/org/cohorts/${cohortId}/onboarding?task_id=${taskId}`, {
        method: 'DELETE',
      });
      await load();
    } catch (e) {
      setActionError(e.message);
      // Refetch so the task list matches what actually persisted.
      await load();
    } finally {
      setBusy(false);
    }
  };

  const toggleComplete = async (assignmentId, memberId, done) => {
    if (busy) return;
    setBusy(true);
    setActionError('');
    try {
      await orgRequest(`/api/org/cohorts/${cohortId}/onboarding`, {
        method: 'POST',
        json: {
          action: done ? 'uncomplete' : 'complete',
          assignment_id: assignmentId,
          member_id: memberId,
        },
      });
      await load();
    } catch (e) {
      setActionError(e.message);
      // Checkbox is driven by server data; refetch to roll it back on failure.
      await load();
    } finally {
      setBusy(false);
    }
  };

  const setMentor = async (memberId, mentorId) => {
    if (busy) return;
    setBusy(true);
    setActionError('');
    try {
      await orgRequest(`/api/org/cohorts/${cohortId}/lifecycle`, {
        method: 'PATCH',
        json: { member_id: memberId, mentor_member_id: mentorId || null },
      });
      await load();
    } catch (e) {
      setActionError(e.message);
      // Select value is driven by server data; refetch to roll it back on failure.
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="c2-state">Loading onboarding…</div>;
  if (error) return <div className="c2-state c2-error">{error}</div>;

  const { tasks = [], members = [], seniors = [] } = data || {};

  return (
    <div>
      <StatStrip stats={data?.stats} />

      {actionError && (
        <p className="org-inline-error" role="alert">
          {actionError}
        </p>
      )}

      {data?.gateEnabled && (
        <div className="c2-note c2-note--warn">
          <i className="bi bi-lock" aria-hidden="true" style={{ verticalAlign: 'middle' }} />{' '}
          Onboarding gate is ON: members must complete gate tasks before submitting a live pitch.
        </div>
      )}

      {members.length === 0 && (
        <div className="c2-note">
          No members are currently onboarding. Provision accepted applicants to populate this track.
        </div>
      )}

      <div className="c2-mentor-cols">
        {/* Left — cohort task progress */}
        <div className="c2-panel">
          <div className="c2-label" style={{ marginTop: 0 }}>
            <i
              className="bi bi-list-check"
              aria-hidden="true"
              style={{ verticalAlign: 'middle' }}
            />{' '}
            Task progress
          </div>
          {tasks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              No onboarding tasks yet.
            </p>
          ) : (
            tasks.map((t) => (
              <div key={t.id} style={{ marginBottom: '0.7rem' }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {t.title}
                    {t.is_gate && (
                      <span
                        className="c2-pill c2-pill--graduating"
                        style={{ marginLeft: '0.4rem' }}
                      >
                        gate
                      </span>
                    )}
                  </span>
                  <span
                    className="c2-num"
                    style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}
                  >
                    {t.done_count}/{t.total}
                  </span>
                </div>
                <div className="c2-funnel-track" style={{ marginTop: '0.3rem' }}>
                  <div
                    className="c2-funnel-fill"
                    style={{ width: `${t.total ? (t.done_count / t.total) * 100 : 0}%` }}
                  />
                </div>
                <button
                  type="button"
                  className="c2-btn c2-btn--sm c2-btn--ghost"
                  style={{ marginTop: '0.3rem' }}
                  onClick={() => setOpenTask(openTask === t.id ? null : t.id)}
                >
                  {openTask === t.id ? 'Hide' : 'Who is outstanding'}
                </button>
                {canManage && (
                  <button
                    type="button"
                    className="c2-btn c2-btn--sm c2-btn--ghost"
                    onClick={() => deleteTask(t.id)}
                    disabled={busy}
                    aria-label="Remove task"
                  >
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                )}
                {openTask === t.id && (
                  <div
                    style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}
                  >
                    {t.outstanding.length === 0
                      ? 'Everyone is done.'
                      : t.outstanding.map((o) => o.display_name).join(', ')}
                  </div>
                )}
              </div>
            ))
          )}

          {canManage && (
            <div
              style={{
                marginTop: '0.8rem',
                borderTop: '1px solid var(--border-primary)',
                paddingTop: '0.6rem',
              }}
            >
              <input
                className="c2-input"
                style={{ width: '100%' }}
                placeholder="New onboarding task"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  margin: '0.5rem 0',
                  fontSize: '0.82rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={newGate}
                  onChange={(e) => setNewGate(e.target.checked)}
                />
                Gate task (blocks live pitch)
              </label>
              <button
                type="button"
                className="c2-btn c2-btn--primary"
                onClick={addTask}
                disabled={busy}
              >
                <i className="bi bi-plus-lg" aria-hidden="true" /> Add task
              </button>
            </div>
          )}
        </div>

        {/* Right — per-member */}
        <div className="c2-panel">
          <div className="c2-label" style={{ marginTop: 0 }}>
            Members
          </div>
          {members.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              No onboarding members.
            </p>
          ) : (
            members.map((m) => (
              <div
                key={m.id}
                style={{
                  borderBottom: '1px solid var(--border-primary)',
                  paddingBottom: '0.6rem',
                  marginBottom: '0.6rem',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <b style={{ color: 'var(--text-primary)' }}>{m.display_name}</b>
                  <span
                    className="c2-num"
                    style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                  >
                    {m.completed_count} of {m.task_total}
                  </span>
                </div>
                <div
                  style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.35rem' }}
                >
                  {m.blocked && (
                    <span className="c2-pill c2-pill--blocked">
                      <i className="bi bi-lock" aria-hidden="true" /> blocked
                    </span>
                  )}
                  <span className="c2-chip">mentor: {m.mentor_name || 'none'}</span>
                  {!m.user_linked && <span className="c2-chip">account pending</span>}
                </div>
                {tasks.length > 0 && (
                  <div style={{ marginTop: '0.4rem' }}>
                    {tasks.map((t) => {
                      const done = m.completed_assignment_ids.includes(t.assignment_id);
                      const canToggle = (canManage || false) && m.user_linked && !busy;
                      return (
                        <label
                          key={t.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.8rem',
                            opacity: canToggle ? 1 : 0.6,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={done}
                            disabled={!canToggle}
                            onChange={() => toggleComplete(t.assignment_id, m.id, done)}
                          />
                          {done ? <i className="bi bi-check-lg" aria-hidden="true" /> : null}
                          {t.title}
                          {t.is_gate ? ' (gate)' : ''}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mentor pairing */}
      <div className="c2-panel" style={{ marginTop: '1rem' }}>
        <div className="c2-label" style={{ marginTop: 0 }}>
          <i className="bi bi-diagram-2" aria-hidden="true" style={{ verticalAlign: 'middle' }} />{' '}
          Mentor pairing
        </div>
        <div className="c2-mentor-cols">
          <div>
            <div
              style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}
            >
              New members
            </div>
            {members.map((m) => (
              <div key={m.id} className="c2-card-row" style={{ justifyContent: 'space-between' }}>
                <span>{m.display_name}</span>
                <select
                  className="c2-select"
                  value={m.mentor_member_id || ''}
                  disabled={!canManage || busy}
                  onChange={(e) => setMentor(m.id, e.target.value)}
                >
                  <option value="">mentor</option>
                  {seniors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.display_name} ({s.mentee_count})
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div>
            <div
              style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}
            >
              Senior load
            </div>
            {seniors.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No seniors available.
              </p>
            ) : (
              seniors.map((s) => (
                <div key={s.id} className="c2-card-row" style={{ justifyContent: 'space-between' }}>
                  <span>
                    {s.display_name}
                    <span style={{ color: 'var(--text-muted)' }}>
                      {' '}
                      · {s.title || s.role?.replace('_', ' ')}
                    </span>
                  </span>
                  <span className="c2-num" style={{ color: 'var(--text-muted)' }}>
                    {s.mentee_count} mentee{s.mentee_count === 1 ? '' : 's'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
