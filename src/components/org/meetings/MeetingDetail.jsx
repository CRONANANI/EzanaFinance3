'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ds';
import { stripDemoLabel } from '@/lib/org-display';
import {
  AGENDA_KINDS,
  DELIVERABLE_KINDS,
  NA,
  RSVP_LABELS,
  RSVP_VALUES,
  VOTE_LABELS,
  VOTE_VALUES,
  agendaMinutes,
  categoryLabel,
  fmtDateTime,
  isCompleted,
  isNotClosed,
  isVoterRole,
  kindLabel,
  repliesByRole,
  roleLabel,
  statusLabel,
  voteBlocker,
} from '@/lib/org-meetings-model';
import { Skel, SectionError } from '@/components/org/command-center/parts';

const PIPELINE = '/org-team-hub/pitches';

function Sec({ id, title, aside, children, className = '' }) {
  return (
    <section className={`omt-sec ${className}`.trim()} aria-labelledby={id}>
      <div className="omt-sec__head">
        <h3 className="omt-sec__title" id={id}>
          {title}
        </h3>
        {aside ? <div className="omt-sec__aside">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

const REPLY_ICON = {
  yes: 'bi-check-lg',
  maybe: 'bi-question-lg',
  no: 'bi-x-lg',
  pending: 'bi-dash',
};
const REPLY_TONE = { yes: 'tcc-pos', maybe: 'tcc-warn', no: 'tcc-neg', pending: 'tcc-na' };

function Reply({ rsvp }) {
  const r = RSVP_VALUES.includes(rsvp) ? rsvp : 'pending';
  return (
    <span className={`omt-reply ${REPLY_TONE[r]}`}>
      <i className={`bi ${REPLY_ICON[r]}`} aria-hidden="true" />
      {RSVP_LABELS[r]}
    </span>
  );
}

/* ── Agenda ─────────────────────────────────────────────────────────────── */
const EMPTY_ITEM = { label: '', kind: 'discussion', owner: '', minutes: '' };

function Agenda({ meeting, canEdit, busy, onSave }) {
  const items = Array.isArray(meeting.agenda) ? meeting.agenda : [];
  const [draft, setDraft] = useState(EMPTY_ITEM);
  const total = agendaMinutes(items);
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onSave(next);
  };
  const add = async (e) => {
    e.preventDefault();
    if (!draft.label.trim()) return;
    const ok = await onSave([
      ...items,
      {
        label: draft.label.trim(),
        kind: draft.kind,
        owner: draft.owner.trim() || null,
        minutes: draft.minutes === '' ? null : Number(draft.minutes),
      },
    ]);
    if (ok) setDraft(EMPTY_ITEM);
  };

  return (
    <Sec
      id="omt-agenda"
      title="Agenda"
      aside={
        items.length > 0 ? (
          <span className="tcc-meta tcc-mono">
            {items.length} {items.length === 1 ? 'item' : 'items'}, {total} min
          </span>
        ) : null
      }
    >
      {items.length === 0 ? (
        <p className="tcc-state">
          <span>No agenda items yet.</span>
          {canEdit && (
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              onClick={() => document.getElementById('omt-agenda-new')?.focus()}
            >
              Add an item
            </button>
          )}
        </p>
      ) : (
        <table className="omt-table omt-agenda">
          <thead>
            <tr>
              <th scope="col" className="omt-num">
                #
              </th>
              <th scope="col">Item</th>
              <th scope="col">Type</th>
              <th scope="col">Owner</th>
              <th scope="col" className="omt-num">
                Min
              </th>
              {canEdit && (
                <th scope="col">
                  <span className="tcc-sr">Order and remove</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id || i}>
                <td className="omt-num tcc-mono">{i + 1}</td>
                <td className="omt-agenda__label">{it.label}</td>
                <td>{kindLabel(it.kind)}</td>
                <td>{it.owner || NA}</td>
                <td className="omt-num tcc-mono">{it.minutes ?? NA}</td>
                {canEdit && (
                  <td className="omt-rowctl">
                    <button
                      type="button"
                      className="tcc-textbtn"
                      aria-label={`Move "${it.label}" up`}
                      disabled={busy || i === 0}
                      onClick={() => move(i, -1)}
                    >
                      <i className="bi bi-arrow-up" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="tcc-textbtn"
                      aria-label={`Move "${it.label}" down`}
                      disabled={busy || i === items.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <i className="bi bi-arrow-down" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="tcc-textbtn omt-danger"
                      aria-label={`Remove "${it.label}"`}
                      disabled={busy}
                      onClick={() => onSave(items.filter((_, x) => x !== i))}
                    >
                      <i className="bi bi-x-lg" aria-hidden="true" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {canEdit && (
        <form className="omt-addrow omt-addrow--agenda" onSubmit={add}>
          <label className="omt-field omt-field--grow">
            <span className="tcc-sr">Agenda item</span>
            <input
              id="omt-agenda-new"
              className="omt-input"
              placeholder="Add an agenda item"
              maxLength={240}
              value={draft.label}
              onChange={(e) => setDraft((x) => ({ ...x, label: e.target.value }))}
            />
          </label>
          <label className="omt-field">
            <span className="tcc-sr">Type</span>
            <select
              className="omt-input omt-select"
              value={draft.kind}
              onChange={(e) => setDraft((x) => ({ ...x, kind: e.target.value }))}
            >
              {AGENDA_KINDS.map((k) => (
                <option key={k} value={k}>
                  {kindLabel(k)}
                </option>
              ))}
            </select>
          </label>
          <label className="omt-field">
            <span className="tcc-sr">Owner</span>
            <input
              className="omt-input"
              placeholder="Owner"
              maxLength={120}
              value={draft.owner}
              onChange={(e) => setDraft((x) => ({ ...x, owner: e.target.value }))}
            />
          </label>
          <label className="omt-field omt-field--min">
            <span className="tcc-sr">Minutes</span>
            <input
              className="omt-input tcc-mono"
              type="number"
              min="0"
              max="600"
              placeholder="Min"
              value={draft.minutes}
              onChange={(e) => setDraft((x) => ({ ...x, minutes: e.target.value }))}
            />
          </label>
          <button
            type="submit"
            className="tcc-textbtn tcc-textbtn--accent"
            disabled={busy || !draft.label.trim()}
          >
            <i className="bi bi-plus-lg" aria-hidden="true" />
            Add item
          </button>
        </form>
      )}
    </Sec>
  );
}

/* ── Attendees, replies and quorum ──────────────────────────────────────── */
function Attendees({ detail, viewer, completed, now, busy, onAdd, onAttended }) {
  const [pick, setPick] = useState('');
  const attendees = detail.attendees || [];
  const invited = new Set(attendees.map((a) => a.member_id));
  const addable = (detail.roster || []).filter((m) => !invited.has(m.id));
  /* Attendance is a fact after the meeting: shown once it is completed or its
     date has passed, or when someone has already been marked. */
  const showAttended =
    completed || isNotClosed(detail.meeting, now) || attendees.some((a) => a.attended != null);
  const canMark = viewer.canManage && showAttended;

  return (
    <div className="omt-people">
      <Sec
        id="omt-attendees"
        title="Attendees and replies"
        aside={
          attendees.length > 0 ? (
            <span className="tcc-meta tcc-mono">{attendees.length} invited</span>
          ) : null
        }
      >
        {attendees.length === 0 ? (
          <p className="tcc-state">
            <span>Nobody has been invited yet.</span>
            {viewer.canManage && !completed && addable.length > 0 && (
              <button
                type="button"
                className="tcc-textbtn tcc-textbtn--accent"
                onClick={() => document.getElementById('omt-invite')?.focus()}
              >
                Invite a member
              </button>
            )}
          </p>
        ) : (
          <table className="omt-table omt-attn">
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Role</th>
                <th scope="col">Reply</th>
                {(showAttended || canMark) && <th scope="col">Attended</th>}
              </tr>
            </thead>
            <tbody>
              {attendees.map((a) => (
                <tr key={a.id || a.member_id}>
                  <td className="omt-attn__name">
                    {a.display_name}
                    {a.member_id === viewer.memberId && <span className="tcc-meta"> (you)</span>}
                  </td>
                  <td>
                    {roleLabel(a.role, a.sub_role)}
                    {isVoterRole(a.role) && detail.meeting.category === 'ic' && (
                      <span className="tcc-sr">, voting member</span>
                    )}
                  </td>
                  <td>
                    <Reply rsvp={a.rsvp} />
                  </td>
                  {(showAttended || canMark) && (
                    <td>
                      {canMark ? (
                        <span
                          className="omt-mark"
                          role="group"
                          aria-label={`${a.display_name} attended`}
                        >
                          <button
                            type="button"
                            className={`tcc-toggle${a.attended === true ? ' is-on' : ''}`}
                            aria-pressed={a.attended === true}
                            disabled={busy}
                            onClick={() => onAttended(a.member_id, true)}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            className={`tcc-toggle${a.attended === false ? ' is-on' : ''}`}
                            aria-pressed={a.attended === false}
                            disabled={busy}
                            onClick={() => onAttended(a.member_id, false)}
                          >
                            Absent
                          </button>
                        </span>
                      ) : a.attended === true ? (
                        <span className="omt-reply tcc-pos">
                          <i className="bi bi-check-lg" aria-hidden="true" />
                          Present
                        </span>
                      ) : a.attended === false ? (
                        <span className="omt-reply tcc-na">Absent</span>
                      ) : (
                        <span className="tcc-na">{NA}</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {viewer.canManage && !completed && addable.length > 0 && (
          <div className="omt-addrow">
            <label className="omt-field omt-field--grow">
              <span className="tcc-sr">Invite a member</span>
              <select
                id="omt-invite"
                className="omt-input omt-select"
                value={pick}
                onChange={(e) => setPick(e.target.value)}
              >
                <option value="">Invite a member</option>
                {addable.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name} ({roleLabel(m.role, m.sub_role)})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              disabled={busy || !pick}
              onClick={async () => {
                if (await onAdd(pick)) setPick('');
              }}
            >
              <i className="bi bi-person-plus" aria-hidden="true" />
              Invite
            </button>
          </div>
        )}
      </Sec>

      <span className="tcc-vrule omt-people__rule" aria-hidden="true" />

      <Sec id="omt-quorum" title={detail.votes ? 'Quorum' : 'Replies by role'}>
        {detail.votes ? (
          <dl className="omt-dl">
            <div>
              <dt>Voting members</dt>
              <dd className="tcc-mono">{detail.votes.eligible}</dd>
            </div>
            <div>
              <dt>Confirmed</dt>
              <dd className="tcc-mono">{detail.votes.confirmed}</dd>
            </div>
            <div>
              <dt>Needed</dt>
              <dd className="tcc-mono">
                {detail.votes.quorum_needed}
                <span className="tcc-meta"> at {detail.votes.quorum_pct}%</span>
              </dd>
            </div>
            <div>
              <dt>Quorum</dt>
              <dd className={detail.votes.quorum_met ? 'tcc-pos' : 'tcc-warn'}>
                <i
                  className={`bi ${detail.votes.quorum_met ? 'bi-check-lg' : 'bi-exclamation-triangle'}`}
                  aria-hidden="true"
                />{' '}
                {detail.votes.quorum_met ? 'Met' : 'Not met'}
              </dd>
            </div>
          </dl>
        ) : null}
        {repliesByRole(attendees).length === 0 ? (
          !detail.votes && <p className="tcc-meta">No replies to count.</p>
        ) : (
          <table className="omt-table omt-roles">
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col" className="omt-num">
                  Yes
                </th>
                <th scope="col" className="omt-num">
                  Invited
                </th>
              </tr>
            </thead>
            <tbody>
              {repliesByRole(attendees).map((g) => (
                <tr key={g.key}>
                  <td>
                    {g.label}
                    {detail.votes && !g.counts && <span className="tcc-meta"> (not counted)</span>}
                  </td>
                  <td className="omt-num tcc-mono">{g.yes}</td>
                  <td className="omt-num tcc-mono">{g.invited}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {detail.votes && (
          <p className="omt-foot">
            Executives and portfolio managers who replied yes or were marked present count toward
            quorum.
          </p>
        )}
      </Sec>
    </div>
  );
}

/* ── Committee vote ─────────────────────────────────────────────────────── */
function Vote({ detail, viewer, busy, onVote }) {
  const v = detail.votes;
  const m = detail.meeting;
  const completed = isCompleted(m);
  const blocked = voteBlocker({ meeting: m, role: viewer.role, quorumMet: v.quorum_met });
  const voter = isVoterRole(viewer.role);

  return (
    <Sec id="omt-vote" title="Committee vote">
      <dl className="omt-dl omt-dl--row">
        <div>
          <dt>Status</dt>
          <dd>{completed ? 'Completed' : 'Open'}</dd>
        </div>
        <div>
          <dt>Ballots received</dt>
          <dd className="tcc-mono">
            {v.received} of {v.eligible}
          </dd>
        </div>
        <div>
          <dt>Quorum</dt>
          <dd className={v.quorum_met ? 'tcc-pos' : 'tcc-warn'}>
            {v.quorum_met ? 'Met' : 'Not met'}
          </dd>
        </div>
        {completed && v.tally && (
          <div>
            <dt>Final count</dt>
            <dd className="tcc-mono">
              Buy {v.tally.buy}, Pass {v.tally.pass}, Abstain {v.tally.abstain}
            </dd>
          </div>
        )}
      </dl>

      <div className="omt-myvote">
        <span className="omt-myvote__label">Your vote</span>
        {voter && !completed ? (
          <span className="tcc-toggles" role="group" aria-label="Your vote">
            {VOTE_VALUES.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`tcc-toggle${v.mine === opt ? ' is-on' : ''}`}
                aria-pressed={v.mine === opt}
                disabled={busy || Boolean(blocked)}
                onClick={() => onVote(opt)}
              >
                {VOTE_LABELS[opt]}
              </button>
            ))}
          </span>
        ) : (
          <span className={v.mine ? '' : 'tcc-na'}>
            {v.mine ? VOTE_LABELS[v.mine] : voter ? 'No vote cast' : NA}
          </span>
        )}
      </div>
      {!completed && (
        <p className="omt-foot">
          {!voter ? 'Only executives and portfolio managers vote. ' : ''}
          {voter && blocked ? `${blocked} ` : ''}
          {voter && !blocked && v.mine
            ? 'You can change your vote until the meeting is completed. '
            : ''}
          Counts and who voted stay hidden until the meeting is completed.
        </p>
      )}
    </Sec>
  );
}

/* ── Completed record: recording, documents, notes ──────────────────────── */
function Recording({ meeting, canEdit, busy, onLink }) {
  const [url, setUrl] = useState('');
  const [err, setErr] = useState(null);
  if (meeting.recording_url) {
    return (
      <Sec id="omt-recording" title="Recording">
        <a
          className="tcc-link"
          href={meeting.recording_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <i className="bi bi-play-circle" aria-hidden="true" />
          Open recording
          <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
        </a>
      </Sec>
    );
  }
  return (
    <Sec id="omt-recording" title="Recording">
      {canEdit ? (
        <form
          className="omt-addrow"
          onSubmit={async (e) => {
            e.preventDefault();
            const v = url.trim();
            if (!/^https?:\/\/\S+$/i.test(v)) {
              setErr('Enter a web link that starts with http or https.');
              return;
            }
            setErr(null);
            if (await onLink(v)) setUrl('');
          }}
        >
          <label className="omt-field omt-field--grow">
            <span className="tcc-sr">Recording link</span>
            <input
              className="omt-input"
              type="url"
              placeholder="Paste a link to the recording"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="tcc-textbtn tcc-textbtn--accent"
            disabled={busy || !url.trim()}
          >
            <i className="bi bi-link-45deg" aria-hidden="true" />
            Link recording
          </button>
        </form>
      ) : (
        <p className="tcc-state">
          <span>No recording linked.</span>
        </p>
      )}
      {err && <p className="omt-fielderror">{err}</p>}
      <p className="omt-foot">Recording, transcripts and summaries are not available yet.</p>
    </Sec>
  );
}

function Documents({ detail, canAdd, canRemove, busy, onAdd, onRemove }) {
  const [kind, setKind] = useState('memo');
  const [label, setLabel] = useState('');
  const items = detail.deliverables || [];
  return (
    <Sec id="omt-docs" title="Documents discussed">
      {items.length === 0 ? (
        <p className="tcc-state">
          <span>No documents recorded.</span>
          {canAdd && (
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              onClick={() => document.getElementById('omt-doc-label')?.focus()}
            >
              Record a document
            </button>
          )}
        </p>
      ) : (
        <table className="omt-table omt-docs">
          <thead>
            <tr>
              <th scope="col">Type</th>
              <th scope="col">Document</th>
              {canRemove && (
                <th scope="col">
                  <span className="tcc-sr">Remove</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id}>
                <td className="omt-docs__kind">{kindLabel(x.kind)}</td>
                <td>{x.label}</td>
                {canRemove && (
                  <td className="omt-rowctl">
                    <button
                      type="button"
                      className="tcc-textbtn omt-danger"
                      aria-label={`Remove "${x.label}"`}
                      disabled={busy}
                      onClick={() => onRemove(x.id)}
                    >
                      <i className="bi bi-x-lg" aria-hidden="true" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {canAdd && (
        <form
          className="omt-addrow"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!label.trim()) return;
            if (await onAdd(kind, label.trim())) setLabel('');
          }}
        >
          <label className="omt-field">
            <span className="tcc-sr">Document type</span>
            <select
              className="omt-input omt-select"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              {DELIVERABLE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {kindLabel(k)}
                </option>
              ))}
            </select>
          </label>
          <label className="omt-field omt-field--grow">
            <span className="tcc-sr">Document name</span>
            <input
              id="omt-doc-label"
              className="omt-input"
              placeholder="Document name"
              maxLength={200}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="tcc-textbtn tcc-textbtn--accent"
            disabled={busy || !label.trim()}
          >
            <i className="bi bi-plus-lg" aria-hidden="true" />
            Add document
          </button>
        </form>
      )}
    </Sec>
  );
}

/* ── The open meeting ───────────────────────────────────────────────────── */
export function MeetingDetail({
  id,
  row,
  state,
  listViewer,
  sample,
  now,
  act,
  onRetry,
  onEdit,
  onNotice,
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  if (state.status === 'loading' && !state.data) {
    return (
      <div className="omt-detail omt-skel" aria-busy="true">
        <Skel w="55%" h={22} />
        <Skel w="40%" h={12} />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skel key={i} w="100%" h={14} />
        ))}
      </div>
    );
  }
  if (state.status === 'missing') {
    return (
      <p className="tcc-state">
        <span>This meeting was not found. It may have been removed.</span>
      </p>
    );
  }
  if (state.status === 'error' || !state.data) {
    return <SectionError message="This meeting could not be loaded." onRetry={onRetry} />;
  }

  const detail = state.data;
  const m = detail.meeting;
  const viewer = { ...listViewer, ...detail.viewer };
  const completed = isCompleted(m);
  const canEdit = Boolean(viewer.canManage);
  const mine = (detail.attendees || []).find((a) => a.member_id === viewer.memberId) || null;
  const title = stripDemoLabel(m.title || row?.title || '');

  /* Run one action. Shows what happened and returns whether it went through. */
  const run = async (action, failText, okText = null) => {
    setBusy(true);
    const res = await act({ ...action, id });
    setBusy(false);
    if (!res.ok) {
      onNotice({ tone: 'error', text: res.error ? `${failText} ${res.error}` : failText });
      return false;
    }
    if (okText) {
      onNotice({
        tone: 'ok',
        text: sample ? `${okText} Sample content: this is not saved.` : okText,
      });
    }
    return true;
  };

  const copyLink = async () => {
    try {
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('m', id);
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
    } catch {
      onNotice({ tone: 'error', text: 'The link could not be copied.' });
    }
  };

  return (
    <article className="omt-detail" aria-labelledby="omt-detail-title">
      <header className="omt-dhead">
        <div className="omt-dhead__line">
          <h2 className="omt-dhead__title" id="omt-detail-title">
            {title}
          </h2>
          <button
            type="button"
            className="tcc-textbtn omt-copy"
            onClick={copyLink}
            aria-label="Copy a link to this meeting"
          >
            <i className={`bi ${copied ? 'bi-check2' : 'bi-link-45deg'}`} aria-hidden="true" />
            <span>{copied ? 'Link copied' : 'Copy link'}</span>
          </button>
        </div>
        <p className="omt-dhead__meta">
          <span className="tcc-mono">
            <i className="bi bi-calendar3" aria-hidden="true" /> {fmtDateTime(m.scheduled_at)}
          </span>
          <span>
            <i className="bi bi-geo-alt" aria-hidden="true" /> {m.location || NA}
          </span>
          <span>{categoryLabel(m.category)}</span>
          <span className={isNotClosed(m, now) ? 'tcc-warn' : completed ? 'tcc-pos' : ''}>
            {isNotClosed(m, now) && <i className="bi bi-exclamation-triangle" aria-hidden="true" />}{' '}
            {statusLabel(m, now)}
          </span>
          {m.category === 'ic' && (
            <span className="tcc-mono">Quorum {detail.votes?.quorum_pct ?? NA}%</span>
          )}
        </p>
        {isNotClosed(m, now) && (
          <p className="omt-foot">
            This meeting&apos;s date has passed and it was not marked completed.
          </p>
        )}
        {canEdit && (
          <div className="omt-dhead__actions">
            <button type="button" className="tcc-textbtn" onClick={() => onEdit(m)}>
              <i className="bi bi-pencil" aria-hidden="true" />
              Edit details
            </button>
            {!completed && (
              <button
                type="button"
                className="tcc-textbtn"
                disabled={busy}
                onClick={() => setConfirming(true)}
              >
                <i className="bi bi-check2-circle" aria-hidden="true" />
                Mark completed
              </button>
            )}
          </div>
        )}
      </header>

      {!completed && mine && (
        <div className="omt-yourreply">
          <span className="omt-myvote__label">Your reply</span>
          <span className="tcc-toggles" role="group" aria-label="Your reply">
            {RSVP_VALUES.map((r) => (
              <button
                key={r}
                type="button"
                className={`tcc-toggle${mine.rsvp === r ? ' is-on' : ''}`}
                aria-pressed={mine.rsvp === r}
                disabled={busy}
                onClick={() => run({ type: 'rsvp', rsvp: r }, 'Your reply was not saved.')}
              >
                {RSVP_LABELS[r]}
              </button>
            ))}
          </span>
          {mine.rsvp === 'pending' && (
            <span className="tcc-warn omt-yourreply__hint">Not replied</span>
          )}
        </div>
      )}

      <Agenda
        meeting={m}
        canEdit={canEdit && !completed}
        busy={busy}
        onSave={(agenda) => run({ type: 'agenda', agenda }, 'The agenda was not saved.')}
      />

      <Attendees
        detail={detail}
        viewer={viewer}
        completed={completed}
        now={now}
        busy={busy}
        onAdd={(memberId) => run({ type: 'addAttendee', memberId }, 'The member was not invited.')}
        onAttended={(memberId, attended) =>
          run({ type: 'attended', memberId, attended }, 'Attendance was not saved.')
        }
      />

      {(detail.preRead || []).length > 0 ? (
        <Sec id="omt-preread" title="Pre-read pack">
          <ul className="omt-preread">
            {detail.preRead.map((p) => (
              <li key={p.id}>
                <i className="bi bi-file-earmark-text" aria-hidden="true" />
                <div>
                  <Link
                    className="tcc-rowlink omt-preread__label"
                    href={`${PIPELINE}?pitch=${encodeURIComponent(p.id)}`}
                  >
                    <span className="tcc-mono tcc-ticker">{p.label.split(':')[0]}</span>
                    {p.label.includes(':') ? `:${p.label.split(':').slice(1).join(':')}` : ''}
                  </Link>
                  {p.note && <p className="omt-preread__note">{p.note}</p>}
                </div>
                <Link
                  className="tcc-link"
                  href={`${PIPELINE}?pitch=${encodeURIComponent(p.id)}`}
                  aria-label={`Open ${p.label} in the Pitch Pipeline`}
                >
                  Pitch <i className="bi bi-arrow-up-right" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Sec>
      ) : (
        m.category === 'ic' &&
        canEdit &&
        !completed && (
          <Sec id="omt-preread" title="Pre-read pack">
            <p className="tcc-state">
              <span>No pitch is linked to this meeting.</span>
              <button
                type="button"
                className="tcc-textbtn tcc-textbtn--accent"
                onClick={() => onEdit(m)}
              >
                Link a pitch
              </button>
            </p>
          </Sec>
        )
      )}

      {detail.votes && (
        <Vote
          detail={detail}
          viewer={viewer}
          busy={busy}
          onVote={(vote) =>
            run({ type: 'vote', vote }, 'Your vote was not recorded.', 'Your vote was recorded.')
          }
        />
      )}

      {completed && (
        <>
          <Recording
            meeting={m}
            canEdit={canEdit}
            busy={busy}
            onLink={(url) =>
              run(
                { type: 'recording', url },
                'The recording link was not saved.',
                'Recording linked.',
              )
            }
          />
          <Documents
            detail={detail}
            canAdd={Boolean(viewer.canRecordDocuments)}
            canRemove={canEdit}
            busy={busy}
            onAdd={(kind, label) =>
              run({ type: 'addDocument', kind, label }, 'The document was not recorded.')
            }
            onRemove={(docId) =>
              run({ type: 'removeDocument', docId }, 'The document was not removed.')
            }
          />
          {Array.isArray(m.minutes) && m.minutes.some((x) => x?.note) && (
            <Sec id="omt-notes" title="Notes">
              <ul className="omt-notes">
                {m.minutes
                  .filter((x) => x?.note)
                  .map((x, i) => (
                    <li key={i}>{x.note}</li>
                  ))}
              </ul>
            </Sec>
          )}
        </>
      )}

      <Modal
        open={confirming}
        onClose={busy ? undefined : () => setConfirming(false)}
        title="Mark this meeting completed?"
        size={460}
        className="omt-dialog"
        footer={
          <>
            <button
              type="button"
              className="tcc-textbtn"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="tcc-btn"
              disabled={busy}
              onClick={async () => {
                const ok = await run(
                  { type: 'complete' },
                  'The meeting was not marked completed.',
                  `"${title}" was marked completed.`,
                );
                if (ok) setConfirming(false);
              }}
            >
              Mark completed
            </button>
          </>
        }
      >
        <p className="omt-dialog__text">
          This cannot be undone. The meeting leaves every upcoming list
          {m.category === 'ic'
            ? ', the committee vote closes and the final count becomes visible to members.'
            : '.'}
        </p>
      </Modal>
    </article>
  );
}
