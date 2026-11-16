'use client';

import { useEffect, useMemo, useState } from 'react';
import { applySampleAction } from '@/lib/org-competitions-sample';
import {
  DELIVERABLE_ICON,
  DELIVERABLE_LABEL,
  NA,
  NEXT_STAGE_LABEL,
  fmtDate,
  fmtScore,
  fmtTime,
  nextStage,
  readinessOf,
  requiredKinds,
} from '@/lib/org-competitions-model';
import { WorkspaceHeader } from './WorkspaceHeader';
import {
  DeliverableList,
  EntryRules,
  FeedbackList,
  KeyValues,
  ReadinessList,
  ResultSummary,
} from './WorkspaceParts';
import { ConfirmDialog } from './landing/Dialogs';
import '@/components/org/command-center/command-center.css';
import './competitions.css';
import '@/styles/home-canvas.css';

/**
 * A sample event's workspace (master admin and demo accounts only), drawn
 * from the sample bundle with the same pieces as the live sub-pages. The
 * tabs switch in place; every action (advance a stage, reveal or hide
 * results, decline a request, hand in a deliverable, change recruiting
 * consent) is applied on the page only and never sent anywhere.
 */
const ENTRANT_TABS = [
  ['overview', 'Overview'],
  ['rules', 'Entry rules'],
  ['deliverables', 'Deliverables'],
  ['live', 'Live board'],
  ['results', 'Results'],
];
const HOST_TABS = [
  ['overview', 'Overview'],
  ['rules', 'Entry rules'],
  ['live', 'Live board'],
  ['results', 'Results'],
  ['host', 'Host tools'],
];
const HOST_TOOLS = [
  ['scoreboard', 'Scoreboard'],
  ['requests', 'Join requests'],
  ['judges', 'Judges'],
  ['rubric', 'Rubric'],
];
const PRESENTATION = {
  upcoming: 'Upcoming',
  on_deck: 'On deck',
  presenting: 'Presenting',
  complete: 'Complete',
};

function Notice({ children }) {
  return (
    <div className="dashboard-page-inset ez-canvas pcx-page">
      <p className="pcx-empty-page">{children}</p>
    </div>
  );
}

function Sec({ id, title, aside, children }) {
  return (
    <section className="pcx-sec" aria-labelledby={id}>
      <div className="pcx-sec__head">
        <h2 className="pcx-h2" id={id}>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function SampleWorkspace({ slug, initialTab }) {
  const [bundle, setBundle] = useState(null);
  const [status, setStatus] = useState('loading');
  const [tab, setTab] = useState(initialTab || 'overview');
  const [tool, setTool] = useState('scoreboard');
  const [confirm, setConfirm] = useState(null);
  const [say, setSay] = useState('');
  const [local, setLocal] = useState({}); // entrant: handed-in kinds and consent, page only

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/org/pitch-competitions/sample', { cache: 'no-store' });
        const json = res.ok ? await res.json() : null;
        if (!alive) return;
        setBundle(json?.sample || null);
        setStatus(json?.sample ? 'ready' : 'missing');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const found = useMemo(() => {
    if (!bundle) return null;
    const h = bundle.hosted.find((e) => e.slug === slug);
    if (h) return { kind: 'host', event: h };
    const e = bundle.entered.find((x) => x.slug === slug);
    if (e) return { kind: 'entrant', event: e };
    return null;
  }, [bundle, slug]);

  if (status === 'loading') {
    return (
      <div className="dashboard-page-inset ez-canvas pcx-page" aria-busy="true">
        <div className="pcx-skel" aria-hidden="true">
          {[40, 70, 90, 60, 80].map((w) => (
            <span key={w} className="tcc-skel" style={{ width: `${w}%`, height: 14 }} />
          ))}
        </div>
      </div>
    );
  }
  if (status === 'error')
    return <Notice>Could not load the sample content. Reload the page to try again.</Notice>;
  if (!found) return <Notice>Competition not found, or you do not have access to it.</Notice>;

  const ev = found.event;
  const isHost = found.kind === 'host';
  const tabs = (isHost ? HOST_TABS : ENTRANT_TABS).map(([key, label]) => ({ key, label }));
  const events = [...bundle.entered, ...bundle.hosted].map((e) => ({ slug: e.slug, name: e.name }));
  const flash = (msg) => {
    setSay(msg);
    setTimeout(() => setSay(''), 3500);
  };
  const patchHost = (patch, extra = {}) => {
    const res = applySampleAction(bundle, { type: 'host', slug, patch, ...extra });
    if (res.ok) setBundle(res.bundle);
    return res;
  };

  const submitted = new Set([...(ev.submittedKinds || []), ...(local.kinds || [])]);
  const consent = (m) => (local.consent?.[m.id] ?? m.consent) !== 'none';

  /* ── Entrant views ── */
  const entrantOverview = () => (
    <div className="pcx-split">
      <div className="pcx-col">
        <Sec id="sw-entry" title="Your entry">
          <KeyValues
            rows={[
              ['Team', ev.team?.team_name],
              ['Host council', ev.host],
              ['Ticker', ev.team?.ticker || NA, true],
              ['Side', ev.team?.side === 'short' ? 'Short' : 'Long'],
              [
                'Presentation slot',
                ev.slot
                  ? `${ev.slot.room}, ${fmtDate(ev.slot.starts_at)} ${fmtTime(ev.slot.starts_at)}`
                  : NA,
                true,
              ],
            ]}
          />
        </Sec>
        <Sec
          id="sw-deliv"
          title="Deliverables"
          aside={
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              onClick={() => setTab('deliverables')}
            >
              Hand in
            </button>
          }
        >
          <DeliverableList config={ev.config} submittedKinds={[...submitted]} />
        </Sec>
        <Sec id="sw-res" title="Result">
          {ev.result ? (
            <ResultSummary result={ev.result} breakdown={ev.result.breakdown} />
          ) : (
            <p className="tcc-state">Results have not been revealed.</p>
          )}
        </Sec>
      </div>
      <span className="tcc-vrule pcx-split__rule" aria-hidden="true" />
      <div className="pcx-col">
        <Sec id="sw-rules" title="Entry rules">
          <EntryRules config={ev.config} />
        </Sec>
        <Sec id="sw-ann" title="Announcements">
          <p className="tcc-state">No announcements yet.</p>
        </Sec>
      </div>
    </div>
  );

  const deliverablesView = () => (
    <div className="pcx-split">
      <div className="pcx-col">
        <Sec id="sw-files" title="Hand in">
          {!requiredKinds(ev.config).length ? (
            <p className="tcc-state">The host has not set deliverables.</p>
          ) : (
            <ul className="pcx-filelist">
              {requiredKinds(ev.config).map((k) => {
                const name = submitted.has(k)
                  ? ev.files?.[k] || `SampleCouncil_${DELIVERABLE_LABEL[k].replace(/\s+/g, '')}.pdf`
                  : null;
                const live = ['open', 'in_progress'].includes(ev.status);
                return (
                  <li key={k}>
                    <i className={`bi ${DELIVERABLE_ICON[k]}`} aria-hidden="true" />
                    <span className="pcx-filelist__label">{DELIVERABLE_LABEL[k]}</span>
                    <span className={`pcx-filelist__file${name ? '' : ' tcc-na'}`}>
                      {name || NA}
                    </span>
                    {live ? (
                      <button
                        type="button"
                        className="tcc-textbtn tcc-textbtn--accent"
                        onClick={() => {
                          setLocal((l) => ({ ...l, kinds: [...new Set([...(l.kinds || []), k])] }));
                          flash(`${DELIVERABLE_LABEL[k]} handed in on the page only.`);
                        }}
                      >
                        {name ? 'Replace' : 'Upload'}
                      </button>
                    ) : (
                      <span className="pcx-muted">Closed</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="pcx-muted pcx-note">
            Due <span className="tcc-mono">{fmtDate(ev.config?.deliverable_due_at)}</span>
          </p>
        </Sec>
      </div>
      <span className="tcc-vrule pcx-split__rule" aria-hidden="true" />
      <div className="pcx-col">
        <Sec
          id="sw-roster"
          title={
            <>
              Team roster <span className="tcc-mono pcx-muted">{ev.members.length}</span>
            </>
          }
        >
          <p className="pcx-muted pcx-note">
            Recruiting consent is off until a member turns it on. When on, judges can see that
            member pitched.
          </p>
          <ul className="pcx-roster">
            {ev.members.map((m) => (
              <li key={m.id} className="pcx-roster-row">
                <span className="pcx-roster-main">
                  {m.name}
                  {m.lead && <span className="pcx-muted"> Lead</span>}
                </span>
                <span className="pcx-roster-meta">Recruiting consent</span>
                <button
                  type="button"
                  className={`tcc-toggle${consent(m) ? ' is-on' : ''}`}
                  aria-pressed={consent(m)}
                  aria-label={`Recruiting consent for ${m.name}`}
                  onClick={() =>
                    setLocal((l) => ({
                      ...l,
                      consent: { ...(l.consent || {}), [m.id]: consent(m) ? 'none' : 'judges' },
                    }))
                  }
                >
                  {consent(m) ? 'On' : 'Off'}
                </button>
              </li>
            ))}
          </ul>
        </Sec>
      </div>
    </div>
  );

  const entrantLive = () => (
    <Sec id="sw-live" title="Running order">
      {!ev.slot ? (
        <p className="tcc-state">No slots scheduled for your team.</p>
      ) : (
        <table className="pcx-table">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Room</th>
              <th scope="col">Team</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="tcc-mono">
                {fmtDate(ev.slot.starts_at)} {fmtTime(ev.slot.starts_at)}
              </td>
              <td>{ev.slot.room}</td>
              <td className="pcx-strong">{ev.team?.team_name}</td>
              <td>
                <span className="pcx-status">
                  <i className="bi bi-clock" aria-hidden="true" /> Upcoming
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      )}
      <p className="pcx-muted pcx-note">
        Entrants see their own team&apos;s slots. The host sees every team.
      </p>
    </Sec>
  );

  const entrantResults = () =>
    ev.result ? (
      <div className="pcx-split">
        <div className="pcx-col">
          <Sec id="sw-result" title={ev.team?.team_name}>
            <ResultSummary result={ev.result} breakdown={ev.result.breakdown} />
          </Sec>
        </div>
        <span className="tcc-vrule pcx-split__rule" aria-hidden="true" />
        <div className="pcx-col">
          <Sec
            id="sw-fb"
            title={
              <>
                Anonymous feedback{' '}
                <span className="tcc-mono pcx-muted">{ev.result.feedback.length}</span>
              </>
            }
          >
            <FeedbackList items={ev.result.feedback} />
          </Sec>
        </div>
      </div>
    ) : (
      <p className="tcc-state">
        <span>
          Results have not been revealed. Your rank, breakdown and feedback appear here once the
          host reveals them.
        </span>
        <button
          type="button"
          className="tcc-textbtn tcc-textbtn--accent"
          onClick={() => setTab('live')}
        >
          View live board
        </button>
      </p>
    );

  /* ── Host views ── */
  const readiness = ev.readiness || readinessOf(ev.counts, ev.rubricCount);
  const next = nextStage(ev.status);
  const blocked = ev.status === 'draft' && !readiness.allMet;

  const hostOverview = () => (
    <>
      <div className="tcc-kpistrip pcx-kpis" role="list" aria-label="Event figures">
        {[
          ['bi-people', 'Teams', ev.counts.teams],
          ['bi-upload', 'Submitted', ev.counts.teamsSubmitted ?? 0],
          ['bi-person-badge', 'Judges', ev.counts.judges],
          ['bi-door-open', 'Rooms', ev.counts.rooms],
        ].map(([icon, label, v]) => (
          <div className="tcc-kpi" role="listitem" key={label}>
            <i className={`bi ${icon} tcc-kpi__icon`} aria-hidden="true" />
            <span className="tcc-kpi__label">{label}</span>
            <span className="tcc-kpi__value tcc-mono">{v ?? 0}</span>
          </div>
        ))}
      </div>
      <div className="pcx-split">
        <div className="pcx-col">
          <Sec
            id="sw-ready"
            title="Readiness checklist"
            aside={
              <span className="tcc-mono pcx-muted">
                {readiness.met} of {readiness.total}
              </span>
            }
          >
            <ReadinessList readiness={readiness} />
            {next && (
              <div className="pcx-actions">
                <button
                  type="button"
                  className="pcx-btn pcx-btn--primary"
                  disabled={blocked}
                  onClick={() => {
                    patchHost({ status: next });
                    flash('Stage moved forward on the page only.');
                  }}
                >
                  {NEXT_STAGE_LABEL[ev.status]}
                </button>
                {blocked && (
                  <span className="pcx-muted">Finish the checklist to open registration.</span>
                )}
              </div>
            )}
          </Sec>
          <Sec id="sw-hostact" title="Host actions">
            <div className="pcx-linkrow">
              <button
                type="button"
                className="tcc-textbtn tcc-textbtn--accent"
                onClick={() => setTab('rules')}
              >
                Entry rules
              </button>
              {[
                ['requests', 'Join requests'],
                ['judges', 'Judge scoring links'],
                ['scoreboard', 'Scoreboard'],
              ].map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className="tcc-textbtn tcc-textbtn--accent"
                  onClick={() => {
                    setTool(k);
                    setTab('host');
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </Sec>
        </div>
        <span className="tcc-vrule pcx-split__rule" aria-hidden="true" />
        <div className="pcx-col">
          <Sec id="sw-event" title="Event">
            <KeyValues
              rows={[
                ['Theme', ev.theme || NA],
                ['Starts', fmtDate(ev.starts_at), true],
                ['Ends', fmtDate(ev.ends_at), true],
                ['Results', ev.results_visible ? 'Revealed to entrants' : 'Hidden from entrants'],
              ]}
            />
          </Sec>
          <Sec id="sw-hann" title="Announcements">
            {ev.announcements.length ? (
              <ul className="pcx-announce">
                {ev.announcements.map((a) => (
                  <li key={a.id} className="pcx-announce-item">
                    <div className="pcx-announce-title">{a.title}</div>
                    <span className="tcc-mono pcx-muted pcx-announce-date">
                      {fmtDate(a.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="tcc-state">No announcements yet.</p>
            )}
          </Sec>
        </div>
      </div>
    </>
  );

  const hostLive = () =>
    !ev.live.length ? (
      <p className="tcc-state">No slots scheduled. Rooms and teams are set under Host tools.</p>
    ) : (
      ev.live.map((rd) => (
        <Sec key={rd.id} id={`sw-${rd.id}`} title={rd.name}>
          <table className="pcx-table">
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Room</th>
                <th scope="col">Team</th>
                <th scope="col">Ticker</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rd.rooms.flatMap((rm) =>
                rm.teams.map((t) => (
                  <tr key={t.id}>
                    <td className="tcc-mono">{fmtTime(t.starts_at)}</td>
                    <td>{rm.name}</td>
                    <td className="pcx-strong">{t.team_name}</td>
                    <td className="tcc-mono">{t.ticker}</td>
                    <td>
                      <span className="pcx-status is-done">
                        <i className="bi bi-check-circle" aria-hidden="true" />{' '}
                        {PRESENTATION[t.presentation_status]}
                      </span>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </Sec>
      ))
    );

  const standings = () => (
    <div className="pcx-tablewrap" role="region" aria-label="Standings" tabIndex={0}>
      <table className="pcx-table">
        <thead>
          <tr>
            <th scope="col" className="pcx-num">
              Rank
            </th>
            <th scope="col">Team</th>
            {(ev.rubric || []).map((c) => (
              <th scope="col" className="pcx-num pcx-col-crit" key={c.id}>
                {c.label}
              </th>
            ))}
            <th scope="col" className="pcx-num">
              Score
            </th>
          </tr>
        </thead>
        <tbody>
          {ev.scoreboard.map((r, i) => (
            <tr key={r.id}>
              <td className="pcx-num tcc-mono">{i + 1}</td>
              <td className="pcx-strong">{r.team_name}</td>
              {r.breakdown.map((c) => (
                <td className="pcx-num tcc-mono pcx-col-crit" key={c.id}>
                  {c.avg}/{c.max_score}
                </td>
              ))}
              <td className="pcx-num tcc-mono pcx-strong">{fmtScore(r.mean)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const hostResults = () =>
    !ev.scoreboard.length ? (
      <p className="tcc-state">No scores submitted yet.</p>
    ) : (
      <Sec
        id="sw-hres"
        title="Standings"
        aside={
          <span className="pcx-muted">
            {ev.results_visible ? 'Revealed to entrants' : 'Hidden from entrants'}
          </span>
        }
      >
        {standings()}
      </Sec>
    );

  const hostTools = () => (
    <>
      <nav className="pcx-subtabs" aria-label="Host tools">
        {HOST_TOOLS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`tcc-toggle${tool === k ? ' is-on' : ''}`}
            aria-pressed={tool === k}
            onClick={() => setTool(k)}
          >
            {label}
          </button>
        ))}
      </nav>
      {tool === 'scoreboard' &&
        (!ev.scoreboard.length ? (
          <p className="tcc-state">No scores submitted yet.</p>
        ) : (
          <Sec
            id="sw-score"
            title="Scores"
            aside={
              <div className="pcx-linkrow">
                <button
                  type="button"
                  className="tcc-textbtn"
                  onClick={() => flash('Scores recomputed. Nothing changed.')}
                >
                  Recompute
                </button>
                {ev.results_visible ? (
                  <button type="button" className="tcc-textbtn" onClick={() => setConfirm('hide')}>
                    <i className="bi bi-eye-slash" aria-hidden="true" /> Hide results
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pcx-btn pcx-btn--primary"
                    onClick={() => setConfirm('reveal')}
                  >
                    <i className="bi bi-eye" aria-hidden="true" /> Reveal results
                  </button>
                )}
              </div>
            }
          >
            {standings()}
          </Sec>
        ))}
      {tool === 'requests' && (
        <Sec id="sw-req" title="Pending requests">
          {!ev.requests.length ? (
            <p className="tcc-state">No pending requests.</p>
          ) : (
            <ul className="pcx-req-list">
              {ev.requests.map((r) => (
                <li key={r.id} className="pcx-req">
                  <div className="pcx-req-main">
                    <div className="pcx-req-name">{r.team_name}</div>
                    <div className="pcx-req-meta">{r.contact_email}</div>
                    <p className="pcx-req-thesis">{r.application_thesis}</p>
                  </div>
                  <div className="pcx-req-actions">
                    <button
                      type="button"
                      className="tcc-textbtn tcc-textbtn--accent"
                      onClick={() => {
                        patchHost(null, { declineRequest: r.id });
                        flash(`${r.team_name} approved on the page only.`);
                      }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="tcc-textbtn pcx-danger"
                      onClick={() => setConfirm({ decline: r })}
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Sec>
      )}
      {tool === 'judges' && (
        <Sec id="sw-judges" title="Judges">
          <p className="pcx-muted pcx-note">
            Each judge scores from a private link, shown once when it is made. Judge names are seen
            by the host only.
          </p>
          <ul className="pcx-roster">
            {ev.judges.map((j) => (
              <li key={j.id} className="pcx-roster-row">
                <span className="pcx-roster-main">{j.full_name}</span>
                <span className="pcx-roster-meta">{j.firm}</span>
              </li>
            ))}
          </ul>
        </Sec>
      )}
      {tool === 'rubric' && (
        <Sec id="sw-rubric" title="Scoring rubric">
          {!ev.rubric.length ? (
            <p className="tcc-state">
              No rubric yet. The checklist needs one before registration opens.
            </p>
          ) : (
            <table className="pcx-table">
              <thead>
                <tr>
                  <th scope="col">Criterion</th>
                  <th scope="col" className="pcx-num">
                    Weight
                  </th>
                  <th scope="col" className="pcx-num">
                    Maximum
                  </th>
                </tr>
              </thead>
              <tbody>
                {ev.rubric.map((c) => (
                  <tr key={c.id}>
                    <td className="pcx-strong">{c.label}</td>
                    <td className="pcx-num tcc-mono">{c.weight}</td>
                    <td className="pcx-num tcc-mono">{c.max_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Sec>
      )}
    </>
  );

  const views = isHost
    ? {
        overview: hostOverview,
        rules: () => <EntryRules config={ev.config} />,
        live: hostLive,
        results: hostResults,
        host: hostTools,
      }
    : {
        overview: entrantOverview,
        rules: () => <EntryRules config={ev.config} />,
        deliverables: deliverablesView,
        live: entrantLive,
        results: entrantResults,
      };
  const current = views[tab] ? tab : 'overview';

  return (
    <div className="dashboard-page-inset ez-canvas pcx-page">
      <WorkspaceHeader
        name={ev.name}
        status={ev.status}
        roleLabel={isHost ? 'Host' : 'Entrant'}
        tabs={tabs}
        active={current}
        onTab={setTab}
        events={events}
        currentSlug={slug}
        sample
        aside={
          say ? (
            <span className="pcx-muted" role="status">
              {say}
            </span>
          ) : null
        }
      />
      <div className="pcx-ws__body">{views[current]()}</div>

      {confirm === 'reveal' && (
        <ConfirmDialog
          title="Reveal results?"
          confirmLabel="Reveal results"
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            patchHost({ results_visible: true });
            setConfirm(null);
            flash('Results revealed on the page only.');
            return { ok: true };
          }}
        >
          Each entrant would see its own rank, criterion breakdown and anonymous feedback, and
          trophies would go to the teams. Sample content is showing, so this is applied to the page
          only.
        </ConfirmDialog>
      )}
      {confirm === 'hide' && (
        <ConfirmDialog
          title="Hide results?"
          confirmLabel="Hide results"
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            patchHost({ results_visible: false });
            setConfirm(null);
            return { ok: true };
          }}
        >
          Entrants will no longer see ranks, scores or feedback for {ev.name}. You can reveal them
          again later.
        </ConfirmDialog>
      )}
      {confirm?.decline && (
        <ConfirmDialog
          title="Decline request?"
          confirmLabel="Decline request"
          danger
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            patchHost(null, { declineRequest: confirm.decline.id });
            setConfirm(null);
            flash('Request declined on the page only.');
            return { ok: true };
          }}
        >
          {confirm.decline.team_name} will be told their request was declined. While registration is
          open their council can ask again.
        </ConfirmDialog>
      )}
    </div>
  );
}
