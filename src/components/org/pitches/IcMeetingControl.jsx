'use client';

import { useCallback, useEffect, useState } from 'react';

const MONO = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' };
const ASSIGNABLE = ['cross_desk_review', 'pitch_scheduled', 'ic_vote'];

/**
 * IC meeting control in the Voting tab. Managers attach a pitch to an IC
 * meeting (satisfies the ic_meeting_assigned gate); executives open the session
 * and close the vote. Reads the org's meetings and never reports a failed write
 * as a success.
 */
export function IcMeetingControl({ pitch, viewer, onRefresh }) {
  const [meetings, setMeetings] = useState([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isManager = ['portfolio_manager', 'executive'].includes(viewer?.role);
  const isExec = viewer?.role === 'executive';

  const loadMeetings = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/org/pitches/ic-meetings', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load IC meetings.');
      setMeetings(data.meetings || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const attached = pitch.ic_meeting_id
    ? meetings.find((m) => m.id === pitch.ic_meeting_id) || null
    : null;
  const openMeetings = meetings.filter((m) => m.status !== 'closed');
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : 'No date set');

  const assign = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/org/pitches/${pitch.id}/ic-meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ic_meeting_id: selected || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not assign the meeting.');
      onRefresh?.();
      await loadMeetings();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const setMeetingStatus = async (status) => {
    if (!attached) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/org/pitches/ic-meetings/${attached.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not update the meeting.');
      await loadMeetings();
      onRefresh?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!isManager) return null;

  const canAssign = pitch.status === 'active' && ASSIGNABLE.includes(pitch.stage);

  return (
    <div className="op-panel op-ic-meeting">
      <h3>IC meeting</h3>

      {attached ? (
        <div className="op-ic-attached">
          <p>
            <span className="op-pill">{attached.status.replace(/_/g, ' ')}</span>{' '}
            <span style={MONO}>{fmtDate(attached.meets_at)}</span>
          </p>
          <p>
            Ballot: {attached.ballot_type} · Quorum:{' '}
            <span style={MONO}>{attached.quorum_pct}%</span>
          </p>
          {isExec && (
            <div className="op-action-row">
              {attached.status === 'scheduled' && (
                <button
                  type="button"
                  className="op-btn"
                  disabled={busy}
                  onClick={() => setMeetingStatus('in_session')}
                >
                  Open session
                </button>
              )}
              {['scheduled', 'in_session'].includes(attached.status) && (
                <button
                  type="button"
                  className="op-btn op-btn--ghost"
                  disabled={busy}
                  onClick={() => setMeetingStatus('closed')}
                >
                  Close vote
                </button>
              )}
            </div>
          )}
        </div>
      ) : canAssign ? (
        openMeetings.length ? (
          <div className="op-ic-assign">
            <label htmlFor="op-ic-meeting-select">Assign to an IC meeting</label>
            <select
              id="op-ic-meeting-select"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Select a meeting</option>
              {openMeetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {fmtDate(m.meets_at)} · {m.status.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <button type="button" className="op-btn" disabled={busy || !selected} onClick={assign}>
              Assign
            </button>
          </div>
        ) : (
          <p className="op-muted">No IC meetings yet. Create one in the IC view of the pipeline.</p>
        )
      ) : (
        <p className="op-muted">This pitch is not ready to be scheduled for the IC.</p>
      )}

      {error && (
        <p className="op-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
