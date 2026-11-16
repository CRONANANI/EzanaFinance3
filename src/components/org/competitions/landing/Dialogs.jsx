'use client';

import { useState } from 'react';
import { Button, Input, Modal, Textarea } from '@/components/ds';
import { FORMATS, admissionLabel, fmtWindow, SIDE_RULE } from '@/lib/org-competitions-model';

/** Text-only option row: the chosen option is emerald text, nothing else. */
export function TextOptions({ label, value, options, onChange }) {
  return (
    <div className="ocp-field">
      <span className="ocp-field__label" id={`opt-${label}`}>
        {label}
      </span>
      <div className="tcc-toggles" role="radiogroup" aria-labelledby={`opt-${label}`}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            className={`tcc-toggle${value === o.id ? ' is-on' : ''}`}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Footer({ onCancel, busy, children }) {
  return (
    <>
      <button type="button" className="tcc-textbtn" onClick={onCancel} disabled={busy}>
        Cancel
      </button>
      {children}
    </>
  );
}

/** New competition: name, format, theme, description, dates and rules link. */
export function NewCompetitionDialog({ sample, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: '',
    format: 'showcase',
    theme: '',
    description: '',
    starts_at: '',
    ends_at: '',
    rules_url: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Give the competition a name.');
    if (form.rules_url && !/^https?:\/\//i.test(form.rules_url.trim())) {
      return setError('The rules link must start with http:// or https://.');
    }
    if (form.starts_at && form.ends_at && form.ends_at < form.starts_at) {
      return setError('The end date is before the start date.');
    }
    setBusy(true);
    setError('');
    const res = await onSubmit({
      name: form.name.trim(),
      format: form.format,
      theme: form.theme.trim() || null,
      description: form.description.trim() || null,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      rules_url: form.rules_url.trim() || null,
    });
    setBusy(false);
    if (!res?.ok) setError(res?.error || 'Could not create the competition. Try again.');
  };

  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title="New competition"
      size={560}
      className="ocp-dialog pcx-dialog"
      footer={
        <Footer onCancel={onClose} busy={busy}>
          <Button
            variant="primary"
            className="tcc-flatbtn"
            loading={busy}
            type="submit"
            form="ocp-new"
          >
            Create competition
          </Button>
        </Footer>
      }
    >
      <form id="ocp-new" className="tcc-form" onSubmit={submit} noValidate>
        {sample && (
          <p className="tcc-form__note">
            Sample content is showing. The competition is added to the page only and is not saved.
          </p>
        )}
        <Input id="ocp-name" label="Name" value={form.name} onChange={set('name')} autoFocus />
        <TextOptions
          label="Format"
          value={form.format}
          options={FORMATS}
          onChange={set('format')}
        />
        <Input
          id="ocp-theme"
          label="Theme"
          hint="Optional"
          value={form.theme}
          onChange={set('theme')}
        />
        <Textarea
          id="ocp-description"
          label="Description"
          hint="Optional"
          rows={3}
          value={form.description}
          onChange={set('description')}
        />
        <div className="tcc-form__pair">
          <Input
            id="ocp-start-date"
            label="Start date"
            type="date"
            value={form.starts_at}
            onChange={set('starts_at')}
          />
          <Input
            id="ocp-end-date"
            label="End date"
            type="date"
            value={form.ends_at}
            onChange={set('ends_at')}
          />
        </div>
        <Input
          id="ocp-rules-link"
          label="Rules link"
          hint="Optional, a web address"
          value={form.rules_url}
          onChange={set('rules_url')}
        />
        {error && (
          <p className="ocp-fielderror" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

/** A plain confirmation: one title, one sentence, a text Cancel and one action. */
export function ConfirmDialog({ title, children, confirmLabel, danger, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const go = async () => {
    setBusy(true);
    setError('');
    const res = await onConfirm();
    setBusy(false);
    if (res && res.ok === false) setError(res.error || 'That did not work. Try again.');
  };
  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={title}
      size={480}
      className="ocp-dialog pcx-dialog"
      footer={
        <Footer onCancel={onClose} busy={busy}>
          {danger ? (
            <button type="button" className="tcc-textbtn ocp-danger" onClick={go} disabled={busy}>
              {confirmLabel}
            </button>
          ) : (
            <Button variant="primary" className="tcc-flatbtn" loading={busy} onClick={go}>
              {confirmLabel}
            </Button>
          )}
        </Footer>
      }
    >
      <div className="ocp-confirm">{children}</div>
      {error && (
        <p className="ocp-fielderror" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}

/** Sample only: the join or apply form, applied to the page. */
export function SampleJoinDialog({ event, onClose, onSubmit }) {
  const cfg = event.config || {};
  const [form, setForm] = useState({
    team: 'Sample council',
    email: '',
    ticker: '',
    side: 'long',
    thesis: '',
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const sides =
    cfg.side_constraint === 'long_only'
      ? [{ id: 'long', label: 'Long' }]
      : cfg.side_constraint === 'short_only'
        ? [{ id: 'short', label: 'Short' }]
        : [
            { id: 'long', label: 'Long' },
            { id: 'short', label: 'Short' },
          ];
  return (
    <Modal
      open
      onClose={onClose}
      title={cfg.admission_mode === 'open_signup' ? 'Join competition' : 'Apply to compete'}
      size={560}
      className="ocp-dialog pcx-dialog"
      footer={
        <Footer onCancel={onClose}>
          <Button variant="primary" className="tcc-flatbtn" type="submit" form="ocp-join">
            {cfg.admission_mode === 'open_signup' ? 'Join' : 'Submit request'}
          </Button>
        </Footer>
      }
    >
      <form
        id="ocp-join"
        className="tcc-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <p className="tcc-form__note">
          Sample content is showing. The request is applied to the page only and is not sent.
        </p>
        <p className="ocp-confirm">
          {event.name}. {admissionLabel(cfg.admission_mode)}, registration{' '}
          <span className="tcc-mono">
            {fmtWindow(cfg.registration_opens_at, cfg.registration_closes_at)}
          </span>
          . {SIDE_RULE[cfg.side_constraint] || SIDE_RULE.either}.
        </p>
        <Input id="ocp-team-name" label="Team name" value={form.team} onChange={set('team')} />
        <Input
          id="ocp-contact-email"
          label="Contact email"
          type="email"
          value={form.email}
          onChange={set('email')}
        />
        <div className="tcc-form__pair">
          <Input
            id="ocp-ticker"
            label="Ticker"
            value={form.ticker}
            onChange={set('ticker')}
            className="tcc-mono"
          />
          <TextOptions label="Side" value={form.side} options={sides} onChange={set('side')} />
        </div>
        <Textarea
          id="ocp-thesis"
          label="Thesis"
          hint="Optional"
          rows={3}
          value={form.thesis}
          onChange={set('thesis')}
        />
      </form>
    </Modal>
  );
}
