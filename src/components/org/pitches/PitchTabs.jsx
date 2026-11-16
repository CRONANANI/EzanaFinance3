'use client';

import { useEffect, useMemo, useState } from 'react';
import { Input, Select, Textarea } from '@/components/ds';
import { ArrowLink, Skel, TextToggle } from '@/components/org/command-center/parts';
import PitchSonarPanel from '@/components/org/sonar/PitchSonarPanel';
import { thesisCompleteness } from '@/lib/pitch/gates';
import {
  CONVICTION,
  DELIVERABLE_KINDS,
  HORIZONS,
  NA,
  OUTCOME_NAMES,
  THESIS_FIELD_NAMES,
  VOTE_NAMES,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  fmtPct,
  fmtShare,
  fmtShortDate,
  horizonName,
  modelName,
  reviewState,
  toneOf,
} from '@/lib/org-pitch-pipeline-model';

const numOrNull = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
const lines = (s) =>
  String(s || '')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

/* A small form state helper: busy flag, message, and a runner. */
function useRunner(run) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const go = async (action, done) => {
    setBusy(true);
    setMsg(null);
    const res = await run(action, done);
    setBusy(false);
    if (!res.ok) setMsg(res.message);
    return res.ok;
  };
  return { busy, msg, setMsg, go };
}

function Msg({ msg }) {
  if (!msg) return null;
  return (
    <p className="opp-error" role="alert">
      <i className="bi bi-exclamation-circle" aria-hidden="true" />
      {msg}
    </p>
  );
}

function PanelState({ panels, onRetry, children }) {
  if (panels.status === 'loading' && !panels.data) {
    return (
      <div className="opp-dskel" aria-busy="true">
        <Skel w="50%" h={14} />
        <Skel w="100%" h={12} />
        <Skel w="85%" h={12} />
      </div>
    );
  }
  if (panels.status === 'error' || panels.status === 'missing') {
    return (
      <p className="tcc-state tcc-state--error" role="alert">
        <i className="bi bi-exclamation-circle" aria-hidden="true" />
        <span>Could not load this part of the pitch.</span>
        <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onRetry}>
          Retry
        </button>
      </p>
    );
  }
  return children(panels.data || {});
}

// ── Thesis ───────────────────────────────────────────────────────────────────
const TEXT_FIELDS = [
  'thesis_short',
  'thesis_full',
  'why_now',
  'variant_perception',
  'falsification',
];

export function ThesisTab({ row, detail, run }) {
  const can = Boolean(row.viewer_state?.can_edit_thesis);
  const [editing, setEditing] = useState(false);
  const p = detail;
  /* Which sections the current stage's thesis gate still needs. */
  const need = useMemo(() => {
    const tier = row.stage === 'screening' ? 80 : row.stage === 'deep_dive' ? 100 : null;
    if (!tier) return null;
    return thesisCompleteness(p, tier);
  }, [p, row.stage]);

  if (editing) return <ThesisForm p={p} run={run} onDone={() => setEditing(false)} />;

  const rows = [
    ['Short thesis', p.thesis_short],
    ['Full thesis', p.thesis_full],
    ['Why now', p.why_now],
    ['Catalysts', (p.catalysts || []).join('; ')],
    ['Risks', (p.risks || []).join('; ')],
    ['Base value', fmtMoney(p.valuation_base), true],
    ['Bull value', fmtMoney(p.valuation_bull), true],
    ['Bear value', fmtMoney(p.valuation_bear), true],
    ['Variant perception', p.variant_perception],
    ['Falsification condition', p.falsification],
    [
      'Position size',
      p.position_size_pct == null ? NA : `${fmtShare(p.position_size_pct)} of the fund`,
      true,
    ],
    ['Target price', fmtMoney(p.target_price), true],
    ['Expected return', fmtPct(p.expected_return_pct), true],
    ['Price at pitch', fmtMoney(p.pitch_price ?? p.current_price_at_submission), true],
    ['Horizon', horizonName(p.time_horizon)],
    ['Conviction', p.conviction_level ? CONVICTION[p.conviction_level] : NA],
    ['Catalyst date', fmtDate(p.catalyst_date), true],
  ];
  return (
    <div className="opp-tab">
      {need && (
        <p className={`opp-note${need.missing.length ? ' tcc-warn' : ''}`}>
          <i
            className={`bi ${need.missing.length ? 'bi-exclamation-triangle' : 'bi-check-circle'}`}
            aria-hidden="true"
          />{' '}
          {need.missing.length
            ? `The ${row.stage === 'screening' ? 'Screening' : 'Deep Dive'} gate still needs: ${need.missing
                .map((k) => (THESIS_FIELD_NAMES[k] || k).toLowerCase())
                .join(', ')}.`
            : `Every section the ${row.stage === 'screening' ? 'Screening' : 'Deep Dive'} gate checks is filled in.`}
        </p>
      )}
      <dl className="opp-fields">
        {rows.map(([k, v, mono]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd
              className={`${mono ? 'tcc-mono' : ''}${v == null || v === '' || v === NA ? ' tcc-na' : ''}`}
            >
              {v == null || v === '' ? NA : v}
            </dd>
          </div>
        ))}
      </dl>
      {can ? (
        <button type="button" className="tcc-btn opp-start" onClick={() => setEditing(true)}>
          <i className="bi bi-pencil-square" aria-hidden="true" />
          Edit thesis
        </button>
      ) : (
        <p className="opp-note">
          {['cross_desk_review', 'pitch_scheduled', 'ic_vote', 'approved', 'in_portfolio'].includes(
            row.stage,
          )
            ? 'The thesis is frozen from Cross-desk review onward, so reviewers and the committee judge the same text.'
            : row.status !== 'active'
              ? 'This pitch is closed.'
              : 'Only the author or a manager can edit this thesis.'}
        </p>
      )}
    </div>
  );
}

function ThesisForm({ p, run, onDone }) {
  const [f, setF] = useState(() => ({
    thesis_short: p.thesis_short || '',
    thesis_full: p.thesis_full || '',
    why_now: p.why_now || '',
    catalysts: (p.catalysts || []).join('\n'),
    risks: (p.risks || []).join('\n'),
    valuation_base: p.valuation_base ?? '',
    valuation_bull: p.valuation_bull ?? '',
    valuation_bear: p.valuation_bear ?? '',
    variant_perception: p.variant_perception || '',
    falsification: p.falsification || '',
    position_size_pct: p.position_size_pct ?? '',
    target_price: p.target_price ?? '',
    expected_return_pct: p.expected_return_pct ?? '',
    time_horizon: p.time_horizon || '12m',
    conviction_level: p.conviction_level ? String(p.conviction_level) : '',
    catalyst_date: p.catalyst_date ? String(p.catalyst_date).slice(0, 10) : '',
  }));
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const { busy, msg, setMsg, go } = useRunner(run);
  const NUMS = [
    'valuation_base',
    'valuation_bull',
    'valuation_bear',
    'position_size_pct',
    'target_price',
    'expected_return_pct',
  ];
  const bad = (k) =>
    f[k] !== '' && !Number.isFinite(Number(f[k])) ? 'Enter a number.' : undefined;

  const save = async () => {
    if (f.thesis_short.trim().length < 20)
      return setMsg('The short thesis needs at least 20 characters.');
    if (NUMS.some((k) => bad(k))) return setMsg('Fix the fields marked above.');
    const patch = {};
    for (const k of TEXT_FIELDS) patch[k] = f[k].trim() || null;
    patch.thesis_short = f.thesis_short.trim();
    patch.catalysts = lines(f.catalysts);
    patch.risks = lines(f.risks);
    for (const k of NUMS) patch[k] = numOrNull(f[k]);
    patch.time_horizon = f.time_horizon;
    patch.conviction_level = numOrNull(f.conviction_level);
    patch.catalyst_date = f.catalyst_date || null;
    if (await go({ type: 'editThesis', patch }, 'The thesis was saved.')) onDone();
  };

  const T = (k, label, rows, hint) => (
    <Textarea
      id={`opp-th-${k}`}
      label={label}
      rows={rows}
      value={f[k]}
      hint={hint}
      onChange={(e) => set(k, e.target.value)}
    />
  );
  const N = (k, label) => (
    <Input
      id={`opp-th-${k}`}
      label={label}
      inputMode="decimal"
      value={f[k]}
      error={bad(k)}
      onChange={(e) => set(k, e.target.value)}
    />
  );
  return (
    <div className="opp-form">
      <Input
        id="opp-th-short"
        label="Short thesis"
        maxLength={280}
        value={f.thesis_short}
        hint="At least 20 characters."
        onChange={(e) => set('thesis_short', e.target.value)}
      />
      {T('thesis_full', 'Full thesis', 4, 'At least 200 characters for the thesis gates.')}
      {T('why_now', 'Why now', 2, 'At least 60 characters.')}
      <div className="opp-grid2">
        {T('catalysts', 'Catalysts', 3, 'One per line.')}
        {T('risks', 'Risks', 3, 'One per line.')}
      </div>
      <div className="opp-grid3">
        {N('valuation_base', 'Base value ($)')}
        {N('valuation_bull', 'Bull value ($)')}
        {N('valuation_bear', 'Bear value ($)')}
      </div>
      {T('variant_perception', 'Variant perception', 2, 'At least 80 characters.')}
      {T(
        'falsification',
        'Falsification condition',
        2,
        'At least 40 characters. Checked at every 90-day review once held.',
      )}
      <div className="opp-grid3">
        {N('position_size_pct', 'Position size (% of fund)')}
        {N('target_price', 'Target price ($)')}
        {N('expected_return_pct', 'Expected return (%)')}
      </div>
      <div className="opp-grid3">
        <Select
          id="opp-th-horizon"
          label="Horizon"
          value={f.time_horizon}
          onChange={(e) => set('time_horizon', e.target.value)}
          options={HORIZONS.map(([value, label]) => ({ value, label }))}
        />
        <Select
          id="opp-th-conv"
          label="Conviction"
          value={f.conviction_level}
          onChange={(e) => set('conviction_level', e.target.value)}
          options={[
            { value: '', label: 'Not set' },
            ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: CONVICTION[n] })),
          ]}
        />
        <Input
          id="opp-th-catdate"
          label="Catalyst date"
          type="date"
          value={f.catalyst_date}
          onChange={(e) => set('catalyst_date', e.target.value)}
        />
      </div>
      <Msg msg={msg} />
      <div className="opp-confirm__row">
        <button type="button" className="tcc-textbtn" onClick={onDone}>
          Cancel
        </button>
        <button type="button" className="tcc-btn" disabled={busy} onClick={save}>
          Save thesis
        </button>
      </div>
    </div>
  );
}

// ── Supporting data ──────────────────────────────────────────────────────────
export function DataTab({ detail, sample }) {
  const [state, setState] = useState({ status: sample ? 'sample' : 'loading', data: null });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (sample) return undefined;
    let off = false;
    setState({ status: 'loading', data: null });
    fetch(`/api/org/pitches/${encodeURIComponent(detail.id)}/supporting-data`)
      .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }))
      .then(({ ok, data }) => !off && setState({ status: ok ? 'ready' : 'error', data }))
      .catch(() => !off && setState({ status: 'error', data: null }));
    return () => {
      off = true;
    };
  }, [detail.id, sample, n]);

  if (sample) {
    return (
      <p className="tcc-state">
        <span>
          Research reports and market data load for your council&apos;s own pitches, not for sample
          content.
        </span>
      </p>
    );
  }
  const d = state.data || {};
  const m = d.metrics?.[0] || null;
  return (
    <div className="opp-tab">
      <PitchSonarPanel pitchId={detail.id} />
      <h3 className="opp-subhead">Company</h3>
      {state.status === 'loading' ? (
        <div className="opp-dskel">
          <Skel w="100%" h={12} />
          <Skel w="70%" h={12} />
        </div>
      ) : state.status === 'error' ? (
        <p className="tcc-state tcc-state--error" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          <span>Supporting data is unavailable right now.</span>
          <button
            type="button"
            className="tcc-textbtn tcc-textbtn--accent"
            onClick={() => setN((x) => x + 1)}
          >
            Retry
          </button>
        </p>
      ) : (
        <>
          {d.profile?.description && (
            <p className="opp-prose">{String(d.profile.description).slice(0, 420)}</p>
          )}
          <dl className="tcc-pairs opp-pairs">
            <div className="tcc-pair">
              <dt>Sector</dt>
              <dd>{[d.profile?.sector, d.profile?.industry].filter(Boolean).join(', ') || NA}</dd>
            </div>
            <div className="tcc-pair">
              <dt>Price</dt>
              <dd className="tcc-mono">
                {fmtMoney(d.quote?.price)}{' '}
                <span className={`tcc-${toneOf(d.quote?.changesPercentage)}`}>
                  {fmtPct(d.quote?.changesPercentage)} today
                </span>
              </dd>
            </div>
            <div className="tcc-pair">
              <dt>Market value</dt>
              <dd className="tcc-mono">
                {d.profile?.mktCap ? `$${(d.profile.mktCap / 1e9).toFixed(2)}B` : NA}
              </dd>
            </div>
            <div className="tcc-pair">
              <dt>Price to earnings</dt>
              <dd className="tcc-mono">{m?.peRatio != null ? Number(m.peRatio).toFixed(2) : NA}</dd>
            </div>
            <div className="tcc-pair">
              <dt>Return on equity</dt>
              <dd className="tcc-mono">{m?.roe != null ? fmtShare(m.roe * 100) : NA}</dd>
            </div>
            <div className="tcc-pair">
              <dt>Peers</dt>
              <dd className="tcc-mono">
                {(Array.isArray(d.peers) ? d.peers : []).slice(0, 8).join(', ') || NA}
              </dd>
            </div>
          </dl>
        </>
      )}
    </div>
  );
}

// ── Deliverables, models and the desk meeting ────────────────────────────────
const MODEL_STAGES = ['deep_dive', 'cross_desk_review', 'pitch_scheduled', 'ic_vote'];

export function DeliverablesTab({ row, detail, panels, onRetry, board, run }) {
  const can = Boolean(detail.permissions?.can_upload_deliverable);
  const [kind, setKind] = useState(row.stage === 'pitch_scheduled' ? 'deck' : 'memo');
  const [title, setTitle] = useState('');
  const { busy, msg, setMsg, go } = useRunner(run);
  const add = async () => {
    if (!title.trim()) return setMsg('Give the deliverable a title.');
    if (await go({ type: 'deliverable', kind, title: title.trim() }, 'The deliverable was listed.'))
      setTitle('');
  };
  const dels = detail.deliverables || [];
  return (
    <div className="opp-tab">
      <h3 className="opp-subhead">
        Deliverables <span className="tcc-mono">({dels.length})</span>
      </h3>
      {dels.length === 0 ? (
        <p className="opp-note">None listed yet.</p>
      ) : (
        <ul className="opp-list">
          {dels.map((x) => (
            <li key={x.id} className="opp-line">
              <i className="bi bi-file-earmark-text" aria-hidden="true" />
              <span className="opp-grow">{x.title}</span>
              <span className="opp-sub">
                {DELIVERABLE_KINDS.find(([k]) => k === x.kind)?.[1] || x.kind}
              </span>
              <span className="tcc-mono opp-sub">{fmtShortDate(x.uploaded_at)}</span>
            </li>
          ))}
        </ul>
      )}
      {can && (
        <div className="opp-inline">
          <Select
            id="opp-del-kind"
            label="Kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            options={DELIVERABLE_KINDS.map(([value, label]) => ({ value, label }))}
          />
          <Input
            id="opp-del-title"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            type="button"
            className="tcc-textbtn tcc-textbtn--accent"
            disabled={busy}
            onClick={add}
          >
            <i className="bi bi-plus-lg" aria-hidden="true" />
            List deliverable
          </button>
        </div>
      )}
      <p className="opp-note">A deliverable is a title and a kind. Files are not stored with it.</p>
      <Msg msg={msg} />

      {MODEL_STAGES.includes(row.stage) && (
        <PanelState panels={panels} onRetry={onRetry}>
          {(p) => (
            <>
              {p.models && <Models row={row} models={p.models} run={run} />}
              {p.deskMeeting && (
                <DeskMeeting row={row} meeting={p.deskMeeting.meeting} board={board} run={run} />
              )}
            </>
          )}
        </PanelState>
      )}
    </div>
  );
}

function Models({ row, models, run }) {
  const { busy, msg, setMsg, go } = useRunner(run);
  const [adding, setAdding] = useState(null);
  const [url, setUrl] = useState('');
  const editable = row.stage === 'deep_dive' && row.status === 'active';
  const save = async () => {
    if (!/^https?:\/\//i.test(url.trim())) return setMsg('Enter a link that starts with https://');
    if (
      await go(
        { type: 'model', modelType: adding, fileUrl: url.trim() },
        `${modelName(adding)} added.`,
      )
    ) {
      setAdding(null);
      setUrl('');
    }
  };
  return (
    <>
      <h3 className="opp-subhead">
        Required models{' '}
        <span className="tcc-mono">
          ({models.completeCount} of {models.requiredCount} reviewed)
        </span>
      </h3>
      <ul className="opp-list">
        {(models.checklist || []).map((c) => (
          <li key={c.model_type} className="opp-line opp-wrap">
            <i
              className={`bi ${c.complete ? 'bi-check-circle tcc-pos' : c.uploaded ? 'bi-hourglass-split tcc-warn' : 'bi-circle tcc-na'}`}
              aria-hidden="true"
            />
            <span className="opp-grow">
              {modelName(c.model_type)}
              <span className="opp-sub">
                {' '}
                {c.complete
                  ? `Reviewed ${fmtShortDate(c.reviewed_at)}`
                  : c.uploaded
                    ? 'Added, awaiting review'
                    : 'Not added'}
              </span>
            </span>
            {c.file_url && (
              <a className="tcc-link" href={c.file_url} target="_blank" rel="noreferrer noopener">
                Open <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
              </a>
            )}
            {editable && models.canReview && c.uploaded && !c.reviewed && (
              <button
                type="button"
                className="tcc-textbtn tcc-textbtn--accent"
                disabled={busy}
                onClick={() =>
                  go(
                    { type: 'model', modelType: c.model_type, reviewed: true },
                    `${modelName(c.model_type)} marked reviewed.`,
                  )
                }
              >
                Mark reviewed
              </button>
            )}
            {editable && (
              <button type="button" className="tcc-textbtn" onClick={() => setAdding(c.model_type)}>
                {c.uploaded ? 'Replace link' : 'Add link'}
              </button>
            )}
          </li>
        ))}
      </ul>
      {adding && (
        <div className="opp-inline">
          <Input
            id="opp-model-url"
            label={`Link to the ${modelName(adding).toLowerCase()}`}
            value={url}
            placeholder="https://"
            hint="Replacing a link clears its review."
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="button" className="tcc-textbtn" onClick={() => setAdding(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="tcc-textbtn tcc-textbtn--accent"
            disabled={busy}
            onClick={save}
          >
            Save link
          </button>
        </div>
      )}
      <Msg msg={msg} />
    </>
  );
}

const MEETING_DECISIONS = [
  ['advance', 'Advance'],
  ['more_work', 'More work'],
  ['kill', 'Stop'],
];

function DeskMeeting({ row, meeting, board, run }) {
  const manager = Boolean(board?.viewer?.is_manager);
  const canLog = manager && row.stage === 'deep_dive' && row.status === 'active';
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    held_at: '',
    attendee_ids: [],
    compliance_notes: '',
    sector_weight_notes: '',
    headwinds: '',
    tailwinds: '',
    proposed_sizing_pct: '',
    decision: '',
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const { busy, msg, setMsg, go } = useRunner(run);
  const roster = (board?.members || []).filter(
    (m) => m.team_id === row.team_id || m.role !== 'analyst',
  );
  const name = (mid) => (board?.members || []).find((m) => m.id === mid)?.display_name || 'Member';

  const save = async () => {
    if (!f.held_at) return setMsg('Enter when the meeting was held.');
    if (f.attendee_ids.length < 3) return setMsg('Choose at least 3 attendees.');
    for (const k of ['compliance_notes', 'sector_weight_notes', 'headwinds', 'tailwinds']) {
      if (!f[k].trim()) return setMsg('Fill in every note.');
    }
    if (!Number.isFinite(Number(f.proposed_sizing_pct)) || f.proposed_sizing_pct === '') {
      return setMsg('Enter the proposed size as a number.');
    }
    const body = {
      ...f,
      held_at: new Date(f.held_at).toISOString(),
      proposed_sizing_pct: Number(f.proposed_sizing_pct),
      decision: f.decision || null,
    };
    if (await go({ type: 'deskMeeting', body }, 'The desk meeting was logged.')) setOpen(false);
  };

  return (
    <>
      <h3 className="opp-subhead">Desk meeting</h3>
      {meeting ? (
        <dl className="tcc-pairs opp-pairs">
          <div className="tcc-pair">
            <dt>Held</dt>
            <dd className="tcc-mono">{fmtDateTime(meeting.held_at)}</dd>
          </div>
          <div className="tcc-pair">
            <dt>Attendees</dt>
            <dd>
              <span className="tcc-mono">{(meeting.attendee_ids || []).length}</span>:{' '}
              {(meeting.attendee_ids || []).map(name).join(', ')}
            </dd>
          </div>
          <div className="tcc-pair">
            <dt>Proposed size</dt>
            <dd className="tcc-mono">{fmtShare(meeting.proposed_sizing_pct)}</dd>
          </div>
          <div className="tcc-pair">
            <dt>Desk decision</dt>
            <dd>{MEETING_DECISIONS.find(([k]) => k === meeting.decision)?.[1] || NA}</dd>
          </div>
          <div className="tcc-pair">
            <dt>Compliance</dt>
            <dd>{meeting.compliance_notes || NA}</dd>
          </div>
          <div className="tcc-pair">
            <dt>Sector weight</dt>
            <dd>{meeting.sector_weight_notes || NA}</dd>
          </div>
          <div className="tcc-pair">
            <dt>Headwinds</dt>
            <dd>{meeting.headwinds || NA}</dd>
          </div>
          <div className="tcc-pair">
            <dt>Tailwinds</dt>
            <dd>{meeting.tailwinds || NA}</dd>
          </div>
        </dl>
      ) : (
        <p className="opp-note">
          Not logged yet. The Deep Dive gate needs a meeting with 3 or more attendees.
        </p>
      )}
      {canLog && !open && (
        <button
          type="button"
          className="tcc-textbtn tcc-textbtn--accent"
          onClick={() => setOpen(true)}
        >
          <i className="bi bi-people" aria-hidden="true" />
          {meeting ? 'Log another meeting' : 'Log desk meeting'}
        </button>
      )}
      {open && (
        <div className="opp-form">
          <div className="opp-grid2">
            <Input
              id="opp-dm-at"
              label="Held at"
              type="datetime-local"
              value={f.held_at}
              onChange={(e) => set('held_at', e.target.value)}
            />
            <Input
              id="opp-dm-size"
              label="Proposed size (% of fund)"
              inputMode="decimal"
              value={f.proposed_sizing_pct}
              onChange={(e) => set('proposed_sizing_pct', e.target.value)}
            />
          </div>
          <fieldset className="opp-fieldset">
            <legend className="ds-field-label">
              Attendees <span className="tcc-mono">({f.attendee_ids.length})</span>
            </legend>
            <div className="opp-checks">
              {roster.map((m) => (
                <label key={m.id} className="opp-check">
                  <input
                    type="checkbox"
                    checked={f.attendee_ids.includes(m.id)}
                    onChange={(e) =>
                      set(
                        'attendee_ids',
                        e.target.checked
                          ? [...f.attendee_ids, m.id]
                          : f.attendee_ids.filter((x) => x !== m.id),
                      )
                    }
                  />
                  {m.display_name}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="opp-grid2">
            <Textarea
              id="opp-dm-comp"
              label="Compliance notes"
              rows={2}
              value={f.compliance_notes}
              onChange={(e) => set('compliance_notes', e.target.value)}
            />
            <Textarea
              id="opp-dm-sector"
              label="Sector weight notes"
              rows={2}
              value={f.sector_weight_notes}
              onChange={(e) => set('sector_weight_notes', e.target.value)}
            />
            <Textarea
              id="opp-dm-head"
              label="Headwinds"
              rows={2}
              value={f.headwinds}
              onChange={(e) => set('headwinds', e.target.value)}
            />
            <Textarea
              id="opp-dm-tail"
              label="Tailwinds"
              rows={2}
              value={f.tailwinds}
              onChange={(e) => set('tailwinds', e.target.value)}
            />
          </div>
          <div className="opp-field">
            <span className="ds-field-label" id="opp-dm-dec">
              Desk decision (optional)
            </span>
            <div className="tcc-toggles opp-toggles" role="group" aria-labelledby="opp-dm-dec">
              {MEETING_DECISIONS.map(([k, label]) => (
                <TextToggle
                  key={k}
                  pressed={f.decision === k}
                  onClick={() => set('decision', f.decision === k ? '' : k)}
                >
                  {label}
                </TextToggle>
              ))}
            </div>
          </div>
          <Msg msg={msg} />
          <div className="opp-confirm__row">
            <button type="button" className="tcc-textbtn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="tcc-btn" disabled={busy} onClick={save}>
              Log meeting
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Discussion ───────────────────────────────────────────────────────────────
export function DiscussionTab({ detail, run }) {
  const [body, setBody] = useState('');
  const { busy, msg, setMsg, go } = useRunner(run);
  const list = detail.discussion || [];
  const post = async () => {
    if (!body.trim()) return setMsg('Write a message first.');
    if (await go({ type: 'comment', body: body.trim() })) setBody('');
  };
  return (
    <div className="opp-tab">
      {list.length === 0 ? (
        <p className="opp-note">No messages yet.</p>
      ) : (
        <ul className="opp-messages">
          {list.map((m) => (
            <li key={m.id}>
              <span className="opp-msghead">
                <strong>{m.author_name}</strong>{' '}
                <span className="tcc-mono opp-sub">{fmtShortDate(m.created_at)}</span>
              </span>
              <p>{m.body}</p>
            </li>
          ))}
        </ul>
      )}
      {detail.permissions?.can_discuss ? (
        <>
          <Textarea
            id="opp-msg"
            label="Message"
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Msg msg={msg} />
          <div className="opp-confirm__row">
            <button type="button" className="tcc-btn" disabled={busy} onClick={post}>
              Post
            </button>
          </div>
        </>
      ) : (
        <p className="opp-note">This pitch is closed to new messages.</p>
      )}
    </div>
  );
}

// ── Review: sign-offs at Screening, cross-desk at Cross-desk review ───────────
export function ReviewTab({ row, panels, onRetry, run }) {
  return (
    <div className="opp-tab">
      <PanelState panels={panels} onRetry={onRetry}>
        {(p) =>
          row.stage === 'screening' && p.signoff ? (
            <Signoffs row={row} s={p.signoff} run={run} />
          ) : row.stage === 'cross_desk_review' && p.crossDesk ? (
            <CrossDesk row={row} c={p.crossDesk} run={run} />
          ) : (
            <p className="opp-note">Nothing to review at this stage.</p>
          )
        }
      </PanelState>
    </div>
  );
}

const SIGN_WORD = { approve: 'Approved', request_changes: 'Changes requested' };

function Signoffs({ row, s, run }) {
  const [comment, setComment] = useState('');
  const { busy, msg, go } = useRunner(run);
  const mayAct = Boolean(row.viewer_state?.can_sign_off) && s.viewer?.eligible;
  const send = (scope, decision) =>
    go(
      { type: 'signoff', scope, decision, comment: comment.trim() || undefined },
      decision === 'approve'
        ? 'Your sign-off is recorded.'
        : 'Your request for changes is recorded.',
    );
  return (
    <>
      <h3 className="opp-subhead">
        Sign-offs{' '}
        <span className="tcc-mono">
          ({s.approvedCount} of {s.required})
        </span>
      </h3>
      <p className="opp-note">
        Senior analysts and above, never the author. At least one from the pitching desk:{' '}
        <span className="tcc-mono">{s.inDeskApproved}</span> so far.
      </p>
      {(s.members || []).length === 0 ? (
        <p className="opp-note">No eligible member on this desk yet.</p>
      ) : (
        <ul className="opp-list">
          {s.members.map((m) => (
            <li key={m.member_id} className="opp-line opp-wrap">
              <span className="opp-grow">
                {m.display_name}
                <span className="opp-sub"> {m.in_desk ? 'Pitching desk' : 'Other desk'}</span>
              </span>
              <span className={`opp-sub ${m.model?.decision === 'approve' ? 'tcc-pos' : ''}`}>
                Model: {SIGN_WORD[m.model?.decision] || 'Waiting'}
              </span>
              <span className={`opp-sub ${m.qualitative?.decision === 'approve' ? 'tcc-pos' : ''}`}>
                Qualitative: {SIGN_WORD[m.qualitative?.decision] || 'Waiting'}
              </span>
            </li>
          ))}
        </ul>
      )}
      {mayAct ? (
        <div className="opp-form">
          <Textarea
            id="opp-sign-comment"
            label="Comment (optional)"
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="opp-confirm__row opp-left">
            <button
              type="button"
              className="tcc-btn"
              disabled={busy}
              onClick={() => send('qualitative', 'approve')}
            >
              Approve the thesis
            </button>
            <button
              type="button"
              className="tcc-textbtn"
              disabled={busy}
              onClick={() => send('model', 'approve')}
            >
              Approve the model
            </button>
            <button
              type="button"
              className="tcc-textbtn opp-danger"
              disabled={busy}
              onClick={() => send('qualitative', 'request_changes')}
            >
              Request changes
            </button>
          </div>
          <Msg msg={msg} />
        </div>
      ) : (
        <p className="opp-note">
          {row.viewer_state?.is_author
            ? 'Authors do not sign off their own pitch.'
            : 'Sign-off needs senior analyst tier or above.'}
        </p>
      )}
    </>
  );
}

const CROSS_WORD = { approve: 'Approved', object: 'Objected', abstain: 'Abstained' };

function CrossDesk({ row, c, run }) {
  const [reason, setReason] = useState('');
  const { busy, msg, setMsg, go } = useRunner(run);
  const send = (decision) => {
    if (decision === 'object' && reason.trim().length < 10)
      return setMsg('An objection needs a reason of at least 10 characters.');
    return go(
      { type: 'crossDesk', decision, reason: reason.trim() || undefined },
      'Your desk’s decision is recorded.',
    );
  };
  return (
    <>
      <h3 className="opp-subhead">
        Cross-desk review{' '}
        <span className="tcc-mono">
          ({c.summary.approved} of {c.summary.needed} needed)
        </span>
      </h3>
      <p className="opp-note">
        A majority of the other desks&apos; portfolio managers approve and none object. The thesis
        is frozen.
      </p>
      <ul className="opp-list">
        {(c.desks || []).map((x) => (
          <li key={x.team_id} className="opp-line opp-wrap">
            <span className="opp-grow">
              {x.team_name}
              <span className="opp-sub"> {x.pm_name || 'No PM'}</span>
            </span>
            <span
              className={
                x.decision === 'approve'
                  ? 'tcc-pos'
                  : x.decision === 'object'
                    ? 'tcc-neg'
                    : 'tcc-na'
              }
            >
              {CROSS_WORD[x.decision] || 'Waiting'}
            </span>
            {x.reason && <span className="opp-sub opp-full">{x.reason}</span>}
          </li>
        ))}
      </ul>
      {row.viewer_state?.can_cross_desk ? (
        <div className="opp-form">
          {c.viewer?.decision && (
            <p className="opp-note">
              Your desk: {CROSS_WORD[c.viewer.decision]}. You can change it.
            </p>
          )}
          <Textarea
            id="opp-cross-reason"
            label="Reason"
            rows={2}
            value={reason}
            hint="Required to object, at least 10 characters."
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="opp-confirm__row opp-left">
            <button
              type="button"
              className="tcc-btn"
              disabled={busy}
              onClick={() => send('approve')}
            >
              Approve
            </button>
            <button
              type="button"
              className="tcc-textbtn opp-danger"
              disabled={busy}
              onClick={() => send('object')}
            >
              Object
            </button>
            <button
              type="button"
              className="tcc-textbtn"
              disabled={busy}
              onClick={() => send('abstain')}
            >
              Abstain
            </button>
          </div>
          <Msg msg={msg} />
        </div>
      ) : (
        <p className="opp-note">
          {c.viewer?.is_pitching_desk
            ? 'The pitching desk does not review its own pitch.'
            : 'Another desk’s portfolio manager records this decision.'}
        </p>
      )}
    </>
  );
}

// ── Voting: meeting, session and results ─────────────────────────────────────
export function VotingTab({ row, detail, board, run }) {
  const viewer = board?.viewer || {};
  const meeting = detail.ic_meeting;
  const b = detail.ballot;
  const meetings = (board?.meetings || []).filter((m) => m.status !== 'closed');
  const [pick, setPick] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const { busy, msg, setMsg, go } = useRunner(run);
  const canAssign =
    viewer.is_manager &&
    row.status === 'active' &&
    ['cross_desk_review', 'pitch_scheduled', 'ic_vote'].includes(row.stage) &&
    !(row.stage === 'ic_vote' && meeting);
  const exec = viewer.role === 'executive';

  const assign = async () => {
    if (!pick) return setMsg('Choose a meeting.');
    if (
      await go(
        { type: 'assignMeeting', meetingId: pick },
        `${row.ticker} was added to the meeting.`,
      )
    )
      setPick('');
  };
  const status = (s, done) => go({ type: 'meetingStatus', meetingId: meeting.id, status: s }, done);
  const votes = b && !b.sealed ? detail.votes || [] : [];

  return (
    <div className="opp-tab">
      <h3 className="opp-subhead">Committee meeting</h3>
      {meeting ? (
        <dl className="tcc-pairs opp-pairs">
          <div className="tcc-pair">
            <dt>When</dt>
            <dd className="tcc-mono">{fmtDateTime(meeting.meets_at)}</dd>
          </div>
          <div className="tcc-pair">
            <dt>Session</dt>
            <dd>
              {{ scheduled: 'Scheduled', in_session: 'In session', closed: 'Closed' }[
                meeting.status
              ] || NA}
            </dd>
          </div>
          <div className="tcc-pair">
            <dt>Ballot</dt>
            <dd>{meeting.ballot_type === 'blind' ? 'Blind' : 'Open'}</dd>
          </div>
          <div className="tcc-pair">
            <dt>Threshold</dt>
            <dd>{meeting.threshold === 'supermajority' ? 'Two thirds Buy' : 'Simple majority'}</dd>
          </div>
          <div className="tcc-pair">
            <dt>Quorum</dt>
            <dd className="tcc-mono">{meeting.quorum_pct ?? 50}%</dd>
          </div>
        </dl>
      ) : (
        <p className="opp-note">Not on a committee meeting yet.</p>
      )}

      {canAssign &&
        (meetings.length ? (
          <div className="opp-inline">
            <Select
              id="opp-assign"
              label={meeting ? 'Move to another meeting' : 'Add to a meeting'}
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              options={[
                { value: '', label: 'Choose a meeting' },
                ...meetings.map((m) => ({
                  value: m.id,
                  label: `${fmtDateTime(m.meets_at)} (${m.ballot_type})`,
                })),
              ]}
            />
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              disabled={busy}
              onClick={assign}
            >
              Add to meeting
            </button>
          </div>
        ) : (
          <p className="opp-note">No open committee meeting. Schedule one from the IC agenda.</p>
        ))}

      {meeting && exec && meeting.status !== 'closed' && (
        <div className="opp-confirm__row opp-left">
          {meeting.status === 'scheduled' && (
            <button
              type="button"
              className="tcc-btn"
              disabled={busy}
              onClick={() => status('in_session', 'The session is open. Voting has started.')}
            >
              Open the session
            </button>
          )}
          {!confirmClose ? (
            <button type="button" className="tcc-textbtn" onClick={() => setConfirmClose(true)}>
              <i className="bi bi-door-closed" aria-hidden="true" />
              Close the vote
            </button>
          ) : (
            <>
              <span className="opp-note">
                Closing ends voting for every pitch on this meeting
                {meeting.ballot_type === 'blind' ? ' and reveals the ballots' : ''}.
              </span>
              <button type="button" className="tcc-textbtn" onClick={() => setConfirmClose(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="tcc-btn"
                disabled={busy}
                onClick={async () => {
                  if (await status('closed', 'The vote is closed.')) setConfirmClose(false);
                }}
              >
                Close the vote
              </button>
            </>
          )}
        </div>
      )}
      <Msg msg={msg} />

      {row.stage === 'ic_vote' && meeting?.status === 'scheduled' && (
        <p className="opp-note">Voting opens when an executive opens the session.</p>
      )}

      {b && meeting && (row.stage === 'ic_vote' || meeting.status === 'closed') && (
        <>
          <h3 className="opp-subhead">Ballots</h3>
          <p className="opp-received">
            <span className="tcc-mono">
              {b.received} of {b.eligible}
            </span>{' '}
            ballots received
          </p>
          {b.sealed ? (
            <p className="opp-note">
              <i className="bi bi-eye-slash" aria-hidden="true" /> Blind ballot. The results and
              every ballot appear here when the meeting closes.
            </p>
          ) : (
            <>
              {b.tally && (
                <p className="opp-tally tcc-mono">
                  Buy {b.tally.yes}, Pass {b.tally.no}, Abstain {b.tally.abstain}
                </p>
              )}
              {meeting.status === 'closed' && (
                <p className="opp-note">
                  The vote is closed. The IC Vote gates check quorum and the threshold when the
                  pitch is moved on.
                </p>
              )}
              {votes.length === 0 ? (
                <p className="opp-note">No ballots.</p>
              ) : (
                <ul className="opp-messages">
                  {votes.map((v) => (
                    <li key={v.id || v.voter_member_id}>
                      <span className="opp-msghead">
                        <strong>{v.voter_name}</strong>{' '}
                        <span>{v.recused ? 'Recused' : VOTE_NAMES[v.vote] || NA}</span>
                      </span>
                      {!v.recused && v.rationale && <p>{v.rationale}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Decision, performance and the held-pitch review ─────────────────────────
export function DecisionTab({ row, detail, sample, run }) {
  const s = row.viewer_state || {};
  const h = detail.hindsight;
  const review = reviewState(detail);
  const meetingClosed = detail.ic_meeting?.status === 'closed';
  const [outcome, setOutcome] = useState('');
  const [why, setWhy] = useState('');
  const [note, setNote] = useState('');
  const [hind, setHind] = useState({ busy: false, msg: null });
  const { busy, msg, setMsg, go } = useRunner(run);

  const record = async () => {
    if (!outcome) return setMsg('Choose an outcome.');
    if (!why.trim()) return setMsg('Write the rationale for the record.');
    await go(
      { type: 'decision', decision: outcome, rationale: why.trim() },
      `The outcome for ${row.ticker} is recorded.`,
    );
  };
  const refreshHindsight = async () => {
    setHind({ busy: true, msg: null });
    try {
      const r = await fetch(`/api/org/archive/hindsight/${encodeURIComponent(detail.id)}`);
      if (!r.ok) throw new Error();
      await run({ type: 'reload' });
      setHind({ busy: false, msg: 'Hindsight refreshed.' });
    } catch {
      setHind({ busy: false, msg: 'Hindsight could not be refreshed right now.' });
    }
  };

  return (
    <div className="opp-tab">
      <h3 className="opp-subhead">Outcome</h3>
      {detail.decision ? (
        <dl className="tcc-pairs opp-pairs">
          <div className="tcc-pair">
            <dt>Decision</dt>
            <dd>{OUTCOME_NAMES[detail.decision] || detail.decision}</dd>
          </div>
          <div className="tcc-pair">
            <dt>Date</dt>
            <dd className="tcc-mono">{fmtDate(detail.decision_at)}</dd>
          </div>
          <div className="tcc-pair">
            <dt>Rationale</dt>
            <dd>{detail.decision_rationale || detail.archive_reason || NA}</dd>
          </div>
          {detail.position_size_pct != null && (
            <div className="tcc-pair">
              <dt>Position size</dt>
              <dd className="tcc-mono">{fmtShare(detail.position_size_pct)}</dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="opp-note">No decision yet.</p>
      )}

      {row.stage === 'approved' && (
        <div className="opp-handoff">
          <p>
            Approved by the committee. Accepting a pitch does not create a position: record it on
            the Trading Desk. Once a position in <span className="tcc-mono">{row.ticker}</span> is
            on the book, the pitch can move to In portfolio.
          </p>
          <ArrowLink href="/org-trading">Open Trading Desk</ArrowLink>
        </div>
      )}

      {s.can_record_outcome && (
        <>
          <h3 className="opp-subhead">Record the outcome</h3>
          {!meetingClosed ? (
            <p className="opp-note">The outcome can be recorded by hand once the vote is closed.</p>
          ) : (
            <div className="opp-form">
              <div className="tcc-toggles opp-toggles" role="group" aria-label="Outcome">
                {['accepted', 'rejected', 'watchlist', 'deferred'].map((k) => (
                  <TextToggle key={k} pressed={outcome === k} onClick={() => setOutcome(k)}>
                    {OUTCOME_NAMES[k]}
                  </TextToggle>
                ))}
              </div>
              <Textarea
                id="opp-out-why"
                label="Rationale"
                rows={2}
                value={why}
                onChange={(e) => setWhy(e.target.value)}
              />
              <p className="opp-note">
                Accepted moves the pitch to Approved. The other outcomes close it.
              </p>
              <div className="opp-confirm__row opp-left">
                <button type="button" className="tcc-btn" disabled={busy} onClick={record}>
                  Record outcome
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {(h || detail.decision) && (
        <>
          <h3 className="opp-subhead">Since the decision</h3>
          {h ? (
            <dl className="tcc-pairs opp-pairs">
              <div className="tcc-pair">
                <dt>Return</dt>
                <dd className={`tcc-mono tcc-${toneOf(h.return_pct)}`}>{fmtPct(h.return_pct)}</dd>
              </div>
              <div className="tcc-pair">
                <dt>S&amp;P 500</dt>
                <dd className={`tcc-mono tcc-${toneOf(h.benchmark_return_pct)}`}>
                  {fmtPct(h.benchmark_return_pct)}
                </dd>
              </div>
              <div className="tcc-pair">
                <dt>Alpha</dt>
                <dd className={`tcc-mono tcc-${toneOf(h.alpha_pct)}`}>{fmtPct(h.alpha_pct)}</dd>
              </div>
            </dl>
          ) : (
            <p className="opp-note">
              A reading is recorded on weekdays from 30 days after the decision.
            </p>
          )}
          {!sample && detail.decision_at && (
            <>
              <button
                type="button"
                className="tcc-textbtn"
                disabled={hind.busy}
                onClick={refreshHindsight}
              >
                <i className="bi bi-arrow-repeat" aria-hidden="true" />
                Refresh hindsight
              </button>
              {hind.msg && <p className="opp-note">{hind.msg}</p>}
            </>
          )}
        </>
      )}

      {row.stage === 'in_portfolio' && (
        <>
          <h3 className="opp-subhead">Thesis review</h3>
          <dl className="tcc-pairs opp-pairs">
            <div className="tcc-pair">
              <dt>Falsification condition</dt>
              <dd>{detail.falsification || NA}</dd>
            </div>
            <div className="tcc-pair">
              <dt>Review due</dt>
              <dd className={`tcc-mono${review.overdue ? ' tcc-warn' : ''}`}>
                {fmtDate(review.due)}
                {review.days != null &&
                  ` (${review.overdue ? `${Math.abs(review.days)} days overdue` : `in ${review.days} days`})`}
              </dd>
            </div>
          </dl>
          {s.can_review_falsification ? (
            <div className="opp-form">
              <Textarea
                id="opp-fals-note"
                label="What you observed (optional)"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="opp-confirm__row opp-left">
                <button
                  type="button"
                  className="tcc-btn"
                  disabled={busy}
                  onClick={() =>
                    go(
                      { type: 'falsification', tripped: false, note },
                      'The thesis was reaffirmed. The 90-day clock restarts.',
                    )
                  }
                >
                  Thesis holds
                </button>
                <button
                  type="button"
                  className="tcc-textbtn opp-danger"
                  disabled={busy}
                  onClick={() =>
                    go(
                      { type: 'falsification', tripped: true, note },
                      'Condition met: a red flag was raised on the Trading Desk.',
                    )
                  }
                >
                  Condition met: raise a red flag
                </button>
              </div>
              <p className="opp-note">Either answer restarts the 90-day clock.</p>
            </div>
          ) : (
            <p className="opp-note">The author or a manager answers the review.</p>
          )}
        </>
      )}
      <Msg msg={msg} />
    </div>
  );
}
