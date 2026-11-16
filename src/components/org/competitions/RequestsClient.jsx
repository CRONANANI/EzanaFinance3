'use client';

import { useState } from 'react';
import { Modal, Textarea } from '@/components/ds';
import { NA } from '@/lib/org-competitions-model';
import { HostToolsNav } from './WorkspaceParts';
import './competitions.css';

const REQ_LABEL = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Declined',
  withdrawn: 'Withdrawn',
};

export function RequestsClient({ competition, initialRequests, canManage }) {
  const [requests, setRequests] = useState(initialRequests || []);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [declining, setDeclining] = useState(null);
  const [note, setNote] = useState('');

  const decide = async (req, decision, decisionNote = null) => {
    setBusyId(req.id);
    setError('');
    const note = decisionNote;
    try {
      const res = await fetch(`/api/org/pitch-competitions/${competition.id}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: req.id, decision, decision_note: note }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'The decision did not save. Try again.');
        return false;
      }
      setRequests((rs) =>
        rs.map((r) => (r.id === req.id ? { ...r, status: decision, decision_note: note } : r)),
      );
      return true;
    } catch {
      setError('Could not connect. Try again.');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const pending = requests.filter((r) => r.status === 'pending');
  const decided = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="pcx-requests">
      <HostToolsNav slug={competition.slug} active="requests" />

      {error ? (
        <p className="tcc-state tcc-state--error" role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}

      <section className="pcx-card-block">
        <h2 className="pcx-block-title">
          Pending <span className="tcc-mono pcx-muted">{pending.length}</span>
        </h2>
        {pending.length === 0 ? (
          <p className="tcc-state">No pending requests.</p>
        ) : (
          <ul className="pcx-req-list">
            {pending.map((r) => (
              <li key={r.id} className="pcx-req">
                <div className="pcx-req-main">
                  <div className="pcx-req-name">{r.team_name}</div>
                  <div className="pcx-req-meta">{r.contact_email || NA}</div>
                  {r.application_thesis ? (
                    <p className="pcx-req-thesis">{r.application_thesis}</p>
                  ) : null}
                  {r.application_deck_url ? (
                    <a
                      className="pcx-link"
                      href={r.application_deck_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Application deck <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                    </a>
                  ) : null}
                  {r.application_note ? <p className="pcx-muted">{r.application_note}</p> : null}
                </div>
                {canManage ? (
                  <div className="pcx-req-actions">
                    <button
                      type="button"
                      className="tcc-textbtn tcc-textbtn--accent"
                      onClick={() => decide(r, 'approved')}
                      disabled={busyId === r.id}
                      aria-label={`Approve ${r.team_name}`}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="tcc-textbtn pcx-danger"
                      onClick={() => {
                        setNote('');
                        setDeclining(r);
                      }}
                      disabled={busyId === r.id}
                      aria-label={`Decline ${r.team_name}`}
                    >
                      Decline
                    </button>
                  </div>
                ) : (
                  <span className="pcx-status">Pending</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {decided.length ? (
        <section className="pcx-card-block">
          <h2 className="pcx-block-title">Decided</h2>
          <ul className="pcx-req-list">
            {decided.map((r) => (
              <li key={r.id} className="pcx-req">
                <div className="pcx-req-main">
                  <div className="pcx-req-name">{r.team_name}</div>
                  <div className="pcx-req-meta">{r.contact_email || NA}</div>
                  {r.decision_note ? <p className="pcx-muted">Note: {r.decision_note}</p> : null}
                </div>
                <span className="pcx-status">{REQ_LABEL[r.status] || r.status}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {declining && (
        <Modal
          open
          onClose={busyId ? undefined : () => setDeclining(null)}
          title="Decline request?"
          size={480}
          className="pcx-dialog"
          footer={
            <>
              <button type="button" className="tcc-textbtn" onClick={() => setDeclining(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="tcc-textbtn pcx-danger"
                disabled={busyId === declining.id}
                onClick={async () => {
                  const ok = await decide(declining, 'rejected', note.trim() || null);
                  if (ok) setDeclining(null);
                }}
              >
                Decline request
              </button>
            </>
          }
        >
          <p className="pcx-confirm">
            {declining.team_name} will be told their request was declined. While registration is
            open their council can ask again.
          </p>
          <Textarea
            id="pcx-decline-note"
            label="Note to the team"
            hint="Optional"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Modal>
      )}
    </div>
  );
}
