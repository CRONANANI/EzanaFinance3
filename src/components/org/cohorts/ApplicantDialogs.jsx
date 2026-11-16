'use client';

import { useEffect, useState } from 'react';
import { Button, Checkbox, Input, Modal, Select, Textarea } from '@/components/ds';
import {
  FORM_FIELD_KINDS,
  NA,
  NEXT_STAGE,
  RUBRIC_LABEL,
  STAGE_LABEL,
  applicantLabel,
  fmtStar,
} from '@/lib/org-cohorts-model';
import { useResource } from './useCohortsSource';
import { SampleNote } from './parts';
import { ErrorLine } from './CohortDialogs';

const SCORE_STEPS = [0, 1, 2, 3, 4, 5];

/* ── Applicant evaluation: details, the viewer's rubric, the panel ───────── */
export function ApplicantDialog({
  applicant,
  canManage,
  request,
  version,
  sample,
  onClose,
  onProvision,
  onChanged,
}) {
  const a = applicant;
  const scores = useResource(request, `/api/org/applicants/${a.id}/scores`, version);
  const [mine, setMine] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState(null); // 'rejected' | 'declined'
  const [reason, setReason] = useState('');

  const data = scores.data;
  useEffect(() => {
    if (!data) return;
    const next = {};
    for (const r of data.my?.rows || [])
      next[r.criterion] = { score: r.score, notes: r.notes || '' };
    setMine(next);
  }, [data]);

  const submitted = !!data?.my?.submitted;
  const criteria = data?.criteria || Object.keys(RUBRIC_LABEL);
  const setCrit = (c, patch) =>
    setMine((m) => ({ ...m, [c]: { score: null, notes: '', ...m[c], ...patch } }));

  const save = async (submit) => {
    const list = criteria
      .filter((c) => mine[c] && mine[c].score != null)
      .map((c) => ({ criterion: c, score: mine[c].score, notes: mine[c].notes || null }));
    if (list.length === 0) {
      setErr('Score at least one criterion first.');
      return;
    }
    if (submit && list.length < criteria.length) {
      setErr('Score every criterion before submitting.');
      return;
    }
    setBusy(true);
    setErr('');
    setNotice('');
    const res = await request('POST', `/api/org/applicants/${a.id}/scores`, {
      scores: list,
      submit,
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.json?.error || 'Your rubric was not saved. Try again.');
      return;
    }
    setNotice(
      submit
        ? 'Rubric submitted. Other reviewers’ submitted notes are now visible.'
        : 'Draft saved.',
    );
    onChanged?.();
  };

  const move = async (stage, rejected_reason) => {
    setBusy(true);
    setErr('');
    const body = { stage };
    if (rejected_reason !== undefined) body.rejected_reason = rejected_reason || null;
    const res = await request('PATCH', `/api/org/applicants/${a.id}`, body);
    setBusy(false);
    if (!res.ok) {
      setErr(res.json?.error || 'The stage was not changed. Try again.');
      return;
    }
    onChanged?.();
    onClose();
  };

  const closed = ['rejected', 'declined', 'accepted'].includes(a.stage);
  const next = NEXT_STAGE[a.stage];
  const decisions =
    canManage && !closed ? (
      <div className="coh-actionrow">
        {a.stage === 'applied' && (
          <button
            type="button"
            className="tcc-textbtn"
            disabled={busy}
            onClick={() => move('interview')}
          >
            Schedule interview
          </button>
        )}
        {next && next !== 'offer' && (
          <button type="button" className="tcc-textbtn" disabled={busy} onClick={() => move(next)}>
            Advance to {STAGE_LABEL[next].toLowerCase()}
          </button>
        )}
        {a.stage === 'pitch' && (
          <button
            type="button"
            className="tcc-textbtn"
            disabled={busy}
            onClick={() => move('offer')}
          >
            Send offer
          </button>
        )}
        {a.stage === 'offer' && (
          <button
            type="button"
            className="tcc-textbtn tcc-textbtn--accent"
            disabled={busy}
            onClick={onProvision}
          >
            <i className="bi bi-person-plus" aria-hidden="true" />
            Accept and provision
          </button>
        )}
        <button
          type="button"
          className="tcc-textbtn"
          disabled={busy}
          onClick={() => setConfirm('declined')}
        >
          Declined
        </button>
        <button
          type="button"
          className="tcc-textbtn coh-danger"
          disabled={busy}
          onClick={() => setConfirm('rejected')}
        >
          Reject
        </button>
      </div>
    ) : null;

  const label = applicantLabel(a);
  const footer = confirm ? (
    <>
      <button
        type="button"
        className="tcc-textbtn"
        onClick={() => setConfirm(null)}
        disabled={busy}
      >
        Cancel
      </button>
      <Button
        variant="danger"
        className="tcc-flatbtn"
        loading={busy}
        onClick={() => move(confirm, reason.trim())}
      >
        {confirm === 'rejected' ? 'Reject applicant' : 'Mark as declined'}
      </Button>
    </>
  ) : submitted || scores.status !== 'ready' ? (
    <button type="button" className="tcc-textbtn" onClick={onClose}>
      Close
    </button>
  ) : (
    <>
      <button type="button" className="tcc-textbtn" onClick={() => save(false)} disabled={busy}>
        Save draft
      </button>
      <Button variant="primary" className="tcc-flatbtn" loading={busy} onClick={() => save(true)}>
        Submit rubric
      </Button>
    </>
  );

  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={`Applicant evaluation · ${label}`}
      size={600}
      className="coh-dialog"
      footer={footer}
    >
      <SampleNote on={sample} />
      <p className="coh-body coh-dim">
        {STAGE_LABEL[a.stage] || a.stage} stage
        {a.blinded
          ? '. Identity hidden until the interview stage.'
          : `. ${[a.program, a.year, a.source && `via ${a.source}`].filter(Boolean).join(', ') || 'No details on file'}.`}
        {data?.aggregate_star != null && (
          <>
            {' '}
            Rubric average <span className="tcc-mono">{fmtStar(data.aggregate_star)}</span>.
          </>
        )}
      </p>
      {!a.blinded && a.email && canManage && <p className="coh-body tcc-mono coh-dim">{a.email}</p>}

      {confirm ? (
        <div className="coh-form">
          <p className="coh-body">
            {confirm === 'rejected'
              ? `${label} moves to the rejected lane. The reason is shown there.`
              : `${label} moves to the declined lane.`}
          </p>
          <Textarea
            id="coh-app-reason"
            label={
              confirm === 'rejected' ? 'Reason for rejection' : 'Reason the applicant declined'
            }
            hint="Optional"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <ErrorLine>{err}</ErrorLine>
        </div>
      ) : (
        <>
          {(a.resume_url || a.sample_pitch_url) && (
            <p className="coh-actionrow">
              {a.resume_url && (
                <a className="tcc-link" href={a.resume_url} target="_blank" rel="noreferrer">
                  <i className="bi bi-file-earmark-text" aria-hidden="true" /> Resume
                </a>
              )}
              {a.sample_pitch_url && (
                <a className="tcc-link" href={a.sample_pitch_url} target="_blank" rel="noreferrer">
                  <i className="bi bi-file-earmark-text" aria-hidden="true" /> Sample pitch
                </a>
              )}
            </p>
          )}
          {a.responses && Object.keys(a.responses).length > 0 && (
            <dl className="coh-pairs coh-pairs--stack">
              {Object.entries(a.responses).map(([k, v]) => (
                <div key={k} className="coh-pairs__row">
                  <dt>{k}</dt>
                  <dd>{String(v)}</dd>
                </div>
              ))}
            </dl>
          )}

          <h3 className="coh-subhead">Your rubric</h3>
          {scores.status === 'loading' ? (
            <p className="tcc-state">Loading the rubric.</p>
          ) : scores.status === 'error' ? (
            <p className="tcc-state tcc-state--error" role="alert">
              <i className="bi bi-exclamation-triangle" aria-hidden="true" />
              <span>Could not load the rubric.</span>
              <button
                type="button"
                className="tcc-textbtn tcc-textbtn--accent"
                onClick={scores.reload}
              >
                Retry
              </button>
            </p>
          ) : (
            <ul className="coh-rubric">
              {criteria.map((c) => (
                <li key={c}>
                  <div className="coh-rubric__top">
                    <span className="coh-rubric__name" id={`coh-crit-${c}`}>
                      {RUBRIC_LABEL[c] || c}
                    </span>
                    <span
                      className="tcc-toggles coh-rubric__steps"
                      role="radiogroup"
                      aria-labelledby={`coh-crit-${c}`}
                    >
                      {SCORE_STEPS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={mine[c]?.score === n}
                          className={`tcc-toggle tcc-mono${mine[c]?.score === n ? ' is-on' : ''}`}
                          disabled={submitted || busy}
                          onClick={() => setCrit(c, { score: n })}
                        >
                          {n}
                        </button>
                      ))}
                      <span className="tcc-mono coh-dim">/ 5</span>
                    </span>
                  </div>
                  <Textarea
                    id={`coh-note-${c}`}
                    aria-label={`Notes for ${RUBRIC_LABEL[c] || c}`}
                    rows={1}
                    placeholder="Notes, hidden from other reviewers until you submit"
                    value={mine[c]?.notes || ''}
                    disabled={submitted || busy}
                    onChange={(e) => setCrit(c, { notes: e.target.value })}
                  />
                </li>
              ))}
            </ul>
          )}
          {submitted && (
            <p className="coh-body coh-tone--pos">
              <i className="bi bi-check-lg" aria-hidden="true" /> Your rubric is submitted.
            </p>
          )}

          <h3 className="coh-subhead">
            Other reviewers{' '}
            <span className="tcc-mono coh-dim">
              {data ? `${data.scores_in} of ${data.interviewer_count} submitted` : ''}
            </span>
          </h3>
          {data && !data.can_view_others && (
            <p className="coh-body coh-dim">
              <i className="bi bi-lock" aria-hidden="true" /> Other reviewers&apos; notes stay
              locked until your rubric is submitted.
            </p>
          )}
          {data && (data.others || []).length === 0 ? (
            <p className="coh-body coh-dim">No other reviewers yet.</p>
          ) : (
            <ul className="coh-panel">
              {(data?.others || []).map((o) => (
                <li key={o.interviewer_id}>
                  <div className="coh-panel__top">
                    <span className="coh-strong">{o.interviewer_name}</span>
                    <span className="tcc-meta">{o.submitted ? 'Submitted' : 'Not submitted'}</span>
                  </div>
                  {o.locked ? (
                    <p className="coh-body coh-dim">
                      <i className="bi bi-lock" aria-hidden="true" /> Locked
                    </p>
                  ) : (
                    <ul className="coh-plain">
                      {o.rows.map((r) => (
                        <li key={r.criterion}>
                          <span>{RUBRIC_LABEL[r.criterion]}</span>
                          <span className="tcc-mono">{r.score} / 5</span>
                          {r.notes && <span className="coh-panel__note">{r.notes}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}

          {decisions && (
            <>
              <h3 className="coh-subhead">Decision</h3>
              {decisions}
            </>
          )}
          {a.stage === 'accepted' && a.provisioned_member_id && (
            <p className="coh-body coh-tone--pos">
              <i className="bi bi-check-lg" aria-hidden="true" /> Accepted and added to the council.
            </p>
          )}
          {notice && (
            <p className="coh-body coh-tone--pos" role="status">
              {notice}
            </p>
          )}
          <ErrorLine>{err}</ErrorLine>
        </>
      )}
    </Modal>
  );
}

/* ── Accept and provision ────────────────────────────────────────────────── */
export function ProvisionDialog({ applicant, request, sample, onClose, onDone }) {
  const people = useResource(request, '/api/org/chart', 0);
  const [title, setTitle] = useState('Junior Analyst');
  const [reportsTo, setReportsTo] = useState('');
  const [mentor, setMentor] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [notice, setNotice] = useState('');
  const options = [
    { value: '', label: 'None' },
    ...(people.data?.members || []).map((m) => ({
      value: m.id,
      label: m.title ? `${m.display_name}, ${m.title}` : m.display_name,
    })),
  ];

  const go = async () => {
    setBusy(true);
    setErr('');
    const res = await request('POST', `/api/org/applicants/${applicant.id}/provision`, {
      title,
      reports_to: reportsTo || null,
      mentor_member_id: mentor || null,
      role: 'analyst',
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.json?.error || 'The member was not created. Try again.');
      return;
    }
    const email = res.json?.welcomeEmail;
    if (res.json?.emailSent === false || (email && email.sent === false && !email.sample)) {
      setNotice(
        'Account created. The welcome email could not be sent; share the sign-in link by hand.',
      );
      return;
    }
    onDone();
  };

  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={`Accept ${applicant.full_name || applicantLabel(applicant)}`}
      size={500}
      className="coh-dialog"
      footer={
        notice ? (
          <Button variant="primary" className="tcc-flatbtn" onClick={onDone}>
            Done
          </Button>
        ) : (
          <>
            <button type="button" className="tcc-textbtn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <Button variant="primary" className="tcc-flatbtn" loading={busy} onClick={go}>
              Accept and provision
            </Button>
          </>
        )
      }
    >
      <SampleNote on={sample} />
      <p className="coh-body">
        Creates the account, adds the person to this cohort as onboarding, pairs the mentor, and
        emails a link to set a password.
      </p>
      <div className="coh-form">
        <Input
          id="coh-prov-title"
          label="Title on the Org Chart"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Select
          id="coh-prov-reports"
          label="Reports to"
          value={reportsTo}
          onChange={(e) => setReportsTo(e.target.value)}
          options={options}
        />
        <Select
          id="coh-prov-mentor"
          label="Mentor"
          value={mentor}
          onChange={(e) => setMentor(e.target.value)}
          options={options}
        />
        <p className="coh-hint">Team assignment happens on the Org Chart afterwards.</p>
      </div>
      {notice && (
        <p className="coh-body coh-tone--warn" role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" /> {notice}
        </p>
      )}
      <ErrorLine>{err}</ErrorLine>
    </Modal>
  );
}

/* ── Add applicant (managers enter applications) ─────────────────────────── */
export function AddApplicantDialog({ cohort, request, sample, onClose, onAdded }) {
  const [f, setF] = useState({ full_name: '', email: '', program: '', year: '', source: '' });
  const [nameErr, setNameErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const submit = async (e) => {
    e?.preventDefault();
    if (!f.full_name.trim()) {
      setNameErr('Enter the applicant’s name.');
      document.getElementById('coh-add-full_name')?.focus();
      return;
    }
    setBusy(true);
    setErr('');
    const res = await request('POST', '/api/org/applicants', { cohort_id: cohort.id, ...f });
    setBusy(false);
    if (!res.ok) {
      setErr(res.json?.error || 'The applicant was not added. Try again.');
      return;
    }
    onAdded();
  };
  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={`Add applicant to ${cohort.name}`}
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
            form="coh-add"
            loading={busy}
          >
            Add applicant
          </Button>
        </>
      }
    >
      <form id="coh-add" className="coh-form" onSubmit={submit} noValidate>
        <SampleNote on={sample} />
        <Input
          id="coh-add-full_name"
          label="Full name"
          value={f.full_name}
          error={nameErr || undefined}
          onChange={(e) => {
            set('full_name', e.target.value);
            setNameErr('');
          }}
        />
        <Input
          id="coh-add-email"
          label="Email"
          hint="Needed to accept and provision later"
          type="email"
          value={f.email}
          onChange={(e) => set('email', e.target.value)}
        />
        <div className="coh-form__pair">
          <Input
            id="coh-add-program"
            label="Program"
            value={f.program}
            onChange={(e) => set('program', e.target.value)}
          />
          <Input
            id="coh-add-year"
            label="Year"
            value={f.year}
            onChange={(e) => set('year', e.target.value)}
          />
        </div>
        <Input
          id="coh-add-source"
          label="Source"
          placeholder="Campus events, Referrals"
          value={f.source}
          onChange={(e) => set('source', e.target.value)}
        />
        <ErrorLine>{err}</ErrorLine>
      </form>
    </Modal>
  );
}

/* ── Application form builder ────────────────────────────────────────────── */
export function FormBuilderDialog({ cohort, form, canManage, request, sample, onClose }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [newKind, setNewKind] = useState('short_text');
  const [newLabel, setNewLabel] = useState('');
  const [newRequired, setNewRequired] = useState(false);
  const fields = form?.fields || [];

  const send = async (payload) => {
    setBusy(true);
    setErr('');
    const res = form
      ? await request('PATCH', `/api/org/cohorts/${cohort.id}/forms`, {
          form_id: form.id,
          ...payload,
        })
      : await request('POST', `/api/org/cohorts/${cohort.id}/forms`, {
          fields: [],
          is_open: false,
          ...payload,
        });
    setBusy(false);
    if (!res.ok) setErr(res.json?.error || 'The form was not changed. Try again.');
    return res.ok;
  };
  const addField = async () => {
    if (!newLabel.trim()) {
      setErr('Enter a label for the field.');
      return;
    }
    const ok = await send({
      fields: [
        ...fields,
        { kind: newKind, label: newLabel.trim(), required: newRequired, options: [] },
      ],
    });
    if (ok) {
      setNewLabel('');
      setNewRequired(false);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={`Application form · ${cohort.name}`}
      size={560}
      className="coh-dialog"
      footer={
        <button type="button" className="tcc-textbtn" onClick={onClose} disabled={busy}>
          Close
        </button>
      }
    >
      <SampleNote on={sample} />
      <p className="coh-body">
        The fields managers fill in for each applicant. There is no public application page, so
        nobody applies through a link.
      </p>
      {form && canManage && (
        <div className="coh-actionrow">
          <button
            type="button"
            className={`tcc-toggle${form.is_open ? ' is-on' : ''}`}
            aria-pressed={!!form.is_open}
            disabled={busy}
            onClick={() => send({ is_open: !form.is_open })}
          >
            {form.is_open ? 'Collection open' : 'Collection closed'}
          </button>
          <button
            type="button"
            className={`tcc-toggle${form.blind_screening ? ' is-on' : ''}`}
            aria-pressed={!!form.blind_screening}
            disabled={busy}
            onClick={() => send({ blind_screening: !form.blind_screening })}
          >
            <i
              className={`bi ${form.blind_screening ? 'bi-eye-slash' : 'bi-eye'}`}
              aria-hidden="true"
            />
            Blind screening {form.blind_screening ? 'on' : 'off'}
          </button>
        </div>
      )}
      <h3 className="coh-subhead">Fields</h3>
      {fields.length === 0 ? (
        <p className="coh-body coh-dim">
          {form ? 'No fields yet.' : 'No form for this cohort yet.'}
        </p>
      ) : (
        <ul className="coh-plain coh-fields">
          {fields.map((fl, i) => (
            <li key={`${fl.label}-${i}`}>
              <span>
                {fl.label}
                {fl.required ? <span className="coh-dim"> (required)</span> : null}
              </span>
              <span className="tcc-meta">
                {FORM_FIELD_KINDS.find((k) => k.kind === fl.kind)?.label || fl.kind}
              </span>
              {canManage && (
                <button
                  type="button"
                  className="tcc-textbtn coh-danger"
                  disabled={busy}
                  onClick={() => send({ fields: fields.filter((_, x) => x !== i) })}
                  aria-label={`Remove the ${fl.label} field`}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <div className="coh-form coh-gap">
          <div className="coh-form__pair">
            <Input
              id="coh-field-label"
              label="New field label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <Select
              id="coh-field-kind"
              label="Kind"
              value={newKind}
              onChange={(e) => setNewKind(e.target.value)}
              options={FORM_FIELD_KINDS.map((k) => ({ value: k.kind, label: k.label }))}
            />
          </div>
          <Checkbox
            checked={newRequired}
            onChange={(e) => setNewRequired(e.target.checked)}
            label="Required"
          />
          <div>
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              disabled={busy}
              onClick={addField}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" />
              {form ? 'Add field' : 'Create form with this field'}
            </button>
          </div>
        </div>
      )}
      {!canManage && <p className="coh-hint">Executives and portfolio managers edit the form.</p>}
      <ErrorLine>{err}</ErrorLine>
    </Modal>
  );
}
