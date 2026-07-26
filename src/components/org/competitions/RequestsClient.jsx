'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, X, ExternalLink, Loader2 } from 'lucide-react';
import './competitions.css';

const REQ_TONE = { pending: 'warn', approved: 'pos', rejected: 'mut', withdrawn: 'mut' };

export function RequestsClient({ competition, initialRequests, canManage }) {
  const [requests, setRequests] = useState(initialRequests || []);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const decide = async (req, decision) => {
    setBusyId(req.id);
    setError('');
    try {
      const note =
        decision === 'rejected'
          ? window.prompt('Optional note to the team (why it was declined):') || null
          : null;
      const res = await fetch(`/api/org/pitch-competitions/${competition.id}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: req.id, decision, decision_note: note }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Could not record the decision.');
        return;
      }
      setRequests((rs) => rs.map((r) => (r.id === req.id ? { ...r, status: decision, decision_note: note } : r)));
    } catch {
      setError('Could not connect.');
    } finally {
      setBusyId(null);
    }
  };

  const pending = requests.filter((r) => r.status === 'pending');
  const decided = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="pcx-page">
      <Link href={`/org-competitions/${competition.slug}`} className="pcx-back">
        <ArrowLeft size={15} /> {competition.name}
      </Link>
      <header className="pcx-cc-head">
        <h1 className="pcx-h1">Join requests</h1>
        <p className="pcx-lead">Review councils requesting or applying to enter. Approving provisions their team.</p>
      </header>

      {error ? <p className="pcx-error pcx-error--banner">{error}</p> : null}

      <section className="pcx-card-block">
        <h2 className="pcx-block-title">Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="pcx-muted">No pending requests.</p>
        ) : (
          <ul className="pcx-req-list">
            {pending.map((r) => (
              <li key={r.id} className="pcx-req">
                <div className="pcx-req-main">
                  <div className="pcx-req-name">{r.team_name}</div>
                  <div className="pcx-req-meta">{r.contact_email || '—'}</div>
                  {r.application_thesis ? <p className="pcx-req-thesis">{r.application_thesis}</p> : null}
                  {r.application_deck_url ? (
                    <a className="pcx-link" href={r.application_deck_url} target="_blank" rel="noopener noreferrer">
                      Application deck <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  ) : null}
                  {r.application_note ? <p className="pcx-muted">{r.application_note}</p> : null}
                </div>
                {canManage ? (
                  <div className="pcx-req-actions">
                    <button type="button" className="pcx-btn pcx-btn--primary" onClick={() => decide(r, 'approved')} disabled={busyId === r.id}>
                      {busyId === r.id ? <Loader2 size={14} className="pcx-spin" /> : <Check size={14} />} Approve
                    </button>
                    <button type="button" className="pcx-btn" onClick={() => decide(r, 'rejected')} disabled={busyId === r.id}>
                      <X size={14} /> Decline
                    </button>
                  </div>
                ) : (
                  <span className={`pcx-pill pcx-pill--${REQ_TONE[r.status]}`}>Pending</span>
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
                  <div className="pcx-req-meta">{r.contact_email || '—'}</div>
                  {r.decision_note ? <p className="pcx-muted">Note: {r.decision_note}</p> : null}
                </div>
                <span className={`pcx-pill pcx-pill--${REQ_TONE[r.status] || 'mut'}`}>
                  {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
