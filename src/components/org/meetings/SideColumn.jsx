'use client';

import Link from 'next/link';
import { stripDemoLabel } from '@/lib/org-display';
import {
  briefOf,
  categoryLabel,
  fmtDay,
  fmtTime,
  isCompleted,
  sessionStatusLabel,
  sessionsToShow,
  sortPast,
} from '@/lib/org-meetings-model';
import { Skel, SectionError } from '@/components/org/command-center/parts';

const PIPELINE = '/org-team-hub/pitches';

function Side({ id, title, aside, children }) {
  return (
    <section className="tcc-section omt-sidesec" aria-labelledby={id}>
      <div className="tcc-head">
        <h2 className="tcc-title omt-sidetitle" id={id}>
          {title}
        </h2>
        {aside ? <div className="tcc-head__aside">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Lines({ n = 4 }) {
  return (
    <div className="omt-skel" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <Skel key={i} w={`${92 - i * 10}%`} h={12} />
      ))}
    </div>
  );
}

export function SideColumn({
  status,
  data,
  meetings,
  next,
  now,
  canCreate,
  onOpen,
  onNew,
  onShowPast,
  onRetry,
}) {
  const loading = status === 'loading';
  const failed = status === 'error';
  const pitchesById = new Map((data?.pitches || []).map((p) => [p.id, p]));
  const waiting = meetings
    .filter(
      (m) =>
        !isCompleted(m) &&
        m.replies?.mine === 'pending' &&
        m.scheduled_at &&
        Date.parse(m.scheduled_at) >= now,
    )
    .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at));
  const recent = sortPast(meetings.filter(isCompleted)).slice(0, 3);
  const sessions = sessionsToShow(data?.sessions || []);

  return (
    <aside className="omt-side" aria-label="Next meeting, replies and committee sessions">
      <Side id="omt-brief" title="Next meeting">
        {loading ? (
          <Lines />
        ) : failed ? (
          <SectionError message="Not available." onRetry={onRetry} />
        ) : !next ? (
          <p className="tcc-state">
            <span>No upcoming meetings.</span>
            {canCreate && (
              <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onNew}>
                New meeting
              </button>
            )}
          </p>
        ) : (
          <div className="omt-brief">
            <button type="button" className="omt-brief__title" onClick={() => onOpen(next.id)}>
              {stripDemoLabel(next.title)}
            </button>
            {briefOf(next, { eligible: data?.eligible_voters || 0, pitchesById }).map((s, i) => (
              <p key={i} className="omt-brief__line">
                {s}
              </p>
            ))}
          </div>
        )}
      </Side>

      <Side
        id="omt-waiting"
        title="Waiting on your reply"
        aside={
          !loading && !failed && waiting.length > 0 ? (
            <span className="tcc-mono tcc-meta">{waiting.length}</span>
          ) : null
        }
      >
        {loading ? (
          <Lines n={3} />
        ) : failed ? (
          <p className="tcc-state">
            <span>Not available.</span>
          </p>
        ) : waiting.length === 0 ? (
          <p className="tcc-state">
            <span>Nothing waiting on you.</span>
          </p>
        ) : (
          <ul className="omt-siderows">
            {waiting.slice(0, 4).map((m) => (
              <li key={m.id}>
                <button type="button" className="omt-siderow" onClick={() => onOpen(m.id)}>
                  <span className="omt-siderow__title">{stripDemoLabel(m.title)}</span>
                  <span className="omt-siderow__meta tcc-mono">
                    {fmtDay(m.scheduled_at)} {fmtTime(m.scheduled_at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Side>

      <Side id="omt-sessions" title="Committee sessions">
        <p className="omt-foot omt-foot--top">From the Pitch Pipeline. Read only here.</p>
        {loading ? (
          <Lines n={3} />
        ) : failed ? (
          <p className="tcc-state">
            <span>Not available.</span>
          </p>
        ) : sessions.length === 0 ? (
          <p className="tcc-state">
            <span>No committee sessions scheduled.</span>
            <Link href={PIPELINE} className="tcc-link">
              Open Pitch Pipeline <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </p>
        ) : (
          <>
            <ul className="omt-siderows">
              {sessions.map((s) => (
                <li key={s.id} className="omt-session">
                  <span className="omt-siderow__title">
                    <span className="tcc-mono">{s.meets_at ? fmtDay(s.meets_at) : 'No date'}</span>
                    <span
                      className={
                        s.status === 'in_session'
                          ? 'tcc-pos'
                          : s.status === 'closed'
                            ? 'tcc-na'
                            : ''
                      }
                    >
                      {sessionStatusLabel(s.status)}
                    </span>
                  </span>
                  <span className="omt-siderow__meta">
                    {s.ballot_type === 'blind' ? 'Blind ballot' : 'Open ballot'}
                    {s.threshold === 'supermajority' ? ', supermajority' : ', simple majority'}
                  </span>
                  {s.pitches?.length > 0 ? (
                    <span className="omt-session__pitches">
                      {s.pitches.slice(0, 6).map((p) => (
                        <Link
                          key={p.id}
                          href={`${PIPELINE}?pitch=${encodeURIComponent(p.id)}`}
                          className="tcc-rowlink tcc-mono omt-session__ticker"
                          title={p.company_name || p.ticker}
                        >
                          {p.ticker}
                        </Link>
                      ))}
                      {s.pitches.length > 6 && (
                        <span className="tcc-meta tcc-mono">+{s.pitches.length - 6}</span>
                      )}
                    </span>
                  ) : (
                    <span className="omt-siderow__meta">No pitches attached</span>
                  )}
                </li>
              ))}
            </ul>
            <Link href={PIPELINE} className="tcc-link omt-sidelink">
              Open Pitch Pipeline <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </>
        )}
      </Side>

      <Side id="omt-recent" title="Recently completed">
        {loading ? (
          <Lines n={3} />
        ) : failed ? (
          <p className="tcc-state">
            <span>Not available.</span>
          </p>
        ) : recent.length === 0 ? (
          <p className="tcc-state">
            <span>No completed meetings yet.</span>
          </p>
        ) : (
          <>
            <ul className="omt-siderows">
              {recent.map((m) => (
                <li key={m.id}>
                  <button type="button" className="omt-siderow" onClick={() => onOpen(m.id)}>
                    <span className="omt-siderow__title">{stripDemoLabel(m.title)}</span>
                    <span className="omt-siderow__meta">
                      <span className="tcc-mono">{fmtDay(m.scheduled_at || m.ended_at)}</span>{' '}
                      {categoryLabel(m.category)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent omt-sidelink"
              onClick={onShowPast}
            >
              All completed meetings <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
          </>
        )}
      </Side>
    </aside>
  );
}
