'use client';

import { useState } from 'react';
import { Input, Modal } from '@/components/ds';
import { TextToggle } from '@/components/org/command-center/parts';
import { fmtDateTime } from '@/lib/org-pitch-pipeline-model';
import { say } from './pitch-copy';

/**
 * Schedule a committee meeting (portfolio managers and executives; the route
 * checks again). The ballot type, the threshold and the quorum are fixed
 * here and apply to every pitch on the meeting's agenda.
 */
export function ScheduleMeetingDialog({ act, onClose, onScheduled }) {
  const [form, setForm] = useState({
    meets_at: '',
    ballot_type: 'open',
    threshold: 'simple',
    quorum_pct: '50',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const quorum = Number(form.quorum_pct);
  const quorumBad = !Number.isFinite(quorum) || quorum < 0 || quorum > 100;

  const submit = async () => {
    setError('');
    if (!form.meets_at) return setError('Choose a date and time.');
    if (quorumBad) return setError('Quorum is a share of voters from 0 to 100.');
    setBusy(true);
    const res = await act({ type: 'scheduleMeeting', form });
    setBusy(false);
    if (!res.ok)
      return setError(say(res.error, 'The meeting was not scheduled. Nothing was changed.'));
    onScheduled(fmtDateTime(new Date(form.meets_at).toISOString()));
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Schedule a committee meeting"
      size={520}
      className="opp-dialog"
      footer={
        <>
          <button type="button" className="tcc-textbtn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="tcc-btn" disabled={busy} onClick={submit}>
            Schedule meeting
          </button>
        </>
      }
    >
      <div className="opp-form">
        <Input
          id="opp-meet-at"
          label="Date and time"
          type="datetime-local"
          value={form.meets_at}
          onChange={(e) => set('meets_at', e.target.value)}
        />
        <div className="opp-field">
          <span className="ds-field-label" id="opp-ballot-label">
            Ballot
          </span>
          <div className="tcc-toggles opp-toggles" role="group" aria-labelledby="opp-ballot-label">
            <TextToggle
              pressed={form.ballot_type === 'open'}
              onClick={() => set('ballot_type', 'open')}
            >
              Open
            </TextToggle>
            <TextToggle
              pressed={form.ballot_type === 'blind'}
              onClick={() => set('ballot_type', 'blind')}
            >
              <i className="bi bi-lock" aria-hidden="true" />
              Blind
            </TextToggle>
          </div>
          <span className="ds-field-hint">
            {form.ballot_type === 'blind'
              ? 'Until the meeting closes, members see only how many ballots are in and their own ballot.'
              : 'Every ballot and the running count are visible to the council as they come in.'}
          </span>
        </div>
        <div className="opp-field">
          <span className="ds-field-label" id="opp-threshold-label">
            Threshold
          </span>
          <div
            className="tcc-toggles opp-toggles"
            role="group"
            aria-labelledby="opp-threshold-label"
          >
            <TextToggle
              pressed={form.threshold === 'simple'}
              onClick={() => set('threshold', 'simple')}
            >
              Simple majority
            </TextToggle>
            <TextToggle
              pressed={form.threshold === 'supermajority'}
              onClick={() => set('threshold', 'supermajority')}
            >
              Two thirds
            </TextToggle>
          </div>
          <span className="ds-field-hint">Abstentions count toward quorum only.</span>
        </div>
        <Input
          id="opp-quorum"
          label="Quorum (% of eligible voters)"
          type="number"
          min="0"
          max="100"
          inputMode="numeric"
          value={form.quorum_pct}
          error={quorumBad ? 'Enter a number from 0 to 100.' : undefined}
          onChange={(e) => set('quorum_pct', e.target.value)}
        />
        {error && (
          <p className="opp-error" role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
