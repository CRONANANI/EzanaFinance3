'use client';

import { useCallback, useEffect, useState } from 'react';
import { Modal, Textarea } from '@/components/ds';
import { Skel } from '@/components/org/command-center/parts';
import {
  GATE_STATUS,
  NA,
  VOTE_NAMES,
  fmtDateTime,
  fmtShortDate,
  gateDetail,
  gateName,
  horizonName,
  stageName,
} from '@/lib/org-pitch-pipeline-model';
import { say } from './pitch-copy';
import {
  DataTab,
  DecisionTab,
  DeliverablesTab,
  DiscussionTab,
  ReviewTab,
  ThesisTab,
  VotingTab,
} from './PitchTabs';

/* Gates that report the committee's result: nothing for a member to fix. */
const RESULT_GATES = new Set(['quorum_met', 'vote_closed', 'vote_passed', 'conflicts_recused']);

/* Which tab fixes each gate. */
const GATE_TAB = {
  senior_analyst_signoffs: 'review',
  cross_desk_majority: 'review',
  no_unresolved_challenges: 'discussion',
  all_challenges_resolved: 'discussion',
  desk_meeting_logged: 'deliverables',
  required_models_complete: 'deliverables',
  deck_uploaded: 'deliverables',
  pre_read_distributed_48h: 'deliverables',
  ic_meeting_assigned: 'voting',
  quorum_met: 'voting',
  vote_closed: 'voting',
  vote_passed: 'voting',
  conflicts_recused: 'voting',
  trade_executed: 'decision',
};

function tabsFor(row, detail) {
  const s = row.stage;
  const tabs = [
    ['thesis', 'Thesis'],
    ['data', 'Supporting data'],
  ];
  if (s !== 'idea') tabs.push(['deliverables', 'Deliverables']);
  tabs.push(['discussion', 'Discussion']);
  if (s === 'screening' || s === 'cross_desk_review') tabs.push(['review', 'Review']);
  if (['cross_desk_review', 'pitch_scheduled', 'ic_vote'].includes(s) || detail?.ic_meeting) {
    tabs.push(['voting', 'Voting']);
  }
  if (
    detail?.decision ||
    ['approved', 'in_portfolio', 'exited', 'rejected'].includes(s) ||
    row.viewer_state?.can_record_outcome
  ) {
    tabs.push(['decision', 'Decision']);
  }
  return tabs;
}

function defaultTab(row) {
  return (
    {
      screening: 'review',
      deep_dive: 'deliverables',
      cross_desk_review: 'review',
      pitch_scheduled: 'voting',
      approved: 'decision',
      in_portfolio: 'decision',
    }[row.stage] || 'thesis'
  );
}

/**
 * One pitch: the gates of its current stage on the left (exactly what the
 * server will check, with the moves this member is allowed), the work in
 * tabs, and, only while the committee is in session on it, the ballot on the
 * right. While that ballot is blind the dialog shows the number of ballots
 * received and the member's own ballot, nothing else.
 */
export function PitchDialog({
  id,
  row,
  board,
  initialTab,
  sample,
  act,
  loadDetail,
  loadPanels,
  onClose,
  onActed,
}) {
  const [detail, setDetail] = useState({ status: 'loading', data: null });
  const [panels, setPanels] = useState({ status: 'idle', data: null });
  const [tab, setTab] = useState(initialTab && initialTab !== 'gates' ? initialTab : null);
  const stage = row?.stage;

  const refresh = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setDetail((d) => ({ status: 'loading', data: d.data }));
      const r = await loadDetail(id);
      setDetail(r.status === 'ready' ? r : { status: r.status, data: null });
    },
    [id, loadDetail],
  );
  const refreshPanels = useCallback(async () => {
    if (!stage) return;
    setPanels((p) => ({ status: 'loading', data: p.data }));
    setPanels(await loadPanels(id, stage));
  }, [id, stage, loadPanels]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    refreshPanels();
  }, [refreshPanels]);

  /** Run an action, then reload this pitch. Returns { ok, message }. */
  const run = useCallback(
    async (action, done) => {
      if (action.type === 'reload') {
        await refresh({ quiet: true });
        return { ok: true };
      }
      const res = await act({ pitchId: id, ...action });
      if (!res.ok)
        return {
          ok: false,
          message: say(res.error, 'That did not go through. Nothing was changed.'),
        };
      await Promise.all([refresh({ quiet: true }), refreshPanels()]);
      if (done) onActed(done);
      return { ok: true };
    },
    [act, id, refresh, refreshPanels, onActed],
  );

  if (!row) {
    return (
      <Modal open onClose={onClose} title="Pitch" size={560} className="opp-dialog">
        <p className="tcc-state">
          <span>This pitch is not in the pipeline you can see. It may have been removed.</span>
        </p>
      </Modal>
    );
  }

  const d = detail.data;
  const tabs = tabsFor(row, d);
  const current = tabs.some(([k]) => k === tab)
    ? tab
    : tabs.some(([k]) => k === defaultTab(row))
      ? defaultTab(row)
      : 'thesis';
  const meeting = d?.ic_meeting || null;
  const voteOpen = stage === 'ic_vote' && meeting && meeting.status === 'in_session';
  const g = row.gate || {};

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <span className="opp-dtitle">
          <span className="tcc-mono">{row.ticker}</span>
          <span>{row.company_name}</span>
          {sample && <span className="tcc-sample">Sample content</span>}
        </span>
      }
      size={1180}
      className="opp-dialog opp-pitch"
    >
      <ul className="opp-dmeta">
        <li>
          Stage <strong>{stageName(stage)}</strong>
        </li>
        {g.total > 0 && (
          <li className="tcc-mono">
            {g.passed} of {g.total} gates passed
          </li>
        )}
        <li>Next: {g.next_stage ? stageName(g.next_stage) : 'End of the pipeline'}</li>
        <li>{row.team_name || 'No desk'}</li>
        <li>{row.analyst_name || NA}</li>
        <li>
          {row.pitch_type
            ? `${row.pitch_type.charAt(0).toUpperCase()}${row.pitch_type.slice(1)}`
            : NA}
          , {horizonName(row.time_horizon)}
        </li>
      </ul>

      <div className={`opp-dbody${voteOpen ? ' opp-dbody--vote' : ''}`}>
        <Gates row={row} sample={sample} run={run} onFix={setTab} />
        <span className="opp-drule" aria-hidden="true" />
        <div className="opp-dmain">
          <div className="tcc-toggles opp-dtabs" role="tablist" aria-label="Pitch sections">
            {tabs.map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                id={`opp-tab-${k}`}
                aria-selected={current === k}
                aria-controls="opp-tabpanel"
                className={`tcc-toggle${current === k ? ' is-on' : ''}`}
                onClick={() => setTab(k)}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            className="opp-tabpanel"
            id="opp-tabpanel"
            role="tabpanel"
            aria-labelledby={`opp-tab-${current}`}
          >
            {detail.status === 'loading' && !d ? (
              <div className="opp-dskel" aria-busy="true">
                <Skel w="60%" h={14} />
                <Skel w="100%" h={12} />
                <Skel w="92%" h={12} />
                <Skel w="80%" h={12} />
              </div>
            ) : detail.status !== 'ready' && !d ? (
              <p className="tcc-state tcc-state--error" role="alert">
                <i className="bi bi-exclamation-circle" aria-hidden="true" />
                <span>
                  {detail.status === 'missing'
                    ? 'This pitch could not be found.'
                    : 'Could not load this pitch.'}
                </span>
                <button
                  type="button"
                  className="tcc-textbtn tcc-textbtn--accent"
                  onClick={() => refresh()}
                >
                  Retry
                </button>
              </p>
            ) : (
              <>
                {current === 'thesis' && <ThesisTab row={row} detail={d} run={run} />}
                {current === 'data' && <DataTab detail={d} sample={sample} />}
                {current === 'deliverables' && (
                  <DeliverablesTab
                    row={row}
                    detail={d}
                    panels={panels}
                    onRetry={refreshPanels}
                    board={board}
                    run={run}
                  />
                )}
                {current === 'discussion' && <DiscussionTab detail={d} run={run} />}
                {current === 'review' && (
                  <ReviewTab row={row} panels={panels} onRetry={refreshPanels} run={run} />
                )}
                {current === 'voting' && <VotingTab row={row} detail={d} board={board} run={run} />}
                {current === 'decision' && (
                  <DecisionTab row={row} detail={d} sample={sample} run={run} />
                )}
              </>
            )}
          </div>
        </div>
        {voteOpen && (
          <>
            <span className="opp-drule" aria-hidden="true" />
            <VotePanel row={row} detail={d} board={board} run={run} />
          </>
        )}
      </div>

      <History detail={d} row={row} />
    </Modal>
  );
}

function Gates({ row, run, onFix }) {
  const g = row.gate || {};
  const s = row.viewer_state || {};
  const [mode, setMode] = useState(null); // 'override' | 'reject' | 'exit'
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const go = async (action, done) => {
    setBusy(true);
    setMsg(null);
    const res = await run(action, done);
    setBusy(false);
    if (!res.ok) setMsg(res.message);
    else {
      setMode(null);
      setText('');
    }
  };

  const nextName = g.next_stage ? stageName(g.next_stage) : null;

  return (
    <section className="opp-gates" aria-labelledby="opp-gates-title">
      <h3 className="opp-subhead" id="opp-gates-title">
        Gates{' '}
        {g.total > 0 && (
          <span className="tcc-mono">
            ({g.passed} of {g.total})
          </span>
        )}
      </h3>
      {!g.total ? (
        <p className="opp-note">
          {row.stage === 'in_portfolio'
            ? 'A held pitch leaves the pipeline only by being marked exited, with a post-mortem.'
            : 'No gates: this stage is the end of the pipeline.'}
        </p>
      ) : (
        <>
          <p className="opp-note">
            What the server checks before a pitch leaves {stageName(row.stage)}.
          </p>
          <ul className="opp-gatelist">
            {g.gates.map((gate) => {
              const st = GATE_STATUS[gate.status] || GATE_STATUS.pending;
              const fix =
                gate.status !== 'pass' && !RESULT_GATES.has(gate.id)
                  ? GATE_TAB[gate.id] || gate.action?.tab
                  : null;
              return (
                <li key={gate.id}>
                  <i className={`bi ${st.icon} tcc-${st.tone}`} aria-hidden="true" />
                  <span className="opp-gatebody">
                    <span className="opp-gatename">{gateName(gate)}</span>
                    <span className="opp-sub">{gateDetail(gate)}</span>
                  </span>
                  <span className={`opp-gatestate tcc-${st.tone}`}>
                    {st.label}
                    {gate.severity === 'soft' && <span className="opp-sub"> (does not block)</span>}
                  </span>
                  {fix && fix !== 'data' && (
                    <button
                      type="button"
                      className="tcc-textbtn tcc-textbtn--accent opp-fix"
                      onClick={() => onFix(fix)}
                    >
                      Open
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {mode === null && (
        <div className="opp-gateactions">
          {nextName && g.can_advance && (
            <button
              type="button"
              className="tcc-btn"
              disabled={busy || !g.all_pass}
              onClick={() => go({ type: 'advance' }, `${row.ticker} moved to ${nextName}.`)}
            >
              Advance to {nextName.toLowerCase()}
            </button>
          )}
          {nextName && !g.can_advance && (
            <p className="opp-note">Moved on by: {row.next_owner || NA}.</p>
          )}
          {nextName && g.can_advance && !g.all_pass && (
            <p className="opp-note">Advance opens once every gate that blocks has passed.</p>
          )}
          {nextName && !g.all_pass && g.can_override && (
            <button type="button" className="tcc-textbtn" onClick={() => setMode('override')}>
              <i className="bi bi-shield-exclamation" aria-hidden="true" />
              Override with a reason
            </button>
          )}
          {row.stage === 'ic_vote' && (
            <p className="opp-note">A committee vote cannot be overridden.</p>
          )}
          {s.can_reject && (
            <button
              type="button"
              className="tcc-textbtn opp-danger"
              onClick={() => setMode('reject')}
            >
              <i className="bi bi-x-octagon" aria-hidden="true" />
              Reject pitch
            </button>
          )}
          {s.can_exit && (
            <button type="button" className="tcc-textbtn" onClick={() => setMode('exit')}>
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
              Mark exited
            </button>
          )}
        </div>
      )}

      {mode && (
        <div className="opp-confirm">
          <Textarea
            id="opp-gate-text"
            rows={3}
            label={
              mode === 'override'
                ? `Why advance ${row.ticker} past a gate that is not met?`
                : mode === 'reject'
                  ? `Why is ${row.ticker} rejected?`
                  : 'Post-mortem'
            }
            hint={
              mode === 'override'
                ? `At least 20 characters. Recorded on the stage history. ${text.trim().length} so far.`
                : mode === 'reject'
                  ? 'Recorded as the archive reason. The pitch leaves the pipeline.'
                  : 'What happened, and what the council learned. Recorded on the pitch.'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="opp-confirm__row">
            <button type="button" className="tcc-textbtn" onClick={() => setMode(null)}>
              Cancel
            </button>
            {mode === 'override' && (
              <button
                type="button"
                className="tcc-btn"
                disabled={busy || text.trim().length < 20}
                onClick={() =>
                  go(
                    { type: 'advance', override: true, reason: text.trim() },
                    `${row.ticker} moved to ${nextName} by override.`,
                  )
                }
              >
                Override and advance
              </button>
            )}
            {mode === 'reject' && (
              <button
                type="button"
                className="tcc-textbtn opp-danger"
                disabled={busy || !text.trim()}
                onClick={() =>
                  go({ type: 'reject', note: text.trim() }, `${row.ticker} was rejected.`)
                }
              >
                Reject {row.ticker}
              </button>
            )}
            {mode === 'exit' && (
              <button
                type="button"
                className="tcc-btn"
                disabled={busy || !text.trim()}
                onClick={() =>
                  go({ type: 'exit', note: text.trim() }, `${row.ticker} was marked exited.`)
                }
              >
                Mark exited
              </button>
            )}
          </div>
        </div>
      )}
      {msg && (
        <p className="opp-error" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          {msg}
        </p>
      )}
    </section>
  );
}

/**
 * The ballot, only at IC vote with the session open. One form. Nothing is
 * chosen until the member chooses. While the ballot is blind the panel says
 * how many ballots are in and what this member voted, and nothing about
 * anyone else.
 */
function VotePanel({ row, detail, board, run }) {
  const b = detail?.ballot || null;
  const meeting = detail?.ic_meeting;
  const voter = Boolean(board?.viewer?.is_manager);
  const own = b?.own || null;
  const [editing, setEditing] = useState(!own);
  const [choice, setChoice] = useState(null);
  const [why, setWhy] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setEditing(!own);
  }, [own]);

  const submit = async () => {
    setMsg(null);
    if (!choice) return setMsg('Choose Buy, Pass or Abstain.');
    if (!why.trim()) return setMsg('Write a rationale. It is recorded on your ballot.');
    setBusy(true);
    const res = await run(
      { type: 'vote', vote: choice, rationale: why.trim() },
      `Your ballot on ${row.ticker} is recorded.`,
    );
    setBusy(false);
    if (!res.ok) return setMsg(res.message);
    setChoice(null);
    setWhy('');
    setEditing(false);
  };

  return (
    <section className="opp-vote" aria-labelledby="opp-vote-title">
      <h3 className="opp-subhead" id="opp-vote-title">
        IC vote
      </h3>
      <dl className="tcc-pairs opp-pairs">
        <div className="tcc-pair">
          <dt>Meeting</dt>
          <dd className="tcc-mono">{fmtDateTime(meeting?.meets_at)}</dd>
        </div>
        <div className="tcc-pair">
          <dt>Ballot</dt>
          <dd>{meeting?.ballot_type === 'blind' ? 'Blind' : 'Open'}</dd>
        </div>
        <div className="tcc-pair">
          <dt>Threshold</dt>
          <dd>{meeting?.threshold === 'supermajority' ? 'Two thirds Buy' : 'Simple majority'}</dd>
        </div>
      </dl>
      {b ? (
        <p className="opp-received">
          <span className="tcc-mono">
            {b.received} of {b.eligible}
          </span>{' '}
          ballots received
          <span className={`opp-sub ${b.quorum_met ? 'tcc-pos' : ''}`}>
            <i
              className={`bi ${b.quorum_met ? 'bi-check-circle' : 'bi-circle'}`}
              aria-hidden="true"
            />{' '}
            Quorum {b.quorum_met ? 'met' : 'not met'} (needs{' '}
            <span className="tcc-mono">{b.quorum_needed}</span>)
          </span>
        </p>
      ) : (
        <Skel w="70%" h={14} />
      )}
      {b?.sealed && (
        <p className="opp-note">
          <i className="bi bi-eye-slash" aria-hidden="true" /> Blind ballot: other members&apos;
          ballots and the count of Buy, Pass and Abstain stay hidden until the meeting closes.
        </p>
      )}

      {!voter ? (
        <p className="opp-note">
          Portfolio managers and executives vote. You can follow the pitch here.
        </p>
      ) : (
        <>
          {own && (
            <p className="opp-own">
              Your ballot: <strong>{VOTE_NAMES[own.vote] || NA}</strong>
              <span className="opp-sub">Recorded {fmtShortDate(own.created_at)}</span>
            </p>
          )}
          {own && !editing && (
            <button type="button" className="tcc-textbtn" onClick={() => setEditing(true)}>
              Change your ballot
            </button>
          )}
          {editing && (
            <div className="opp-voteform">
              <span className="ds-field-label" id="opp-vote-choice">
                {own ? 'New ballot' : 'Your ballot'}
              </span>
              <div
                className="tcc-toggles opp-toggles"
                role="radiogroup"
                aria-labelledby="opp-vote-choice"
              >
                {['yes', 'no', 'abstain'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={choice === v}
                    className={`tcc-toggle${choice === v ? ' is-on' : ''}`}
                    onClick={() => setChoice(v)}
                  >
                    {VOTE_NAMES[v]}
                  </button>
                ))}
              </div>
              <Textarea
                id="opp-vote-why"
                label="Rationale"
                rows={4}
                value={why}
                hint={`Required. Recorded on your ballot. ${why.trim().length} characters.`}
                onChange={(e) => setWhy(e.target.value)}
              />
              <div className="opp-confirm__row">
                {own && (
                  <button type="button" className="tcc-textbtn" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                )}
                <button type="button" className="tcc-btn" disabled={busy} onClick={submit}>
                  {own ? 'Replace ballot' : 'Submit ballot'}
                </button>
              </div>
              <p className="opp-note">
                You can replace your ballot until an executive closes the vote.
              </p>
            </div>
          )}
          {msg && (
            <p className="opp-error" role="alert">
              <i className="bi bi-exclamation-circle" aria-hidden="true" />
              {msg}
            </p>
          )}
        </>
      )}
    </section>
  );
}

function History({ detail, row }) {
  const h = detail?.history || [];
  const notes = h.filter((x) => x.note && x.note !== 'Pitch submitted');
  return (
    <footer className="opp-dfoot">
      <div className="opp-history">
        <span className="opp-history__label">Stage history</span>
        {h.length === 0 ? (
          <span className="tcc-na">{NA}</span>
        ) : (
          h.map((x, i) => (
            <span key={x.id || i} className="opp-history__step">
              {i > 0 && <i className="bi bi-arrow-right" aria-hidden="true" />}
              {stageName(x.to_stage)}{' '}
              <span className="tcc-mono opp-sub">({fmtShortDate(x.created_at)})</span>
            </span>
          ))
        )}
      </div>
      {notes.length > 0 && (
        <ul className="opp-notes">
          {notes.map((x) => (
            <li key={x.id}>
              <span className="tcc-mono">{fmtShortDate(x.created_at)}</span> {stageName(x.to_stage)}
              , {x.actor_name}: {x.note}
            </li>
          ))}
        </ul>
      )}
      {row.stage === 'approved' && (
        <p className="opp-note">
          <i className="bi bi-info-circle" aria-hidden="true" /> Approving a pitch does not create a
          position. Record it on the Trading Desk; the pitch can then move to In portfolio.
        </p>
      )}
    </footer>
  );
}
