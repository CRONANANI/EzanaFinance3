'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Input, Modal } from '@/components/ds';
import {
  COUNCIL_FORM_HREF,
  FUND_ANALYTICS_HREF,
  PERIOD_MAX,
  RATIO_FIELDS,
  formFromMetrics,
  ratioBody,
  validateRatios,
} from '@/lib/council-rankings-model';

const ROUTE = '/api/org/council/fund-metrics';

/**
 * Report the council's fund ratios. Executives and portfolio managers only
 * (the route checks again). The same form, and the same route, as the
 * Competitions page's "Council rating and fund ratios" sub-page, which keeps
 * its address. Ratios and percentages only: there is no field for an amount.
 *
 * With sample content showing, saving applies the ratios to the page and
 * nothing is sent.
 */
export function ReportRatiosDialog({ metrics, sample, onSampleSave, onClose, onSaved }) {
  const [form, setForm] = useState(() => formFromMetrics(metrics));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(({ [key]: _drop, ...rest }) => rest);
  };

  const submit = async (e) => {
    e?.preventDefault();
    const found = validateRatios(form);
    setErrors(found);
    setError(null);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`crx-form-${first}`)?.focus();
      return;
    }
    if (sample) {
      onSampleSave(form);
      onSaved({ sample: true });
      onClose();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(ROUTE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ratioBody(form)),
      });
      if (res.ok) {
        onSaved({ sample: false });
        onClose();
        return;
      }
      setError(
        res.status === 403
          ? 'Only executives and portfolio managers can report fund ratios. Nothing was saved.'
          : 'The fund ratios were not saved. Try again.',
      );
    } catch {
      setError('The fund ratios were not saved. Try again.');
    }
    setSaving(false);
  };

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title="Report fund ratios"
      size={560}
      className="crx-dialog"
      footer={
        <>
          <button type="button" className="tcc-textbtn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <Button
            variant="primary"
            className="tcc-flatbtn"
            loading={saving}
            type="submit"
            form="crx-form"
          >
            Save ratios
          </Button>
        </>
      }
    >
      <form id="crx-form" className="tcc-form crx-form" onSubmit={submit} noValidate>
        {sample && (
          <p className="tcc-form__note">
            Sample content is showing. This is applied to the page only and is not saved.
          </p>
        )}
        <p className="tcc-form__note">
          Shown on the table as self-reported. Sharpe counts most, then alpha, then return, less max
          drawdown. Ratios and percentages only, never an amount. The rating is recalculated once a
          day. Return and risk for your fund are on{' '}
          <Link href={FUND_ANALYTICS_HREF} className="tcc-link">
            Fund Analytics
          </Link>
          .
        </p>
        <Input
          id="crx-form-period_label"
          label="Period"
          hint="As you want it shown, for example FY2026 Q2"
          value={form.period_label}
          maxLength={PERIOD_MAX + 10}
          error={errors.period_label}
          onChange={(e) => set('period_label', e.target.value)}
          autoFocus
        />
        <div className="crx-form__grid">
          {RATIO_FIELDS.map((f) => (
            <Input
              key={f.key}
              id={`crx-form-${f.key}`}
              label={f.unit ? `${f.label} (%)` : f.label}
              hint={f.hint}
              type="number"
              inputMode="decimal"
              step="0.01"
              className="crx-form__num"
              value={form[f.key]}
              error={errors[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
            />
          ))}
        </div>
        {error && (
          <p className="crx-form__error" role="alert">
            {error}
          </p>
        )}
        <p className="tcc-form__note">
          The same form is on{' '}
          <Link href={COUNCIL_FORM_HREF} className="tcc-link">
            Competitions
          </Link>
          .
        </p>
      </form>
    </Modal>
  );
}
