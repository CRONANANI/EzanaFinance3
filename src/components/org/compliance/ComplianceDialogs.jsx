'use client';

import { useState } from 'react';
import { Button, Input, Modal, Select, Textarea } from '@/components/ds';
import {
  CHECKED_TEXT,
  RULE_META,
  RULE_TYPES,
  SOURCE_TEXT,
  blankRuleForm,
  fmtDay,
  isHardBreach,
  ruleLabel,
  validateRuleForm,
} from '@/lib/org-compliance-model';

const MAX_REASON = 500;

const SampleNote = () => (
  <p className="tcc-form__note">
    Sample content is showing. This is applied to the page only and is not saved.
  </p>
);

function failText(res, what) {
  if (res.status === 403) return `Your role cannot ${what}. Nothing was saved.`;
  if (res.error && res.status === 400) return `${res.error} Nothing was saved.`;
  return 'That did not go through. Nothing was saved. Try again.';
}

/** Add a rule. Executives only; the route checks again. */
export function RuleDialog({ sample, onSubmit, onClose }) {
  const [form, setForm] = useState(blankRuleForm);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const meta = RULE_META[form.rule_type];
  const hard = form.severity === 'block';

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors({});
  };

  const submit = async (e) => {
    e?.preventDefault();
    const found = validateRuleForm(form);
    setErrors(found);
    setError(null);
    if (Object.keys(found).length) {
      document.getElementById(`cmp-rule-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setSaving(true);
    const res = await onSubmit({ type: 'add', form });
    if (res.ok) {
      onClose(res.sample ? 'Rule added to the sample. It is not saved.' : 'Rule added.');
      return;
    }
    setSaving(false);
    setError(failText(res, 'add rules'));
  };

  const unitHint =
    meta.unit === '%'
      ? 'Percent of the fund.'
      : meta.unit === '$'
        ? 'Dollars, for example 5000000000 for 5 billion.'
        : meta.field === 'ticker'
          ? 'One ticker.'
          : meta.field === 'sector'
            ? 'Written exactly as sectors are written on your holdings.'
            : 'A whole number of positions.';

  return (
    <Modal
      open
      onClose={saving ? undefined : () => onClose()}
      title="Add rule"
      size={520}
      className="cmp-dialog"
      footer={
        <>
          <button type="button" className="tcc-textbtn" onClick={() => onClose()} disabled={saving}>
            Cancel
          </button>
          <Button
            variant="primary"
            className="tcc-flatbtn"
            loading={saving}
            type="submit"
            form="cmp-rule-form"
          >
            Save rule
          </Button>
        </>
      }
    >
      <form id="cmp-rule-form" className="tcc-form cmp-form" onSubmit={submit} noValidate>
        {sample && <SampleNote />}
        <Select
          id="cmp-rule-rule_type"
          label="Rule type"
          value={form.rule_type}
          error={errors.rule_type}
          autoFocus
          options={RULE_TYPES.map((t) => ({ value: t, label: RULE_META[t].label }))}
          onChange={(e) => set({ rule_type: e.target.value, value: '' })}
        />
        <Input
          id="cmp-rule-value"
          label="Value"
          className={meta.field === 'sector' ? undefined : 'tcc-mono'}
          inputMode={
            ['pct', 'value'].includes(meta.field)
              ? 'decimal'
              : meta.field === 'min' || meta.field === 'max'
                ? 'numeric'
                : undefined
          }
          placeholder={meta.placeholder}
          value={form.value}
          error={errors.value}
          hint={unitHint}
          onChange={(e) => set({ value: e.target.value })}
        />
        <Select
          id="cmp-rule-severity"
          label="Severity"
          value={form.severity}
          error={errors.severity}
          options={[
            { value: 'warning', label: 'Soft' },
            { value: 'block', label: 'Hard' },
          ]}
          onChange={(e) => set({ severity: e.target.value })}
        />
        <p className="cmp-form__how">
          <i className="bi bi-info-circle" aria-hidden="true" />
          <span>
            {CHECKED_TEXT[meta.checked]}.{' '}
            {meta.checked === 'recorded'
              ? 'Ezana keeps the rule on record but never reads it.'
              : meta.checked === 'holdings'
                ? 'It never logs a breach or stops anything.'
                : meta.checked === 'idea'
                  ? 'The idea check saves nothing, so this rule never logs a breach or stops a pitch.'
                  : hard
                    ? 'A pitch that breaks it logs a hard breach and cannot be submitted from the pitch form.'
                    : 'A pitch that breaks it logs a soft breach and still goes through.'}{' '}
            No rule stops a trade.
          </span>
        </p>
        {error && (
          <p className="cmp-fielderror" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

/** Delete a rule, confirmed. Executives only; the route checks again. */
export function DeleteRuleDialog({ rule, sample, onSubmit, onClose }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const confirm = async () => {
    setSaving(true);
    setError(null);
    const res = await onSubmit({ type: 'delete', id: rule.id });
    if (res.ok) {
      onClose(res.sample ? 'Rule deleted from the sample. Nothing was saved.' : 'Rule deleted.');
      return;
    }
    setSaving(false);
    setError(failText(res, 'delete rules'));
  };
  return (
    <Modal
      open
      onClose={saving ? undefined : () => onClose()}
      title="Delete rule"
      size={460}
      className="cmp-dialog"
      footer={
        <>
          <button type="button" className="tcc-textbtn" onClick={() => onClose()} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="tcc-textbtn cmp-danger"
            onClick={confirm}
            disabled={saving}
          >
            {saving ? 'Deleting' : 'Delete rule'}
          </button>
        </>
      }
    >
      <div className="tcc-form cmp-form">
        {sample && <SampleNote />}
        <p className="cmp-form__text">
          Delete <strong>{ruleLabel(rule)}</strong>? Breaches already logged against it keep their
          text but no longer name the rule. A rule cannot be edited, so to change it, delete it and
          add it again. This cannot be undone.
        </p>
        {error && (
          <p className="cmp-fielderror" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

/**
 * Resolve a breach. Executives and portfolio managers; the route checks
 * again. The reason field shows only when the reason can be stored.
 */
export function ResolveDialog({ breach, ruleName, storage, sample, onSubmit, onClose }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const needsReason = storage;
  const ready = !needsReason || reason.trim().length > 0;
  const hard = isHardBreach(breach);

  const confirm = async (e) => {
    e?.preventDefault();
    if (!ready) return;
    setSaving(true);
    setError(null);
    const res = await onSubmit(breach.id, needsReason ? reason.trim() : '');
    if (res.ok) {
      onClose(
        res.sample
          ? 'Breach resolved in the sample. Nothing was saved.'
          : `Breach resolved${breach.ticker ? ` for ${breach.ticker}` : ''}.`,
      );
      return;
    }
    setSaving(false);
    setError(failText(res, 'resolve breaches'));
  };

  const rows = [
    ['Ticker', breach.ticker || 'N/A', true],
    ['Logged', fmtDay(breach.created_at), true],
    ['Source', SOURCE_TEXT[breach.source_type] || 'N/A'],
    ['Severity', hard ? 'hard' : 'soft'],
    ['Rule', ruleName],
    ['Detail', breach.detail || 'N/A'],
  ];

  return (
    <Modal
      open
      onClose={saving ? undefined : () => onClose()}
      title="Resolve breach"
      size={520}
      className="cmp-dialog"
      footer={
        <>
          <button type="button" className="tcc-textbtn" onClick={() => onClose()} disabled={saving}>
            Cancel
          </button>
          <Button
            variant="primary"
            className="tcc-flatbtn"
            loading={saving}
            disabled={!ready}
            type="submit"
            form="cmp-resolve-form"
          >
            Resolve breach
          </Button>
        </>
      }
    >
      <form id="cmp-resolve-form" className="tcc-form cmp-form" onSubmit={confirm} noValidate>
        {sample && <SampleNote />}
        <dl className="cmp-facts">
          {rows.map(([k, v, mono]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd
                className={`${mono ? 'tcc-mono' : ''}${k === 'Severity' ? (hard ? ' tcc-neg' : '') : ''}`}
              >
                {k === 'Severity' && (
                  <i
                    className={`bi bi-exclamation-triangle${hard ? '' : ' tcc-warn'}`}
                    aria-hidden="true"
                  />
                )}{' '}
                {v}
              </dd>
            </div>
          ))}
        </dl>
        {needsReason ? (
          <Textarea
            id="cmp-resolve-reason"
            label="Reason (required)"
            rows={3}
            maxLength={MAX_REASON}
            autoFocus
            value={reason}
            placeholder="Why this breach is resolved"
            hint={`${reason.length} of ${MAX_REASON} characters. Stored with your name and the date.`}
            onChange={(e) => setReason(e.target.value)}
          />
        ) : (
          <p className="cmp-form__how">
            <i className="bi bi-info-circle" aria-hidden="true" />
            <span>
              A reason cannot be stored yet, so none is asked for. Resolving marks the breach
              resolved
              {sample
                ? ''
                : ' and adds an entry with your name to the council activity log, which executives can read'}
              .
            </span>
          </p>
        )}
        <p className="tcc-form__note">Open and resolved are the only states a breach has.</p>
        {error && (
          <p className="cmp-fielderror" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
