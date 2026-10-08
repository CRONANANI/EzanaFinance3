'use client';

/**
 * "Tell us what high signal means to you": pick the datasets that must
 * overlap, set what makes an event high signal, and see how many events match
 * before saving. The preview runs for everyone (300ms after the last change);
 * saving and alerts belong to an account. Saved rules become My signals chips
 * and their events join the carousel. On phones the builder is a bottom sheet
 * opened from "Build a signal".
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  CAPITOL_DATASETS,
  MAX_RULES,
  OUTSIDE_DATASETS,
  RULE_CONDITIONS,
  RULE_WINDOWS,
  defaultRule,
  suggestRuleName,
  visibleConditions,
} from '@/lib/datasets/capitol-hub/signals';
import { useCwh, PREVIEW_ID } from './CwhProvider';
import { LinkedChips } from './bits';
import { DASH, signed } from './cwh-format';

const TILE = {
  'Politician Tracker': { icon: 'bi-bank', sub: 'Member trades' },
  'Government Contracts': { icon: 'bi-briefcase', sub: 'Federal awards' },
  'Committee Assignments': { icon: 'bi-diagram-3', sub: 'Who oversees what' },
  'Lobbying Activity': { icon: 'bi-megaphone', sub: 'LDA spend' },
  'Campaign Finance Records': {
    icon: 'bi-cash-stack',
    sub: 'FEC receipts',
    name: 'Campaign Finance',
  },
};
const OUTSIDE_ICON = {
  'Form 4 insiders': 'bi-person-badge',
  '13F institutions': 'bi-bar-chart',
  '13D/G whales': 'bi-graph-up-arrow',
  'Prediction markets': 'bi-broadcast',
};
const WINDOW_TEXT = { '30D': '30 days', '90D': '90 days', '180D': '180 days', '12M': '12 months' };
const COLLAPSE_KEY = 'cwh-builder-collapsed';

function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

/** One step-2 condition: a check, the label and an inline value chip. */
function ConditionRow({ def, cond, onChange }) {
  const id = useId();
  const on = cond.enabled !== false;
  const [before, after] = def.label;
  const valueLabel = def.multi
    ? cond.value.length === def.values.length
      ? 'ALL'
      : def.values
          .filter((v) => cond.value.includes(v.value))
          .map((v) => v.label)
          .join(', ')
    : def.values.find((v) => v.value === cond.value)?.label || DASH;
  return (
    <div className={`cwh-cond${on ? '' : ' is-off'}`}>
      <input
        id={id}
        type="checkbox"
        className="cwh-cond-check"
        checked={on}
        onChange={(e) => onChange({ ...cond, enabled: e.target.checked })}
      />
      <label htmlFor={id} className="cwh-cond-label">
        {before}
      </label>
      {def.multi ? (
        <details className="cwh-cond-multi">
          <summary className="cwh-cond-val" aria-label={`${before}: ${valueLabel}`}>
            {valueLabel} <i className="bi bi-chevron-down" aria-hidden="true" />
          </summary>
          <div className="cwh-cond-menu" role="group" aria-label={before}>
            {def.values.map((v) => (
              <label key={v.value} className="cwh-cond-opt">
                <input
                  type="checkbox"
                  checked={cond.value.includes(v.value)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...cond.value, v.value]
                      : cond.value.filter((x) => x !== v.value);
                    if (next.length) onChange({ ...cond, value: next, enabled: true });
                  }}
                />
                {v.label}
              </label>
            ))}
          </div>
        </details>
      ) : def.values.length > 1 ? (
        <span className="cwh-cond-val">
          <select
            aria-label={`${before} value`}
            value={String(cond.value)}
            onChange={(e) => {
              const v = def.values.find((x) => String(x.value) === e.target.value);
              onChange({ ...cond, value: v ? v.value : cond.value, enabled: true });
            }}
          >
            {def.values.map((v) => (
              <option key={String(v.value)} value={String(v.value)}>
                {v.label}
              </option>
            ))}
          </select>
          <i className="bi bi-chevron-down" aria-hidden="true" />
        </span>
      ) : (
        <span className="cwh-cond-val is-static">{valueLabel}</span>
      )}
      {after ? <span className="cwh-cond-after">{after}</span> : null}
    </div>
  );
}

function RuleChip({ rule, onOpen, onEdit, onRename, onToggleAlerts, onDelete }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const item = (label, fn) => (
    <li role="none">
      <button
        type="button"
        role="menuitem"
        className="cwh-menu-item"
        onClick={() => {
          setOpen(false);
          fn();
        }}
      >
        {label}
      </button>
    </li>
  );
  return (
    <span className="cwh-rule-chip" ref={wrap}>
      <button type="button" className="cwh-rule-chip-main" onClick={onOpen}>
        <i className="bi bi-lightning-charge" aria-hidden="true" /> {rule.name}
      </button>
      <button
        type="button"
        className="cwh-rule-chip-more"
        aria-label={`${rule.name} options`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <i className="bi bi-three-dots" aria-hidden="true" />
      </button>
      {open ? (
        <ul className="cwh-menu" role="menu" aria-label={`${rule.name} options`}>
          {item('Edit', onEdit)}
          {item('Rename', onRename)}
          {item(rule.alerts ? 'Pause alerts' : 'Turn on alerts', onToggleAlerts)}
          {item('Delete', onDelete)}
        </ul>
      ) : null}
    </span>
  );
}

export default function RuleBuilder() {
  const {
    isAuthenticated,
    authLoading,
    gate,
    rules,
    saveRule,
    updateRule,
    deleteRule,
    showPreviewEvents,
  } = useCwh();
  const [rule, setRule] = useState(defaultRule);
  const [nameTouched, setNameTouched] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [preview, setPreview] = useState({ state: 'idle' });
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState('');
  const [alertsOn, setAlertsOn] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sheet, setSheet] = useState(false);
  const nameId = useId();
  const seq = useRef(0);
  const guest = !authLoading && !isAuthenticated;

  useEffect(() => setCollapsed(readCollapsed()), []);

  /* The phone bottom sheet: Escape closes it; the page behind holds still. */
  useEffect(() => {
    if (!sheet) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && setSheet(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [sheet]);
  const toggleCollapsed = () => {
    setCollapsed((v) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1');
      } catch {
        /* per-viewer convenience only */
      }
      return !v;
    });
  };

  const visible = useMemo(() => visibleConditions(rule.datasets), [rule.datasets]);
  const suggested = suggestRuleName(rule);
  const name = nameTouched ? rule.name : rule.name || suggested;
  const enough = rule.datasets.length >= 2;

  /* The preview: 300ms after the last change. */
  const body = useMemo(
    () => ({ datasets: rule.datasets, conditions: rule.conditions, window: rule.window }),
    [rule.datasets, rule.conditions, rule.window],
  );
  useEffect(() => {
    if (!enough) {
      setPreview({ state: 'few' });
      return undefined;
    }
    const n = ++seq.current;
    setPreview((p) => ({ ...p, state: p.count != null ? 'refresh' : 'loading' }));
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch('/api/datasets/capitol/rules/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const d = await res.json().catch(() => ({}));
        if (n !== seq.current) return;
        if (!res.ok || !d.ok) throw new Error(d.error || 'preview');
        setPreview({ state: 'done', count: d.count, first: d.first || [] });
      } catch {
        if (n === seq.current) setPreview({ state: 'error' });
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [body, enough]);

  const toggleDataset = (d) =>
    setRule((r) => ({
      ...r,
      datasets: r.datasets.includes(d) ? r.datasets.filter((x) => x !== d) : [...r.datasets, d],
    }));
  const setCondition = (c) =>
    setRule((r) => ({ ...r, conditions: r.conditions.map((x) => (x.id === c.id ? c : x)) }));

  const openMore = async () => {
    try {
      const res = await fetch('/api/datasets/capitol/rules/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, full: true, name }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error('preview');
      showPreviewEvents(d.events || []);
      setSheet(false);
      window.dispatchEvent(new CustomEvent('cwh:open-rule', { detail: { ruleId: PREVIEW_ID } }));
    } catch {
      setMessage('Those matches could not be opened just now. Try again.');
    }
  };

  const doSave = async (withAlerts) => {
    if (authLoading) return;
    if (!isAuthenticated) {
      gate(withAlerts ? 'signal-alert' : 'signal-save');
      return;
    }
    if (!enough) return;
    const payload = { ...rule, name: name.trim() || suggested, alerts: withAlerts || rule.alerts };
    setSaving(withAlerts ? 'alert' : 'save');
    setMessage('');
    const out = editingId ? await updateRule(editingId, payload) : await saveRule(payload);
    setSaving(null);
    if (out.auth) return gate('signal-save');
    if (out.error) {
      setMessage(out.error);
      return;
    }
    setEditingId(out.rule.id);
    setRule((r) => ({ ...r, name: out.rule.name, alerts: out.rule.alerts }));
    setNameTouched(true);
    if (withAlerts) setAlertsOn(true);
    setMessage(
      editingId ? 'Signal updated.' : 'Saved to My signals. Its events join the carousel.',
    );
  };

  const loadRule = (r) => {
    setRule({
      name: r.name,
      datasets: r.datasets,
      conditions: RULE_CONDITIONS.map((def) => {
        const c = r.conditions.find((x) => x.id === def.id);
        return c || { id: def.id, value: def.default, enabled: false };
      }),
      window: r.window,
      alerts: r.alerts,
    });
    setNameTouched(true);
    setEditingId(r.id);
    setAlertsOn(r.alerts);
    setCollapsed(false);
    if (window.matchMedia?.('(max-width: 640px)').matches) setSheet(true);
    else document.getElementById('cwh-builder-h')?.scrollIntoView({ block: 'start' });
    setMessage(`Editing ${r.name}.`);
  };

  const startNew = () => {
    setRule(defaultRule());
    setNameTouched(false);
    setEditingId(null);
    setAlertsOn(false);
    setMessage('');
  };

  const rename = async (r) => {
    // eslint-disable-next-line no-alert
    const next = window.prompt('Rename this signal', r.name);
    if (next == null || !next.trim()) return;
    const out = await updateRule(r.id, { name: next.trim().slice(0, 80) });
    setMessage(out.error || 'Signal renamed.');
  };

  const remove = async (r) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete ${r.name}?`)) return;
    const out = await deleteRule(r.id);
    if (editingId === r.id) startNew();
    setMessage(out.error || 'Signal deleted.');
  };

  const lock = guest ? <i className="bi bi-lock cwh-lock" aria-hidden="true" /> : null;
  const capitolPicked = rule.datasets.filter((d) => CAPITOL_DATASETS.includes(d));
  const outsidePicked = rule.datasets.filter((d) => !CAPITOL_DATASETS.includes(d));

  return (
    <section
      className={`cwh-section cwh-builder${sheet ? ' is-sheet-open' : ''}`}
      aria-labelledby="cwh-builder-h"
    >
      <div className="cwh-builder-head">
        <div>
          <h2 className="cwh-h3" id="cwh-builder-h">
            Tell us what high signal means to you
          </h2>
          <p className="cwh-caption">Your rules add events to the carousel under My signals.</p>
        </div>
        <span className="cwh-push" />
        {rules?.length ? (
          <div className="cwh-rule-chips" role="group" aria-label="My signals">
            <span className="cwh-caption">My signals</span>
            {rules.map((r) => (
              <RuleChip
                key={r.id}
                rule={r}
                onOpen={() =>
                  window.dispatchEvent(
                    new CustomEvent('cwh:open-rule', { detail: { ruleId: r.id } }),
                  )
                }
                onEdit={() => loadRule(r)}
                onRename={() => rename(r)}
                onToggleAlerts={async () => {
                  const out = await updateRule(r.id, { alerts: !r.alerts });
                  setMessage(
                    out.error ||
                      (r.alerts ? 'Alerts paused.' : 'Alerts on. Email alerts start soon.'),
                  );
                }}
                onDelete={() => remove(r)}
              />
            ))}
            <span className="cwh-vdiv" aria-hidden="true" />
          </div>
        ) : null}
        <button
          type="button"
          className="cwh-text-btn cwh-builder-collapse"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls="cwh-builder-panel"
        >
          <i className={`bi ${collapsed ? 'bi-chevron-down' : 'bi-x'}`} aria-hidden="true" />{' '}
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>

      <button
        type="button"
        className="cwh-btn cwh-btn--emerald cwh-sheet-open"
        onClick={() => setSheet(true)}
      >
        <i className="bi bi-sliders" aria-hidden="true" /> Build a signal
      </button>

      {sheet ? (
        <button
          type="button"
          className="cwh-sheet-scrim"
          aria-label="Close"
          onClick={() => setSheet(false)}
        />
      ) : null}

      <div
        id="cwh-builder-panel"
        className="cwh-card cwh-builder-panel"
        hidden={collapsed && !sheet}
        role={sheet ? 'dialog' : undefined}
        aria-modal={sheet ? 'true' : undefined}
        aria-label={sheet ? 'Build a signal' : undefined}
      >
        <div className="cwh-sheet-bar">
          <span className="cwh-h3">Build a signal</span>
          <button
            type="button"
            className="cwh-round"
            onClick={() => setSheet(false)}
            aria-label="Close"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        {/* Step 1 */}
        <div className="cwh-step">
          <p className="cwh-step-h">
            <span className="cwh-step-n">1</span> Pick the datasets that must overlap
          </p>
          <p className="cwh-step-sub">
            An event qualifies only when every selected dataset has a matching record for the same
            company or member.
          </p>
          <div className="cwh-tiles" role="group" aria-label="Capitol datasets">
            {CAPITOL_DATASETS.map((d) => {
              const on = rule.datasets.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  className={`cwh-tile${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() => toggleDataset(d)}
                >
                  <span className="cwh-tile-top">
                    <i className={`bi ${TILE[d].icon}`} aria-hidden="true" />
                    <span className="cwh-tile-box" aria-hidden="true">
                      {on ? <i className="bi bi-check-lg" /> : null}
                    </span>
                  </span>
                  <span className="cwh-tile-name">{TILE[d].name || d}</span>
                  <span className="cwh-tile-sub">{TILE[d].sub}</span>
                </button>
              );
            })}
          </div>
          <p className="cwh-label cwh-step-label">From other dimensions</p>
          <div className="cwh-outside" role="group" aria-label="Datasets from other dimensions">
            {OUTSIDE_DATASETS.map((d) => {
              const on = rule.datasets.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  className={`cwh-ochip${on ? ' is-on' : ''}${d.join ? '' : ' is-preview'}`}
                  aria-pressed={d.join ? on : undefined}
                  aria-disabled={d.join ? undefined : 'true'}
                  disabled={!d.join}
                  title={d.join ? undefined : 'No company join yet'}
                  onClick={() => d.join && toggleDataset(d.id)}
                >
                  <i className={`bi ${OUTSIDE_ICON[d.id]}`} aria-hidden="true" />
                  <span>{d.id}</span>
                  {d.join ? (
                    <span className="cwh-ochip-plus" aria-hidden="true">
                      {on ? <i className="bi bi-check-lg" /> : '+'}
                    </span>
                  ) : (
                    <span className="cwh-tag">PREVIEW</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="cwh-overlap">
            <span className="cwh-label">Overlap</span>
            {enough ? (
              <LinkedChips datasets={[...capitolPicked, ...outsidePicked]} />
            ) : (
              <span className="cwh-caption">Pick at least two datasets.</span>
            )}
          </div>
        </div>

        {/* Step 2 */}
        <div className="cwh-step">
          <p className="cwh-step-h">
            <span className="cwh-step-n">2</span> Set what makes it high signal
          </p>
          <div className="cwh-conds">
            {RULE_CONDITIONS.filter((c) => visible.includes(c.id)).map((def) => (
              <ConditionRow
                key={def.id}
                def={def}
                cond={rule.conditions.find((c) => c.id === def.id)}
                onChange={setCondition}
              />
            ))}
            <div className="cwh-cond">
              <span className="cwh-cond-check-static" aria-hidden="true">
                <i className="bi bi-check2" />
              </span>
              <span className="cwh-cond-label">Window</span>
              <span className="cwh-cond-val">
                <select
                  aria-label="Window"
                  value={rule.window}
                  onChange={(e) => setRule((r) => ({ ...r, window: e.target.value }))}
                >
                  {Object.keys(RULE_WINDOWS).map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
                <i className="bi bi-chevron-down" aria-hidden="true" />
              </span>
            </div>
          </div>
          <button
            type="button"
            className="cwh-link-btn cwh-plain"
            onClick={() => {
              setSheet(false);
              const bar = document.getElementById('hub-ezanaql');
              bar?.scrollIntoView({ block: 'start' });
              window.setTimeout(() => bar?.querySelector('.eqb-input')?.focus(), 250);
            }}
          >
            <i className="bi bi-stars" aria-hidden="true" /> Describe it in plain English instead
          </button>
        </div>

        {/* Step 3 */}
        <div className="cwh-step cwh-step--preview">
          <p className="cwh-step-h">
            <span className="cwh-step-n">3</span> Preview and save
          </p>
          <p className="cwh-count" aria-live="polite">
            {preview.state === 'few' ? (
              <span className="cwh-caption">Pick at least two datasets to see matches.</span>
            ) : preview.state === 'error' ? (
              <span className="cwh-caption">
                The preview could not run just now. Try again in a minute.
              </span>
            ) : preview.count == null ? (
              <span className="cwh-skel cwh-skel--count" aria-label="Counting matches" />
            ) : (
              <>
                <b className={preview.state === 'refresh' ? 'is-stale' : undefined}>
                  {preview.count}
                </b>
                <span>
                  event{preview.count === 1 ? '' : 's'} match in the last {WINDOW_TEXT[rule.window]}
                </span>
              </>
            )}
          </p>
          {preview.first?.length && preview.state !== 'few' && preview.state !== 'error' ? (
            <ul className="cwh-matches">
              {preview.first.map((m) => (
                <li key={m.id} className="cwh-match">
                  <span className="cwh-match-tk">{m.ticker}</span>
                  <span className="cwh-match-line">{m.line}</span>
                  <span
                    className={`cwh-match-ret${m.return30d == null ? '' : m.return30d >= 0 ? ' is-pos' : ' is-neg'}`}
                  >
                    {signed(m.return30d)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {preview.count > 3 && preview.state === 'done' ? (
            <button type="button" className="cwh-link-btn" onClick={openMore}>
              +{preview.count - 3} more
            </button>
          ) : null}
          <label className="cwh-label cwh-name-label" htmlFor={nameId}>
            Name
          </label>
          <input
            id={nameId}
            className="cwh-input"
            maxLength={80}
            value={name}
            onChange={(e) => {
              setNameTouched(true);
              setRule((r) => ({ ...r, name: e.target.value }));
            }}
          />
          <div className="cwh-save-row">
            <button
              type="button"
              className="cwh-btn cwh-btn--emerald cwh-btn--grow"
              onClick={() => doSave(false)}
              disabled={!enough || saving != null || (isAuthenticated && !name.trim())}
            >
              {saving === 'save' ? 'Saving' : editingId ? 'Update signal' : 'Save to My signals'}
              {lock}
            </button>
            <button
              type="button"
              className={`cwh-btn${alertsOn ? ' is-on' : ''}`}
              onClick={() => doSave(true)}
              disabled={!enough || saving != null || alertsOn}
              aria-pressed={alertsOn}
            >
              <i className={`bi ${alertsOn ? 'bi-bell-fill' : 'bi-bell'}`} aria-hidden="true" />{' '}
              {alertsOn ? 'Alerts on' : 'Alert me'}
              {lock}
            </button>
          </div>
          {alertsOn ? <p className="cwh-note cwh-alert-note">Email alerts start soon.</p> : null}
          {editingId ? (
            <button type="button" className="cwh-text-btn" onClick={startNew}>
              Start a new signal
            </button>
          ) : null}
          {message ? (
            <p className="cwh-note" role="status">
              {message}
            </p>
          ) : null}
          <p className="cwh-note">
            Your rule filters public records; it does not predict prices. Saving and alerts need an
            account, up to {MAX_RULES} signals. Preview works signed out.
          </p>
        </div>
      </div>
    </section>
  );
}
