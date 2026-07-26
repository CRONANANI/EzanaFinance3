'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gavel, MapPin, Clock, ArrowRight, CheckCircle2, CircleDashed, Circle } from 'lucide-react';
import './judge.css';

function fmtTime(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[4]}:${m[5]}`;
}

const STATUS = {
  not_started: { label: 'Not started', Icon: Circle, cls: 'jx-mut' },
  in_progress: { label: 'In progress', Icon: CircleDashed, cls: 'jx-warn' },
  submitted: { label: 'Submitted', Icon: CheckCircle2, cls: 'jx-ok' },
};

export function JudgeLanding({ token }) {
  const [state, setState] = useState('loading'); // loading | error | ready | denied
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/competitions/judge/session?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
        if (!alive) return;
        if (res.status === 401) {
          setState('denied');
          return;
        }
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState('error');
          return;
        }
        setData(json);
        setState('ready');
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  if (state === 'loading') return <JudgeShell><div className="jx-loading">Loading your judging session…</div></JudgeShell>;
  if (state === 'denied')
    return (
      <JudgeShell>
        <div className="jx-denied">
          <Gavel size={30} aria-hidden="true" />
          <h1>This link isn’t valid</h1>
          <p>It may have expired or been revoked. Ask the host organizer for a fresh link.</p>
        </div>
      </JudgeShell>
    );
  if (state === 'error') return <JudgeShell><div className="jx-denied"><p>Something went wrong. Please try again.</p></div></JudgeShell>;

  const { judge, competition, rooms, teams } = data;

  return (
    <JudgeShell>
      <header className="jx-head">
        <div className="jx-badge"><Gavel size={14} aria-hidden="true" /> Judge</div>
        <h1 className="jx-title">{competition?.name}</h1>
        <p className="jx-sub">
          {judge?.full_name}
          {judge?.firm ? ` · ${judge.firm}` : ''}
        </p>
      </header>

      {rooms?.length ? (
        <div className="jx-rooms">
          {rooms.map((r) => (
            <div key={r.id} className="jx-room">
              <span className="jx-room-name">{r.pitch_rounds?.name ? `${r.pitch_rounds.name} · ` : ''}{r.name}</span>
              {r.location ? <span className="jx-room-meta"><MapPin size={12} aria-hidden="true" /> {r.location}</span> : null}
              {r.starts_at ? <span className="jx-room-meta"><Clock size={12} aria-hidden="true" /> {fmtTime(r.starts_at)}</span> : null}
            </div>
          ))}
        </div>
      ) : null}

      <h2 className="jx-section">Teams to score</h2>
      {teams?.length === 0 ? (
        <p className="jx-empty">No teams assigned to your room yet.</p>
      ) : (
        <ul className="jx-teams">
          {teams.map((t) => {
            const s = STATUS[t.status] || STATUS.not_started;
            return (
              <li key={t.id}>
                <Link className="jx-team" href={`/judge/${token}/team/${t.id}`}>
                  <span className="jx-team-main">
                    <span className="jx-team-name">{t.team_name}</span>
                    <span className="jx-team-meta">
                      {t.ticker ? t.ticker : ''}
                      {t.ticker && t.side ? ' · ' : ''}
                      {t.side || ''}
                    </span>
                  </span>
                  <span className={`jx-status ${s.cls}`}>
                    <s.Icon size={14} aria-hidden="true" /> {s.label}
                    {t.myTotal != null ? <span className="jx-team-score">{t.myTotal}</span> : null}
                  </span>
                  <ArrowRight size={16} aria-hidden="true" className="jx-team-arrow" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </JudgeShell>
  );
}

export function JudgeShell({ children }) {
  return (
    <div className="jx-page">
      <div className="jx-container">{children}</div>
    </div>
  );
}
