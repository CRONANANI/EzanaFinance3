'use client';

/**
 * Investment thesis panel (Mock Trading, Nov 14 2026): the active thesis at
 * the top of the right column, above the order ticket. One tab per saved
 * thesis (up to THESIS_LIMITS.maxTheses), the thesis as a definition list,
 * and a four-stat strip (portfolio alignment, risk tolerance, single-name
 * cap, current trade fit). Also the Build / edit modal and the delete
 * confirmation, which the page opens (the Thesis alignment card's empty
 * state opens the same modal).
 *
 * Data comes from useMockTheses; validation is the shared parseThesis in
 * src/lib/trading/mock-thesis.js, run again on the server. Wording describes
 * how an order lines up with the thesis; it never advises.
 * Styles: mock-trading.css (mock-thesis-).
 */
import { useEffect, useId, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Dropdown,
  EmptyState,
  ErrorState,
  Input,
  MenuItem,
  Modal,
  Select,
  Tabs,
  Textarea,
  Tooltip,
} from '@/components/ds';
import { CANONICAL_SECTORS, CANONICAL_TO_DISPLAY } from '@/lib/fmp/sector-performance';
import {
  RISK_TOLERANCES,
  THESIS_LIMITS,
  THESIS_TEMPLATES,
  TIME_HORIZONS,
  parseThesis,
  riskToleranceLabel,
  timeHorizonLabel,
} from '@/lib/trading/mock-thesis';
import { fmtPct } from '@/lib/trading/mock-ticket';

export const THESIS_EXPLAINER =
  "Create and switch between investment theses for this paper account. Each thesis sets your objective, time horizon, sector focus and risk tolerance. When you prepare a trade, Ezana shows how the order lines up with your active thesis and your portfolio's current risk profile.";

const sectorLabel = (s) => CANONICAL_TO_DISPLAY[s] || s;
const capLabel = (v) => (Number.isFinite(Number(v)) ? `${Number(v).toFixed(1)}%` : 'N/A');

/* ------------------------------------------------------------------ */
/* Build / edit modal                                                  */
/* ------------------------------------------------------------------ */

const blank = () => ({
  name: '',
  objective: '',
  time_horizon: '3_5y',
  risk_tolerance: 'moderate',
  sector_focus: [],
  position_rules: '',
  max_single_name_pct: String(THESIS_LIMITS.capDefault),
});

const fromThesis = (t) => ({
  name: t.name || '',
  objective: t.objective || '',
  time_horizon: t.time_horizon || '3_5y',
  risk_tolerance: t.risk_tolerance || 'moderate',
  sector_focus: Array.isArray(t.sector_focus) ? [...t.sector_focus] : [],
  position_rules: t.position_rules || '',
  max_single_name_pct: String(t.max_single_name_pct ?? THESIS_LIMITS.capDefault),
});

/**
 * open      boolean
 * thesis    the thesis being edited, or null to build a new one
 * onSave    async (values) => { ok, error? }
 */
export function ThesisModal({ open, thesis = null, onClose, onSave }) {
  const id = useId();
  const [form, setForm] = useState(blank);
  const [template, setTemplate] = useState('blank');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(thesis ? fromThesis(thesis) : blank());
    setTemplate('blank');
    setError(null);
  }, [open, thesis]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleSector = (s) =>
    setForm((f) => ({
      ...f,
      sector_focus: f.sector_focus.includes(s)
        ? f.sector_focus.filter((x) => x !== s)
        : [...f.sector_focus, s],
    }));
  const pickTemplate = (key) => {
    setTemplate(key);
    const t = THESIS_TEMPLATES.find((x) => x.key === key);
    setForm(t?.values ? fromThesis(t.values) : blank());
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const parsed = parseThesis(form, { sectors: CANONICAL_SECTORS });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setBusy(true);
    setError(null);
    const r = await onSave(parsed.value);
    setBusy(false);
    if (r?.ok) onClose();
    else setError(r?.error || 'That did not work. Try again.');
  };

  const full = form.sector_focus.length >= THESIS_LIMITS.sectors;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={thesis ? 'Edit thesis' : 'Build thesis'}
      size="560px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={`${id}-form`} loading={busy}>
            {thesis ? 'Save changes' : 'Save thesis'}
          </Button>
        </>
      }
    >
      <form id={`${id}-form`} className="mock-thesis-form" onSubmit={submit} noValidate>
        {!thesis ? (
          <Select
            id={`${id}-tpl`}
            label="Start from"
            value={template}
            onChange={(e) => pickTemplate(e.target.value)}
            options={THESIS_TEMPLATES.map((t) => ({ value: t.key, label: t.label }))}
          />
        ) : null}
        <Input
          id={`${id}-name`}
          label="Name"
          value={form.name}
          maxLength={THESIS_LIMITS.name}
          onChange={set('name')}
          required
        />
        <Textarea
          id={`${id}-obj`}
          label="Objective"
          rows={3}
          value={form.objective}
          maxLength={THESIS_LIMITS.objective}
          onChange={set('objective')}
          hint={`${form.objective.length} of ${THESIS_LIMITS.objective} characters`}
        />
        <div className="mock-thesis-form__row">
          <Select
            id={`${id}-hz`}
            label="Time horizon"
            value={form.time_horizon}
            onChange={set('time_horizon')}
            options={TIME_HORIZONS}
          />
          <Select
            id={`${id}-risk`}
            label="Risk tolerance"
            value={form.risk_tolerance}
            onChange={set('risk_tolerance')}
            options={RISK_TOLERANCES}
          />
        </div>
        <fieldset className="mock-thesis-sectors">
          <legend className="ds-field-label">
            Sector focus{' '}
            <span className="mock-muted">
              ({form.sector_focus.length} of {THESIS_LIMITS.sectors})
            </span>
          </legend>
          <div className="mock-thesis-sectors__grid">
            {CANONICAL_SECTORS.map((s) => {
              const on = form.sector_focus.includes(s);
              return (
                <label key={s} className={`mock-thesis-sector${on ? ' is-on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={!on && full}
                    onChange={() => toggleSector(s)}
                  />
                  <span>{sectorLabel(s)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <Textarea
          id={`${id}-rules`}
          label="Position rules"
          rows={2}
          value={form.position_rules}
          maxLength={THESIS_LIMITS.positionRules}
          onChange={set('position_rules')}
          hint={`${form.position_rules.length} of ${THESIS_LIMITS.positionRules} characters`}
        />
        <Input
          id={`${id}-cap`}
          label="Max single-name weight (%)"
          inputMode="decimal"
          value={form.max_single_name_pct}
          onChange={(e) =>
            setForm((f) => ({ ...f, max_single_name_pct: e.target.value.replace(/[^0-9.]/g, '') }))
          }
          hint={`${THESIS_LIMITS.capMin} to ${THESIS_LIMITS.capMax}, one decimal`}
        />
        {error ? (
          <Alert tone="error" className="mock-thesis-form__error">
            {error}
          </Alert>
        ) : null}
      </form>
    </Modal>
  );
}

export function DeleteThesisModal({ thesis, pending, onCancel, onConfirm }) {
  return (
    <Modal
      open={Boolean(thesis)}
      onClose={onCancel}
      title={thesis ? `Delete ${thesis.name}?` : ''}
      size="440px"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={pending}>
            Delete thesis
          </Button>
        </>
      }
    >
      <p className="mock-confirm__lead">
        Trades placed under this thesis keep their notes. If it is your active thesis, your oldest
        remaining thesis becomes active.
      </p>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

const ROWS = [
  ['objective', 'Objective', 'bi-bullseye'],
  ['time_horizon', 'Time horizon', 'bi-calendar3'],
  ['risk_tolerance', 'Risk tolerance', 'bi-bar-chart'],
  ['sector_focus', 'Sector focus', 'bi-layers'],
  ['position_rules', 'Position rules', 'bi-sliders'],
  ['max_single_name_pct', 'Max single-name weight', 'bi-pie-chart'],
];

function rowValue(t, key) {
  if (key === 'time_horizon') return timeHorizonLabel(t.time_horizon) || 'N/A';
  if (key === 'risk_tolerance') return riskToleranceLabel(t.risk_tolerance) || 'N/A';
  if (key === 'sector_focus')
    return t.sector_focus?.length ? t.sector_focus.map(sectorLabel).join(', ') : 'Any sector';
  if (key === 'max_single_name_pct') return capLabel(t.max_single_name_pct);
  return t[key] || 'Not set';
}

/**
 * theses     useMockTheses() result
 * alignment  portfolioAlignment() for the active thesis (percent) or null
 * fit        thesisFit() for the ticket's order, or null
 */
export function ThesisPanel({ theses, alignment, fit, onBuild, onEdit, onDelete, onActivate }) {
  const tabsRef = useRef(null);
  const [details, setDetails] = useState(false);
  const { status, theses: list, active } = theses;
  const atLimit = list.length >= THESIS_LIMITS.maxTheses;

  const focusTabs = () => {
    const el =
      tabsRef.current?.querySelector('[role="tab"][aria-selected="true"]') ||
      tabsRef.current?.querySelector('[role="tab"]');
    el?.focus();
  };

  const build = (
    <button type="button" className="mock-btn" onClick={onBuild} disabled={atLimit}>
      <i className="bi bi-plus-lg" aria-hidden="true" /> Build thesis
    </button>
  );

  return (
    <section className="mock-card mock-thesis" aria-labelledby="mock-thesis-h">
      <header className="mock-card-header">
        <i className="bi bi-layers mock-card-icon" aria-hidden="true" />
        <h2 id="mock-thesis-h" className="mock-card-title">
          Investment thesis
        </h2>
        <Tooltip label={THESIS_EXPLAINER} className="mock-thesis-info">
          <button type="button" className="mock-icon-btn" aria-label="About investment theses">
            <i className="bi bi-info-circle" aria-hidden="true" />
          </button>
        </Tooltip>
        <div className="mock-card-header__end">
          {atLimit ? (
            <Tooltip label={`You can keep up to ${THESIS_LIMITS.maxTheses} theses.`}>
              {build}
            </Tooltip>
          ) : (
            build
          )}
          {list.length > 1 ? (
            <>
              <Button size="sm" className="mock-only-wide" onClick={focusTabs}>
                <i className="bi bi-arrow-left-right" aria-hidden="true" /> Switch thesis
              </Button>
              <Dropdown
                align="right"
                className="mock-only-narrow"
                trigger={
                  <span className="ds-btn ds-btn--primary ds-btn--sm">
                    <i className="bi bi-arrow-left-right" aria-hidden="true" /> Switch thesis
                  </span>
                }
              >
                {list.map((t) => (
                  <MenuItem
                    key={t.id}
                    icon={t.id === theses.activeId ? 'bi-check-lg' : undefined}
                    onClick={() => onActivate(t.id)}
                  >
                    {t.name}
                  </MenuItem>
                ))}
              </Dropdown>
            </>
          ) : null}
        </div>
      </header>

      {status === 'loading' ? (
        <div className="mock-skel-stack" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="mock-skel mock-skel--line" />
          ))}
        </div>
      ) : status === 'error' && list.length === 0 ? (
        <ErrorState
          title="Your theses could not load"
          description="The rest of the page keeps working."
          action={
            <Button variant="ghost" size="sm" onClick={theses.reload}>
              Try again
            </Button>
          }
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon="bi-layers"
          description="Set an objective, horizon, sector focus and risk tolerance, and see how each order lines up with it."
          action={
            <button type="button" className="mock-btn" onClick={onBuild}>
              <i className="bi bi-plus-lg" aria-hidden="true" /> Build thesis
            </button>
          }
        />
      ) : (
        <>
          <div ref={tabsRef} className="mock-thesis-tabs">
            <Tabs
              tabs={list.map((t) => ({ id: t.id, label: t.name }))}
              value={theses.activeId}
              onChange={onActivate}
            />
          </div>
          {active ? (
            <>
              <div className="mock-thesis-head">
                <span className="mock-strong">{active.name}</span>
                <Dropdown
                  align="right"
                  trigger={
                    <span className="mock-icon-btn" aria-label={`Actions for ${active.name}`}>
                      <i className="bi bi-three-dots" aria-hidden="true" />
                    </span>
                  }
                >
                  <MenuItem icon="bi-pencil" onClick={() => onEdit(active)}>
                    Edit thesis
                  </MenuItem>
                  <MenuItem icon="bi-trash" danger onClick={() => onDelete(active)}>
                    Delete thesis
                  </MenuItem>
                </Dropdown>
              </div>
              <button
                type="button"
                className="mock-link mock-link--start mock-only-narrow"
                aria-expanded={details}
                onClick={() => setDetails((v) => !v)}
              >
                {details ? 'Hide thesis details' : 'Show thesis details'}{' '}
                <i
                  className={`bi ${details ? 'bi-chevron-up' : 'bi-chevron-down'}`}
                  aria-hidden="true"
                />
              </button>
              <dl className={`mock-thesis-dl${details ? ' is-open' : ''}`}>
                {ROWS.map(([key, label, icon]) => (
                  <div key={key} className="mock-thesis-dl__row">
                    <dt>
                      <i className={`bi ${icon}`} aria-hidden="true" /> {label}
                    </dt>
                    <dd className={key === 'max_single_name_pct' ? 'mock-num' : undefined}>
                      {rowValue(active, key)}
                    </dd>
                  </div>
                ))}
              </dl>
              <dl className="mock-thesis-stats">
                <div>
                  <dt>Portfolio alignment</dt>
                  <dd className="mock-num">{alignment == null ? 'N/A' : fmtPct(alignment, 0)}</dd>
                </div>
                <div>
                  <dt>Risk tolerance</dt>
                  <dd>{riskToleranceLabel(active.risk_tolerance) || 'N/A'}</dd>
                </div>
                <div>
                  <dt>Single-name cap</dt>
                  <dd className="mock-num">{capLabel(active.max_single_name_pct)}</dd>
                </div>
                <div>
                  <dt>Current trade fit</dt>
                  <dd className={fit ? `mock-fit is-${fit.label.toLowerCase()}` : undefined}>
                    {fit ? fit.label : 'N/A'}
                  </dd>
                </div>
              </dl>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}

export default ThesisPanel;
