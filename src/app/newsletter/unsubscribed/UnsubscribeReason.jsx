'use client';

import { useState } from 'react';

/**
 * Optional, NON-BLOCKING reason capture. The unsubscribe already happened on the
 * one-click GET; this just records why, if the user cares to say. Nothing here
 * gates the unsubscribe.
 */
export function UnsubscribeReason({ token }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!reason.trim() || busy) return;
    setBusy(true);
    try {
      await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reason }),
      });
    } catch {
      /* non-blocking — the unsubscribe already succeeded */
    } finally {
      setBusy(false);
      setSent(true);
    }
  };

  if (sent) return <p className="nl-status-note">Thanks for the feedback.</p>;

  return (
    <form className="nl-status-reason" onSubmit={submit}>
      <label htmlFor="nl-unsub-reason" className="nl-status-reason-label">
        Mind telling us why? (optional)
      </label>
      <textarea
        id="nl-unsub-reason"
        className="nl-status-reason-input"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Too many emails, not relevant, …"
      />
      <button type="submit" className="nl-status-reason-btn" disabled={busy || !reason.trim()}>
        {busy ? 'Sending…' : 'Send feedback'}
      </button>
    </form>
  );
}
