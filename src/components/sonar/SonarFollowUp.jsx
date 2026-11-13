'use client';

/**
 * SonarFollowUp (Sonar research workspace, Nov 13 2026): "Ask a follow-up question", its own
 * card under the board. A follow-up is a new standard research run carrying a bounded context
 * from this answer (followUpContext, about 1,800 characters, never the conversation), and the
 * server replaces it with the stored parent when the reader owns one. A file can be attached:
 * its text is read on the server for that one run and never stored. Above the composer, "In
 * this session" lists the answers asked so far; choosing one shows it again from memory.
 * Styles: sonar-follow-up.css (sfu-).
 */
import { useId, useRef, useState } from 'react';
import { checkAttachment, FOLLOWUP_MAX_CHARS } from '@/lib/sonar/workspace';
import { useSonarPlan } from './useSonarPlan';
import { useSessionThread } from './session-thread';
import './sonar-follow-up.css';

const MODE = { quick: 'Quick ping', standard: 'Standard research', deep: 'Deep research' };
const time = (t) =>
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(t));

/**
 * context      followUpContext() of this answer
 * parentRunId  the research run this answers, when there is one
 * onAsk(q, extra)  the host's standard research path; extra = { followUp, attachment? }
 * onRestore(entry) shows a session entry again (no request); omit to hide the list
 * currentId    this answer's session entry id (marked in the list)
 */
export function SonarFollowUp({
  context,
  parentRunId = null,
  onAsk,
  onRestore = null,
  currentId = null,
}) {
  const id = useId();
  const fileRef = useRef(null);
  const plan = useSonarPlan();
  const thread = useSessionThread();
  const [q, setQ] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [state, setState] = useState('idle');
  const guest = plan.isGuest;
  if (typeof onAsk !== 'function') return null;

  const pick = async (f) => {
    setFileError(null);
    if (!f) return;
    const check = checkAttachment({ name: f.name, type: f.type, size: f.size });
    if (!check.ok) {
      setFileError(check.error);
      return;
    }
    setFile({ name: f.name, status: 'reading' });
    try {
      const body = new FormData();
      body.append('file', f);
      const res = await fetch('/api/sonar/attachment', {
        method: 'POST',
        body,
        credentials: 'include',
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'That file could not be read.');
      setFile({ name: j.name, text: j.text, clipped: j.clipped, status: 'ready' });
    } catch (e) {
      setFile(null);
      setFileError(e.message);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const question = q.trim().slice(0, FOLLOWUP_MAX_CHARS);
    if (!question || state === 'sending' || file?.status === 'reading') return;
    setState('sending');
    try {
      onAsk(question, {
        followUp: { ...(parentRunId ? { parentRunId } : {}), context },
        ...(file?.status === 'ready' ? { attachment: { name: file.name, text: file.text } } : {}),
      });
      setState('idle');
      setQ('');
      setFile(null);
    } catch {
      setState('error');
    }
  };

  return (
    <section className="sfu" aria-labelledby={`${id}-label`}>
      {onRestore && thread.length >= 2 ? (
        <div className="sfu-thread">
          <h3 className="sfu-thread-head">In this session</h3>
          <ul className="sfu-thread-list">
            {thread.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="sfu-thread-item"
                  aria-current={t.id === currentId ? 'true' : undefined}
                  onClick={() => onRestore(t)}
                >
                  <span className="sfu-thread-q">{t.headline || t.question}</span>
                  <span className="sfu-thread-meta">
                    {MODE[t.mode] || ''} · {time(t.at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <form className="sfu-form" onSubmit={submit}>
        <label id={`${id}-label`} htmlFor={`${id}-q`} className="sfu-label">
          <i className="bi bi-chat-left-text" aria-hidden="true" />
          Ask a follow-up question
        </label>
        <div className="sfu-row">
          <div className="sfu-field">
            <input
              id={`${id}-q`}
              className="sfu-input"
              type="text"
              value={q}
              maxLength={FOLLOWUP_MAX_CHARS}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ask about the assumptions, risks, companies involved, or another part of this analysis"
              aria-describedby={fileError ? `${id}-err` : undefined}
            />
            <button
              type="button"
              className="sfu-attach"
              aria-label="Attach a file"
              title={guest ? 'Sign in to attach a file.' : 'Attach a file'}
              disabled={guest || file?.status === 'reading'}
              onClick={() => fileRef.current?.click()}
            >
              <i className="bi bi-paperclip" aria-hidden="true" />
            </button>
            <input
              ref={fileRef}
              type="file"
              className="sfu-file"
              accept=".pdf,.txt,.md,.csv,application/pdf,text/plain,text/markdown,text/csv"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                pick(e.target.files?.[0] || null);
                e.target.value = '';
              }}
            />
          </div>
          <button
            type="submit"
            className="sfu-ask"
            disabled={!q.trim() || state === 'sending' || file?.status === 'reading'}
            aria-busy={state === 'sending' || undefined}
          >
            <i
              className={`bi ${state === 'sending' ? 'bi-arrow-repeat sfu-spin' : 'bi-send'}`}
              aria-hidden="true"
            />
            Ask
          </button>
        </div>
        {guest ? <p className="sfu-note">Sign in to attach a file.</p> : null}
        {file ? (
          <p className="sfu-chip">
            <i className="bi bi-file-earmark-text" aria-hidden="true" />
            <span>{file.name}</span>
            {file.status === 'reading' ? <span className="sfu-note">Reading</span> : null}
            {file.clipped ? (
              <span className="sfu-note">Long file: only the start is used</span>
            ) : null}
            <button
              type="button"
              className="sfu-chip-x"
              aria-label={`Remove ${file.name}`}
              onClick={() => setFile(null)}
            >
              <i className="bi bi-x" aria-hidden="true" />
            </button>
          </p>
        ) : null}
        {fileError ? (
          <p id={`${id}-err`} className="sfu-error" role="alert">
            {fileError}
          </p>
        ) : null}
        {state === 'error' ? (
          <p className="sfu-error" role="alert">
            That follow-up did not start.{' '}
            <button type="submit" className="sfu-retry">
              Retry
            </button>
          </p>
        ) : null}
      </form>
    </section>
  );
}

export default SonarFollowUp;
