'use client';

/**
 * The "…" menu on every community post, Echo comment, direct message and
 * public profile: Report (with a reason) and Block user. Required by the
 * App Store and Google Play for apps with user-generated content.
 */
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { REPORT_REASONS } from '@/lib/moderation/core';
import './moderation.css';

export default function ContentActionsMenu({
  contentType,
  contentId,
  authorId,
  authorName = 'this member',
  onBlocked,
  className = '',
}) {
  const { user } = useAuth() || {};
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null); // null | 'report' | 'block'
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [state, setState] = useState('idle'); // idle | busy | done | error
  const [msg, setMsg] = useState(null);
  const wrap = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!wrap.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user || !contentId || authorId === user.id) return null;

  const close = () => {
    setMode(null);
    setReason('');
    setDetails('');
    setState('idle');
    setMsg(null);
  };

  const submitReport = async () => {
    if (!reason) return;
    setState('busy');
    try {
      const res = await fetch('/api/moderation/report', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, contentId, reason, details }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not send the report.');
      setState('done');
      setMsg('Thanks. Our team reviews every report.');
    } catch (e) {
      setState('error');
      setMsg(e.message);
    }
  };

  const block = async () => {
    setState('busy');
    try {
      const res = await fetch('/api/moderation/block', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authorId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not block this member.');
      setState('done');
      setMsg(`${authorName} is blocked. You will not see their posts, comments or messages.`);
      onBlocked?.(authorId);
    } catch (e) {
      setState('error');
      setMsg(e.message);
    }
  };

  return (
    <div className={`modm ${className}`.trim()} ref={wrap}>
      <button
        type="button"
        className="modm-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        onClick={() => setOpen((v) => !v)}
      >
        <i className="bi bi-three-dots" aria-hidden="true" />
      </button>
      {open ? (
        <div className="modm-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setMode('report');
            }}
          >
            <i className="bi bi-flag" aria-hidden="true" /> Report
          </button>
          {authorId ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setMode('block');
              }}
            >
              <i className="bi bi-slash-circle" aria-hidden="true" /> Block user
            </button>
          ) : null}
        </div>
      ) : null}

      {mode ? (
        <div className="modm-overlay" onClick={close}>
          <div
            className="modm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modm-title"
            onClick={(e) => e.stopPropagation()}
          >
            {mode === 'report' ? (
              <>
                <h2 id="modm-title" className="modm-title">
                  Report
                </h2>
                {state === 'done' ? (
                  <p className="modm-msg">{msg}</p>
                ) : (
                  <>
                    <fieldset className="modm-reasons">
                      <legend>Why are you reporting this?</legend>
                      {REPORT_REASONS.map((r) => (
                        <label key={r.value}>
                          <input
                            type="radio"
                            name="modm-reason"
                            value={r.value}
                            checked={reason === r.value}
                            onChange={() => setReason(r.value)}
                          />
                          {r.label}
                        </label>
                      ))}
                    </fieldset>
                    <label className="modm-details">
                      Anything else (optional)
                      <textarea
                        maxLength={1000}
                        rows={3}
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                      />
                    </label>
                    {state === 'error' ? <p className="modm-msg">{msg}</p> : null}
                  </>
                )}
                <div className="modm-actions">
                  <button type="button" onClick={close}>
                    {state === 'done' ? 'Close' : 'Cancel'}
                  </button>
                  {state !== 'done' ? (
                    <button
                      type="button"
                      className="modm-primary"
                      disabled={!reason || state === 'busy'}
                      onClick={submitReport}
                    >
                      {state === 'busy' ? 'Sending' : 'Send report'}
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <h2 id="modm-title" className="modm-title">
                  Block {authorName}?
                </h2>
                <p className="modm-msg">
                  {state === 'idle' || state === 'busy'
                    ? 'Their posts, comments and messages will be hidden from you, and neither of you can message the other. You can unblock them later.'
                    : msg}
                </p>
                <div className="modm-actions">
                  <button type="button" onClick={close}>
                    {state === 'done' ? 'Close' : 'Cancel'}
                  </button>
                  {state !== 'done' ? (
                    <button
                      type="button"
                      className="modm-primary"
                      disabled={state === 'busy'}
                      onClick={block}
                    >
                      {state === 'busy' ? 'Blocking' : 'Block'}
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
