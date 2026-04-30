'use client';

import { useState, useEffect } from 'react';
import './copy-request-button.css';

/**
 * Request to copy the viewed user's portfolio (no trade replication — intent only).
 */
export default function CopyRequestButton({ targetUserId }) {
  const [state, setState] = useState('loading');
  const [errorMsg, setErrorMsg] = useState(null);
  const [requestRow, setRequestRow] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const [reqRes, actRes] = await Promise.all([
          fetch('/api/community/copy-request'),
          fetch('/api/community/copy-request/active'),
        ]);
        const reqData = await reqRes.json();
        const actData = actRes.ok ? await actRes.json() : { copying: [] };
        if (cancelled) return;

        const copyingThis =
          Array.isArray(actData.copying) &&
          actData.copying.some((c) => c.target_user_id === targetUserId);
        if (copyingThis) {
          setState('approved');
          return;
        }

        const found = (reqData.outgoing || []).find((r) => r.target_user_id === targetUserId);
        if (found) {
          setRequestRow(found);
          if (found.status === 'pending') setState('pending');
          else if (found.status === 'approved') setState('approved');
          else if (found.status === 'rejected') setState('cooldown');
          else setState('idle');
        } else {
          setState('idle');
        }
      } catch {
        if (!cancelled) setState('idle');
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [targetUserId]);

  const handleRequest = async () => {
    setState('requesting');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/community/copy-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to send request');
        setState('error');
        return;
      }
      setRequestRow(data.request);
      setState('pending');
    } catch (e) {
      setErrorMsg(e.message);
      setState('error');
    }
  };

  const handleWithdraw = async () => {
    if (!requestRow?.id) return;
    setState('requesting');
    try {
      const res = await fetch('/api/community/copy-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestRow.id, action: 'withdraw' }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed');
        setState('error');
        return;
      }
      setRequestRow(null);
      setState('idle');
    } catch (e) {
      setErrorMsg(e.message);
      setState('error');
    }
  };

  if (state === 'loading') {
    return (
      <button type="button" disabled className="profile-copy-btn profile-copy-btn-loading">
        <i className="bi bi-arrow-clockwise" aria-hidden /> Loading…
      </button>
    );
  }

  if (state === 'pending') {
    return (
      <button
        type="button"
        onClick={handleWithdraw}
        className="profile-copy-btn profile-copy-btn-pending"
        title="Click to withdraw"
      >
        <i className="bi bi-clock" aria-hidden /> Request Pending
      </button>
    );
  }

  if (state === 'approved') {
    return (
      <button type="button" disabled className="profile-copy-btn profile-copy-btn-approved">
        <i className="bi bi-check-circle-fill" aria-hidden /> Copying
      </button>
    );
  }

  if (state === 'cooldown') {
    return (
      <button
        type="button"
        disabled
        className="profile-copy-btn profile-copy-btn-cooldown"
        title="You can request again after 30 days"
      >
        <i className="bi bi-x-circle" aria-hidden /> Request Declined
      </button>
    );
  }

  if (state === 'error') {
    return (
      <div className="profile-copy-error">
        <button
          type="button"
          onClick={() => {
            setErrorMsg(null);
            setState('idle');
          }}
          className="profile-copy-btn profile-copy-btn-error"
        >
          <i className="bi bi-exclamation-triangle" aria-hidden /> {errorMsg || 'Try Again'}
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={handleRequest} className="profile-copy-btn">
      <i className="bi bi-arrow-repeat" aria-hidden /> Request to Copy
    </button>
  );
}
