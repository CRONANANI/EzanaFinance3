'use client';

/**
 * "Council learning": the council band of the Learning Center
 * (/learning-center), shown only to council members once their membership is
 * known. The personal hub is unchanged for everyone; this band sits directly
 * under the KPI strip.
 *
 *   strip              learning context: council, your role, cohort, open
 *                      learning work, next due date
 *   Assigned to me     your Reading assignments and council learning items
 *   Onboarding gate    your cohort's checklist with your own completion
 *   My grades          your own Participation and Overall grades
 *   Council path       your council's material, then the default course order
 *   Team progress      managers: assignment completion and the Learning score
 *                      of the council rating (never course progress)
 *   Advisor queue      executives: overdue and submitted work
 *
 * Every figure comes from src/lib/org-learning-model.js over the member's own
 * council records (or the labelled sample, master admin and demo accounts
 * only). Nothing on the band writes.
 */
import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { Tooltip } from '@/components/ds';
import {
  LINKS,
  NA,
  DEFAULT_PATH,
  advisorQueue,
  assignedRows,
  contextFigures,
  fmtDay,
  fmtLearning,
  gradeRows,
  isExecutive,
  isManager,
  onboardingView,
  pathItems,
  roleLabel,
  statusMeta,
  teamRows,
} from '@/lib/org-learning-model';
import './council-learning.css';

/* ── Atoms and states ───────────────────────────────────────────────────── */

function Info({ label, align = 'end' }) {
  return (
    <Tooltip label={label} className={`lh-info lh-info--${align}`}>
      <button type="button" className="lh-info__btn" aria-label={label}>
        <i className="bi bi-info-circle" aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

function Skel({ w = '100%', h = 12 }) {
  return <span className="lh-skel" style={{ width: w, height: h }} aria-hidden="true" />;
}

function Loading({ label, rows = 3 }) {
  return (
    <div className="lcc-skel" aria-busy="true" aria-label={label}>
      {['78%', '62%', '70%', '54%', '66%'].slice(0, rows).map((w) => (
        <span key={w} className="lcc-skel__row">
          <Skel w={16} h={16} />
          <Skel w={w} />
          <Skel w={48} h={10} />
        </span>
      ))}
    </div>
  );
}

function Empty({ children, href, onClick, action }) {
  return (
    <p className="lcc-state">
      <span>{children}</span>
      {href ? (
        <Link href={href} className="lh-link">
          {action}
        </Link>
      ) : onClick ? (
        <button type="button" className="lh-text-btn lh-text-btn--accent" onClick={onClick}>
          {action}
        </button>
      ) : null}
    </p>
  );
}

function Failed({ children, onRetry }) {
  return (
    <p className="lh-error" role="alert">
      <i className="bi bi-exclamation-triangle" aria-hidden="true" />
      <span>{children}</span>
      <button type="button" className="lh-text-btn lh-text-btn--accent" onClick={onRetry}>
        Retry
      </button>
    </p>
  );
}

function Status({ k }) {
  const m = statusMeta(k);
  return (
    <span className="lcc-status">
      <i className={`bi ${m.icon}${m.warn ? ' lcc-warn' : ''}`} aria-hidden="true" />
      {m.label}
    </span>
  );
}

function Col({ id, icon, title, info, aside, busy, children }) {
  const hid = useId();
  return (
    <section
      id={id}
      className="lcc-col"
      aria-labelledby={hid}
      aria-busy={busy || undefined}
      tabIndex={-1}
    >
      <header className="lh-head lh-head--ruled">
        <h3 id={hid} className="lh-title lcc-title">
          <i className={`bi ${icon}`} aria-hidden="true" />
          <span>{title}</span>
          {info ? <Info label={info} align="start" /> : null}
        </h3>
        {aside}
      </header>
      {children}
    </section>
  );
}

/* ── Cards ─────────────────────────────────────────────────────────────── */

function AssignedCard({ state, assigned, onRetry, onPath }) {
  return (
    <Col
      id="lcc-assigned"
      icon="bi-list-check"
      title={assigned ? `Assigned to me (${assigned.open})` : 'Assigned to me'}
      info="Reading assignments given to you and material your council assigned to you, open work first."
      busy={state === 'loading'}
    >
      {state === 'loading' ? (
        <Loading label="Loading your assignments" />
      ) : state === 'error' || !assigned ? (
        <Failed onRetry={onRetry}>Your assignments did not load.</Failed>
      ) : assigned.rows.length === 0 ? (
        <Empty onClick={onPath} action="Open council path">
          Nothing is assigned to you right now.
        </Empty>
      ) : (
        <>
          <ul className="lcc-list">
            {assigned.rows.map((r) => {
              const body = (
                <>
                  <i className={`bi ${r.icon} lcc-list__icon`} aria-hidden="true" />
                  <span className="lh-row-title lcc-list__title">{r.title}</span>
                  <span className="lcc-due">
                    Due <span className="lh-num">{fmtDay(r.due)}</span>
                  </span>
                  <Status k={r.status} />
                </>
              );
              return (
                <li key={r.id}>
                  {r.href && r.external ? (
                    <a className="lcc-row" href={r.href} target="_blank" rel="noopener noreferrer">
                      {body}
                    </a>
                  ) : r.href ? (
                    <Link className="lcc-row" href={r.href}>
                      {body}
                    </Link>
                  ) : (
                    <span className="lcc-row">{body}</span>
                  )}
                </li>
              );
            })}
          </ul>
          {assigned.others > 0 ? (
            <p className="lcc-foot">
              <Link href={LINKS.assignments} className="lh-link">
                <span className="lh-num">{assigned.others}</span> other open{' '}
                {assigned.others === 1 ? 'assignment' : 'assignments'}
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
            </p>
          ) : null}
        </>
      )}
    </Col>
  );
}

function OnboardingCard({ state, onb, failed, onRetry }) {
  const title = onb?.cohortName ? `Onboarding gate, ${onb.cohortName}` : 'Onboarding gate';
  return (
    <Col
      id="lcc-onboarding"
      icon="bi-mortarboard"
      title={title}
      info="Your cohort's onboarding checklist. A task is done once your submission is recorded on Assignments or Cohorts. Tasks marked as required to pitch form the gate."
      busy={state === 'loading'}
    >
      {state === 'loading' ? (
        <Loading label="Loading your onboarding checklist" rows={4} />
      ) : state === 'error' || failed ? (
        <Failed onRetry={onRetry}>The onboarding checklist did not load.</Failed>
      ) : !onb ? (
        <Empty href="/org-team-hub" action="Open Team Hub">
          No onboarding checklist is set for your cohort.
        </Empty>
      ) : (
        <>
          <ul className="lcc-checks">
            {onb.tasks.map((t) => (
              <li key={t.id} className="lcc-check">
                <i
                  className={`bi ${t.done ? 'bi-check-square-fill lcc-check--done' : 'bi-square'}`}
                  aria-hidden="true"
                />
                <span className="lh-row-title">{t.title}</span>
                <span className="lh-sr">{t.done ? 'Done' : 'Not done'}</span>
                {t.is_gate ? <span className="lcc-faint">Required to pitch</span> : null}
              </li>
            ))}
          </ul>
          <p className="lcc-gate">
            <span className="lh-strong">
              {onb.gateOn ? `Ready to pitch: ${onb.ready ? 'Yes' : 'No'}` : 'No pitch gate is set'}
            </span>
            <span className="lh-muted">
              <span className="lh-num">{onb.remaining}</span>{' '}
              {onb.remaining === 1 ? 'item' : 'items'} remaining
            </span>
          </p>
        </>
      )}
    </Col>
  );
}

function GradesCard({ state, grades, onRetry }) {
  const view = useMemo(() => (grades ? gradeRows(grades.grades) : null), [grades]);
  return (
    <Col
      id="lcc-grades"
      icon="bi-bar-chart"
      title="My grades"
      info="Your own grades as your council entered them. Only you see these here."
      busy={state === 'loading'}
    >
      {state === 'loading' ? (
        <Loading label="Loading your grades" rows={2} />
      ) : state === 'error' || !grades ? (
        <Failed onRetry={onRetry}>Your grades did not load.</Failed>
      ) : grades.hidden ? (
        <Empty href={LINKS.grades} action="Open Grades">
          Your council has paused grade visibility.
        </Empty>
      ) : view.total === 0 ? (
        <Empty href={LINKS.grades} action="Open Grades">
          No grades have been entered for you yet.
        </Empty>
      ) : (
        <>
          <ul className="lcc-grades">
            {view.rows.map((g) => (
              <li key={g.kind} className="lcc-grade">
                <span className="lh-row-title">{g.label}</span>
                <span className="lh-num lcc-grade__score">{g.score}</span>
                <span className="lh-num lcc-grade__letter">{g.letter}</span>
                <span className="lh-row-meta lcc-grade__note">
                  {g.graded ? g.note : 'Not graded yet.'}
                </span>
              </li>
            ))}
          </ul>
          <p className="lcc-foot">
            <Link href={LINKS.grades} className="lh-link">
              {view.more > 0 ? (
                <>
                  <span className="lh-num">{view.more}</span> more in Grades
                </>
              ) : (
                'Open Grades'
              )}
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </p>
        </>
      )}
    </Col>
  );
}

function PathCard({ state, content, failed, onRetry, pathCounts, onOpenLevel }) {
  const items = useMemo(() => (content ? pathItems(content) : []), [content]);
  return (
    <Col
      id="lcc-path"
      icon="bi-layers"
      title="Council path"
      info="Material your council added, in the order it was added, then the default course order for a new analyst."
      busy={state === 'loading'}
    >
      {state === 'loading' ? (
        <Loading label="Loading the council path" />
      ) : (
        <>
          {state === 'error' || failed ? (
            <Failed onRetry={onRetry}>Your council&apos;s material did not load.</Failed>
          ) : items.length === 0 ? (
            <p className="lcc-note">
              Your council has not added material yet. The default order from the Ezana curriculum
              is below.
            </p>
          ) : (
            <ul className="lcc-list">
              {items.map((c) => {
                const body = (
                  <>
                    <i className={`bi ${c.icon} lcc-list__icon`} aria-hidden="true" />
                    <span className="lh-row-title lcc-list__title">{c.title}</span>
                    <span className="lcc-faint">{c.kind}</span>
                  </>
                );
                return (
                  <li key={c.id}>
                    {c.href ? (
                      <a
                        className="lcc-row lcc-row--3"
                        href={c.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {body}
                      </a>
                    ) : (
                      <span className="lcc-row lcc-row--3">{body}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <h4 className="lh-subtitle lcc-sub">Starter courses</h4>
          <ol className="lcc-steps">
            {DEFAULT_PATH.map((s, i) => {
              const c = pathCounts?.[`${s.track}:${s.level}`];
              return (
                <li key={`${s.track}:${s.level}`}>
                  <button
                    type="button"
                    className="lcc-step"
                    onClick={() => onOpenLevel?.(s.track, s.level)}
                  >
                    <span className="lh-num lcc-step__n">{i + 1}</span>
                    <span className="lh-row-title">{s.label}</span>
                    <span className="lh-num lcc-faint">{c ? `${c.done} / ${c.total}` : NA}</span>
                    <i className="bi bi-chevron-right" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </Col>
  );
}

function TeamCard({ state, rows, failed, onRetry }) {
  return (
    <Col
      id="lcc-team"
      icon="bi-people"
      title={rows ? `Team progress (${rows.length})` : 'Team progress'}
      info="Assignments you can see that name each member, and the Learning score from the council rating (0 to 100). Private course progress is never shown."
      busy={state === 'loading'}
    >
      {state === 'loading' ? (
        <Loading label="Loading team progress" rows={4} />
      ) : state === 'error' || failed ? (
        <Failed onRetry={onRetry}>Team progress did not load.</Failed>
      ) : rows.length === 0 ? (
        <Empty href={LINKS.assignments} action="Open Assignments">
          No members have assigned work you can see yet.
        </Empty>
      ) : (
        <>
          <div className="lcc-table-wrap">
            <table className="lcc-table">
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col" className="is-num">
                    Done
                  </th>
                  <th scope="col" className="is-num">
                    Due 7d
                  </th>
                  <th scope="col" className="is-num">
                    Overdue
                  </th>
                  <th scope="col" className="is-num">
                    Learning
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.memberId}>
                    <th scope="row">
                      <span className="lh-row-title">{r.name}</span>
                      <span className="lh-row-meta">{roleLabel(r.role)}</span>
                    </th>
                    <td className="is-num">
                      {r.done} / {r.total}
                    </td>
                    <td className="is-num">{r.dueWeek}</td>
                    <td className="is-num">{r.overdue}</td>
                    <td className="is-num">{fmtLearning(r.learning)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="lcc-foot lcc-faint">Private course progress is not shown.</p>
        </>
      )}
    </Col>
  );
}

function QueueCard({ state, queue, failed, onRetry }) {
  return (
    <Col
      id="lcc-queue"
      icon="bi-clipboard-check"
      title="Advisor queue"
      info="Assignments that are past due, or handed in and waiting for review, overdue first."
      busy={state === 'loading'}
    >
      {state === 'loading' ? (
        <Loading label="Loading the advisor queue" />
      ) : state === 'error' || failed ? (
        <Failed onRetry={onRetry}>The advisor queue did not load.</Failed>
      ) : queue.rows.length === 0 ? (
        <Empty href={LINKS.assignments} action="View all assignments">
          No overdue or submitted work right now.
        </Empty>
      ) : (
        <>
          <ul className="lcc-list">
            {queue.rows.map((r) => (
              <li key={r.id}>
                <Link className="lcc-row lcc-row--queue" href={r.href}>
                  <i className="bi bi-file-earmark-text lcc-list__icon" aria-hidden="true" />
                  <span className="lcc-list__title">
                    <span className="lh-row-title">{r.title}</span>
                    <span className="lh-row-meta">
                      {r.who}, due <span className="lh-num">{fmtDay(r.due)}</span>
                    </span>
                  </span>
                  <Status k={r.status} />
                </Link>
              </li>
            ))}
          </ul>
          <p className="lcc-foot">
            <Link href={LINKS.assignments} className="lh-link">
              {queue.total > queue.rows.length ? (
                <>
                  View all <span className="lh-num">{queue.total}</span>
                </>
              ) : (
                'View all assignments'
              )}
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </p>
        </>
      )}
    </Col>
  );
}

/* ── The band ───────────────────────────────────────────────────────────── */

function Strip({ state, figs, onRetry }) {
  if (state === 'error') return <Failed onRetry={onRetry}>Council learning did not load.</Failed>;
  const cells = figs
    ? [
        { label: figs.university || 'Council', value: figs.council, text: true },
        { label: 'Your role', value: figs.role, text: true },
        { label: 'Cohort', value: figs.cohort, text: true },
        { label: 'Open learning work', value: figs.open },
        { label: 'Next due', value: figs.nextDue },
      ]
    : null;
  return (
    <dl className="lcc-strip" aria-busy={state === 'loading' || undefined}>
      {(cells || Array.from({ length: 5 }, () => null)).map((c, i) => (
        <div key={c?.label || i} className="lcc-strip__cell">
          <dt>{c ? c.label : <Skel w={64} h={10} />}</dt>
          <dd className={c && !c.text ? 'lh-num' : undefined}>
            {c ? c.value : <Skel w={96} h={16} />}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function CouncilLearning({ council, pathCounts, onOpenLevel }) {
  const { status, data, retry, sampleActive } = council;
  const [jump, setJump] = useState('lcc-assigned');
  const ready = status === 'ready' && data;
  const viewer = data?.viewer || null;
  const manager = ready ? isManager(viewer) : false;
  const exec = ready ? isExecutive(viewer) : false;
  const now = data?.now || Date.now();

  const assigned = useMemo(
    () =>
      ready && data.assignments && data.learningItems
        ? assignedRows({ assignments: data.assignments, learningItems: data.learningItems }, now)
        : null,
    [ready, data, now],
  );
  const onb = useMemo(() => (ready ? onboardingView(data.onboarding) : null), [ready, data]);
  const team = useMemo(
    () =>
      ready && manager && data.assignments && data.roster
        ? teamRows(
            {
              assignments: data.assignments,
              roster: data.roster,
              learningScores: data.learningScores || {},
              viewerUserId: viewer.userId,
            },
            now,
          )
        : null,
    [ready, manager, data, viewer, now],
  );
  const queue = useMemo(
    () => (ready && exec && data.assignments ? advisorQueue(data.assignments, now) : null),
    [ready, exec, data, now],
  );
  const figs = ready
    ? contextFigures({ council: data.council, viewer, onboarding: data.onboarding }, assigned)
    : null;

  const st = status === 'error' ? 'error' : ready ? 'ready' : 'loading';
  const tabs = [
    { id: 'lcc-assigned', label: 'Assigned to me', n: assigned?.open },
    { id: 'lcc-onboarding', label: 'Onboarding', n: onb?.total },
    { id: 'lcc-grades', label: 'My grades' },
    ...(manager ? [{ id: 'lcc-team', label: 'Team progress', n: team?.length }] : []),
    ...(exec ? [{ id: 'lcc-queue', label: 'Advisor queue', n: queue?.total }] : []),
  ];
  const go = (id) => {
    setJump(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.focus({ preventScroll: true });
    }
  };

  /* A part that failed alone arrives as null: that card shows its error. */
  const partFailed = (k) => ready && data[k] == null;

  return (
    <section className="lcc-band" aria-labelledby="lcc-heading">
      <div className="lcc-head">
        <h2 id="lcc-heading" className="lcc-heading">
          Council learning
        </h2>
        <nav className="lcc-tabs" aria-label="Council learning sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`lcc-tab${jump === t.id ? ' is-on' : ''}`}
              aria-current={jump === t.id ? 'true' : undefined}
              onClick={() => go(t.id)}
            >
              {t.label}
              {typeof t.n === 'number' ? <span className="lh-num"> ({t.n})</span> : null}
            </button>
          ))}
        </nav>
        {sampleActive ? <span className="lcc-faint lcc-sample">Sample content</span> : null}
      </div>

      <Strip state={st} figs={figs} onRetry={retry} />

      <div className="lcc-row3">
        <AssignedCard
          state={st === 'ready' && !assigned ? 'error' : st}
          assigned={assigned}
          onRetry={retry}
          onPath={() => go('lcc-path')}
        />
        <OnboardingCard state={st} onb={onb} failed={partFailed('onboarding')} onRetry={retry} />
        <GradesCard state={st} grades={data?.grades || null} onRetry={retry} />
      </div>

      <div className={`lcc-row3 lcc-row3--n${1 + (manager ? 1 : 0) + (exec ? 1 : 0)}`}>
        <PathCard
          state={st}
          content={data?.content || null}
          failed={partFailed('content')}
          onRetry={retry}
          pathCounts={pathCounts}
          onOpenLevel={onOpenLevel}
        />
        {manager ? (
          <TeamCard
            state={st}
            rows={team}
            failed={!team || partFailed('learningScores')}
            onRetry={retry}
          />
        ) : null}
        {exec ? <QueueCard state={st} queue={queue} failed={!queue} onRetry={retry} /> : null}
      </div>
    </section>
  );
}
