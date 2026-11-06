'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Input,
  NumericValue,
  Select,
  Textarea,
  Toggle,
} from '@/components/ds';
import {
  ASSUMPTION_FIELDS,
  HORIZON_MAX,
  HORIZON_MIN,
  NOTES_MAX,
  OUTPUT_FORMATS,
  REPORT_SECTIONS,
  REVIEW_RULE_FIELDS,
  VALUATION_METHODS,
  optionLabel,
} from '@/lib/org-sonar/research-methodology';

const ENDPOINT = '/api/org/research-methodology';
const CONFIDENCE_OPTIONS = [
  { value: '', label: 'Any confidence' },
  { value: 'low', label: 'Low or higher' },
  { value: 'moderate', label: 'Moderate or higher' },
  { value: 'high', label: 'High only' },
];
const rule = (id) => REVIEW_RULE_FIELDS.find((f) => f.id === id);

/* Rates are stored as decimals and edited as percents. */
const toInput = (f, v) =>
  Number.isFinite(v) ? String(f.unit === 'pct' ? +(v * 100).toFixed(4) : v) : '';
const fromInput = (f, s) => {
  if (s === '' || s == null) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return f.unit === 'pct' ? Math.round(n * 1e4) / 1e6 : n;
};
const boundText = (f, v) => (f.unit === 'pct' ? `${+(v * 100).toFixed(2)}%` : `${v}`);

function toForm(m) {
  const rr = m.reviewRules || {};
  return {
    valuationMethods: [...m.valuationMethods],
    requiredSections: [...m.requiredSections],
    horizonMonths: String(m.horizonMonths),
    scenariosRequired: m.scenariosRequired,
    redTeamRequired: m.redTeamRequired,
    outputFormat: m.outputFormat,
    notes: m.notes || '',
    review: {
      min_reviewers: rr.min_reviewers != null ? String(rr.min_reviewers) : '',
      require_executive_approval: rr.require_executive_approval === true,
      require_citations: rr.require_citations === true,
      min_confidence: rr.min_confidence || '',
      stale_after_days: rr.stale_after_days != null ? String(rr.stale_after_days) : '',
    },
    overrides: Object.fromEntries(
      ASSUMPTION_FIELDS.map((f) => [f.id, toInput(f, m.assumptionOverrides?.[f.id])]),
    ),
  };
}

/* Client-side checks mirror validateMethodology; the server re-validates. */
function checkForm(form) {
  const errs = {};
  if (!form.valuationMethods.length) errs.valuation_methods = 'Choose at least one method.';
  const h = Number(form.horizonMonths);
  if (!Number.isInteger(h) || h < HORIZON_MIN || h > HORIZON_MAX) {
    errs.horizon_months = `Enter a whole number from ${HORIZON_MIN} to ${HORIZON_MAX}.`;
  }
  for (const id of ['min_reviewers', 'stale_after_days']) {
    const f = rule(id);
    const s = form.review[id];
    if (s === '') continue;
    const n = Number(s);
    if (!Number.isInteger(n) || n < f.min || n > f.max) {
      errs[`review_rules.${id}`] = `Enter a whole number from ${f.min} to ${f.max}.`;
    }
  }
  for (const f of ASSUMPTION_FIELDS) {
    const v = fromInput(f, form.overrides[f.id]);
    if (v === null) continue;
    if (!Number.isFinite(v) || v < f.min || v > f.max) {
      errs[`assumption_overrides.${f.id}`] =
        `Enter a value from ${boundText(f, f.min)} to ${boundText(f, f.max)}.`;
    }
  }
  const field = (id) => ASSUMPTION_FIELDS.find((f) => f.id === id);
  const bf = fromInput(field('beta_floor'), form.overrides.beta_floor);
  const bc = fromInput(field('beta_cap'), form.overrides.beta_cap);
  if (
    Number.isFinite(bf) &&
    Number.isFinite(bc) &&
    bc < bf &&
    !errs['assumption_overrides.beta_cap']
  ) {
    errs['assumption_overrides.beta_cap'] = 'The beta cap must be at or above the beta floor.';
  }
  return errs;
}

function toBody(form) {
  const review = {};
  if (form.review.min_reviewers !== '') review.min_reviewers = Number(form.review.min_reviewers);
  if (form.review.require_executive_approval) review.require_executive_approval = true;
  if (form.review.require_citations) review.require_citations = true;
  if (form.review.min_confidence) review.min_confidence = form.review.min_confidence;
  if (form.review.stale_after_days !== '') {
    review.stale_after_days = Number(form.review.stale_after_days);
  }
  const overrides = {};
  for (const f of ASSUMPTION_FIELDS) {
    const v = fromInput(f, form.overrides[f.id]);
    if (v !== null) overrides[f.id] = v;
  }
  return {
    valuation_methods: form.valuationMethods,
    required_sections: form.requiredSections,
    horizon_months: Number(form.horizonMonths),
    scenarios_required: form.scenariosRequired,
    red_team_required: form.redTeamRequired,
    review_rules: review,
    assumption_overrides: overrides,
    output_format: form.outputFormat,
    notes: form.notes.trim() ? form.notes : null,
  };
}

function OptionGroup({ legend, hint, options, selected, onToggle, error, idBase }) {
  const hintId = `${idBase}-hint`;
  const errId = `${idBase}-err`;
  return (
    <fieldset
      className="sorg-rm-fieldset"
      aria-describedby={
        [hint ? hintId : null, error ? errId : null].filter(Boolean).join(' ') || undefined
      }
      data-invalid={error ? 'true' : undefined}
    >
      <legend className="sorg-rm-legend">{legend}</legend>
      {hint && (
        <p id={hintId} className="sorg-rm-hint">
          {hint}
        </p>
      )}
      <div className="sorg-rm-grid">
        {options.map((o) => (
          <Checkbox
            key={o.id}
            label={o.label}
            checked={selected.includes(o.id)}
            onChange={() => onToggle(o.id)}
          />
        ))}
      </div>
      {error && (
        <p id={errId} className="sorg-rm-error">
          <i className="bi bi-exclamation-circle" aria-hidden="true" /> {error}
        </p>
      )}
    </fieldset>
  );
}

function ReadOnlyView({ m }) {
  const overrides = ASSUMPTION_FIELDS.filter((f) => Number.isFinite(m.assumptionOverrides?.[f.id]));
  const rr = m.reviewRules || {};
  const rules = [
    rr.min_reviewers != null ? `${rr.min_reviewers} reviewer(s) before approval` : null,
    rr.require_executive_approval ? 'An executive approves every report' : null,
    rr.require_citations ? 'Every figure cites a source' : null,
    rr.min_confidence ? `Submitted at ${rr.min_confidence} confidence or higher` : null,
    rr.stale_after_days != null ? `Refreshed after ${rr.stale_after_days} days` : null,
  ].filter(Boolean);
  return (
    <dl className="sorg-rm-dl">
      <dt>Valuation methods</dt>
      <dd className="sorg-rm-chips">
        {m.valuationMethods.map((id) => (
          <Badge key={id} tone="neutral">
            {optionLabel(VALUATION_METHODS, id)}
          </Badge>
        ))}
      </dd>
      <dt>Required report sections</dt>
      <dd className="sorg-rm-chips">
        {m.requiredSections.length
          ? m.requiredSections.map((id) => (
              <Badge key={id} tone="neutral">
                {optionLabel(REPORT_SECTIONS, id)}
              </Badge>
            ))
          : 'None required'}
      </dd>
      <dt>Horizon</dt>
      <dd>
        <NumericValue value={m.horizonMonths} decimals={0} /> months
      </dd>
      <dt>Scenarios</dt>
      <dd>{m.scenariosRequired ? 'Required' : 'Optional'}</dd>
      <dt>Red team review</dt>
      <dd>{m.redTeamRequired ? 'Required' : 'Only in deep research'}</dd>
      <dt>Output format</dt>
      <dd>{optionLabel(OUTPUT_FORMATS, m.outputFormat)}</dd>
      <dt>Review rules</dt>
      <dd>{rules.length ? rules.join('. ') + '.' : 'None set'}</dd>
      <dt>Assumption overrides</dt>
      <dd>
        {overrides.length ? (
          <ul className="sorg-rm-list">
            {overrides.map((f) => {
              const v = m.assumptionOverrides[f.id];
              return (
                <li key={f.id}>
                  {f.label}:{' '}
                  {f.unit === 'pct' ? (
                    <NumericValue value={v * 100} format="percent" decimals={2} />
                  ) : (
                    <NumericValue value={v} decimals={2} />
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          'Engine defaults'
        )}
      </dd>
      {m.notes && (
        <>
          <dt>Notes</dt>
          <dd className="sorg-rm-notes">{m.notes}</dd>
        </>
      )}
    </dl>
  );
}

export function ResearchMethodology() {
  const uid = useId();
  const [state, setState] = useState({ loading: true, m: null, canManage: false, error: null });
  const [form, setForm] = useState(null);
  const [errs, setErrs] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(ENDPOINT, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.status === 403) {
          setState({ loading: false, m: null, canManage: false, error: null, hidden: true });
          return;
        }
        if (!res.ok)
          throw new Error(data?.error || 'The research methodology could not be loaded.');
        setState({
          loading: false,
          m: data.methodology,
          canManage: Boolean(data.viewer?.canManage),
          error: null,
        });
        setForm(toForm(data.methodology));
      } catch (e) {
        if (alive) setState({ loading: false, m: null, canManage: false, error: e.message });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const patch = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const patchIn = (group, k, v) => setForm((f) => ({ ...f, [group]: { ...f[group], [k]: v } }));
  const toggleIn = (k, id) =>
    setForm((f) => ({
      ...f,
      [k]: f[k].includes(id) ? f[k].filter((x) => x !== id) : [...f[k], id],
    }));

  /* After a failed save, move focus to the first field that needs attention
     (once React has rendered the error state). */
  const formRef = useRef(null);
  const focusFirstInvalid = () =>
    requestAnimationFrame(() => {
      const el = formRef.current?.querySelector(
        '[aria-invalid="true"], fieldset[data-invalid="true"] input',
      );
      el?.focus();
    });

  const save = useCallback(async () => {
    setMsg(null);
    const local = checkForm(form);
    setErrs(local);
    if (Object.keys(local).length) {
      setMsg({ err: 'Some fields need attention.' });
      focusFirstInvalid();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toBody(form)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (Array.isArray(data?.fields)) {
          setErrs(Object.fromEntries(data.fields.map((x) => [x.field, x.message])));
          focusFirstInvalid();
        }
        throw new Error(data?.error || 'Save failed.');
      }
      setState((s) => ({ ...s, m: data.methodology }));
      setForm(toForm(data.methodology));
      setMsg({ ok: 'Research methodology saved.' });
    } catch (e) {
      setMsg({ err: e.message });
    } finally {
      setSaving(false);
    }
  }, [form]);

  if (state.hidden) return null;

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Research Methodology</h2>
        <p className="settings-panel-desc">
          How Sonar&apos;s analysts research a company for your fund: the valuation methods to use,
          the sections every report must cover, the default horizon and the assumptions the
          valuation engine applies.
        </p>
      </div>

      {state.loading ? (
        <p className="sorg-fg-muted" role="status">
          Loading the research methodology…
        </p>
      ) : state.error ? (
        <Alert tone="error">{state.error}</Alert>
      ) : !state.canManage ? (
        <>
          <Alert tone="info">
            Your fund&apos;s executives set the research methodology. You can view it here.
          </Alert>
          <div className="settings-section">
            <ReadOnlyView m={state.m} />
          </div>
        </>
      ) : (
        <form
          ref={formRef}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {state.m?.isDefault && (
            <Alert tone="info">
              Your fund has not set a methodology yet, so Sonar uses the defaults shown below.
            </Alert>
          )}

          <div className="settings-section">
            <div className="settings-section-title">Valuation and report</div>
            <OptionGroup
              idBase={`${uid}-vm`}
              legend="Preferred valuation methods"
              hint="Valuation work leads with these, labelled as your fund's methodology."
              options={VALUATION_METHODS}
              selected={form.valuationMethods}
              onToggle={(id) => toggleIn('valuationMethods', id)}
              error={errs.valuation_methods}
            />
            <OptionGroup
              idBase={`${uid}-rs`}
              legend="Required report sections"
              hint="The research director fills each one, or writes that it is not available in Ezana data."
              options={REPORT_SECTIONS}
              selected={form.requiredSections}
              onToggle={(id) => toggleIn('requiredSections', id)}
              error={errs.required_sections}
            />
            <div className="sorg-rm-row">
              <Input
                id={`${uid}-horizon`}
                label="Default horizon (months)"
                type="number"
                inputMode="numeric"
                min={HORIZON_MIN}
                max={HORIZON_MAX}
                step={1}
                value={form.horizonMonths}
                onChange={(e) => patch('horizonMonths', e.target.value)}
                hint={`Used when a question names no horizon. ${HORIZON_MIN} to ${HORIZON_MAX} months.`}
                error={errs.horizon_months}
                className="ds-num"
              />
              <Select
                id={`${uid}-format`}
                label="Output format"
                value={form.outputFormat}
                onChange={(e) => patch('outputFormat', e.target.value)}
                options={OUTPUT_FORMATS.map((o) => ({ value: o.id, label: o.label }))}
                error={errs.output_format}
              />
            </div>
            <div className="sorg-rm-toggles">
              <Toggle
                label="Scenarios (bear, base, bull) are required"
                checked={form.scenariosRequired}
                onChange={(e) => patch('scenariosRequired', e.target.checked)}
              />
              <Toggle
                label="A red team reviews every standard report"
                checked={form.redTeamRequired}
                onChange={(e) => patch('redTeamRequired', e.target.checked)}
              />
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Review rules</div>
            <div className="sorg-rm-row">
              <Input
                id={`${uid}-reviewers`}
                label={rule('min_reviewers').label}
                type="number"
                inputMode="numeric"
                min={0}
                max={5}
                step={1}
                placeholder="Not set"
                value={form.review.min_reviewers}
                onChange={(e) => patchIn('review', 'min_reviewers', e.target.value)}
                error={errs['review_rules.min_reviewers']}
                hint="0 to 5."
                className="ds-num"
              />
              <Select
                id={`${uid}-confidence`}
                label={rule('min_confidence').label}
                value={form.review.min_confidence}
                onChange={(e) => patchIn('review', 'min_confidence', e.target.value)}
                options={CONFIDENCE_OPTIONS}
                error={errs['review_rules.min_confidence']}
              />
              <Input
                id={`${uid}-stale`}
                label={rule('stale_after_days').label}
                type="number"
                inputMode="numeric"
                min={7}
                max={730}
                step={1}
                placeholder="Not set"
                value={form.review.stale_after_days}
                onChange={(e) => patchIn('review', 'stale_after_days', e.target.value)}
                error={errs['review_rules.stale_after_days']}
                hint="7 to 730 days."
                className="ds-num"
              />
            </div>
            <div className="sorg-rm-toggles">
              <Toggle
                label={rule('require_executive_approval').label}
                checked={form.review.require_executive_approval}
                onChange={(e) => patchIn('review', 'require_executive_approval', e.target.checked)}
              />
              <Toggle
                label={rule('require_citations').label}
                checked={form.review.require_citations}
                onChange={(e) => patchIn('review', 'require_citations', e.target.checked)}
              />
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Assumption overrides</div>
            <p className="sorg-rm-hint">
              Leave a field blank to use the valuation engine&apos;s default. Rates are percents
              (enter 5.5 for 5.5%).
            </p>
            <div className="sorg-rm-row sorg-rm-row--wide">
              {ASSUMPTION_FIELDS.map((f) => (
                <Input
                  key={f.id}
                  id={`${uid}-ao-${f.id}`}
                  label={f.unit === 'pct' ? `${f.label} (%)` : `${f.label} (x)`}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={f.unit === 'pct' ? f.min * 100 : f.min}
                  max={f.unit === 'pct' ? f.max * 100 : f.max}
                  placeholder="Default"
                  value={form.overrides[f.id]}
                  onChange={(e) => patchIn('overrides', f.id, e.target.value)}
                  hint={`${boundText(f, f.min)} to ${boundText(f, f.max)}.`}
                  error={errs[`assumption_overrides.${f.id}`]}
                  className="ds-num"
                />
              ))}
            </div>
          </div>

          <div className="settings-section">
            <Textarea
              id={`${uid}-notes`}
              label="Notes for the analysts"
              rows={3}
              maxLength={NOTES_MAX}
              value={form.notes}
              onChange={(e) => patch('notes', e.target.value)}
              hint={`Optional. Up to ${NOTES_MAX} characters.`}
              error={errs.notes}
            />
          </div>

          <div className="sorg-rm-actions">
            <Button type="submit" loading={saving}>
              {saving ? 'Saving…' : 'Save research methodology'}
            </Button>
            {msg?.ok && <Alert tone="success">{msg.ok}</Alert>}
            {msg?.err && <Alert tone="error">{msg.err}</Alert>}
          </div>
        </form>
      )}
    </div>
  );
}
