'use client';

import { useCallback, useEffect, useState } from 'react';
import './social.css';

function StatusPill({ status }) {
  return <span className={`sc2-status sc2-status--${status}`}>{status}</span>;
}

function MeetingList({ meetings, canRun, onOpen, onCreate }) {
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!title.trim() || creating) return;
    setCreating(true);
    await onCreate(title.trim());
    setTitle('');
    setCreating(false);
  };

  return (
    <div>
      {canRun && (
        <div className="sc2-toolbar">
          <input
            className="sc2-search"
            placeholder="New meeting title… e.g. Q2 Investment Committee"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button type="button" className="sc2-btn sc2-btn--primary" onClick={create} disabled={creating}>
            <i className="bi bi-plus-lg" aria-hidden /> New meeting
          </button>
        </div>
      )}
      {meetings.length === 0 ? (
        <div className="sc2-state">No meetings yet.</div>
      ) : (
        meetings.map((m) => (
          <div key={m.id} className="sc2-meeting-item">
            <div>
              <div style={{ fontWeight: 700 }}>{m.title}</div>
              <div className="sc2-comment-time sc2-num">
                {new Date(m.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <StatusPill status={m.status} />
              <button type="button" className="sc2-btn" onClick={() => onOpen(m.id)}>
                Open
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function MeetingRoom({ meetingId, onBack }) {
  const [meeting, setMeeting] = useState(null);
  const [canRun, setCanRun] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agendaText, setAgendaText] = useState('');
  const [minuteText, setMinuteText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/org/meetings/${meetingId}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMeeting(data.meeting);
        setCanRun(!!data.viewer?.canRun);
      }
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    load();
    // Light polling so spectators see the live agenda/minutes update.
    const id = setInterval(load, 12000);
    return () => clearInterval(id);
  }, [load]);

  const act = async (payload) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/org/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="sc2-state">Loading meeting…</div>;
  if (!meeting) return <div className="sc2-state sc2-error">Meeting not found.</div>;

  const agenda = Array.isArray(meeting.agenda) ? meeting.agenda : [];
  const minutes = Array.isArray(meeting.minutes) ? meeting.minutes : [];

  return (
    <div>
      <div className="sc2-header">
        <div>
          <button type="button" className="sc2-link-btn" onClick={onBack}>
            ← All meetings
          </button>
          <h2 className="sc2-title" style={{ fontSize: '1.4rem' }}>
            {meeting.title} <StatusPill status={meeting.status} />
          </h2>
        </div>
        {canRun && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {meeting.status === 'scheduled' && (
              <button type="button" className="sc2-btn sc2-btn--primary" onClick={() => act({ action: 'start' })} disabled={busy}>
                <i className="bi bi-play-fill" aria-hidden /> Start
              </button>
            )}
            {meeting.status === 'live' && (
              <button type="button" className="sc2-btn" onClick={() => act({ action: 'close' })} disabled={busy}>
                <i className="bi bi-stop-fill" aria-hidden /> Close meeting
              </button>
            )}
          </div>
        )}
      </div>

      {!canRun && meeting.status === 'live' && (
        <div className="sc2-sub" style={{ marginBottom: '1rem' }}>
          You&apos;re spectating this live committee meeting.
        </div>
      )}

      <div className="sc2-meeting-grid">
        <div className="sc2-panel">
          <h3 className="sc2-panel-title">Agenda</h3>
          {agenda.length === 0 ? (
            <div className="sc2-digest-empty">No agenda items yet.</div>
          ) : (
            agenda.map((a) => (
              <div key={a.id} className="sc2-meeting-item">
                <div>
                  {a.ticker && <span className="sc2-tag sc2-tag--ticker">{a.ticker}</span>} {a.label}
                </div>
                {canRun && meeting.status === 'live' && (
                  <div className="sc2-vote-row">
                    {['approve', 'reject', 'defer'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        className="sc2-btn sc2-btn--ghost"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.68rem' }}
                        onClick={() =>
                          act({
                            action: 'record_minute',
                            entry: { type: 'decision', ticker: a.ticker || null, label: a.label, decision: d },
                          })
                        }
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
          {canRun && meeting.status !== 'closed' && (
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
              <input
                className="sc2-search"
                placeholder="Add agenda item (e.g. NVDA — committee review)"
                value={agendaText}
                onChange={(e) => setAgendaText(e.target.value)}
              />
              <button
                type="button"
                className="sc2-btn"
                disabled={busy || !agendaText.trim()}
                onClick={() => {
                  const t = agendaText.trim();
                  const tickerMatch = t.match(/^([A-Z]{1,6})\b/);
                  act({
                    action: 'append_agenda',
                    item: { label: t, ticker: tickerMatch ? tickerMatch[1] : null },
                  });
                  setAgendaText('');
                }}
              >
                Add
              </button>
            </div>
          )}
        </div>

        <div className="sc2-panel">
          <h3 className="sc2-panel-title">Minutes</h3>
          {minutes.length === 0 ? (
            <div className="sc2-digest-empty">No minutes recorded yet.</div>
          ) : (
            minutes.map((m) => (
              <div key={m.id} className="sc2-minute">
                {m.type === 'decision' ? (
                  <>
                    {m.ticker && <span className="sc2-tag sc2-tag--ticker">{m.ticker}</span>}{' '}
                    <strong style={{ textTransform: 'capitalize' }}>{m.decision}</strong> — {m.label}
                  </>
                ) : (
                  m.text
                )}
                <div className="sc2-minute-meta">
                  {m.by ? `${m.by} · ` : ''}
                  {m.at ? new Date(m.at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            ))
          )}
          {canRun && meeting.status === 'live' && (
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
              <input
                className="sc2-search"
                placeholder="Record a note in the minutes…"
                value={minuteText}
                onChange={(e) => setMinuteText(e.target.value)}
              />
              <button
                type="button"
                className="sc2-btn"
                disabled={busy || !minuteText.trim()}
                onClick={() => {
                  act({ action: 'record_minute', entry: { type: 'note', text: minuteText.trim() } });
                  setMinuteText('');
                }}
              >
                Log
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MeetingMode() {
  const [meetings, setMeetings] = useState([]);
  const [canRun, setCanRun] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/org/meetings', { cache: 'no-store' });
      if (res.status === 403) {
        setError('This page is for organizational members only.');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to load meetings.');
        return;
      }
      setMeetings(data.meetings || []);
      setCanRun(!!data.viewer?.canRun);
      setError('');
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (title) => {
    const res = await fetch('/api/org/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const data = await res.json();
      await load();
      if (data.meeting?.id) setOpenId(data.meeting.id);
    }
  };

  if (loading) return <div className="sc2-state">Loading meetings…</div>;
  if (error) return <div className="sc2-state sc2-error">{error}</div>;

  return (
    <div className="sc2-root">
      {!openId && (
        <div className="sc2-header">
          <div>
            <p className="sc2-eyebrow">Team Hub</p>
            <h1 className="sc2-title">Meeting Mode</h1>
            <p className="sc2-sub">Run the investment committee live — agenda, decisions, minutes.</p>
          </div>
        </div>
      )}
      {openId ? (
        <MeetingRoom meetingId={openId} onBack={() => { setOpenId(null); load(); }} />
      ) : (
        <MeetingList meetings={meetings} canRun={canRun} onOpen={setOpenId} onCreate={create} />
      )}
    </div>
  );
}
