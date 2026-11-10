'use client';

/**
 * Smart Watchlists (Nov 2026): the component card on the Watchlist page and
 * the builder dialog. A smart watchlist is an ordinary watchlist with a rule;
 * the engine (src/lib/watchlist/smart-engine.js) runs it hourly and on save,
 * adds new matches, and drops a 'watchlist' notification into the bell.
 */
import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ds';
import { ASSET_CLASSES, CLASS_BY_TYPE, displayTicker } from '@/lib/watchlist/asset-classes';
import {
  CHAMBERS,
  CONDITIONS,
  MAX_CONDITIONS,
  MAX_ITEMS_CAP,
  PARTIES,
  SECTOR_LABELS,
  SIDES,
  STOCK_SECTORS,
  conditionsFor,
  describeCondition,
  describeRule,
  newCondition,
  sanitizeRule,
} from '@/lib/watchlist/smart-rules';
import { fmtSignedPct, fmtTime, fmtUSD, signOf } from '@/lib/watchlist/watchlist-view';

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

function RuleRow({ rule, busy, onToggle, onRun, onEdit, onOpen }) {
  const cls = CLASS_BY_TYPE[rule.assetClass];
  const status = !rule.enabled
    ? { tone: 'flat', text: 'Paused' }
    : rule.lastError
      ? { tone: 'down', text: 'Last run failed' }
      : rule.lastRunAt
        ? {
            tone: 'up',
            text: `Ran ${fmtTime(rule.lastRunAt)}${rule.lastRunAdded ? `, +${rule.lastRunAdded}` : ''}`,
          }
        : { tone: 'flat', text: 'Waiting for first run' };
  return (
    <li className="wlm-smart__rule">
      <div className="wlm-smart__rule-main">
        <button type="button" className="wlm-smart__name" onClick={() => onOpen(rule)}>
          <i className="bi bi-stars" aria-hidden="true" />
          <span className="wlm-ellipsis">{rule.label}</span>
        </button>
        <span className="wlm-xs wlm-muted wlm-clamp">
          {cls?.label}: {describeRule({ match: rule.match, conditions: rule.conditions })}
        </span>
        <span className={`wlm-xs wlm-tone is-${status.tone}`}>{status.text}</span>
      </div>
      <div className="wlm-smart__rule-actions">
        <label className="wlm-switch">
          <input
            type="checkbox"
            checked={rule.enabled}
            disabled={busy}
            onChange={(e) => onToggle(rule, e.target.checked)}
          />
          <span className="wlm-switch__track" aria-hidden="true" />
          <span className="wlm-sr">
            {rule.enabled ? `Pause ${rule.label}` : `Resume ${rule.label}`}
          </span>
        </label>
        <button
          type="button"
          className="wlm-icon-btn"
          disabled={busy || !rule.enabled}
          aria-label={`Run ${rule.label} now`}
          onClick={() => onRun(rule)}
        >
          <i
            className={`bi ${busy ? 'bi-hourglass-split' : 'bi-arrow-repeat'}`}
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          className="wlm-icon-btn"
          aria-label={`Edit ${rule.label}`}
          onClick={() => onEdit(rule)}
        >
          <i className="bi bi-pencil" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

/**
 * The "Smart watchlists" component card: each rule with its status, a pause
 * switch, Run now and Edit, then the latest auto-added assets.
 */
export function SmartWatchlistCard({ smart, onCreate, onEdit, onOpenList, onChanged, notify }) {
  const [busyId, setBusyId] = useState(null);

  const toggle = async (rule, enabled) => {
    setBusyId(rule.id);
    try {
      const out = await smart.update(rule.id, { enabled });
      if (out.added?.length) notify(`${rule.label}: added ${out.added.length}`);
      await smart.reload();
      onChanged?.();
    } catch (e) {
      notify(e.message);
    } finally {
      setBusyId(null);
    }
  };
  const run = async (rule) => {
    setBusyId(rule.id);
    try {
      const out = await smart.runNow(rule.id);
      notify(
        out.added?.length
          ? `${rule.label}: added ${out.added.length}`
          : `${rule.label}: no new matches`,
      );
      await smart.reload();
      onChanged?.();
    } catch (e) {
      notify(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="wlm-card wlm-smart" aria-labelledby="wlm-smart-h">
      <header className="wlm-card__head">
        <i className="bi bi-stars wlm-card__icon" aria-hidden="true" />
        <h2 id="wlm-smart-h" className="wlm-card__title">
          Smart watchlists
        </h2>
        <button type="button" className="wlm-btn wlm-btn--sm wlm-btn--accent" onClick={onCreate}>
          <i className="bi bi-plus-lg" aria-hidden="true" /> New
        </button>
      </header>

      {smart.status === 'loading' ? (
        <div className="wlm-skel-stack" aria-hidden="true">
          <span className="wlm-skel wlm-skel--row" />
          <span className="wlm-skel wlm-skel--row" />
        </div>
      ) : smart.status === 'error' ? (
        <p className="wlm-empty">
          Smart watchlists could not load.{' '}
          <button type="button" className="wlm-link" onClick={smart.reload}>
            Retry
          </button>
        </p>
      ) : smart.rules.length === 0 ? (
        <div className="wlm-smart__empty">
          <p className="wlm-sm">
            Set conditions once and let the list fill itself: stocks up 5% today in Technology,
            senators who bought NVDA this quarter, gold under a price.
          </p>
          <p className="wlm-xs wlm-muted">New matches show up here and in your notifications.</p>
        </div>
      ) : (
        <ul className="wlm-smart__rules">
          {smart.rules.map((r) => (
            <RuleRow
              key={r.id}
              rule={r}
              busy={busyId === r.id}
              onToggle={toggle}
              onRun={run}
              onEdit={onEdit}
              onOpen={(rule) => onOpenList(rule.listId)}
            />
          ))}
        </ul>
      )}

      {smart.events.length > 0 ? (
        <div className="wlm-smart__feed">
          <h3 className="wlm-eyebrow">Recently auto-added</h3>
          <ul className="wlm-smart__events">
            {smart.events.slice(0, 6).map((e) => (
              <li key={e.id} className="wlm-smart__event">
                <span className="wlm-smart__event-sym wlm-num wlm-strong">
                  {e.type === 'politician' ? e.name : displayTicker(e.ticker)}
                </span>
                <span className="wlm-xs wlm-muted wlm-clamp">
                  {e.listLabel}
                  {e.reason ? `: ${e.reason}` : ''}
                </span>
                <span className="wlm-xs wlm-muted wlm-num">{fmtTime(e.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Condition editors                                                   */
/* ------------------------------------------------------------------ */

const toNum = (v) => (v === '' ? null : Number(v));

function NumField({ label, value, onChange, step = 'any', suffix, prefix, min }) {
  return (
    <label className="wlm-field wlm-field--inline">
      <span className="wlm-field__label">{label}</span>
      <span className="wlm-field__affix">
        {prefix ? <span className="wlm-field__fix">{prefix}</span> : null}
        <input
          type="number"
          inputMode="decimal"
          className="wlm-input wlm-num"
          step={step}
          min={min}
          value={value ?? ''}
          onChange={(e) => onChange(toNum(e.target.value))}
        />
        {suffix ? <span className="wlm-field__fix">{suffix}</span> : null}
      </span>
    </label>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="wlm-field wlm-field--inline">
      <span className="wlm-field__label">{label}</span>
      <select className="wlm-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Chips({ label, options, values, onChange }) {
  return (
    <fieldset className="wlm-chips">
      <legend className="wlm-field__label">{label}</legend>
      <div className="wlm-chips__row">
        {options.map((o) => {
          const on = values.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              className={`wlm-chip${on ? ' is-on' : ''}`}
              aria-pressed={on}
              onClick={() => onChange(on ? values.filter((v) => v !== o.id) : [...values, o.id])}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const DAY_OPTIONS = [7, 30, 90, 180, 365].map((d) => ({ id: String(d), label: `Last ${d} days` }));
const PARTY_ANY = [{ id: 'any', label: 'Any party' }, ...PARTIES];

function ConditionEditor({ c, onChange }) {
  const set = (patch) => onChange({ ...c, ...patch });
  switch (c.type) {
    case 'day_change':
      return (
        <>
          <SelectField
            label="Direction"
            value={c.op}
            options={[
              { id: 'gte', label: 'At or above' },
              { id: 'lte', label: 'At or below' },
            ]}
            onChange={(op) => set({ op })}
          />
          <NumField
            label="Change"
            suffix="%"
            value={c.value}
            onChange={(value) => set({ value })}
          />
        </>
      );
    case 'price':
      return (
        <>
          <NumField label="Min" prefix="$" min="0" value={c.min} onChange={(min) => set({ min })} />
          <NumField label="Max" prefix="$" min="0" value={c.max} onChange={(max) => set({ max })} />
        </>
      );
    case 'market_cap':
      return (
        <>
          <NumField
            label="Min"
            prefix="$"
            suffix="B"
            min="0"
            value={c.min}
            onChange={(min) => set({ min })}
          />
          <NumField
            label="Max"
            prefix="$"
            suffix="B"
            min="0"
            value={c.max}
            onChange={(max) => set({ max })}
          />
        </>
      );
    case 'sector':
      return (
        <Chips
          label="Sectors"
          options={STOCK_SECTORS.map((s) => ({ id: s, label: SECTOR_LABELS[s] || s }))}
          values={c.sectors}
          onChange={(sectors) => set({ sectors })}
        />
      );
    case 'congress_traded':
      return (
        <>
          <SelectField
            label="Trade"
            value={c.side}
            options={SIDES}
            onChange={(side) => set({ side })}
          />
          <SelectField
            label="Window"
            value={String(c.days)}
            options={DAY_OPTIONS}
            onChange={(d) => set({ days: Number(d) })}
          />
          <NumField
            label="Members, at least"
            step="1"
            min="1"
            value={c.min_members}
            onChange={(v) => set({ min_members: v })}
          />
          <SelectField
            label="Party"
            value={c.party}
            options={PARTY_ANY}
            onChange={(party) => set({ party })}
          />
          <NumField
            label="Trade size, at least"
            prefix="$"
            min="0"
            step="1000"
            value={c.min_amount}
            onChange={(v) => set({ min_amount: v })}
          />
        </>
      );
    case 'party':
      return (
        <Chips
          label="Party"
          options={PARTIES}
          values={c.parties}
          onChange={(parties) => set({ parties })}
        />
      );
    case 'chamber':
      return (
        <Chips
          label="Chamber"
          options={CHAMBERS}
          values={c.chambers}
          onChange={(chambers) => set({ chambers })}
        />
      );
    case 'state':
      return (
        <label className="wlm-field">
          <span className="wlm-field__label">States (two-letter codes, comma separated)</span>
          <input
            className="wlm-input"
            value={(c.states || []).join(', ')}
            placeholder="CA, TX, NY"
            onChange={(e) =>
              set({
                states: e.target.value
                  .split(/[,\s]+/)
                  .map((s) => s.trim().toUpperCase())
                  .filter(Boolean),
              })
            }
          />
        </label>
      );
    case 'trade_activity':
      return (
        <>
          <SelectField
            label="Trade"
            value={c.side}
            options={SIDES}
            onChange={(side) => set({ side })}
          />
          <NumField
            label="Trades, at least"
            step="1"
            min="1"
            value={c.min_trades}
            onChange={(v) => set({ min_trades: v })}
          />
          <SelectField
            label="Window"
            value={String(c.days)}
            options={DAY_OPTIONS}
            onChange={(d) => set({ days: Number(d) })}
          />
        </>
      );
    case 'traded_ticker':
      return (
        <>
          <label className="wlm-field wlm-field--inline">
            <span className="wlm-field__label">Ticker</span>
            <input
              className="wlm-input wlm-num"
              value={c.ticker || ''}
              maxLength={12}
              onChange={(e) => set({ ticker: e.target.value.toUpperCase() })}
            />
          </label>
          <SelectField
            label="Trade"
            value={c.side}
            options={SIDES}
            onChange={(side) => set({ side })}
          />
          <SelectField
            label="Window"
            value={String(c.days)}
            options={DAY_OPTIONS}
            onChange={(d) => set({ days: Number(d) })}
          />
        </>
      );
    case 'trade_size':
      return (
        <>
          <NumField
            label="At least"
            prefix="$"
            step="1000"
            min="0"
            value={c.min_amount}
            onChange={(v) => set({ min_amount: v })}
          />
          <SelectField
            label="Window"
            value={String(c.days)}
            options={DAY_OPTIONS}
            onChange={(d) => set({ days: Number(d) })}
          />
        </>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Builder dialog                                                      */
/* ------------------------------------------------------------------ */

const TEMPLATES = {
  stock: [
    {
      label: 'Top gainers',
      match: 'all',
      conditions: [
        { type: 'day_change', op: 'gte', value: 5 },
        { type: 'market_cap', min: 2, max: null },
      ],
    },
    {
      label: 'Congress buying',
      match: 'all',
      conditions: [{ ...newCondition('congress_traded'), min_members: 2 }],
    },
    {
      label: 'Tech dip',
      match: 'all',
      conditions: [
        { type: 'sector', sectors: ['Technology'] },
        { type: 'day_change', op: 'lte', value: -3 },
      ],
    },
  ],
  politician: [
    { label: 'Active traders', match: 'all', conditions: [newCondition('trade_activity')] },
    { label: 'Big trades', match: 'all', conditions: [newCondition('trade_size')] },
    { label: 'Bought NVDA', match: 'all', conditions: [newCondition('traded_ticker')] },
  ],
};

function draftFrom(rule) {
  if (!rule) {
    return {
      label: '',
      asset_class: 'stock',
      match: 'all',
      conditions: [newCondition('day_change')],
      max_items: 25,
      notify: true,
    };
  }
  return {
    label: rule.label,
    asset_class: rule.assetClass,
    match: rule.match,
    conditions: rule.conditions,
    max_items: rule.maxItems,
    notify: rule.notify,
  };
}

/**
 * Create or edit a smart watchlist. `rule` (from the card) puts it in edit
 * mode. `onSaved(result)` gets the API response.
 */
export function SmartWatchlistDialog({ open, rule, smart, onClose, onSaved }) {
  const [draft, setDraft] = useState(() => draftFrom(rule));
  const [preview, setPreview] = useState({
    status: 'idle',
    matches: [],
    candidates: 0,
    error: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(draftFrom(rule));
      setPreview({ status: 'idle', matches: [], candidates: 0, error: null });
      setError(null);
      setConfirmDelete(false);
    }
  }, [open, rule]);

  const offered = useMemo(() => conditionsFor(draft.asset_class), [draft.asset_class]);
  const check = useMemo(() => sanitizeRule(draft), [draft]);

  const setClass = (asset_class) => {
    setDraft((d) => ({
      ...d,
      asset_class,
      conditions: [newCondition(conditionsFor(asset_class)[0])],
    }));
    setPreview({ status: 'idle', matches: [], candidates: 0, error: null });
  };
  const setCond = (i, c) =>
    setDraft((d) => ({ ...d, conditions: d.conditions.map((x, j) => (j === i ? c : x)) }));
  const removeCond = (i) =>
    setDraft((d) => ({ ...d, conditions: d.conditions.filter((_, j) => j !== i) }));
  const addCond = (type) =>
    setDraft((d) => ({ ...d, conditions: [...d.conditions, newCondition(type)] }));
  const changeType = (i, type) => setCond(i, newCondition(type));

  const runPreview = async () => {
    if (!check.ok) return;
    setPreview((p) => ({ ...p, status: 'loading', error: null }));
    try {
      const out = await smart.preview(check.rule);
      setPreview({
        status: 'ready',
        matches: out.matches || [],
        candidates: out.candidates || 0,
        error: null,
      });
    } catch (e) {
      setPreview({ status: 'error', matches: [], candidates: 0, error: e.message });
    }
  };

  const save = async () => {
    if (!check.ok) {
      setError(check.error);
      return;
    }
    if (!draft.label.trim()) {
      setError('Give the smart watchlist a name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const out = rule
        ? await smart.update(rule.id, {
            label: draft.label.trim(),
            rule: { ...check.rule, enabled: rule.enabled },
          })
        : await smart.create(draft.label.trim(), check.rule);
      onSaved(out, !rule);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await smart.remove(rule.id);
      onSaved({ removed: true }, false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const templates = TEMPLATES[draft.asset_class] || [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="640px"
      title={rule ? 'Edit smart watchlist' : 'New smart watchlist'}
      footer={
        <div className="wlm-dialog-foot">
          {rule ? (
            confirmDelete ? (
              <span className="wlm-dialog-foot__confirm">
                <span className="wlm-xs">Keep the list, stop auto-adding?</span>
                <button
                  type="button"
                  className="wlm-btn wlm-btn--sm wlm-btn--danger"
                  disabled={saving}
                  onClick={remove}
                >
                  Turn off
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="wlm-btn wlm-btn--ghost wlm-btn--sm"
                onClick={() => setConfirmDelete(true)}
              >
                Make it a regular list
              </button>
            )
          ) : (
            <span />
          )}
          <span className="wlm-dialog-foot__right">
            <button type="button" className="wlm-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="wlm-btn wlm-btn--accent"
              disabled={saving || !check.ok}
              onClick={save}
            >
              {saving ? 'Saving…' : rule ? 'Save changes' : 'Create and run'}
            </button>
          </span>
        </div>
      }
    >
      <div className="wlm-builder">
        <label className="wlm-field">
          <span className="wlm-field__label">Name</span>
          <input
            className="wlm-input"
            maxLength={80}
            value={draft.label}
            placeholder="e.g. Momentum tech"
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
          />
        </label>

        <fieldset className="wlm-chips">
          <legend className="wlm-field__label">Add</legend>
          <div className="wlm-chips__row">
            {ASSET_CLASSES.map((c) => (
              <button
                key={c.type}
                type="button"
                className={`wlm-chip${draft.asset_class === c.type ? ' is-on' : ''}`}
                aria-pressed={draft.asset_class === c.type}
                disabled={!!rule && draft.asset_class !== c.type}
                onClick={() => setClass(c.type)}
              >
                <i className={`bi ${c.icon}`} aria-hidden="true" /> {c.label}
              </button>
            ))}
          </div>
          {rule ? (
            <span className="wlm-xs wlm-muted">
              The asset class is fixed once a smart watchlist exists.
            </span>
          ) : null}
        </fieldset>

        {!rule && templates.length ? (
          <div className="wlm-builder__templates">
            <span className="wlm-xs wlm-muted">Start from</span>
            {templates.map((t) => (
              <button
                key={t.label}
                type="button"
                className="wlm-chip wlm-chip--ghost"
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    match: t.match,
                    conditions: t.conditions,
                    label: d.label || t.label,
                  }))
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="wlm-builder__match">
          <span className="wlm-sm">Add when</span>
          <select
            className="wlm-input wlm-input--sm"
            value={draft.match}
            aria-label="Match mode"
            onChange={(e) => setDraft((d) => ({ ...d, match: e.target.value }))}
          >
            <option value="all">all conditions match</option>
            <option value="any">any condition matches</option>
          </select>
        </div>

        <ol className="wlm-builder__conds">
          {draft.conditions.map((c, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <li key={i} className="wlm-cond">
              <div className="wlm-cond__head">
                <select
                  className="wlm-input wlm-input--sm"
                  aria-label={`Condition ${i + 1}`}
                  value={c.type}
                  onChange={(e) => changeType(i, e.target.value)}
                >
                  {offered.map((t) => (
                    <option key={t} value={t}>
                      {CONDITIONS[t].label}
                    </option>
                  ))}
                </select>
                <span className="wlm-xs wlm-muted wlm-cond__desc">{describeCondition(c)}</span>
                <button
                  type="button"
                  className="wlm-icon-btn"
                  aria-label={`Remove condition ${i + 1}`}
                  disabled={draft.conditions.length <= 1}
                  onClick={() => removeCond(i)}
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </div>
              <div className="wlm-cond__body">
                <ConditionEditor c={c} onChange={(next) => setCond(i, next)} />
              </div>
            </li>
          ))}
        </ol>

        {draft.conditions.length < MAX_CONDITIONS ? (
          <div className="wlm-builder__add">
            <select
              className="wlm-input wlm-input--sm"
              aria-label="Add a condition"
              value=""
              onChange={(e) => e.target.value && addCond(e.target.value)}
            >
              <option value="">+ Add condition</option>
              {offered.map((t) => (
                <option key={t} value={t}>
                  {CONDITIONS[t].label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="wlm-builder__opts">
          <NumField
            label="Keep at most"
            step="1"
            min="1"
            suffix="items"
            value={draft.max_items}
            onChange={(v) =>
              setDraft((d) => ({ ...d, max_items: Math.min(MAX_ITEMS_CAP, Math.max(1, v || 1)) }))
            }
          />
          <label className="wlm-check">
            <input
              type="checkbox"
              checked={draft.notify}
              onChange={(e) => setDraft((d) => ({ ...d, notify: e.target.checked }))}
            />
            <span className="wlm-sm">Notify me when something is added</span>
          </label>
        </div>

        <div className="wlm-builder__preview">
          <div className="wlm-builder__preview-head">
            <span className="wlm-sm wlm-strong">Preview</span>
            <button
              type="button"
              className="wlm-btn wlm-btn--sm"
              disabled={!check.ok || preview.status === 'loading'}
              onClick={runPreview}
            >
              {preview.status === 'loading' ? 'Checking…' : 'See what matches now'}
            </button>
          </div>
          {!check.ok ? (
            <p className="wlm-xs wlm-tone is-down" role="alert">
              {check.error}
            </p>
          ) : preview.status === 'error' ? (
            <p className="wlm-xs wlm-tone is-down" role="alert">
              {preview.error}
            </p>
          ) : preview.status === 'ready' ? (
            preview.matches.length === 0 ? (
              <p className="wlm-xs wlm-muted">
                Nothing matches right now ({preview.candidates} checked). The list fills as
                conditions are met.
              </p>
            ) : (
              <ul className="wlm-builder__matches">
                {preview.matches.map((m) => (
                  <li key={`${m.type}:${m.ticker}`}>
                    <span className="wlm-num wlm-strong">
                      {m.type === 'politician' ? m.name : m.display}
                    </span>
                    {m.price != null ? (
                      <span className="wlm-num wlm-xs">{fmtUSD(m.price)}</span>
                    ) : null}
                    {m.changePct != null ? (
                      <span className={`wlm-num wlm-xs wlm-tone is-${signOf(m.changePct)}`}>
                        {fmtSignedPct(m.changePct)}
                      </span>
                    ) : null}
                    <span className="wlm-xs wlm-muted wlm-clamp">{m.reason}</span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="wlm-xs wlm-muted">
              Up to 10 new matches are added per run. Runs happen hourly.
            </p>
          )}
        </div>

        {error ? (
          <p className="wlm-sm wlm-tone is-down" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
