'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Layers,
  DoorOpen,
  Users,
  Gavel,
  SlidersHorizontal,
  LayoutDashboard,
  Loader2,
} from 'lucide-react';
import { StatusPill } from './CompetitionsListClient';
import './competitions.css';

const STATUS_ORDER = ['draft', 'open', 'in_progress', 'judging', 'complete'];
const NEXT_STATUS_LABEL = {
  draft: 'Open registration',
  open: 'Start competition',
  in_progress: 'Move to judging',
  judging: 'Mark complete',
};

const TABS = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'structure', label: 'Structure', Icon: Layers },
  { id: 'invitations', label: 'Invitations', Icon: Users },
  { id: 'rubric', label: 'Rubric', Icon: SlidersHorizontal },
];

export function CommandCenterClient({ initialCompetition, initialStructure, canManage }) {
  const [competition, setCompetition] = useState(initialCompetition);
  const [structure, setStructure] = useState(initialStructure || emptyStructure());
  const [tab, setTab] = useState('overview');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const compId = competition.id;

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/org/pitch-competitions/${compId}`, { cache: 'no-store' });
    if (!res.ok) return;
    const json = await res.json().catch(() => ({}));
    if (json.competition) setCompetition(json.competition);
    if (json.structure) setStructure(json.structure);
  }, [compId]);

  // One entry point for every structure mutation → refetch on success.
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
          setError(json?.error || 'Action failed.');
          return false;
        }
        await refetch();
        return true;
      } catch {
        setError('Could not connect.');
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
          setError(json?.error || 'Update failed.');
          return;
        }
        if (json.competition) setCompetition(json.competition);
      } catch {
        setError('Could not connect.');
      } finally {
        setBusy(false);
      }
    },
    [compId],
  );

  const readiness = useMemo(() => computeReadiness(structure), [structure]);
  const c = structure.counts || {};

  return (
    <div className="pcx-page">
      <Link href="/org-competitions" className="pcx-back">
        <ArrowLeft size={15} /> All competitions
      </Link>

      <header className="pcx-cc-head">
        <div>
          <div className="pcx-cc-title-row">
            <h1 className="pcx-h1">{competition.name}</h1>
            <StatusPill status={competition.status} />
            {!competition.isHost ? <span className="pcx-tag pcx-tag--muted">Participant view</span> : null}
          </div>
          {competition.theme ? <p className="pcx-lead">{competition.theme}</p> : null}
        </div>
      </header>

      <div className="pcx-cc-links">
        {canManage ? (
          <>
            <Link href={`/org-competitions/${competition.slug}/config`} className="pcx-btn">
              Onboarding config
            </Link>
            <Link href={`/org-competitions/${competition.slug}/requests`} className="pcx-btn">
              Join requests
            </Link>
          </>
        ) : null}
        {!competition.isHost ? (
          <Link href={`/org-competitions/${competition.slug}/deliverables`} className="pcx-btn">
            My deliverables
          </Link>
        ) : null}
      </div>

      {error ? <p className="pcx-error pcx-error--banner">{error}</p> : null}

      <nav className="pcx-tabs" role="tablist" aria-label="Command center sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`pcx-tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <t.Icon size={15} aria-hidden="true" /> {t.label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <OverviewTab
          competition={competition}
          counts={c}
          readiness={readiness}
          canManage={canManage}
          busy={busy}
          onAdvance={patchCompetition}
        />
      )}
      {tab === 'structure' && (
        <StructureTab structure={structure} canManage={canManage} busy={busy} act={act} />
      )}
      {tab === 'invitations' && (
        <InvitationsTab structure={structure} canManage={canManage} busy={busy} act={act} />
      )}
      {tab === 'rubric' && (
        <RubricTab compId={compId} rubric={structure.rubric} canManage={canManage} onSaved={refetch} />
      )}
    </div>
  );
}

/* ─────────────── Overview ─────────────── */
function OverviewTab({ competition, counts, readiness, canManage, busy, onAdvance }) {
  const nextStatus = STATUS_ORDER[STATUS_ORDER.indexOf(competition.status) + 1];
  const canOpen = competition.status !== 'draft' || readiness.allMet;

  return (
    <div className="pcx-tabpanel">
      <div className="pcx-stat-row">
        <Stat label="Teams" value={counts.teams || 0} sub={`${counts.teamsRegistered || 0} registered`} />
        <Stat label="Submitted" value={counts.teamsSubmitted || 0} sub="deliverables in" />
        <Stat label="Judges" value={counts.judges || 0} sub="confirmed" />
        <Stat label="Rooms" value={counts.rooms || 0} sub={`${counts.rounds || 0} rounds`} />
      </div>

      <section className="pcx-card-block">
        <h2 className="pcx-block-title">Readiness checklist</h2>
        <ul className="pcx-check">
          {readiness.items.map((it) => (
            <li key={it.key} className={it.met ? 'is-met' : ''}>
              {it.met ? <CheckCircle2 size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
              <span>{it.label}</span>
            </li>
          ))}
        </ul>
        {canManage && nextStatus ? (
          <div className="pcx-advance">
            <button
              type="button"
              className="pcx-btn pcx-btn--primary"
              disabled={busy || (competition.status === 'draft' && !canOpen)}
              onClick={() => onAdvance({ status: nextStatus })}
              title={competition.status === 'draft' && !canOpen ? 'Complete the checklist first' : undefined}
            >
              {NEXT_STATUS_LABEL[competition.status]}
            </button>
            {competition.status === 'draft' && !canOpen ? (
              <span className="pcx-muted">Finish the checklist to open registration.</span>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="pcx-stat">
      <div className="pcx-stat-value">{value}</div>
      <div className="pcx-stat-label">{label}</div>
      {sub ? <div className="pcx-stat-sub">{sub}</div> : null}
    </div>
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
            if (roundName.trim()) act({ action: 'add_round', name: roundName.trim() }).then((okd) => okd && setRoundName(''));
          }}
        >
          <input className="pcx-input" placeholder="Round name (e.g. Semifinal)" value={roundName} onChange={(e) => setRoundName(e.target.value)} />
          <button type="submit" className="pcx-btn pcx-btn--primary" disabled={busy || !roundName.trim()}>
            <Plus size={15} /> Add round
          </button>
        </form>
      ) : null}

      {(structure.rounds || []).length === 0 ? (
        <div className="pcx-empty pcx-empty--sm">
          <Layers size={22} aria-hidden="true" />
          <p>No rounds yet.</p>
        </div>
      ) : (
        (structure.rounds || []).map((round) => (
          <RoundBlock key={round.id} round={round} teams={teams} judges={judges} canManage={canManage} busy={busy} act={act} />
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
          <Layers size={15} aria-hidden="true" /> {round.name}
        </h3>
        {canManage ? (
          <button type="button" className="pcx-iconbtn pcx-danger" onClick={() => act({ action: 'remove_round', round_id: round.id })} disabled={busy} aria-label={`Remove ${round.name}`}>
            <Trash2 size={15} />
          </button>
        ) : null}
      </div>

      {canManage ? (
        <form
          className="pcx-inline-form pcx-inline-form--sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (roomName.trim())
              act({ action: 'add_room', round_id: round.id, name: roomName.trim(), location: roomLoc.trim() || null }).then((okd) => {
                if (okd) {
                  setRoomName('');
                  setRoomLoc('');
                }
              });
          }}
        >
          <input className="pcx-input" placeholder="Room name (Room A)" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
          <input className="pcx-input" placeholder="Location / link (optional)" value={roomLoc} onChange={(e) => setRoomLoc(e.target.value)} />
          <button type="submit" className="pcx-btn" disabled={busy || !roomName.trim()}>
            <Plus size={14} /> Room
          </button>
        </form>
      ) : null}

      {round.rooms.length === 0 ? (
        <p className="pcx-muted pcx-indent">No rooms in this round yet.</p>
      ) : (
        <div className="pcx-rooms">
          {round.rooms.map((room) => (
            <RoomCard key={room.id} room={room} unassigned={unassigned} judges={judges} canManage={canManage} busy={busy} act={act} />
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
          <DoorOpen size={14} aria-hidden="true" /> {room.name}
        </span>
        {room.location ? <span className="pcx-muted">{room.location}</span> : null}
        {canManage ? (
          <button type="button" className="pcx-iconbtn pcx-danger" onClick={() => act({ action: 'remove_room', room_id: room.id })} disabled={busy} aria-label={`Remove ${room.name}`}>
            <Trash2 size={13} />
          </button>
        ) : null}
      </div>

      <div className="pcx-room-section">
        <span className="pcx-room-sub"><Users size={12} aria-hidden="true" /> Teams</span>
        {(room.teams || []).length === 0 ? (
          <span className="pcx-muted">None assigned</span>
        ) : (
          <ul className="pcx-chiplist">
            {room.teams.map((t) => (
              <li key={t.id} className="pcx-chip">
                {t.team_name}
                {t.ticker ? <span className="pcx-chip-meta"> {t.ticker}</span> : null}
                {canManage ? (
                  <button type="button" className="pcx-chip-x" onClick={() => act({ action: 'assign_team', team_id: t.id, room_id: null })} disabled={busy} aria-label={`Remove ${t.team_name} from room`}>
                    ×
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
            onChange={(e) => e.target.value && act({ action: 'assign_team', team_id: e.target.value, room_id: room.id })}
            disabled={busy}
            aria-label={`Assign a team to ${room.name}`}
          >
            <option value="">+ Assign team…</option>
            {unassigned.map((t) => (
              <option key={t.id} value={t.id}>
                {t.team_name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="pcx-room-section">
        <span className="pcx-room-sub"><Gavel size={12} aria-hidden="true" /> Judges</span>
        {(room.judges || []).length === 0 ? (
          <span className="pcx-muted">None assigned</span>
        ) : (
          <ul className="pcx-chiplist">
            {room.judges.map((j) => (
              <li key={j.id} className="pcx-chip">
                {j.full_name}
                {j.firm ? <span className="pcx-chip-meta"> {j.firm}</span> : null}
                {canManage ? (
                  <button type="button" className="pcx-chip-x" onClick={() => act({ action: 'unassign_judge', room_id: room.id, judge_id: j.id })} disabled={busy} aria-label={`Remove ${j.full_name} from room`}>
                    ×
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
            onChange={(e) => e.target.value && act({ action: 'assign_judge', room_id: room.id, judge_id: e.target.value })}
            disabled={busy}
            aria-label={`Assign a judge to ${room.name}`}
          >
            <option value="">+ Assign judge…</option>
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
function InvitationsTab({ structure, canManage, busy, act }) {
  const [team, setTeam] = useState({ team_name: '', invite_email: '', ticker: '', side: '' });
  const [judge, setJudge] = useState({ full_name: '', email: '', firm: '', title: '' });
  const teams = structure.teams || [];
  const judges = structure.judges || [];

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
        <h2 className="pcx-block-title"><Users size={15} aria-hidden="true" /> Councils & teams</h2>
        {canManage ? (
          <form className="pcx-stack-form" onSubmit={submitTeam}>
            <input className="pcx-input" placeholder="Team name (e.g. McMaster A)" value={team.team_name} onChange={(e) => setTeam({ ...team, team_name: e.target.value })} />
            <input className="pcx-input" placeholder="Invite email (optional)" value={team.invite_email} onChange={(e) => setTeam({ ...team, invite_email: e.target.value })} />
            <div className="pcx-form-row">
              <input className="pcx-input" placeholder="Ticker (optional)" value={team.ticker} onChange={(e) => setTeam({ ...team, ticker: e.target.value })} />
              <select className="pcx-input" value={team.side} onChange={(e) => setTeam({ ...team, side: e.target.value })} aria-label="Side">
                <option value="">Side…</option>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
            <button type="submit" className="pcx-btn pcx-btn--primary" disabled={busy || !team.team_name.trim()}>
              <Plus size={15} /> Invite team
            </button>
          </form>
        ) : null}
        <ul className="pcx-roster">
          {teams.length === 0 ? <li className="pcx-muted">No teams invited yet.</li> : null}
          {teams.map((t) => (
            <li key={t.id} className="pcx-roster-row">
              <span className="pcx-roster-main">{t.team_name}</span>
              <span className="pcx-roster-meta">
                {t.ticker ? `${t.ticker}${t.side ? ` · ${t.side}` : ''}` : t.invite_email || '—'}
              </span>
              <span className={`pcx-pill pcx-pill--${TEAM_TONE[t.status] || 'mut'}`}>
                {TEAM_LABEL[t.status] || t.status}
              </span>
              {canManage ? (
                <button type="button" className="pcx-iconbtn pcx-danger" onClick={() => act({ action: 'remove_team', team_id: t.id })} disabled={busy} aria-label={`Remove ${t.team_name}`}>
                  <Trash2 size={14} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="pcx-card-block">
        <h2 className="pcx-block-title"><Gavel size={15} aria-hidden="true" /> Judges</h2>
        <p className="pcx-muted pcx-note">
          Magic-link access is generated in Phase 3 — for now this just captures the roster.
        </p>
        {canManage ? (
          <form className="pcx-stack-form" onSubmit={submitJudge}>
            <input className="pcx-input" placeholder="Full name" value={judge.full_name} onChange={(e) => setJudge({ ...judge, full_name: e.target.value })} />
            <input className="pcx-input" placeholder="Email" value={judge.email} onChange={(e) => setJudge({ ...judge, email: e.target.value })} />
            <div className="pcx-form-row">
              <input className="pcx-input" placeholder="Firm (optional)" value={judge.firm} onChange={(e) => setJudge({ ...judge, firm: e.target.value })} />
              <input className="pcx-input" placeholder="Title (optional)" value={judge.title} onChange={(e) => setJudge({ ...judge, title: e.target.value })} />
            </div>
            <button type="submit" className="pcx-btn pcx-btn--primary" disabled={busy || !judge.full_name.trim() || !judge.email.trim()}>
              <Plus size={15} /> Add judge
            </button>
          </form>
        ) : null}
        <ul className="pcx-roster">
          {judges.length === 0 ? <li className="pcx-muted">No judges yet.</li> : null}
          {judges.map((j) => (
            <li key={j.id} className="pcx-roster-row">
              <span className="pcx-roster-main">{j.full_name}</span>
              <span className="pcx-roster-meta">{[j.title, j.firm].filter(Boolean).join(', ') || j.email}</span>
              {canManage ? (
                <button type="button" className="pcx-iconbtn pcx-danger" onClick={() => act({ action: 'remove_judge', judge_id: j.id })} disabled={busy} aria-label={`Remove ${j.full_name}`}>
                  <Trash2 size={14} />
                </button>
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
    (rubric || []).map((r) => ({ label: r.label, description: r.description || '', weight: r.weight, max_score: r.max_score })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const update = (i, key, val) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  const addRow = () => setRows((rs) => [...rs, { label: '', description: '', weight: 1, max_score: 10 }]);
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
        <h2 className="pcx-block-title"><SlidersHorizontal size={15} aria-hidden="true" /> Scoring rubric</h2>
        <p className="pcx-muted pcx-note">
          Weights are relative — a criterion at 1.25 counts 25% more than one at 1.0. Judges score each
          out of its max in Phase 3.
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
                <input className="pcx-input" placeholder="Criterion" value={r.label} onChange={(e) => update(i, 'label', e.target.value)} disabled={!canManage} />
                <input className="pcx-input pcx-input--sub" placeholder="Description (optional)" value={r.description} onChange={(e) => update(i, 'description', e.target.value)} disabled={!canManage} />
              </div>
              <input className="pcx-input pcx-input--num" type="number" step="0.25" min="0.25" value={r.weight} onChange={(e) => update(i, 'weight', Number(e.target.value))} disabled={!canManage} aria-label="Weight" />
              <input className="pcx-input pcx-input--num" type="number" step="1" min="1" value={r.max_score} onChange={(e) => update(i, 'max_score', Number(e.target.value))} disabled={!canManage} aria-label="Max score" />
              {canManage ? (
                <button type="button" className="pcx-iconbtn pcx-danger" onClick={() => removeRow(i)} aria-label="Remove criterion">
                  <Trash2 size={14} />
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
              <Plus size={15} /> Add criterion
            </button>
            <button type="button" className="pcx-btn pcx-btn--primary" onClick={save} disabled={busy}>
              {busy ? <Loader2 size={15} className="pcx-spin" /> : null} Save rubric
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
const TEAM_TONE = { invited: 'mut', registered: 'pos', submitted: 'done', withdrawn: 'mut' };
const TEAM_LABEL = { invited: 'Invited', registered: 'Registered', submitted: 'Submitted', withdrawn: 'Withdrawn' };

function emptyStructure() {
  return { rounds: [], teams: [], judges: [], rubric: [], counts: {} };
}
function computeReadiness(structure) {
  const c = structure.counts || {};
  const items = [
    { key: 'round', label: 'At least one round', met: (c.rounds || 0) >= 1 },
    { key: 'room', label: 'At least one room scheduled', met: (c.rooms || 0) >= 1 },
    { key: 'team', label: 'At least one team invited', met: (c.teams || 0) >= 1 },
    { key: 'judge', label: 'At least one judge added', met: (c.judges || 0) >= 1 },
    { key: 'rubric', label: 'Scoring rubric defined', met: (structure.rubric || []).length >= 1 },
  ];
  return { items, allMet: items.every((i) => i.met) };
}
