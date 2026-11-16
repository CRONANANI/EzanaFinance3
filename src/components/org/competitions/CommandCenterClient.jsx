'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Input, Modal } from '@/components/ds';
import {
  NA,
  NEXT_STAGE_LABEL,
  fmtDate,
  fmtTime,
  hostTools,
  nextStage,
  readinessOf,
} from '@/lib/org-competitions-model';
import { DeliverableList, EntryRules, KeyValues, ReadinessList } from './WorkspaceParts';
import './competitions.css';

const HOST_TABS = ['structure', 'invitations', 'rubric'];
const dayOf = (v) => (v ? String(v).slice(0, 10) : '');

/**
 * One event's Overview, and for host managers the Structure, Invitations and
 * Rubric host tools (?tab=). The workspace head and tabs come from the
 * route's frame. Host managers: figures, readiness, the one step forward,
 * host actions, dates and rules link, announcements. Entrants: their entry,
 * the host's rules, what they owe, their slot and their result after reveal.
 */
export function CommandCenterClient({
  initialCompetition,
  initialStructure,
  canManage,
  initialTab = 'overview',
  entrant = null,
}) {
  const [competition, setCompetition] = useState(initialCompetition);
  const [structure, setStructure] = useState(initialStructure || emptyStructure());
  const tab = canManage && HOST_TABS.includes(initialTab) ? initialTab : 'overview';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [datesOpen, setDatesOpen] = useState(false);
  const announceRef = useRef(null);

  const compId = competition.id;

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/org/pitch-competitions/${compId}`, { cache: 'no-store' });
    if (!res.ok) return;
    const json = await res.json().catch(() => ({}));
    if (json.competition) setCompetition((c) => ({ ...c, ...json.competition }));
    if (json.structure) setStructure(json.structure);
  }, [compId]);

  // One entry point for every structure mutation, then a refetch on success.
  const act = useCallback(
    async (body) => {
      setBusy(true);
      setError('');
      try {
        const res = await fetch(`/api/org/pitch-competitions/${compId}/structure`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(json?.error || 'That change did not save. Try again.');
          return false;
        }
        await refetch();
        return true;
      } catch {
        setError('Could not connect. Try again.');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [compId, refetch],
  );

  const patchCompetition = useCallback(
    async (patch) => {
      setBusy(true);
      setError('');
      try {
        const res = await fetch(`/api/org/pitch-competitions/${compId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = json?.error || 'That change did not save. Try again.';
          setError(msg);
          return { ok: false, error: msg };
        }
        if (json.competition) setCompetition((c) => ({ ...c, ...json.competition }));
        return { ok: true };
      } catch {
        setError('Could not connect. Try again.');
        return { ok: false, error: 'Could not connect. Try again.' };
      } finally {
        setBusy(false);
      }
    },
    [compId],
  );

  const readiness = useMemo(
    () => readinessOf(structure.counts, (structure.rubric || []).length),
    [structure],
  );
  const c = structure.counts || {};

  return (
    <div className="pcx-cc">
      {canManage && tab !== 'overview' && (
        <nav className="pcx-subtabs" aria-label="Host tools">
          {hostTools(competition.slug).map((t) => (
            <Link
              key={t.key}
              href={t.href}
              className={`tcc-toggle${tab === t.key ? ' is-on' : ''}`}
              aria-current={tab === t.key ? 'page' : undefined}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      )}

      {error ? (
        <p className="tcc-state tcc-state--error" role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}

      {tab === 'overview' && (
        <>
          <div className="tcc-kpistrip pcx-kpis" role="list" aria-label="Event figures">
            <Kpi
              icon="bi-people"
              label="Teams"
              value={c.teams}
              sub={`${c.teamsRegistered || 0} registered`}
            />
            <Kpi icon="bi-upload" label="Submitted" value={c.teamsSubmitted} />
            <Kpi icon="bi-person-badge" label="Judges" value={c.judges} />
            <Kpi
              icon="bi-door-open"
              label="Rooms"
              value={c.rooms}
              sub={`${c.rounds || 0} rounds`}
            />
          </div>
          {competition.isHost ? (
            <HostOverview
              competition={competition}
              readiness={readiness}
              canManage={canManage}
              busy={busy}
              onAdvance={(status) => patchCompetition({ status })}
              onDates={() => setDatesOpen(true)}
              onAnnounce={() => announceRef.current?.focus()}
              announcements={
                <AnnouncementsPanel compId={compId} canManage={canManage} inputRef={announceRef} />
              }
            />
          ) : (
            <EntrantOverview
              competition={competition}
              entrant={entrant}
              announcements={<AnnouncementsPanel compId={compId} canManage={false} />}
            />
          )}
        </>
      )}
      {tab === 'structure' && (
        <StructureTab structure={structure} canManage={canManage} busy={busy} act={act} />
      )}
      {tab === 'invitations' && (
        <InvitationsTab
          structure={structure}
          canManage={canManage}
          busy={busy}
          act={act}
          compId={compId}
        />
      )}
      {tab === 'rubric' && (
        <RubricTab
          compId={compId}
          rubric={structure.rubric}
          canManage={canManage}
          onSaved={refetch}
        />
      )}

      {datesOpen && (
        <DatesDialog
          competition={competition}
          onClose={() => setDatesOpen(false)}
          onSave={async (patch) => {
            const res = await patchCompetition(patch);
            if (res.ok) setDatesOpen(false);
            return res;
          }}
        />
      )}
    </div>
  );
}

function Kpi({ icon, label, value, sub }) {
  return (
    <div className="tcc-kpi" role="listitem" title={sub}>
      <i className={`bi ${icon} tcc-kpi__icon`} aria-hidden="true" />
      <span className="tcc-kpi__label">{label}</span>
      <span className="tcc-kpi__value tcc-mono">{value ?? 0}</span>
    </div>
  );
}

/* ─────────────── Overview: host ─────────────── */
function HostOverview({
  competition,
  readiness,
  canManage,
  busy,
  onAdvance,
  onDates,
  onAnnounce,
  announcements,
}) {
  const next = nextStage(competition.status);
  const blocked = competition.status === 'draft' && !readiness.allMet;
  const slug = competition.slug;
  return (
    <div className="pcx-split">
      <div className="pcx-col">
        <section className="pcx-sec" aria-labelledby="pcx-ready-title">
          <div className="pcx-sec__head">
            <h2 className="pcx-h2" id="pcx-ready-title">
              Readiness checklist
            </h2>
            <span className="tcc-mono pcx-muted">
              {readiness.met} of {readiness.total}
            </span>
          </div>
          <ReadinessList readiness={readiness} />
          {canManage && next ? (
            <div className="pcx-actions">
              <button
                type="button"
                className="pcx-btn pcx-btn--primary"
                disabled={busy || blocked}
                onClick={() => onAdvance(next)}
              >
                {NEXT_STAGE_LABEL[competition.status]}
              </button>
              {blocked ? (
                <span className="pcx-muted">Finish the checklist to open registration.</span>
              ) : null}
            </div>
          ) : null}
        </section>

        {canManage && (
          <section className="pcx-sec" aria-labelledby="pcx-hostact-title">
            <h2 className="pcx-h2" id="pcx-hostact-title">
              Host actions
            </h2>
            <div className="pcx-linkrow">
              <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onDates}>
                Edit dates and rules link
              </button>
              <button
                type="button"
                className="tcc-textbtn tcc-textbtn--accent"
                onClick={onAnnounce}
              >
                Post announcement
              </button>
              <Link className="tcc-link" href={`/org-competitions/${slug}/requests`}>
                Join requests
              </Link>
              <Link className="tcc-link" href={`/org-competitions/${slug}?tab=invitations`}>
                Judge scoring links
              </Link>
              <Link className="tcc-link" href={`/org-competitions/${slug}/scoreboard`}>
                Scoreboard
              </Link>
            </div>
          </section>
        )}

        <section className="pcx-sec" aria-labelledby="pcx-dates-title">
          <h2 className="pcx-h2" id="pcx-dates-title">
            Event
          </h2>
          <KeyValues
            rows={[
              ['Theme', competition.theme || NA],
              ['Starts', fmtDate(competition.starts_at), true],
              ['Ends', fmtDate(competition.ends_at), true],
              [
                'Rules link',
                competition.rules_url ? (
                  <a
                    key="r"
                    className="tcc-link"
                    href={competition.rules_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open the rules <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                  </a>
                ) : (
                  NA
                ),
              ],
              [
                'Results',
                competition.results_visible ? 'Revealed to entrants' : 'Hidden from entrants',
              ],
            ]}
          />
        </section>
      </div>
      <span className="tcc-vrule pcx-split__rule" aria-hidden="true" />
      <div className="pcx-col">{announcements}</div>
    </div>
  );
}

/* ─────────────── Overview: entrant ─────────────── */
function EntrantOverview({ competition, entrant, announcements }) {
  const slug = competition.slug;
  const team = entrant?.team;
  const slot = entrant?.slot;
  const result = entrant?.result;
  return (
    <div className="pcx-split">
      <div className="pcx-col">
        <section className="pcx-sec" aria-labelledby="pcx-entry-title">
          <h2 className="pcx-h2" id="pcx-entry-title">
            Your entry
          </h2>
          {team ? (
            <KeyValues
              rows={[
                ['Team', team.team_name],
                ['Ticker', team.ticker || NA, true],
                ['Side', team.side ? team.side.charAt(0).toUpperCase() + team.side.slice(1) : NA],
                [
                  'Presentation slot',
                  slot?.starts_at
                    ? `${slot.room ? `${slot.room}, ` : ''}${fmtDate(slot.starts_at)} ${fmtTime(slot.starts_at)}`
                    : NA,
                  true,
                ],
              ]}
            />
          ) : (
            <p className="tcc-state">Your council has no team in this competition.</p>
          )}
        </section>
        <section className="pcx-sec" aria-labelledby="pcx-deliv-title">
          <div className="pcx-sec__head">
            <h2 className="pcx-h2" id="pcx-deliv-title">
              Deliverables
            </h2>
            <Link className="tcc-link" href={`/org-competitions/${slug}/deliverables`}>
              Hand in
            </Link>
          </div>
          <DeliverableList
            config={entrant?.config}
            submittedKinds={entrant?.submittedKinds || []}
          />
        </section>
        <section className="pcx-sec" aria-labelledby="pcx-res-title">
          <div className="pcx-sec__head">
            <h2 className="pcx-h2" id="pcx-res-title">
              Result
            </h2>
            {result && (
              <Link className="tcc-link" href={`/org-competitions/${slug}/results`}>
                Breakdown and feedback
              </Link>
            )}
          </div>
          {result ? (
            <KeyValues
              rows={[
                ['Rank', result.rank ?? NA, true],
                [
                  'Weighted score',
                  result.weighted_total == null ? NA : `${result.weighted_total} of 100`,
                  true,
                ],
              ]}
            />
          ) : (
            <p className="tcc-state">Results have not been revealed.</p>
          )}
        </section>
      </div>
      <span className="tcc-vrule pcx-split__rule" aria-hidden="true" />
      <div className="pcx-col">
        <section className="pcx-sec" aria-labelledby="pcx-rules-title">
          <div className="pcx-sec__head">
            <h2 className="pcx-h2" id="pcx-rules-title">
              Entry rules
            </h2>
          </div>
          <EntryRules config={entrant?.config} rulesUrl={competition.rules_url} />
        </section>
        {announcements}
      </div>
    </div>
  );
}

/* ─────────────── Dates and rules link (host) ─────────────── */
function DatesDialog({ competition, onClose, onSave }) {
  const [form, setForm] = useState({
    starts_at: dayOf(competition.starts_at),
    ends_at: dayOf(competition.ends_at),
    rules_url: competition.rules_url || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    if (form.rules_url && !/^https?:\/\//i.test(form.rules_url.trim())) {
      return setError('The rules link must start with http:// or https://.');
    }
    if (form.starts_at && form.ends_at && form.ends_at < form.starts_at) {
      return setError('The end date is before the start date.');
    }
    setBusy(true);
    setError('');
    const res = await onSave({
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      rules_url: form.rules_url.trim() || null,
    });
    setBusy(false);
    if (!res.ok) setError(res.error || 'That change did not save. Try again.');
  };
  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title="Dates and rules link"
      size={520}
      className="pcx-dialog"
      footer={
        <>
          <button type="button" className="tcc-textbtn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <Button
            variant="primary"
            className="tcc-flatbtn"
            loading={busy}
            type="submit"
            form="pcx-dates"
          >
            Save changes
          </Button>
        </>
      }
    >
      <form id="pcx-dates" className="tcc-form" onSubmit={submit} noValidate>
        <p className="tcc-form__note">
          Registration dates and the deliverable due date are under Entry rules.
        </p>
        <div className="tcc-form__pair">
          <Input
            id="pcx-start"
            label="Start date"
            type="date"
            value={form.starts_at}
            onChange={set('starts_at')}
          />
          <Input
            id="pcx-end"
            label="End date"
            type="date"
            value={form.ends_at}
            onChange={set('ends_at')}
          />
        </div>
        <Input
          id="pcx-rules"
          label="Rules link"
          hint="A web address entrants can open"
          value={form.rules_url}
          onChange={set('rules_url')}
        />
        {error && (
          <p className="pcx-fielderror" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

/* ─────────────── Announcements ─────────────── */
function AnnouncementsPanel({ compId, canManage, inputRef }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [form, setForm] = useState({ title: '', body: '' });
  const [busy, setBusy] = useState(false);
  const [postError, setPostError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch(`/api/org/pitch-competitions/${compId}/announcements`, {
        cache: 'no-store',
      });
      if (!res.ok) return setStatus('error');
      const json = await res.json();
      setItems(json.announcements || []);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [compId]);

  useEffect(() => {
    load();
  }, [load]);

  const post = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    setPostError('');
    try {
      const res = await fetch(`/api/org/pitch-competitions/${compId}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title.trim(), body: form.body.trim() || null }),
      });
      if (res.ok) {
        const json = await res.json();
        setItems((a) => [json.announcement, ...a]);
        setForm({ title: '', body: '' });
      } else setPostError('The announcement did not post. Try again.');
    } catch {
      setPostError('Could not connect. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pcx-sec" aria-labelledby="pcx-ann-title">
      <h2 className="pcx-h2" id="pcx-ann-title">
        Announcements
      </h2>
      {canManage ? (
        <form className="pcx-stack-form" onSubmit={post}>
          <input
            ref={inputRef}
            className="pcx-input"
            placeholder="Announcement title"
            aria-label="Announcement title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            className="pcx-input pcx-textarea"
            rows={2}
            placeholder="Details (optional)"
            aria-label="Announcement details"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          <div className="pcx-actions">
            <button type="submit" className="pcx-btn" disabled={busy || !form.title.trim()}>
              Post to all registered teams
            </button>
            {postError && <span className="pcx-error">{postError}</span>}
          </div>
        </form>
      ) : null}
      {status === 'loading' ? (
        <div className="pcx-skel" aria-hidden="true">
          <span className="tcc-skel" style={{ width: '70%', height: 12 }} />
          <span className="tcc-skel" style={{ width: '50%', height: 12 }} />
        </div>
      ) : status === 'error' ? (
        <p className="tcc-state tcc-state--error" role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          <span>Could not load announcements.</span>
          <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={load}>
            Retry
          </button>
        </p>
      ) : items.length === 0 ? (
        <p className="tcc-state">No announcements yet.</p>
      ) : (
        <ul className="pcx-announce">
          {items.map((a) => (
            <li key={a.id} className="pcx-announce-item">
              <div className="pcx-announce-title">{a.title}</div>
              {a.body ? <p className="pcx-announce-body">{a.body}</p> : null}
              {a.created_at ? (
                <span className="tcc-mono pcx-muted pcx-announce-date">
                  {fmtDate(a.created_at)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ─────────────── Structure ─────────────── */
function StructureTab({ structure, canManage, busy, act }) {
  const [roundName, setRoundName] = useState('');
  const teams = structure.teams || [];
  const judges = structure.judges || [];

  return (
    <div className="pcx-tabpanel">
      {canManage ? (
        <form
          className="pcx-inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (roundName.trim())
              act({ action: 'add_round', name: roundName.trim() }).then(
                (okd) => okd && setRoundName(''),
              );
          }}
        >
          <input
            className="pcx-input"
            placeholder="Round name (e.g. Semifinal)"
            aria-label="Round name"
            value={roundName}
            onChange={(e) => setRoundName(e.target.value)}
          />
          <button
            type="submit"
            className="pcx-btn pcx-btn--primary"
            disabled={busy || !roundName.trim()}
          >
            <i className="bi bi-plus-lg" aria-hidden="true" /> Add round
          </button>
        </form>
      ) : null}

      {(structure.rounds || []).length === 0 ? (
        <div className="pcx-empty pcx-empty--sm">
          <i className="bi bi-layers" aria-hidden="true" />
          <p>No rounds yet.</p>
        </div>
      ) : (
        (structure.rounds || []).map((round) => (
          <RoundBlock
            key={round.id}
            round={round}
            teams={teams}
            judges={judges}
            canManage={canManage}
            busy={busy}
            act={act}
          />
        ))
      )}
    </div>
  );
}

function RoundBlock({ round, teams, judges, canManage, busy, act }) {
  const [roomName, setRoomName] = useState('');
  const [roomLoc, setRoomLoc] = useState('');
  const unassigned = teams.filter((t) => !t.room_id);

  return (
    <section className="pcx-round">
      <div className="pcx-round-head">
        <h3 className="pcx-round-name">
          <i className="bi bi-layers" aria-hidden="true" /> {round.name}
        </h3>
        {canManage ? (
          <button
            type="button"
            className="pcx-iconbtn pcx-danger"
            onClick={() => act({ action: 'remove_round', round_id: round.id })}
            disabled={busy}
            aria-label={`Remove ${round.name}`}
          >
            <i className="bi bi-trash3" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {canManage ? (
        <form
          className="pcx-inline-form pcx-inline-form--sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (roomName.trim())
              act({
                action: 'add_room',
                round_id: round.id,
                name: roomName.trim(),
                location: roomLoc.trim() || null,
              }).then((okd) => {
                if (okd) {
                  setRoomName('');
                  setRoomLoc('');
                }
              });
          }}
        >
          <input
            className="pcx-input"
            placeholder="Room name (Room A)"
            aria-label="Room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <input
            className="pcx-input"
            placeholder="Location / link (optional)"
            aria-label="Room location or link"
            value={roomLoc}
            onChange={(e) => setRoomLoc(e.target.value)}
          />
          <button type="submit" className="pcx-btn" disabled={busy || !roomName.trim()}>
            <i className="bi bi-plus-lg" aria-hidden="true" /> Room
          </button>
        </form>
      ) : null}

      {round.rooms.length === 0 ? (
        <p className="pcx-muted pcx-indent">No rooms in this round yet.</p>
      ) : (
        <div className="pcx-rooms">
          {round.rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              unassigned={unassigned}
              judges={judges}
              canManage={canManage}
              busy={busy}
              act={act}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RoomCard({ room, unassigned, judges, canManage, busy, act }) {
  const assignedJudgeIds = new Set((room.judges || []).map((j) => j.id));
  const availableJudges = judges.filter((j) => !assignedJudgeIds.has(j.id));

  return (
    <div className="pcx-room">
      <div className="pcx-room-head">
        <span className="pcx-room-name">
          <i className="bi bi-door-open" aria-hidden="true" /> {room.name}
        </span>
        {room.location ? <span className="pcx-muted">{room.location}</span> : null}
        {canManage ? (
          <button
            type="button"
            className="pcx-iconbtn pcx-danger"
            onClick={() => act({ action: 'remove_room', room_id: room.id })}
            disabled={busy}
            aria-label={`Remove ${room.name}`}
          >
            <i className="bi bi-trash3" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="pcx-room-section">
        <span className="pcx-room-sub">
          <i className="bi bi-people" aria-hidden="true" /> Teams
        </span>
        {(room.teams || []).length === 0 ? (
          <span className="pcx-muted">None assigned</span>
        ) : (
          <ul className="pcx-chiplist">
            {room.teams.map((t) => (
              <li key={t.id} className="pcx-chip">
                {t.team_name}
                {t.ticker ? <span className="pcx-chip-meta"> {t.ticker}</span> : null}
                {canManage ? (
                  <button
                    type="button"
                    className="pcx-chip-x"
                    onClick={() => act({ action: 'assign_team', team_id: t.id, room_id: null })}
                    disabled={busy}
                    aria-label={`Remove ${t.team_name} from room`}
                  >
                    <i className="bi bi-x" aria-hidden="true" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {canManage && unassigned.length ? (
          <select
            className="pcx-input pcx-input--sm"
            value=""
            onChange={(e) =>
              e.target.value &&
              act({ action: 'assign_team', team_id: e.target.value, room_id: room.id })
            }
            disabled={busy}
            aria-label={`Assign a team to ${room.name}`}
          >
            <option value="">Assign a team</option>
            {unassigned.map((t) => (
              <option key={t.id} value={t.id}>
                {t.team_name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="pcx-room-section">
        <span className="pcx-room-sub">
          <i className="bi bi-hammer" aria-hidden="true" /> Judges
        </span>
        {(room.judges || []).length === 0 ? (
          <span className="pcx-muted">None assigned</span>
        ) : (
          <ul className="pcx-chiplist">
            {room.judges.map((j) => (
              <li key={j.id} className="pcx-chip">
                {j.full_name}
                {j.firm ? <span className="pcx-chip-meta"> {j.firm}</span> : null}
                {canManage ? (
                  <button
                    type="button"
                    className="pcx-chip-x"
                    onClick={() =>
                      act({ action: 'unassign_judge', room_id: room.id, judge_id: j.id })
                    }
                    disabled={busy}
                    aria-label={`Remove ${j.full_name} from room`}
                  >
                    <i className="bi bi-x" aria-hidden="true" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {canManage && availableJudges.length ? (
          <select
            className="pcx-input pcx-input--sm"
            value=""
            onChange={(e) =>
              e.target.value &&
              act({ action: 'assign_judge', room_id: room.id, judge_id: e.target.value })
            }
            disabled={busy}
            aria-label={`Assign a judge to ${room.name}`}
          >
            <option value="">Assign a judge</option>
            {availableJudges.map((j) => (
              <option key={j.id} value={j.id}>
                {j.full_name}
                {j.firm ? ` · ${j.firm}` : ''}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </div>
  );
}

/* ─────────────── Invitations ─────────────── */
function InvitationsTab({ structure, canManage, busy, act, compId }) {
  const [team, setTeam] = useState({ team_name: '', invite_email: '', ticker: '', side: '' });
  const [judge, setJudge] = useState({ full_name: '', email: '', firm: '', title: '' });
  const [links, setLinks] = useState({}); // judgeId -> raw link (shown once)
  const [tokenBusy, setTokenBusy] = useState(null);
  const teams = structure.teams || [];
  const judges = structure.judges || [];

  const manageToken = async (judgeId, action) => {
    setTokenBusy(judgeId);
    try {
      const res = await fetch(`/api/org/pitch-competitions/${compId}/judges/${judgeId}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.link) {
        setLinks((l) => ({ ...l, [judgeId]: json.link }));
      } else if (res.ok && action === 'revoke') {
        setLinks((l) => ({ ...l, [judgeId]: '__revoked__' }));
      }
    } finally {
      setTokenBusy(null);
    }
  };

  const submitTeam = (e) => {
    e.preventDefault();
    if (!team.team_name.trim()) return;
    act({
      action: 'add_team',
      team_name: team.team_name.trim(),
      invite_email: team.invite_email.trim() || null,
      ticker: team.ticker.trim() || null,
      side: team.side || null,
    }).then((okd) => okd && setTeam({ team_name: '', invite_email: '', ticker: '', side: '' }));
  };
  const submitJudge = (e) => {
    e.preventDefault();
    if (!judge.full_name.trim() || !judge.email.trim()) return;
    act({
      action: 'add_judge',
      full_name: judge.full_name.trim(),
      email: judge.email.trim(),
      firm: judge.firm.trim() || null,
      title: judge.title.trim() || null,
    }).then((okd) => okd && setJudge({ full_name: '', email: '', firm: '', title: '' }));
  };

  return (
    <div className="pcx-tabpanel pcx-two-col">
      <section className="pcx-card-block">
        <h2 className="pcx-block-title">
          <i className="bi bi-people" aria-hidden="true" /> Councils and teams
        </h2>
        {canManage ? (
          <form className="pcx-stack-form" onSubmit={submitTeam}>
            <input
              className="pcx-input"
              placeholder="Team name"
              aria-label="Team name"
              value={team.team_name}
              onChange={(e) => setTeam({ ...team, team_name: e.target.value })}
            />
            <input
              className="pcx-input"
              placeholder="Invite email (optional)"
              aria-label="Invite email"
              value={team.invite_email}
              onChange={(e) => setTeam({ ...team, invite_email: e.target.value })}
            />
            <div className="pcx-form-row">
              <input
                className="pcx-input"
                placeholder="Ticker (optional)"
                aria-label="Ticker"
                value={team.ticker}
                onChange={(e) => setTeam({ ...team, ticker: e.target.value })}
              />
              <select
                className="pcx-input"
                value={team.side}
                onChange={(e) => setTeam({ ...team, side: e.target.value })}
                aria-label="Side"
              >
                <option value="">Side</option>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
            <button
              type="submit"
              className="pcx-btn pcx-btn--primary"
              disabled={busy || !team.team_name.trim()}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" /> Invite team
            </button>
          </form>
        ) : null}
        <ul className="pcx-roster">
          {teams.length === 0 ? <li className="pcx-muted">No teams invited yet.</li> : null}
          {teams.map((t) => (
            <li key={t.id} className="pcx-roster-row">
              <span className="pcx-roster-main">{t.team_name}</span>
              <span className="pcx-roster-meta">
                {t.ticker ? `${t.ticker}${t.side ? ` · ${t.side}` : ''}` : t.invite_email || NA}
              </span>
              <span className="pcx-status">{TEAM_LABEL[t.status] || t.status}</span>
              {canManage ? (
                <button
                  type="button"
                  className="pcx-iconbtn pcx-danger"
                  onClick={() => act({ action: 'remove_team', team_id: t.id })}
                  disabled={busy}
                  aria-label={`Remove ${t.team_name}`}
                >
                  <i className="bi bi-trash3" aria-hidden="true" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="pcx-card-block">
        <h2 className="pcx-block-title">
          <i className="bi bi-hammer" aria-hidden="true" /> Judges
        </h2>
        <p className="pcx-muted pcx-note">
          Each judge scores from a private link. A link is shown once, when it is made.
        </p>
        {canManage ? (
          <form className="pcx-stack-form" onSubmit={submitJudge}>
            <input
              className="pcx-input"
              placeholder="Full name"
              aria-label="Judge full name"
              value={judge.full_name}
              onChange={(e) => setJudge({ ...judge, full_name: e.target.value })}
            />
            <input
              className="pcx-input"
              placeholder="Email"
              aria-label="Judge email"
              value={judge.email}
              onChange={(e) => setJudge({ ...judge, email: e.target.value })}
            />
            <div className="pcx-form-row">
              <input
                className="pcx-input"
                placeholder="Firm (optional)"
                aria-label="Firm"
                value={judge.firm}
                onChange={(e) => setJudge({ ...judge, firm: e.target.value })}
              />
              <input
                className="pcx-input"
                placeholder="Title (optional)"
                aria-label="Title"
                value={judge.title}
                onChange={(e) => setJudge({ ...judge, title: e.target.value })}
              />
            </div>
            <button
              type="submit"
              className="pcx-btn pcx-btn--primary"
              disabled={busy || !judge.full_name.trim() || !judge.email.trim()}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" /> Add judge
            </button>
          </form>
        ) : null}
        <ul className="pcx-roster">
          {judges.length === 0 ? <li className="pcx-muted">No judges yet.</li> : null}
          {judges.map((j) => (
            <li key={j.id} className="pcx-judge">
              <div className="pcx-roster-row pcx-judge-row">
                <span className="pcx-roster-main">{j.full_name}</span>
                <span className="pcx-roster-meta">
                  {[j.title, j.firm].filter(Boolean).join(', ') || j.email}
                </span>
                {canManage ? (
                  <div className="pcx-judge-actions">
                    <button
                      type="button"
                      className="pcx-btn pcx-btn--sm"
                      onClick={() => manageToken(j.id, 'generate')}
                      disabled={tokenBusy === j.id}
                    >
                      {tokenBusy === j.id ? (
                        <i className="bi bi-arrow-repeat pcx-spin" aria-hidden="true" />
                      ) : null}{' '}
                      {links[j.id] && links[j.id] !== '__revoked__'
                        ? 'Regenerate'
                        : 'Generate link'}
                    </button>
                    <button
                      type="button"
                      className="pcx-btn pcx-btn--sm"
                      onClick={() => manageToken(j.id, 'revoke')}
                      disabled={tokenBusy === j.id}
                    >
                      Revoke
                    </button>
                    <button
                      type="button"
                      className="pcx-iconbtn pcx-danger"
                      onClick={() => act({ action: 'remove_judge', judge_id: j.id })}
                      disabled={busy}
                      aria-label={`Remove ${j.full_name}`}
                    >
                      <i className="bi bi-trash3" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>
              {links[j.id] === '__revoked__' ? (
                <p className="pcx-muted pcx-judge-link">
                  Link revoked. The judge can no longer access their scorecard.
                </p>
              ) : links[j.id] ? (
                <div className="pcx-judge-link">
                  <input
                    className="pcx-input pcx-input--sm"
                    readOnly
                    value={links[j.id]}
                    onFocus={(e) => e.target.select()}
                    aria-label="Judge magic link"
                  />
                  <button
                    type="button"
                    className="pcx-btn pcx-btn--sm"
                    onClick={() => navigator.clipboard?.writeText(links[j.id])}
                  >
                    Copy
                  </button>
                  <span className="pcx-muted">Shown once, copy it now.</span>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ─────────────── Rubric ─────────────── */
function RubricTab({ compId, rubric, canManage, onSaved }) {
  const [rows, setRows] = useState(() =>
    (rubric || []).map((r) => ({
      label: r.label,
      description: r.description || '',
      weight: r.weight,
      max_score: r.max_score,
    })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const update = (i, key, val) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  const addRow = () =>
    setRows((rs) => [...rs, { label: '', description: '', weight: 1, max_score: 10 }]);
  const removeRow = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const save = async () => {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch(`/api/org/pitch-competitions/${compId}/rubric`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria: rows.map((r, i) => ({ ...r, sort_order: i })) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Could not save the rubric.');
        return;
      }
      setSaved(true);
      onSaved?.();
    } catch {
      setError('Could not connect.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pcx-tabpanel">
      <section className="pcx-card-block">
        <h2 className="pcx-block-title">
          <i className="bi bi-sliders" aria-hidden="true" /> Scoring rubric
        </h2>
        <p className="pcx-muted pcx-note">
          Weights are relative: a criterion at 1.25 counts 25% more than one at 1.0. Judges score
          each criterion out of its maximum, and totals are weighted to a score of 100.
        </p>
        <div className="pcx-rubric">
          <div className="pcx-rubric-head">
            <span>Criterion</span>
            <span>Weight</span>
            <span>Max</span>
            <span aria-hidden="true" />
          </div>
          {rows.map((r, i) => (
            <div className="pcx-rubric-row" key={i}>
              <div className="pcx-rubric-crit">
                <input
                  className="pcx-input"
                  placeholder="Criterion"
                  aria-label="Criterion"
                  value={r.label}
                  onChange={(e) => update(i, 'label', e.target.value)}
                  disabled={!canManage}
                />
                <input
                  className="pcx-input pcx-input--sub"
                  placeholder="Description (optional)"
                  aria-label="Criterion description"
                  value={r.description}
                  onChange={(e) => update(i, 'description', e.target.value)}
                  disabled={!canManage}
                />
              </div>
              <input
                className="pcx-input pcx-input--num"
                type="number"
                step="0.25"
                min="0.25"
                value={r.weight}
                onChange={(e) => update(i, 'weight', Number(e.target.value))}
                disabled={!canManage}
                aria-label="Weight"
              />
              <input
                className="pcx-input pcx-input--num"
                type="number"
                step="1"
                min="1"
                value={r.max_score}
                onChange={(e) => update(i, 'max_score', Number(e.target.value))}
                disabled={!canManage}
                aria-label="Max score"
              />
              {canManage ? (
                <button
                  type="button"
                  className="pcx-iconbtn pcx-danger"
                  onClick={() => removeRow(i)}
                  aria-label="Remove criterion"
                >
                  <i className="bi bi-trash3" aria-hidden="true" />
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
        {canManage ? (
          <div className="pcx-rubric-actions">
            <button type="button" className="pcx-btn" onClick={addRow}>
              <i className="bi bi-plus-lg" aria-hidden="true" /> Add criterion
            </button>
            <button
              type="button"
              className="pcx-btn pcx-btn--primary"
              onClick={save}
              disabled={busy}
            >
              {busy ? <i className="bi bi-arrow-repeat pcx-spin" aria-hidden="true" /> : null} Save
              rubric
            </button>
            {saved ? <span className="pcx-saved">Saved</span> : null}
          </div>
        ) : null}
        {error ? <p className="pcx-error">{error}</p> : null}
      </section>
    </div>
  );
}

/* ─────────────── helpers ─────────────── */
const TEAM_LABEL = {
  invited: 'Invited',
  registered: 'Registered',
  submitted: 'Submitted',
  withdrawn: 'Withdrawn',
};

function emptyStructure() {
  return { rounds: [], teams: [], judges: [], rubric: [], counts: {} };
}
