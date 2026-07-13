'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  X,
  Video,
  Sparkles,
  FileText,
  Link2,
  Users,
  CalendarClock,
  MapPin,
} from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import './meetings2.css';

/* ── Static metadata (theme-token dots live in the CSS) ───────────────────── */
const CATEGORY_META = {
  ic: { label: 'IC', dot: 'ic', pill: 'ic' },
  sector: { label: 'Sector', dot: 'sector', pill: 'sector' },
  general: { label: 'General', dot: 'general', pill: 'general' },
  exec: { label: 'Exec', dot: 'exec', pill: 'exec' },
  education: { label: 'Education', dot: 'education', pill: 'education' },
};
const CATEGORY_ORDER = ['ic', 'sector', 'general', 'exec', 'education'];
const AGENDA_KINDS = ['discussion', 'pitch', 'review', 'vote', 'update', 'other'];
const DELIVERABLE_KINDS = [
  'model',
  'memo',
  'report',
  'deck',
  'sheet',
  'primer',
  'news',
  'earnings_call',
];
const RECORDING_SOURCES = [
  ['zoom', 'Zoom'],
  ['otter', 'Otter.ai'],
  ['fireflies', 'Fireflies'],
  ['read_ai', 'Read.ai'],
  ['upload', 'Uploaded / link'],
];
const TIER_META = {
  exec: 'VPs / Exec',
  portfolio_manager: 'Portfolio Managers',
  analyst: 'Sector Analysts',
};
const PROVIDER_LABELS = {
  zoom: 'Zoom',
  otter: 'Otter.ai',
  fireflies: 'Fireflies',
  read_ai: 'Read.ai',
};
const CARD_STEP = 184 + 9.6; // card width + gap

function catLabel(c) {
  return CATEGORY_META[c]?.label || 'General';
}
function isPast(m) {
  return m.status === 'closed';
}
function fmtDateTime(iso) {
  if (!iso) return 'No time set';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
function fmtDateShort(iso) {
  if (!iso) return 'TBD';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function initials(name) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

/* ── Meeting strip (horizontal, paged track) ──────────────────────────────── */
function MeetingStrip({ meetings, mode, catLabelText, selectedId, onSelect, hpage, setHpage }) {
  const vpRef = useRef(null);
  const [vpWidth, setVpWidth] = useState(760);

  useEffect(() => {
    const measure = () => {
      if (vpRef.current) setVpWidth(vpRef.current.clientWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const visible = Math.max(1, Math.floor((vpWidth + 9.6) / CARD_STEP));
  const maxStart = Math.max(0, meetings.length - visible);
  const start = Math.min(hpage, maxStart);
  const translate = -start * CARD_STEP;
  const atStart = start <= 0;
  const atEnd = start >= maxStart;

  return (
    <div>
      <div className="mt2-strip-head">
        <span className="mt2-strip-title">
          {catLabelText} · {meetings.length} {mode === 'upcoming' ? 'upcoming' : 'recorded'}
        </span>
        <div className="mt2-strip-nav">
          <button
            type="button"
            className="mt2-arrow"
            aria-label="Previous meetings"
            disabled={atStart}
            onClick={() => setHpage(Math.max(0, start - visible))}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            className="mt2-arrow"
            aria-label="Next meetings"
            disabled={atEnd}
            onClick={() => setHpage(Math.min(maxStart, start + visible))}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
      <div className="mt2-strip-viewport" ref={vpRef}>
        <div className="mt2-strip-track" style={{ transform: `translateX(${translate}px)` }}>
          {meetings.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`mt2-mcard${m.id === selectedId ? ' is-active' : ''}`}
              onClick={() => onSelect(m.id)}
            >
              <div className="mt2-mcard__top">
                <span
                  className={`mt2-pill mt2-pill--${CATEGORY_META[m.category]?.pill || 'general'}`}
                >
                  {catLabel(m.category)}
                </span>
                <span className={`mt2-pill mt2-pill--${isPast(m) ? 'completed' : 'scheduled'}`}>
                  {isPast(m) ? 'Completed' : 'Scheduled'}
                </span>
              </div>
              <div className="mt2-mcard__title">{m.title}</div>
              <div className="mt2-mcard__meta mt2-num">
                {fmtDateShort(m.scheduled_at || m.ended_at || m.created_at)}
                {m.location ? ` · ${m.location}` : ''}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Agenda builder (upcoming) — full array persisted on every change ─────── */
function AgendaBuilder({ agenda, canManage, onSave, busy }) {
  const [items, setItems] = useState(agenda);
  const [draft, setDraft] = useState({ label: '', minutes: '', owner: '', kind: 'discussion' });

  useEffect(() => {
    setItems(agenda);
  }, [agenda]);

  const commit = (next) => {
    setItems(next);
    onSave(next);
  };
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };
  const remove = (i) => commit(items.filter((_, idx) => idx !== i));
  const add = () => {
    if (!draft.label.trim()) return;
    commit([...items, { ...draft, minutes: draft.minutes === '' ? null : Number(draft.minutes) }]);
    setDraft({ label: '', minutes: '', owner: '', kind: 'discussion' });
  };

  return (
    <div className="mt2-section">
      <h3 className="mt2-section__title">
        <FileText size={13} /> Agenda
      </h3>
      {items.length === 0 ? (
        <div className="mt2-empty">No agenda items yet.</div>
      ) : (
        items.map((it, i) => (
          <div className="mt2-agenda-item" key={it.id || i}>
            <span className="mt2-agenda-n">{i + 1}</span>
            <div className="mt2-agenda-body">
              <div className="mt2-agenda-label">{it.label}</div>
              <div className="mt2-agenda-sub">
                {it.kind ? <span style={{ textTransform: 'capitalize' }}>{it.kind}</span> : null}
                {it.owner ? ` · ${it.owner}` : ''}
                {it.minutes ? ` · ${it.minutes} min` : ''}
              </div>
            </div>
            {canManage && (
              <div className="mt2-agenda-ctrls">
                <button
                  type="button"
                  className="mt2-mini"
                  aria-label="Move up"
                  disabled={busy || i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  className="mt2-mini"
                  aria-label="Move down"
                  disabled={busy || i === items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  type="button"
                  className="mt2-mini"
                  aria-label="Remove item"
                  disabled={busy}
                  onClick={() => remove(i)}
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        ))
      )}
      {canManage && (
        <div style={{ marginTop: '0.6rem' }}>
          <div className="mt2-form-row">
            <input
              className="mt2-input"
              style={{ flex: '2 1 180px' }}
              placeholder="Agenda item…"
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            />
            <select
              className="mt2-select"
              style={{ flex: '1 1 110px' }}
              value={draft.kind}
              onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value }))}
            >
              {AGENDA_KINDS.map((k) => (
                <option key={k} value={k} style={{ textTransform: 'capitalize' }}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className="mt2-form-row" style={{ marginTop: '0.4rem' }}>
            <input
              className="mt2-input"
              style={{ flex: '2 1 160px' }}
              placeholder="Owner (optional)"
              value={draft.owner}
              onChange={(e) => setDraft((d) => ({ ...d, owner: e.target.value }))}
            />
            <input
              className="mt2-input"
              style={{ flex: '1 1 90px' }}
              type="number"
              min="0"
              placeholder="Min"
              value={draft.minutes}
              onChange={(e) => setDraft((d) => ({ ...d, minutes: e.target.value }))}
            />
            <button
              type="button"
              className="mt2-btn"
              disabled={busy || !draft.label.trim()}
              onClick={add}
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Attendees + RSVP ─────────────────────────────────────────────────────── */
function AttendeesSection({ detail, viewer, onRsvp, onAddAttendees, busy, past }) {
  const [pick, setPick] = useState('');
  const attendees = detail.attendees || [];
  const attendeeIds = new Set(attendees.map((a) => a.member_id));
  const addable = (detail.roster || []).filter((m) => !attendeeIds.has(m.id));

  return (
    <div className="mt2-section">
      <h3 className="mt2-section__title">
        <Users size={13} /> Attendees
      </h3>
      {attendees.length === 0 ? (
        <div className="mt2-empty">No attendees added yet.</div>
      ) : (
        attendees.map((a) => {
          const mine = a.member_id === viewer.memberId;
          return (
            <div className="mt2-att" key={a.id || a.member_id}>
              <span className="mt2-avatar">{initials(a.display_name)}</span>
              <div className="mt2-att-body">
                <div className="mt2-att-name">
                  {a.display_name}
                  {mine ? ' (you)' : ''}
                </div>
                <div className="mt2-att-role">{(a.role || '').replace('_', ' ')}</div>
              </div>
              {past ? (
                a.attended === false ? (
                  <span className="mt2-att-absent">Absent</span>
                ) : a.rsvp === 'yes' || a.attended ? null : (
                  <span className="mt2-att-role" style={{ textTransform: 'capitalize' }}>
                    {a.rsvp}
                  </span>
                )
              ) : mine ? (
                <div className="mt2-rsvp">
                  {['yes', 'maybe', 'no'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`mt2-rsvp__btn${a.rsvp === r ? ` is-${r}` : ''}`}
                      disabled={busy}
                      onClick={() => onRsvp(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="mt2-att-role" style={{ textTransform: 'capitalize' }}>
                  {a.rsvp}
                </span>
              )}
            </div>
          );
        })
      )}
      {!past && viewer.canManage && addable.length > 0 && (
        <div className="mt2-form-row" style={{ marginTop: '0.6rem' }}>
          <select
            className="mt2-select"
            style={{ flex: 1 }}
            value={pick}
            onChange={(e) => setPick(e.target.value)}
          >
            <option value="">Add attendee from org chart…</option>
            {addable.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name} ({(m.role || '').replace('_', ' ')})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="mt2-btn"
            disabled={busy || !pick}
            onClick={() => {
              onAddAttendees([pick]);
              setPick('');
            }}
          >
            <Plus size={14} /> Add
          </button>
        </div>
      )}
    </div>
  );
}

/* ── IC live vote (quorum-gated) ──────────────────────────────────────────── */
function VoteSection({ detail, viewer, onVote, busy }) {
  const v = detail.votes;
  if (!v) return null;
  const total = v.total || 0;
  const pct = (n) => (total > 0 ? `${(n / total) * 100}%` : '0%');
  return (
    <div className="mt2-section">
      <h3 className="mt2-section__title">Investment Committee vote</h3>
      <div className="mt2-vote">
        <div className="mt2-tally">
          <span className="mt2-tally__seg--buy" style={{ width: pct(v.tally.buy) }} />
          <span className="mt2-tally__seg--pass" style={{ width: pct(v.tally.pass) }} />
          <span className="mt2-tally__seg--abstain" style={{ width: pct(v.tally.abstain) }} />
        </div>
        <div className="mt2-tally-legend mt2-num">
          <span>Buy {v.tally.buy}</span>
          <span>Pass {v.tally.pass}</span>
          <span>Abstain {v.tally.abstain}</span>
        </div>
        <div className="mt2-vote-btns">
          {['buy', 'pass', 'abstain'].map((opt) => (
            <button
              key={opt}
              type="button"
              className={`mt2-vote-btn is-${opt}${v.myVote === opt ? ' is-mine' : ''}`}
              disabled={busy || !viewer.isICVoter || !v.quorumMet}
              onClick={() => onVote(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="mt2-note mt2-num">
          Quorum {v.presentCount}/{v.eligibleCount} present · needs {v.quorumPct}%{' '}
          {v.quorumMet ? '· quorum met' : '· quorum not met — voting locked'}
        </div>
        {!viewer.isICVoter && (
          <div className="mt2-note">Only Investment Committee members can vote.</div>
        )}
      </div>
    </div>
  );
}

/* ── AI analysis (past) ───────────────────────────────────────────────────── */
function AnalysisSection({ detail }) {
  const m = detail.meeting;
  const sentiment = detail.sentiment || [];
  const status = m.analysis_status || 'none';
  const hasSummary = !!m.ai_summary;

  return (
    <div className="mt2-section">
      <div className="mt2-ai">
        <h3 className="mt2-ai__title">
          <Sparkles size={13} /> AI meeting analysis
        </h3>
        {hasSummary ? (
          <p className="mt2-ai__summary">{m.ai_summary}</p>
        ) : (
          <p className="mt2-ai__pending">
            {status === 'transcribing' &&
              'Recording is transcribing — analysis will follow automatically.'}
            {status === 'analyzing' &&
              'Transcript is being analyzed — summary and sentiment are on the way.'}
            {(status === 'none' || status === 'ready') &&
              'Not analyzed yet. A summary appears here once a recording has been transcribed and analyzed.'}
          </p>
        )}

        {sentiment.length > 0 && (
          <div style={{ marginTop: '0.9rem' }}>
            <div className="mt2-section__title" style={{ color: 'var(--purple)' }}>
              Sentiment by attendee tier
            </div>
            {sentiment.map((s) => {
              const pos = s.score >= 0;
              const w = `${Math.abs(s.score) * 50}%`;
              return (
                <div className="mt2-tier" key={s.tier}>
                  <div className="mt2-tier__head">
                    <span className="mt2-tier__name">{TIER_META[s.tier] || s.tier}</span>
                    <span className="mt2-tier__score">
                      {s.score > 0 ? `+${s.score.toFixed(2)}` : s.score.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt2-tier__track">
                    <span className="mt2-tier__mid" />
                    <span
                      className={`mt2-tier__fill ${pos ? 'is-pos' : 'is-neg'}`}
                      style={pos ? { left: '50%', width: w } : { right: '50%', width: w }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Deliverables discussed (past) ────────────────────────────────────────── */
function DeliverablesSection({ detail, viewer, onAdd, onRemove, busy }) {
  const [draft, setDraft] = useState({ kind: 'memo', label: '' });
  const items = detail.deliverables || [];
  return (
    <div className="mt2-section">
      <h3 className="mt2-section__title">Deliverables discussed</h3>
      {items.length === 0 ? (
        <div className="mt2-empty">No deliverables recorded.</div>
      ) : (
        <div className="mt2-delivs">
          {items.map((d) => (
            <span className={`mt2-deliv mt2-deliv--${d.kind}`} key={d.id}>
              {d.label}
              {viewer.canManage && (
                <button
                  type="button"
                  className="mt2-deliv__x"
                  aria-label="Remove"
                  disabled={busy}
                  onClick={() => onRemove(d.id)}
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {viewer.canManage && (
        <div className="mt2-form-row" style={{ marginTop: '0.6rem' }}>
          <select
            className="mt2-select"
            style={{ flex: '0 0 130px' }}
            value={draft.kind}
            onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value }))}
          >
            {DELIVERABLE_KINDS.map((k) => (
              <option key={k} value={k}>
                {k.replace('_', ' ')}
              </option>
            ))}
          </select>
          <input
            className="mt2-input"
            style={{ flex: 1 }}
            placeholder="Deliverable label…"
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
          />
          <button
            type="button"
            className="mt2-btn"
            disabled={busy || !draft.label.trim()}
            onClick={() => {
              onAdd(draft);
              setDraft({ kind: 'memo', label: '' });
            }}
          >
            <Plus size={14} /> Add
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Recording (past) ─────────────────────────────────────────────────────── */
function RecordingSection({ detail, viewer, onLink, busy }) {
  const m = detail.meeting;
  const [url, setUrl] = useState('');
  const [source, setSource] = useState('upload');
  if (m.recording_url) return null; // the header button covers viewing an existing recording
  return (
    <div className="mt2-section">
      <h3 className="mt2-section__title">
        <Video size={13} /> Recording
      </h3>
      {viewer.canManage ? (
        <>
          <div className="mt2-form-row">
            <input
              className="mt2-input"
              style={{ flex: 1 }}
              placeholder="Paste recording link (Zoom / Otter / Fireflies / Read.ai)…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <select
              className="mt2-select"
              style={{ flex: '0 0 140px' }}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {RECORDING_SOURCES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="mt2-btn"
              disabled={busy || !url.trim()}
              onClick={() => onLink(url.trim(), source)}
            >
              <Link2 size={14} /> Link
            </button>
          </div>
          <div className="mt2-note" style={{ marginTop: '0.4rem' }}>
            Direct file upload is not available yet — paste a recording link from your provider.
          </div>
        </>
      ) : (
        <div className="mt2-empty">No recording linked yet.</div>
      )}
    </div>
  );
}

/* ── Detail panel ─────────────────────────────────────────────────────────── */
function MeetingDetail({ meetingId, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/org/meetings/${meetingId}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to load meeting.');
        return;
      }
      setDetail(data);
      setError('');
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const patch = async (payload, { reloadList } = {}) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/org/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await load();
        if (reloadList) onChanged?.();
      }
    } finally {
      setBusy(false);
    }
  };

  const sub = async (path, method, body) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/org/meetings/${meetingId}/${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="mt2-detail">
        <div className="mt2-skel" style={{ height: 22, width: '55%', marginBottom: 12 }} />
        <div className="mt2-skel" style={{ height: 14, width: '35%', marginBottom: 20 }} />
        <div className="mt2-skel" style={{ height: 90 }} />
      </div>
    );
  }
  if (error) return <div className="mt2-detail mt2-state mt2-error">{error}</div>;
  if (!detail) return null;

  const m = detail.meeting;
  const { viewer } = detail;
  const past = isPast(m);
  const agenda = Array.isArray(m.agenda) ? m.agenda : [];

  return (
    <div className="mt2-detail">
      <div className="mt2-detail-head">
        <div style={{ minWidth: 0 }}>
          <div className="mt2-detail-badges">
            <span className={`mt2-pill mt2-pill--${CATEGORY_META[m.category]?.pill || 'general'}`}>
              {catLabel(m.category)}
            </span>
            <span className={`mt2-pill mt2-pill--${past ? 'completed' : 'scheduled'}`}>
              {past ? 'Completed' : 'Scheduled'}
            </span>
            {detail.votes?.eligibleCount > 0 && m.category === 'ic' && (
              <span className="mt2-pill mt2-pill--quorum mt2-num">
                Quorum {detail.votes.presentCount}/{detail.votes.eligibleCount}
              </span>
            )}
          </div>
          <h2 className="mt2-detail-title">{m.title}</h2>
          <div className="mt2-detail-meta mt2-num">
            <CalendarClock size={12} style={{ verticalAlign: '-2px' }} />{' '}
            {fmtDateTime(m.scheduled_at || m.ended_at)}
            {m.location ? (
              <>
                {' · '}
                <MapPin size={12} style={{ verticalAlign: '-2px' }} /> {m.location}
              </>
            ) : null}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {past && m.recording_url && (
            <a className="mt2-btn" href={m.recording_url} target="_blank" rel="noopener noreferrer">
              <Video size={14} /> Recording
            </a>
          )}
          {!past && viewer.canManage && (
            <button
              type="button"
              className="mt2-btn"
              disabled={busy}
              onClick={() => patch({ action: 'complete' }, { reloadList: true })}
            >
              Mark completed
            </button>
          )}
        </div>
      </div>

      {past ? (
        <>
          <AnalysisSection detail={detail} />
          <AttendeesSection
            detail={detail}
            viewer={viewer}
            past
            onRsvp={() => {}}
            onAddAttendees={() => {}}
            busy={busy}
          />
          <DeliverablesSection
            detail={detail}
            viewer={viewer}
            busy={busy}
            onAdd={(d) => sub('deliverables', 'POST', d)}
            onRemove={(id) => sub(`deliverables?deliverable_id=${id}`, 'DELETE')}
          />
          <RecordingSection
            detail={detail}
            viewer={viewer}
            busy={busy}
            onLink={(url, source) =>
              patch(
                { action: 'set_recording', recording_url: url, recording_source: source },
                { reloadList: true },
              )
            }
          />
        </>
      ) : (
        <>
          <AgendaBuilder
            agenda={agenda}
            canManage={viewer.canManage}
            busy={busy}
            onSave={(items) => patch({ action: 'set_agenda', agenda: items })}
          />
          <AttendeesSection
            detail={detail}
            viewer={viewer}
            busy={busy}
            onRsvp={(rsvp) => sub('attendees', 'PATCH', { rsvp })}
            onAddAttendees={(ids) => sub('attendees', 'POST', { member_ids: ids })}
          />
          {(detail.preRead || []).length > 0 && (
            <div className="mt2-section">
              <h3 className="mt2-section__title">Pre-read pack</h3>
              {detail.preRead.map((p) => (
                <div className="mt2-preread" key={p.id}>
                  <FileText
                    size={15}
                    style={{ color: 'var(--emerald-text)', flex: 'none', marginTop: 2 }}
                  />
                  <div>
                    <div className="mt2-preread__label">{p.label}</div>
                    {p.note && <div className="mt2-preread__note">{p.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {m.category === 'ic' && (
            <VoteSection
              detail={detail}
              viewer={viewer}
              busy={busy}
              onVote={(vote) => sub('votes', 'POST', { vote })}
            />
          )}
        </>
      )}
    </div>
  );
}

/* ── New meeting modal ────────────────────────────────────────────────────── */
function NewMeetingModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    category: 'general',
    scheduled_at: '',
    location: '',
  });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.title.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/org/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          category: form.category,
          scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
          location: form.location.trim() || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onCreated(data.meeting);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt2-modal-backdrop" onClick={onClose}>
      <div className="mt2-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="mt2-modal__title">New meeting</h3>
        <div className="mt2-field">
          <label className="mt2-field__label">Title</label>
          <input
            className="mt2-input"
            placeholder="e.g. Q3 Investment Committee"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>
        <div className="mt2-field">
          <label className="mt2-field__label">Category</label>
          <select
            className="mt2-select"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {catLabel(c)}
              </option>
            ))}
          </select>
        </div>
        <div className="mt2-field">
          <label className="mt2-field__label">Scheduled time</label>
          <input
            className="mt2-input"
            type="datetime-local"
            value={form.scheduled_at}
            onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
          />
        </div>
        <div className="mt2-field">
          <label className="mt2-field__label">Location</label>
          <input
            className="mt2-input"
            placeholder="Room / video link"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          />
        </div>
        <div className="mt2-modal__actions">
          <button type="button" className="mt2-btn mt2-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="mt2-btn mt2-btn--primary"
            disabled={busy || !form.title.trim()}
            onClick={submit}
          >
            Create meeting
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Recorder ⚙ popover (managers only, honest not-connected) ─────────────── */
function RecorderPopover({ onClose }) {
  const [integrations, setIntegrations] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/org/meetings/recorders', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (res.ok) setIntegrations(data.integrations || []);
        else setIntegrations([]);
      } catch {
        setIntegrations([]);
      }
    })();
  }, []);

  return (
    <div className="mt2-popover" onClick={(e) => e.stopPropagation()}>
      <p className="mt2-popover__title">Recorder integrations</p>
      <p className="mt2-popover__desc">
        No meeting recorders are connected yet. Connecting Zoom, Otter.ai, Fireflies or Read.ai
        requires an account-level OAuth setup that isn&apos;t wired in this build.
      </p>
      {(integrations || []).map((it) => (
        <div className="mt2-prov" key={it.provider}>
          <span className="mt2-prov__name">{PROVIDER_LABELS[it.provider] || it.provider}</span>
          <span className="mt2-prov__state">{it.enabled ? 'Connected' : 'Not connected'}</span>
        </div>
      ))}
      {integrations === null && <div className="mt2-empty">Checking…</div>}
    </div>
  );
}

/* ── Left rail ────────────────────────────────────────────────────────────── */
function Rail({
  mode,
  setMode,
  modeCounts,
  cat,
  setCat,
  catCounts,
  presentCats,
  queue,
  sentimentTrend,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const modeDesc = { upcoming: 'Scheduled sessions', past: 'Recorded & completed' };

  const maxAbs = Math.max(0.001, ...sentimentTrend.map((s) => Math.abs(s.avg)));
  const avgTone = sentimentTrend.length
    ? sentimentTrend.reduce((a, s) => a + s.avg, 0) / sentimentTrend.length
    : 0;

  return (
    <div className="mt2-rail">
      {/* Mode switcher */}
      <div className="mt2-mode">
        <button type="button" className="mt2-mode__btn" onClick={() => setMenuOpen((o) => !o)}>
          <span>
            <span className="mt2-mode__label" style={{ textTransform: 'capitalize' }}>
              {mode === 'past' ? 'Past sessions' : 'Upcoming'}
            </span>
            <span className="mt2-mode__desc mt2-num">
              {modeCounts[mode]} · {modeDesc[mode]}
            </span>
          </span>
          <ChevronDown size={15} />
        </button>
        {menuOpen && (
          <div className="mt2-mode__menu">
            {['upcoming', 'past'].map((mo) => (
              <button
                key={mo}
                type="button"
                className={`mt2-mode__item${mode === mo ? ' is-active' : ''}`}
                onClick={() => {
                  setMode(mo);
                  setMenuOpen(false);
                }}
              >
                <span style={{ textTransform: 'capitalize' }}>
                  {mo === 'past' ? 'Past sessions' : 'Upcoming'}
                </span>
                <span className="mt2-num">{modeCounts[mo]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="mt2-card">
        <p className="mt2-card__title">Categories</p>
        <div className="mt2-cats">
          <button
            type="button"
            className={`mt2-cat${cat === 'all' ? ' is-active' : ''}`}
            onClick={() => setCat('all')}
          >
            <span className="mt2-cat__dot mt2-dot--all" />
            <span className="mt2-cat__label">All</span>
            <span className="mt2-cat__count mt2-num">{modeCounts[mode]}</span>
          </button>
          {CATEGORY_ORDER.filter((c) => presentCats.has(c)).map((c) => (
            <button
              key={c}
              type="button"
              className={`mt2-cat${cat === c ? ' is-active' : ''}`}
              onClick={() => setCat(c)}
            >
              <span className={`mt2-cat__dot mt2-dot--${c}`} />
              <span className="mt2-cat__label">{catLabel(c)}</span>
              <span className="mt2-cat__count mt2-num">{catCounts[c] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Transcription queue */}
      <div className="mt2-card">
        <p className="mt2-card__title">Transcription queue</p>
        {queue.length === 0 ? (
          <div className="mt2-empty">
            Nothing queued. Linked recordings appear here while they transcribe.
          </div>
        ) : (
          queue.map((q) => (
            <div className="mt2-queue-row" key={q.id}>
              <div style={{ minWidth: 0 }}>
                <div className="mt2-queue-src">{q.title}</div>
                <div className="mt2-queue-meta">
                  {q.recording_source ? q.recording_source.replace('_', ' ') : 'recording'}
                </div>
              </div>
              <span className={`mt2-chip mt2-chip--${q.analysis_status}`}>
                {q.analysis_status === 'ready'
                  ? 'Ready'
                  : q.analysis_status === 'analyzing'
                    ? 'Analyzing'
                    : 'Transcribing'}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Meeting sentiment */}
      <div className="mt2-card">
        <p className="mt2-card__title">Meeting sentiment</p>
        {sentimentTrend.length === 0 ? (
          <div className="mt2-empty">Not enough analyzed sessions yet to show a tone trend.</div>
        ) : (
          <>
            <div className="mt2-spark">
              {sentimentTrend.map((s, i) => (
                <span
                  key={s.meetingId}
                  className={`mt2-spark__bar${i === sentimentTrend.length - 1 ? ' is-latest' : ''}`}
                  style={{ height: `${20 + (Math.abs(s.avg) / maxAbs) * 80}%` }}
                  title={`${s.title}: ${s.avg > 0 ? '+' : ''}${s.avg}`}
                />
              ))}
            </div>
            <div className="mt2-spark__avg mt2-num">
              Avg tone {avgTone > 0 ? '+' : ''}
              {avgTone.toFixed(2)} · {sentimentTrend.length} session
              {sentimentTrend.length === 1 ? '' : 's'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Root ─────────────────────────────────────────────────────────────────── */
export function MeetingMode({ initialData = null }) {
  const { orgData } = useOrg();
  const orgName = orgData?.org?.name || orgData?.org?.university_name || 'Team Hub';

  const [payload, setPayload] = useState(
    initialData || {
      meetings: [],
      sentimentTrend: [],
      recordersConnected: false,
      viewer: {},
    },
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState('');

  const [mode, setMode] = useState('upcoming');
  const [cat, setCat] = useState('all');
  const [hpage, setHpage] = useState(0);
  const [selectedByMode, setSelectedByMode] = useState({ upcoming: null, past: null });
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

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
      setPayload(data);
      setError('');
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Seeded from the server component → skip the mount fetch. When there's no
    // initialData (e.g. non-member 403 path) keep the client fetch as fallback.
    if (initialData) return;
    load();
  }, [load, initialData]);

  const meetings = useMemo(() => payload.meetings || [], [payload.meetings]);
  const viewer = payload.viewer || {};

  const byMode = useMemo(
    () => ({
      upcoming: meetings.filter((m) => !isPast(m)),
      past: meetings.filter((m) => isPast(m)),
    }),
    [meetings],
  );
  const modeCounts = { upcoming: byMode.upcoming.length, past: byMode.past.length };
  const modeList = byMode[mode];

  const catCounts = useMemo(() => {
    const c = {};
    for (const m of modeList) c[m.category] = (c[m.category] || 0) + 1;
    return c;
  }, [modeList]);
  const presentCats = useMemo(() => new Set(modeList.map((m) => m.category)), [modeList]);

  const filtered = useMemo(
    () => (cat === 'all' ? modeList : modeList.filter((m) => m.category === cat)),
    [modeList, cat],
  );

  const queue = useMemo(
    () =>
      meetings.filter((m) => ['transcribing', 'analyzing', 'ready'].includes(m.analysis_status)),
    [meetings],
  );

  const selectedId = selectedByMode[mode];

  // Reset paging + re-select the first meeting whenever mode/category/list changes.
  useEffect(() => {
    setHpage(0);
    setSelectedByMode((prev) => {
      const stillThere = filtered.some((m) => m.id === prev[mode]);
      if (stillThere) return prev;
      return { ...prev, [mode]: filtered[0]?.id || null };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, cat, filtered.length]);

  // If category no longer present after a data reload, fall back to All.
  useEffect(() => {
    if (cat !== 'all' && !presentCats.has(cat)) setCat('all');
  }, [presentCats, cat]);

  if (loading)
    return (
      <div className="mt2-root">
        <div className="mt2-state">Loading meetings…</div>
      </div>
    );
  if (error)
    return (
      <div className="mt2-root">
        <div className="mt2-state mt2-error">{error}</div>
      </div>
    );

  const selectMeeting = (id) => setSelectedByMode((prev) => ({ ...prev, [mode]: id }));

  return (
    <div className="mt2-root" onClick={() => popoverOpen && setPopoverOpen(false)}>
      <div className="mt2-header">
        <div>
          <p className="mt2-eyebrow">Team Hub · {orgName}</p>
          <h1 className="mt2-title">Meetings</h1>
          <p className="mt2-sub">
            A recording library and AI analysis for your committee, sector and team sessions.
          </p>
        </div>
        <div className="mt2-header-actions" onClick={(e) => e.stopPropagation()}>
          {viewer.canManage && (
            <button
              type="button"
              className="mt2-iconbtn"
              aria-label="Recorder integrations"
              onClick={() => setPopoverOpen((o) => !o)}
            >
              <Settings size={17} />
              {payload.recordersConnected && <span className="mt2-iconbtn__dot" />}
            </button>
          )}
          {viewer.canManage && (
            <button
              type="button"
              className="mt2-btn mt2-btn--primary"
              onClick={() => setNewOpen(true)}
            >
              <Plus size={15} /> New meeting
            </button>
          )}
          {popoverOpen && <RecorderPopover onClose={() => setPopoverOpen(false)} />}
        </div>
      </div>

      {meetings.length === 0 ? (
        <div className="mt2-empty-detail">
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
            No meetings yet
          </p>
          <p style={{ marginBottom: viewer.canManage ? '1rem' : 0 }}>
            Schedule a committee, sector or team session to start building the library.
          </p>
          {viewer.canManage && (
            <button
              type="button"
              className="mt2-btn mt2-btn--primary"
              onClick={() => setNewOpen(true)}
            >
              <Plus size={15} /> New meeting
            </button>
          )}
        </div>
      ) : (
        <div className="mt2-body">
          <Rail
            mode={mode}
            setMode={setMode}
            modeCounts={modeCounts}
            cat={cat}
            setCat={setCat}
            catCounts={catCounts}
            presentCats={presentCats}
            queue={queue}
            sentimentTrend={payload.sentimentTrend || []}
          />
          <div className="mt2-main">
            {filtered.length === 0 ? (
              <div className="mt2-empty-detail">
                <p>No {mode === 'upcoming' ? 'upcoming' : 'recorded'} meetings in this category.</p>
              </div>
            ) : (
              <>
                <MeetingStrip
                  meetings={filtered}
                  mode={mode}
                  catLabelText={cat === 'all' ? 'All meetings' : catLabel(cat)}
                  selectedId={selectedId}
                  onSelect={selectMeeting}
                  hpage={hpage}
                  setHpage={setHpage}
                />
                {selectedId ? (
                  <MeetingDetail key={selectedId} meetingId={selectedId} onChanged={load} />
                ) : (
                  <div className="mt2-empty-detail">Select a meeting to see its detail.</div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {newOpen && (
        <NewMeetingModal
          onClose={() => setNewOpen(false)}
          onCreated={(meeting) => {
            setNewOpen(false);
            load().then(() => {
              if (meeting?.id) {
                const isP = meeting.status === 'closed';
                const mo = isP ? 'past' : 'upcoming';
                setMode(mo);
                setCat('all');
                setSelectedByMode((prev) => ({ ...prev, [mo]: meeting.id }));
              }
            });
          }}
        />
      )}
    </div>
  );
}

export default MeetingMode;
