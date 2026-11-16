'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Checkbox, Input, Modal, Select, Textarea } from '@/components/ds';
import { NA, fmtDate, roleLabel } from '@/lib/org-cohorts-model';
import { SampleNote } from './parts';

const LIBRARY_HREF = '/org-team-hub/research-library';

function ErrorLine({ children }) {
  if (!children) return null;
  return (
    <p className="coh-formerr" role="alert">
      <i className="bi bi-exclamation-triangle" aria-hidden="true" />
      {children}
    </p>
  );
}

/* ── New cohort: created as recruiting and NOT current ───────────────────── */
export function NewCohortDialog({ request, sample, onClose, onCreated }) {
  const [f, setF] = useState({
    name: '',
    term_type: 'year',
    entry_term: '',
    expected_grad_term: '',
    onboarding_gate: true,
  });
  const [err, setErr] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e?.preventDefault();
    if (!f.name.trim()) {
      setNameErr('Enter a name for the cohort.');
      document.getElementById('coh-new-name')?.focus();
      return;
    }
    setBusy(true);
    setErr('');
    /* Never sent as current: "Set as current" is the separate, explicit step. */
    const res = await request('POST', '/api/org/cohorts', { ...f, status: 'recruiting' });
    setBusy(false);
    if (!res.ok) {
      setErr(res.json?.error || 'The cohort was not created. Try again.');
      return;
    }
    onCreated(res.json?.cohort?.id || null);
  };

  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title="New cohort"
      size={480}
      className="coh-dialog"
      footer={
        <>
          <button type="button" className="tcc-textbtn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <Button
            variant="primary"
            className="tcc-flatbtn"
            type="submit"
            form="coh-new"
            loading={busy}
          >
            Create cohort
          </Button>
        </>
      }
    >
      <form id="coh-new" className="coh-form" onSubmit={submit} noValidate>
        <SampleNote on={sample} />
        <Input
          id="coh-new-name"
          label="Name"
          placeholder="Class of 2028"
          value={f.name}
          error={nameErr || undefined}
          onChange={(e) => {
            set('name', e.target.value);
            setNameErr('');
          }}
        />
        <Select
          id="coh-new-term"
          label="Term type"
          value={f.term_type}
          onChange={(e) => set('term_type', e.target.value)}
          options={[
            { value: 'semester', label: 'Semester' },
            { value: 'quarter', label: 'Quarter' },
            { value: 'year', label: 'Year' },
          ]}
        />
        <div className="coh-form__pair">
          <Input
            id="coh-new-entry"
            label="Entry term"
            placeholder="Fall 2026"
            value={f.entry_term}
            onChange={(e) => set('entry_term', e.target.value)}
          />
          <Input
            id="coh-new-grad"
            label="Expected graduation"
            placeholder="Spring 2028"
            value={f.expected_grad_term}
            onChange={(e) => set('expected_grad_term', e.target.value)}
          />
        </div>
        <Checkbox
          checked={f.onboarding_gate}
          onChange={(e) => set('onboarding_gate', e.target.checked)}
          label="Onboarding gate: block a first live pitch until gate tasks are done"
        />
        <p className="coh-hint">
          The new cohort starts as recruiting. The current cohort does not change until an executive
          chooses Set as current.
        </p>
        <ErrorLine>{err}</ErrorLine>
      </form>
    </Modal>
  );
}

/* ── Set as current ──────────────────────────────────────────────────────── */
export function SetCurrentDialog({ cohort, current, request, sample, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    setBusy(true);
    setErr('');
    const res = await request('PATCH', '/api/org/cohorts', {
      cohort_id: cohort.id,
      is_current: true,
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.json?.error || 'The current cohort was not changed. Try again.');
      return;
    }
    onDone();
  };
  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={`Set ${cohort.name} as current`}
      size={480}
      className="coh-dialog"
      footer={
        <>
          <button type="button" className="tcc-textbtn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <Button variant="primary" className="tcc-flatbtn" onClick={go} loading={busy}>
            Set as current
          </Button>
        </>
      }
    >
      <SampleNote on={sample} />
      <p className="coh-body">
        The current cohort labels the Command Center figures, stamps the term on new assignments,
        grades and fund reports, and is the class Term completion compares with the one before.
        {current ? ` ${current.name} stops being current.` : ''}
      </p>
      <ErrorLine>{err}</ErrorLine>
    </Modal>
  );
}

/* ── Graduate: shows exactly who graduates, then confirms ────────────────── */
export function GraduateDialog({ cohort, preview, request, sample, onClose, onDone, onReload }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const loading = preview.status === 'loading';
  const failed = preview.status === 'error';
  const members = preview.data?.members || [];
  const missing = preview.data?.missing || [];
  const ready = preview.status === 'ready' && preview.data;

  const go = async () => {
    setBusy(true);
    setErr('');
    const res = await request('POST', `/api/org/cohorts/${cohort.id}/archive`, {
      graduate: true,
      force: missing.length > 0,
      expected_member_ids: members.map((m) => m.member_id),
    });
    setBusy(false);
    if (res.status === 409 && res.json?.gate === 'roster_changed') {
      setErr('The members flagged to graduate changed. The list is updated; review it again.');
      onReload();
      return;
    }
    if (res.status === 409 && res.json?.gate === 'handoff_docs') {
      setErr('A handoff is now missing. The list is updated; review it again.');
      onReload();
      return;
    }
    if (!res.ok) {
      setErr(res.json?.error || 'The cohort was not graduated. Nothing changed.');
      return;
    }
    onDone(res.json?.graduated ?? members.length);
  };

  const n = members.length;
  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={`Graduate ${cohort.name}`}
      size={640}
      className="coh-dialog"
      footer={
        <>
          <button type="button" className="tcc-textbtn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          {missing.length > 0 && (
            <Link href={LIBRARY_HREF} className="tcc-link">
              Open Research Library <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          )}
          <Button
            variant="danger"
            className="tcc-flatbtn"
            onClick={go}
            loading={busy}
            disabled={!ready}
          >
            {missing.length > 0 ? 'Graduate anyway' : 'Graduate class'}
          </Button>
        </>
      }
    >
      <SampleNote on={sample} />
      <p className="coh-body">
        Archives {cohort.name}, keeps a snapshot of the fund, and freezes each graduating
        member&apos;s Ezana Rating and pitch count.{' '}
        {n === 1 ? 'This member becomes' : 'These members become'} inactive alumni. This cannot be
        reversed.
      </p>
      {loading ? (
        <p className="tcc-state">Checking who is flagged to graduate.</p>
      ) : failed ? (
        <p className="tcc-state tcc-state--error" role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          <span>Could not load the graduation list.</span>
          <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onReload}>
            Retry
          </button>
        </p>
      ) : n === 0 ? (
        <p className="coh-body coh-tone--warn">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" /> No member of this cohort
          is flagged to graduate. The cohort is archived and nobody moves to alumni.
        </p>
      ) : (
        <>
          <p className="coh-caps">
            {n} {n === 1 ? 'member graduates' : 'members graduate'}, only from this cohort
          </p>
          <ul className="coh-gradlist">
            {members.map((m) => (
              <li key={m.member_id}>
                <span className="coh-gradlist__who">
                  <strong>{m.display_name || NA}</strong>
                  <span className="tcc-meta">{m.title || roleLabel(m.role)}</span>
                </span>
                <span className="coh-gradlist__cov">
                  {m.sectors.length === 0 ? (
                    <span className="tcc-meta">No sector coverage on file</span>
                  ) : (
                    m.sectors.map((s) => (
                      <span
                        key={s.sector}
                        className={s.published ? 'coh-tone--pos' : 'coh-tone--warn'}
                      >
                        <i
                          className={`bi ${s.published ? 'bi-check-lg' : 'bi-exclamation-triangle'}`}
                          aria-hidden="true"
                        />
                        {s.sector}: {s.published ? 'handoff published' : 'no published handoff'}
                      </span>
                    ))
                  )}
                </span>
              </li>
            ))}
          </ul>
          {missing.length > 0 && (
            <p className="coh-body coh-tone--warn">
              <i className="bi bi-exclamation-triangle" aria-hidden="true" />{' '}
              {missing.map((m) => `${m.sector} (${m.member_name || 'member'})`).join(', ')}{' '}
              {missing.length === 1 ? 'has' : 'have'} no published handoff. Publish one in the
              Research Library, or graduate anyway as an executive override, which is recorded in
              the audit log.
            </p>
          )}
        </>
      )}
      <ErrorLine>{err}</ErrorLine>
    </Modal>
  );
}

/* ── Track record of an archived cohort ──────────────────────────────────── */
const signed = (n) =>
  n == null || !Number.isFinite(Number(n)) ? NA : `${n >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`;
const money = (n) =>
  n == null || !Number.isFinite(Number(n))
    ? NA
    : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function TrackRecordDialog({ cohort, onClose }) {
  const snap = cohort?.archived_snapshot || {};
  const fund = snap.fund || {};
  const roster = snap.roster || [];
  const track = snap.pitch_track_record || [];
  return (
    <Modal
      open
      onClose={onClose}
      title={`${cohort.name}: track record`}
      size={680}
      className="coh-dialog"
    >
      <p className="coh-body">
        Snapshot taken {fmtDate(cohort.archived_at || snap.archived_at)}. The whole fund at that
        moment.
      </p>
      <dl className="coh-snap">
        <div>
          <dt>Fund value</dt>
          <dd className="tcc-mono">{money(fund.total_value)}</dd>
        </div>
        <div>
          <dt>Hit rate</dt>
          <dd className="tcc-mono">
            {fund.hit_rate == null ? NA : `${Math.round(fund.hit_rate * 100)}%`}
          </dd>
        </div>
        <div>
          <dt>Average alpha</dt>
          <dd className="tcc-mono">{signed(fund.avg_alpha_pct)}</dd>
        </div>
        <div>
          <dt>Positions</dt>
          <dd className="tcc-mono">{fund.positions ?? NA}</dd>
        </div>
        <div>
          <dt>Pitches</dt>
          <dd className="tcc-mono">{fund.pitch_count ?? NA}</dd>
        </div>
      </dl>
      <h3 className="coh-subhead">Roster</h3>
      {roster.length === 0 ? (
        <p className="tcc-state">No roster recorded.</p>
      ) : (
        <ul className="coh-plain">
          {roster.map((m, i) => (
            <li key={i}>
              <span>{m.display_name}</span>
              <span className="tcc-meta">
                {m.title || roleLabel(m.role)}
                {m.graduated ? ', graduated' : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
      <h3 className="coh-subhead">Pitches</h3>
      {track.length === 0 ? (
        <p className="tcc-state">No pitches recorded.</p>
      ) : (
        <div className="coh-scroll">
          <table className="coh-table coh-table--compact">
            <thead>
              <tr>
                <th scope="col">Ticker</th>
                <th scope="col">Decision</th>
                <th scope="col" className="coh-num">
                  Return
                </th>
                <th scope="col" className="coh-num">
                  Alpha
                </th>
              </tr>
            </thead>
            <tbody>
              {track.map((t, i) => (
                <tr key={i}>
                  <td className="tcc-mono tcc-ticker">{t.ticker}</td>
                  <td>{t.decision ? t.decision[0].toUpperCase() + t.decision.slice(1) : NA}</td>
                  <td
                    className={`coh-num tcc-mono ${t.return_pct == null ? 'tcc-na' : t.return_pct >= 0 ? 'tcc-pos' : 'tcc-neg'}`}
                  >
                    {signed(t.return_pct)}
                  </td>
                  <td
                    className={`coh-num tcc-mono ${t.alpha_pct == null ? 'tcc-na' : t.alpha_pct >= 0 ? 'tcc-pos' : 'tcc-neg'}`}
                  >
                    {signed(t.alpha_pct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

/* ── A reason, then a destructive confirm (Depart, Reject, Declined) ─────── */
export function ReasonDialog({
  title,
  body,
  label,
  confirm,
  optional = true,
  sample,
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    if (!optional && !reason.trim()) {
      setErr('Enter a reason.');
      return;
    }
    setBusy(true);
    setErr('');
    const res = await onConfirm(reason.trim());
    setBusy(false);
    if (res && res.ok === false) setErr(res.error || 'Nothing changed. Try again.');
  };
  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={title}
      size={480}
      className="coh-dialog"
      footer={
        <>
          <button type="button" className="tcc-textbtn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <Button variant="danger" className="tcc-flatbtn" onClick={go} loading={busy}>
            {confirm}
          </Button>
        </>
      }
    >
      <SampleNote on={sample} />
      {body && <p className="coh-body">{body}</p>}
      <Textarea
        id="coh-reason"
        label={label}
        hint={optional ? 'Optional' : undefined}
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <ErrorLine>{err}</ErrorLine>
    </Modal>
  );
}

export { ErrorLine };
