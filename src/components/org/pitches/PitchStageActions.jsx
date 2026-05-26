'use client';

import { useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { getMemberByEmail } from '@/lib/orgMockData';

export function PitchStageActions({ pitch, onRefresh }) {
  const { orgData } = useOrg();
  const viewer = getMemberByEmail(orgData?.member?.email) || {
    role: 'analyst',
    id: 'm10',
    team_id: 't7',
  };
  const [note, setNote] = useState('');
  const [meetingAt, setMeetingAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [busy, setBusy] = useState(false);

  if (!pitch || pitch.is_archived) return null;

  const transition = async (to_stage, extra = {}) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/org/pitches/${pitch.id}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_stage,
          note,
          committee_meeting_at: meetingAt || undefined,
          research_due_at: dueAt || undefined,
          ...extra,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onRefresh?.(data.pitch);
      setNote('');
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const recordDecision = async (decision) => {
    const rationale = note.trim() || window.prompt('Decision rationale (required):');
    if (!rationale) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/org/pitches/${pitch.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, decision_rationale: rationale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onRefresh?.(data.pitch);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const actions = [];

  if (pitch.stage === 'idea' && ['portfolio_manager', 'executive'].includes(viewer.role)) {
    actions.push(
      <button
        key="approve"
        type="button"
        className="op-btn"
        disabled={busy}
        onClick={() => transition('research_approved', { research_due_at: dueAt || undefined })}
      >
        Approve research
      </button>,
      <button
        key="reject"
        type="button"
        className="op-btn op-btn--ghost"
        disabled={busy}
        onClick={() => transition('rejected')}
      >
        Reject idea
      </button>,
    );
  }

  if (pitch.stage === 'research_in_progress' && pitch.analyst_member_id === viewer.id) {
    actions.push(
      <button
        key="pm"
        type="button"
        className="op-btn"
        disabled={busy || pitch.deliverable_count < 1}
        onClick={() => transition('pm_review')}
      >
        Submit for PM review
      </button>,
    );
  }

  if (pitch.stage === 'pm_review' && ['portfolio_manager', 'executive'].includes(viewer.role)) {
    actions.push(
      <button
        key="rev"
        type="button"
        className="op-btn op-btn--ghost"
        disabled={busy}
        onClick={() => transition('research_in_progress')}
      >
        Request revisions
      </button>,
      <button
        key="sched"
        type="button"
        className="op-btn"
        disabled={busy || !meetingAt}
        onClick={() => transition('committee_scheduled')}
      >
        Schedule committee
      </button>,
    );
  }

  if (pitch.stage === 'committee_scheduled' && viewer.role === 'executive') {
    actions.push(
      <button
        key="vote"
        type="button"
        className="op-btn"
        disabled={busy}
        onClick={() => transition('committee_vote')}
      >
        Open voting
      </button>,
    );
  }

  if (pitch.stage === 'committee_vote' && viewer.role === 'executive') {
    actions.push(
      <button
        key="acc"
        type="button"
        className="op-btn"
        disabled={busy}
        onClick={() => recordDecision('accepted')}
      >
        Accept
      </button>,
      <button
        key="rej"
        type="button"
        className="op-btn op-btn--ghost"
        disabled={busy}
        onClick={() => recordDecision('rejected')}
      >
        Reject
      </button>,
      <button
        key="watch"
        type="button"
        className="op-btn op-btn--ghost"
        disabled={busy}
        onClick={() => recordDecision('watchlist')}
      >
        Watchlist
      </button>,
    );
  }

  if (!actions.length) return null;

  return (
    <div className="op-stage-actions">
      <h3>Actions</h3>
      {(pitch.stage === 'pm_review' || pitch.stage === 'idea') && (
        <>
          <input
            className="op-search"
            placeholder="Note / rationale"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ marginBottom: 8, width: '100%' }}
          />
          {pitch.stage === 'idea' && (
            <input
              type="date"
              className="op-search"
              value={dueAt ? dueAt.slice(0, 10) : ''}
              onChange={(e) => setDueAt(e.target.value ? `${e.target.value}T23:59:00Z` : '')}
              style={{ marginBottom: 8, width: '100%' }}
              aria-label="Research due date"
            />
          )}
        </>
      )}
      {pitch.stage === 'pm_review' && (
        <input
          type="datetime-local"
          className="op-search"
          value={meetingAt}
          onChange={(e) => setMeetingAt(e.target.value)}
          style={{ marginBottom: 8, width: '100%' }}
        />
      )}
      <div className="op-action-row">{actions}</div>
    </div>
  );
}
