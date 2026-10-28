'use client';

import { useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';

/**
 * Pitch action bar. Advancement is the gate panel's job (PitchGatePanel); this
 * bar carries only the actions the gate panel does not cover: rejecting a pitch
 * and marking a live-portfolio holding exited. PM or executive only.
 */
export function PitchStageActions({ pitch, onRefresh }) {
  const { orgData } = useOrg();
  const member = orgData?.member;
  const viewer = {
    role: member?.role || 'analyst',
    id: member?.id || null,
    team_id: member?.team_id || null,
  };
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // In-portfolio holdings are "accepted" (is_archived) but still act-on-able:
  // managers can mark them exited with a post-mortem. Truly archived
  // (rejected / exited) pitches are read-only.
  const isLivePortfolio = pitch?.stage === 'in_portfolio';
  if (!pitch || (pitch.is_archived && !isLivePortfolio)) return null;

  const isManager = ['portfolio_manager', 'executive'].includes(viewer.role);

  const post = async (url, body) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Request failed');
      onRefresh?.(data.pitch);
      setNote('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const actions = [];

  if (pitch.status === 'active' && isManager && pitch.stage === 'idea') {
    actions.push(
      <button
        key="reject-idea"
        type="button"
        className="op-btn op-btn--ghost"
        disabled={busy || !note.trim()}
        onClick={() => post(`/api/org/pitches/${pitch.id}/stage`, { to_stage: 'rejected', note })}
      >
        Reject idea
      </button>,
    );
  } else if (pitch.status === 'active' && isManager && !isLivePortfolio) {
    actions.push(
      <button
        key="reject-pitch"
        type="button"
        className="op-btn op-btn--ghost"
        disabled={busy || !note.trim()}
        onClick={() => post(`/api/org/pitches/${pitch.id}/advance`, { reject: true, note })}
      >
        Reject pitch
      </button>,
    );
  }

  if (isLivePortfolio && isManager) {
    actions.push(
      <button
        key="exit"
        type="button"
        className="op-btn op-btn--ghost"
        disabled={busy || !note.trim()}
        onClick={() => post(`/api/org/pitches/${pitch.id}/stage`, { to_stage: 'exited', note })}
        title="Requires a post-mortem note"
      >
        Mark exited (post-mortem)
      </button>,
    );
  }

  if (!actions.length) return null;

  return (
    <div className="op-stage-actions">
      <h3>Actions</h3>
      <input
        className="op-search"
        aria-label="Rationale"
        placeholder="Rationale (required)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ marginBottom: 8, width: '100%' }}
      />
      <div className="op-action-row">{actions}</div>
      {error && (
        <p className="op-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
