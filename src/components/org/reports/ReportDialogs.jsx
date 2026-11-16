'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ds';
import { TextToggle } from '@/components/org/command-center/parts';
import {
  DISCLOSURE,
  NA,
  fmtDay,
  fmtMoney,
  fmtPct,
  fmtPts,
  preSaveChecks,
  tone,
} from '@/lib/org-reports-model';

const toneClass = (v) => {
  const t = tone(v);
  return t === 'pos' ? ' tcc-pos' : t === 'neg' ? ' tcc-neg' : t === 'na' ? ' tcc-na' : '';
};

/** Yes / No as text toggles. */
export function YesNo({ label, value, onChange, id }) {
  return (
    <div className="rpt-yesno" role="group" aria-labelledby={id}>
      <span className="rpt-yesno__label" id={id}>
        {label}
      </span>
      <span className="tcc-toggles">
        <TextToggle pressed={value} onClick={() => onChange(true)}>
          Yes
        </TextToggle>
        <TextToggle pressed={!value} onClick={() => onChange(false)}>
          No
        </TextToggle>
      </span>
    </div>
  );
}

function Figure({ label, children, className = '' }) {
  return (
    <div className="rpt-fig">
      <span className="rpt-fig__label">{label}</span>
      <span className={`rpt-fig__value tcc-mono${className}`}>{children}</span>
    </div>
  );
}

export function Checks({ items }) {
  return (
    <ul className="rpt-checks">
      {items.map((c) => (
        <li key={c.text}>
          <i
            className={`bi ${c.ok ? 'bi-check2 rpt-checks__ok' : 'bi-exclamation-triangle rpt-checks__warn'}`}
            aria-hidden="true"
          />
          <span>
            <span className="tcc-sr">{c.ok ? 'Passed: ' : 'Note: '}</span>
            {c.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Generate: the check before saving (a dry run that saves nothing), then
 * Save and open report. The figures are worked out again when it is saved.
 */
export function GenerateDialog({ initial, sample, onCheck, onSave, onClose }) {
  const [period, setPeriod] = useState(initial.period || '');
  const [includeRoster, setIncludeRoster] = useState(initial.includeRoster);
  const [includeNames, setIncludeNames] = useState(initial.includeNames);
  const [state, setState] = useState({ status: 'loading', preview: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  /* The figures do not depend on the label; the include choices change only
     what is saved, so the dry run runs on open and on Retry. */
  useEffect(() => {
    let live = true;
    setState({ status: 'loading', preview: null });
    onCheck({ period, includeRoster: true, includeNames: true }).then((r) => {
      if (!live) return;
      if (r.ok && r.preview) setState({ status: 'ready', preview: r.preview });
      else setState({ status: r.status === 403 ? 'forbidden' : 'error', preview: null });
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const p = state.preview ? { ...state.preview, includeRoster, includeNames } : null;
  const c = p?.comparison || null;

  const submit = async () => {
    if (!p) return;
    setSaving(true);
    setError(null);
    const res = await onSave({ period, includeRoster, includeNames }, p);
    if (res.ok) {
      onClose({ id: res.id, sample: res.sample });
      return;
    }
    setSaving(false);
    setError(
      res.status === 403
        ? 'Your role cannot save stakeholder reports. Nothing was saved.'
        : 'The report was not saved. Try again.',
    );
  };

  return (
    <Modal
      open
      onClose={saving ? undefined : () => onClose(null)}
      title="Generate stakeholder report"
      size={640}
      className="rpt-dialog"
      footer={
        <>
          <button
            type="button"
            className="tcc-textbtn"
            onClick={() => onClose(null)}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="tcc-btn"
            onClick={submit}
            disabled={saving || state.status !== 'ready'}
          >
            {saving ? 'Saving' : 'Save and open report'}
          </button>
        </>
      }
    >
      <div className="tcc-form rpt-form">
        <p className="rpt-form__lede">
          Check what will be saved. A saved report is frozen and cannot be edited later.
        </p>
        {sample && (
          <p className="tcc-form__note">
            Sample content is showing. The report is added to the page only and is not saved.
          </p>
        )}
        <label className="rpt-field">
          <span className="rpt-field__label">Period label</span>
          <span className="rpt-field__input">
            <i className="bi bi-pencil" aria-hidden="true" />
            <input
              value={period}
              maxLength={120}
              placeholder="Period label, e.g. Fall 2026"
              onChange={(e) => setPeriod(e.target.value)}
            />
          </span>
        </label>

        {state.status === 'loading' && (
          <p className="tcc-state" role="status">
            <i className="bi bi-arrow-repeat" aria-hidden="true" />
            Working out the figures. Nothing is saved yet.
          </p>
        )}
        {state.status === 'error' && (
          <p className="tcc-state tcc-state--error" role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true" />
            <span>The figures could not be worked out.</span>
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              onClick={() => setTick((t) => t + 1)}
            >
              Retry
            </button>
          </p>
        )}
        {state.status === 'forbidden' && (
          <p className="tcc-state" role="alert">
            Your role cannot generate stakeholder reports.
          </p>
        )}

        {p && (
          <>
            <div className="rpt-figs">
              <Figure label="Fund value">{fmtMoney(p.fundValue)}</Figure>
              <Figure label="Gain on cost, not time-weighted" className={toneClass(p.gainPct)}>
                {fmtPct(p.gainPct)}
              </Figure>
              <Figure label={`${p.symbol}, same dates`} className={c ? '' : ' tcc-na'}>
                {c ? fmtPct(c.benchmarkPct) : NA}
              </Figure>
              <Figure
                label="Difference to benchmark"
                className={c ? toneClass(c.differencePts) : ' tcc-na'}
              >
                {c ? fmtPts(c.differencePts) : NA}
              </Figure>
              <Figure label="Positions">{p.positions ?? NA}</Figure>
              <Figure label="Unpriced holdings">{p.unpricedCount ?? NA}</Figure>
            </div>
            <p className="rpt-form__text">
              {c ? (
                <>
                  Current holdings over the compared dates{' '}
                  <span className={`tcc-mono${toneClass(c.fundPct)}`}>{fmtPct(c.fundPct)}</span>{' '}
                  against {p.symbol} on the same days and weights, from {fmtDay(c.start)} to{' '}
                  {fmtDay(c.end)}.
                </>
              ) : (
                <>
                  No {p.symbol} price history is available for these dates, so the report will show
                  no benchmark and no difference.
                </>
              )}
            </p>
            <div className="rpt-dialog__cols">
              <div>
                <h3 className="rpt-h3">Pre-save checks</h3>
                <Checks items={preSaveChecks(p)} />
              </div>
              <div>
                <h3 className="rpt-h3">Choices</h3>
                <YesNo
                  id="rpt-dlg-roster"
                  label="Include roster"
                  value={includeRoster}
                  onChange={setIncludeRoster}
                />
                <YesNo
                  id="rpt-dlg-names"
                  label="Include analyst names"
                  value={includeNames}
                  onChange={setIncludeNames}
                />
              </div>
            </div>
          </>
        )}
        <p className="rpt-disclosure">{DISCLOSURE}</p>
        {error && (
          <p className="rpt-fielderror" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

/** Delete a saved report for the whole council. */
export function DeleteDialog({ report, council, sample, onConfirm, onClose }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const confirm = async () => {
    setSaving(true);
    setError(null);
    const res = await onConfirm(report.id);
    if (res.ok) {
      onClose(
        res.sample ? 'Report removed from the sample. Nothing was saved.' : 'Report deleted.',
      );
      return;
    }
    setSaving(false);
    setError(
      res.status === 403
        ? 'Your role cannot delete stakeholder reports. Nothing was deleted.'
        : 'The report was not deleted. Try again.',
    );
  };
  return (
    <Modal
      open
      onClose={saving ? undefined : () => onClose(null)}
      title="Delete saved report"
      size={480}
      className="rpt-dialog"
      footer={
        <>
          <button
            type="button"
            className="tcc-textbtn"
            onClick={() => onClose(null)}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="tcc-textbtn rpt-danger"
            onClick={confirm}
            disabled={saving}
          >
            {saving ? 'Deleting' : 'Delete report'}
          </button>
        </>
      }
    >
      <div className="tcc-form rpt-form">
        {sample && (
          <p className="tcc-form__note">
            Sample content is showing. This is applied to the page only and is not saved.
          </p>
        )}
        <p className="rpt-form__text">
          <strong>{report.title}</strong>, generated {fmtDay(report.createdAt)}
          {report.author ? ` by ${report.author}` : ''}, will be deleted for everyone in{' '}
          {council || 'the council'}. Copies already printed or saved as a PDF are not affected.
        </p>
        <p className="rpt-form__text tcc-na">This cannot be undone.</p>
        {error && (
          <p className="rpt-fielderror" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
