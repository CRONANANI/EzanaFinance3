'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Monitor, Radio, Clock, MapPin } from 'lucide-react';
import './competitions.css';

const POLL_MS = 15000;

const ROOM_TONE = { scheduled: 'mut', in_progress: 'pos', running_late: 'warn', done: 'done' };
const ROOM_LABEL = { scheduled: 'Scheduled', in_progress: 'In progress', running_late: 'Running late', done: 'Done' };
const TEAM_NEXT = { upcoming: 'on_deck', on_deck: 'presenting', presenting: 'complete', complete: 'complete' };
const TEAM_LABEL = { upcoming: 'Upcoming', on_deck: 'On deck', presenting: 'Presenting', complete: 'Complete' };
const TEAM_TONE = { upcoming: 'mut', on_deck: 'warn', presenting: 'pos', complete: 'done' };

function fmtTime(iso, offsetMin = 0) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  let h = Number(m[4]);
  let min = Number(m[5]) + (Number(offsetMin) || 0);
  h += Math.floor(min / 60);
  min %= 60;
  h = ((h % 24) + 24) % 24;
  const ap = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(min).padStart(2, '0')} ${ap}`;
}

export function LiveBoardClient({ competition }) {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [projector, setProjector] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/org/pitch-competitions/${competition.id}/live`, { cache: 'no-store' });
      if (!res.ok) {
        setState('error');
        return;
      }
      setData(await res.json());
      setState('ready');
    } catch {
      setState('error');
    }
  }, [competition.id]);

  useEffect(() => {
    load();
    timer.current = setInterval(load, POLL_MS);
    return () => clearInterval(timer.current);
  }, [load]);

  const control = async (payload) => {
    setBusy(true);
    try {
      await fetch(`/api/org/pitch-competitions/${competition.id}/live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const canManage = data?.canManage && !projector;
  const myOrgId = data?.myOrgId;

  // "When am I up?" — my team currently on deck or presenting.
  const myAlert = (() => {
    if (!data) return null;
    for (const rd of data.board || []) {
      for (const rm of rd.rooms || []) {
        for (const t of rm.teams || []) {
          if (t.org_id === myOrgId && (t.presentation_status === 'on_deck' || t.presentation_status === 'presenting')) {
            return { team: t, room: rm };
          }
        }
      }
    }
    return null;
  })();

  return (
    <div className={`pcx-page ${projector ? 'pcx-projector' : ''}`}>
      {!projector ? (
        <Link href={`/org-competitions/${competition.slug}`} className="pcx-back">
          <ArrowLeft size={15} /> {competition.name}
        </Link>
      ) : null}

      <header className="pcx-cc-head pcx-cc-title-row" style={{ justifyContent: 'space-between' }}>
        <div className="pcx-cc-title-row">
          <Radio size={18} aria-hidden="true" className="pcx-live-dot" />
          <h1 className="pcx-h1">Live board</h1>
          <span className="pcx-muted">updates every 15s</span>
        </div>
        <button type="button" className="pcx-btn" onClick={() => setProjector((p) => !p)}>
          <Monitor size={14} /> {projector ? 'Exit projector' : 'Projector mode'}
        </button>
      </header>

      {myAlert ? (
        <div className="pcx-live-alert">
          You’re {myAlert.team.presentation_status === 'presenting' ? 'presenting now' : 'on deck'} — {myAlert.team.team_name} in {myAlert.room.name}
        </div>
      ) : null}

      {state === 'loading' && <div className="pcx-empty pcx-empty--sm">Loading the board…</div>}
      {state === 'error' && <div className="pcx-empty pcx-empty--sm">Could not load the board.</div>}

      {state === 'ready' &&
        (data.board || []).map((rd) => (
          <section key={rd.id} className="pcx-live-round">
            <h2 className="pcx-block-title">{rd.name}</h2>
            {rd.rooms.length === 0 ? (
              <p className="pcx-muted">No rooms.</p>
            ) : (
              <div className="pcx-live-rooms">
                {rd.rooms.map((rm) => (
                  <div key={rm.id} className={`pcx-live-room ${rm.live_status === 'done' ? 'is-done' : ''}`}>
                    <div className="pcx-live-room-head">
                      <span className="pcx-live-room-name">{rm.name}</span>
                      <span className={`pcx-pill pcx-pill--${ROOM_TONE[rm.live_status]}`}>{ROOM_LABEL[rm.live_status]}</span>
                    </div>
                    <div className="pcx-live-room-meta">
                      {rm.starts_at ? (
                        <span><Clock size={12} aria-hidden="true" /> {fmtTime(rm.starts_at, rm.running_offset_min)}{rm.running_offset_min ? ` (+${rm.running_offset_min}m)` : ''}</span>
                      ) : null}
                      {rm.location ? <span><MapPin size={12} aria-hidden="true" /> {rm.location}</span> : null}
                    </div>

                    <ul className="pcx-live-teams">
                      {rm.teams.length === 0 ? <li className="pcx-muted">No teams</li> : null}
                      {rm.teams.map((t) => (
                        <li key={t.id} className={`pcx-live-team is-${t.presentation_status} ${t.org_id === myOrgId ? 'is-mine' : ''}`}>
                          <span className="pcx-live-team-name">
                            {t.team_name}
                            {t.org_id === myOrgId ? <span className="pcx-you">You</span> : null}
                          </span>
                          <span className={`pcx-live-team-status pcx-${TEAM_TONE[t.presentation_status]}`}>{TEAM_LABEL[t.presentation_status]}</span>
                          {canManage && t.presentation_status !== 'complete' ? (
                            <button type="button" className="pcx-btn pcx-btn--sm" disabled={busy} onClick={() => control({ action: 'team', team_id: t.id, presentation_status: TEAM_NEXT[t.presentation_status] })}>
                              → {TEAM_LABEL[TEAM_NEXT[t.presentation_status]]}
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>

                    {canManage ? (
                      <div className="pcx-live-controls">
                        {['scheduled', 'in_progress', 'running_late', 'done'].map((s) => (
                          <button key={s} type="button" className={`pcx-btn pcx-btn--sm ${rm.live_status === s ? 'pcx-btn--primary' : ''}`} disabled={busy} onClick={() => control({ action: 'room', room_id: rm.id, live_status: s })}>
                            {ROOM_LABEL[s]}
                          </button>
                        ))}
                        {rm.live_status === 'running_late' ? (
                          <label className="pcx-live-offset">
                            +min
                            <input
                              type="number"
                              min="0"
                              className="pcx-input pcx-input--num"
                              defaultValue={rm.running_offset_min}
                              onBlur={(e) => control({ action: 'room', room_id: rm.id, running_offset_min: Number(e.target.value) })}
                            />
                          </label>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
    </div>
  );
}
