'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CONDITIONS,
  MAX_UNIVERSE,
  UNSUPPORTED_CONDITIONS,
  cleanTicker,
  explainSpec,
  validateSpec,
} from '@/lib/quants/strategy-spec';
import { LAB_TEMPLATES } from './lab-templates';
import { BacktestReport } from './BacktestReport';
import { ValidationPanel } from './ValidationPanel';
import { toApiConfig } from './lab-format';

const UNSUPPORTED_LABELS = {
  congress_buy: 'Congress member buys',
  congress_sell: 'Congress member sells',
  insider_purchase: 'Insider purchase',
  hedge_fund_new_position: 'Hedge fund opens a position',
  fed_rate_change: 'Fed rate change',
  cpi_surprise: 'CPI surprise',
  yield_curve_inversion: 'Yield curve inversion',
};

const CONDITION_GROUPS = Object.entries(CONDITIONS).reduce((acc, [id, def]) => {
  (acc[def.group] = acc[def.group] || []).push({ id, label: def.label });
  return acc;
}, {});

const PARAM_LABELS = {
  period: 'Period',
  fast: 'Fast',
  slow: 'Slow',
  threshold: 'Level',
  band: 'Band',
  multiple: 'Multiple',
  window: 'Window',
  withinDays: 'Within days',
};

const isoDaysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

const defaultParams = (id) =>
  Object.fromEntries(Object.entries(CONDITIONS[id].params).map(([k, p]) => [k, p.def]));

const newCondition = (id = 'price_above_sma') => ({ id, params: defaultParams(id) });

const EMPTY_DRAFT = {
  id: null,
  name: '',
  tickers: 'SPY',
  benchmark: 'SPY',
  side: 'long',
  entryMode: 'and',
  entry: [newCondition('sma_cross_up')],
  exit: [newCondition('sma_cross_down')],
  stopLossPct: '',
  trailingStopPct: '',
  takeProfitPct: '',
  maxHoldDays: '',
  sizingType: 'equal_weight',
  sizingPct: 10,
  maxPositions: 1,
};

/** Flatten a stored rule node into the builder's condition rows. */
function nodeToRows(node) {
  if (!node) return { mode: 'and', rows: [] };
  if (node.op === 'cond') return { mode: 'and', rows: [{ id: node.id, params: node.params }] };
  if (node.op === 'and' || node.op === 'or') {
    const rows = (node.args || [])
      .filter((a) => a.op === 'cond' && CONDITIONS[a.id])
      .map((a) => ({ id: a.id, params: { ...defaultParams(a.id), ...a.params } }));
    return { mode: node.op, rows };
  }
  return { mode: 'and', rows: [] };
}

function specToDraft(spec, base = {}) {
  const entry = nodeToRows(spec.entry);
  const exit = nodeToRows(spec.exit?.rule);
  return {
    ...EMPTY_DRAFT,
    ...base,
    tickers: (spec.universe || []).join(', '),
    benchmark: spec.benchmark || 'SPY',
    side: spec.side === 'short' ? 'short' : 'long',
    entryMode: entry.mode,
    entry: entry.rows,
    exit: exit.rows,
    stopLossPct: spec.exit?.stopLossPct ?? '',
    trailingStopPct: spec.exit?.trailingStopPct ?? '',
    takeProfitPct: spec.exit?.takeProfitPct ?? '',
    maxHoldDays: spec.exit?.maxHoldDays ?? '',
    sizingType: spec.sizing?.type === 'pct_equity' ? 'pct_equity' : 'equal_weight',
    sizingPct: spec.sizing?.pct ?? 10,
    maxPositions: spec.sizing?.maxPositions ?? 1,
  };
}

function draftToSpec(d) {
  const universe = [
    ...new Set(
      String(d.tickers || '')
        .split(/[\s,]+/)
        .map(cleanTicker)
        .filter(Boolean),
    ),
  ];
  const toNode = (r) => ({ op: 'cond', id: r.id, params: r.params });
  const exit = {};
  if (d.exit.length) exit.rule = { op: 'or', args: d.exit.map(toNode) };
  for (const k of ['stopLossPct', 'trailingStopPct', 'takeProfitPct', 'maxHoldDays']) {
    if (d[k] !== '' && d[k] !== null && Number(d[k]) > 0) exit[k] = Number(d[k]);
  }
  const sizing = { type: d.sizingType, maxPositions: Number(d.maxPositions) || 1 };
  if (d.sizingType === 'pct_equity') sizing.pct = Number(d.sizingPct) || 5;
  return {
    universe,
    benchmark: cleanTicker(d.benchmark) || 'SPY',
    side: d.side,
    entry: { op: d.entryMode, args: d.entry.map(toNode) },
    exit,
    sizing,
  };
}

async function api(path, options) {
  const res = await fetch(path, {
    ...options,
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error || 'Something went wrong. Try again.');
    err.details = Array.isArray(json?.details) ? json.details : [];
    throw err;
  }
  return json;
}

function ConditionRows({ rows, onChange, idPrefix, emptyLabel }) {
  const update = (i, next) => onChange(rows.map((r, k) => (k === i ? next : r)));
  return (
    <div className="ql-conds">
      {rows.length === 0 && <p className="ql-hint">{emptyLabel}</p>}
      {rows.map((row, i) => (
        <div key={`${idPrefix}-${i}`} className="ql-cond">
          <select
            className="ql-input"
            aria-label="Condition"
            value={row.id}
            onChange={(e) => update(i, newCondition(e.target.value))}
          >
            {Object.entries(CONDITION_GROUPS).map(([group, items]) => (
              <optgroup key={group} label={group}>
                {items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {Object.entries(CONDITIONS[row.id].params).map(([key, p]) => (
            <label key={key} className="ql-param">
              <span>{PARAM_LABELS[key] || key}</span>
              {p.kind === 'enum' ? (
                <select
                  className="ql-input"
                  value={row.params[key]}
                  onChange={(e) =>
                    update(i, { ...row, params: { ...row.params, [key]: e.target.value } })
                  }
                >
                  {p.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="ql-input ql-input--num"
                  type="number"
                  min={p.min}
                  max={p.max}
                  step={p.kind === 'int' ? 1 : 'any'}
                  value={row.params[key]}
                  onChange={(e) =>
                    update(i, {
                      ...row,
                      params: {
                        ...row.params,
                        [key]: e.target.value === '' ? '' : Number(e.target.value),
                      },
                    })
                  }
                />
              )}
            </label>
          ))}
          <button
            type="button"
            className="ql-icon-btn"
            aria-label="Remove condition"
            onClick={() => onChange(rows.filter((_, k) => k !== i))}
          >
            <i className="bi bi-x-lg" aria-hidden />
          </button>
        </div>
      ))}
      <button type="button" className="ql-link" onClick={() => onChange([...rows, newCondition()])}>
        <i className="bi bi-plus-lg" aria-hidden /> Add condition
      </button>
    </div>
  );
}

function NumField({ label, value, onChange, suffix, ...rest }) {
  return (
    <label className="ql-field">
      <span className="ql-label">{label}</span>
      <span className="ql-field-row">
        <input
          className="ql-input ql-input--num"
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...rest}
        />
        {suffix && <span className="ql-suffix">{suffix}</span>}
      </span>
    </label>
  );
}

/**
 * @param {'full'|'build'} [mode]  'build' shows the strategy builder only:
 *        run history, the report and validation live in the Backtesting
 *        workspace.
 * @param {string|null} [initialStrategyId]  open this saved strategy on load
 * @param {(run: object, strategyId: string) => void} [onRunComplete]  called
 *        after a successful backtest, instead of showing the report here
 */
export function QuantLabWorkbench({ mode = 'full', initialStrategyId = null, onRunComplete }) {
  const buildOnly = mode === 'build';
  const openedInitial = useRef(false);
  const [strategies, setStrategies] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // loading | ready | error
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [config, setConfig] = useState(() => ({
    startDate: isoDaysAgo(365 * 5),
    endDate: isoDaysAgo(1),
    initialCapital: 100000,
    slippageBps: 5,
    commissionPerShare: 0.005,
    riskFreeRate: 0,
  }));
  const [busy, setBusy] = useState(''); // '' | 'save' | 'run'
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [run, setRun] = useState(null);
  const [runs, setRuns] = useState([]);
  const [savedHash, setSavedHash] = useState('');

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const spec = useMemo(() => draftToSpec(draft), [draft]);
  const checked = useMemo(() => validateSpec(spec), [spec]);
  const explanation = useMemo(() => (checked.ok ? explainSpec(checked.spec) : []), [checked]);
  const draftHash = useMemo(() => JSON.stringify([draft.name.trim(), spec]), [draft.name, spec]);
  const dirty = draftHash !== savedHash;

  const loadStrategies = useCallback(async () => {
    try {
      const json = await api('/api/quants/strategies');
      setStrategies(json.strategies || []);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    loadStrategies();
  }, [loadStrategies]);

  const loadRuns = useCallback(async (strategyId) => {
    try {
      const json = await api(`/api/quants/backtests?strategyId=${strategyId}`);
      setRuns(json.runs || []);
    } catch {
      setRuns([]);
    }
  }, []);

  const openStrategy = (s) => {
    const next = specToDraft(s.version?.spec || {}, { id: s.id, name: s.name });
    setDraft(next);
    setSavedHash(JSON.stringify([next.name.trim(), draftToSpec(next)]));
    setRun(null);
    setError(null);
    setNotice('');
    loadRuns(s.id);
  };

  /* Open the strategy named in the link that brought the user here, once. */
  useEffect(() => {
    if (openedInitial.current || !initialStrategyId || loadState !== 'ready') return;
    openedInitial.current = true;
    const match = strategies.find((s) => s.id === initialStrategyId);
    if (match) openStrategy(match);
    // openStrategy only sets state; listing it would re-run this on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStrategyId, loadState, strategies]);

  const startNew = (template) => {
    const next = template
      ? specToDraft(template.spec, { id: null, name: template.name })
      : { ...EMPTY_DRAFT };
    setDraft(next);
    setSavedHash('');
    setRun(null);
    setRuns([]);
    setError(null);
    setNotice('');
  };

  /** Saves the draft and returns the strategy id (null when it failed). */
  const save = async () => {
    setError(null);
    setNotice('');
    if (!draft.name.trim()) {
      setError({ message: 'Give the strategy a name before saving.', details: [] });
      return null;
    }
    if (!checked.ok) {
      setError({ message: 'Fix the strategy definition first.', details: checked.errors });
      return null;
    }
    setBusy('save');
    try {
      const body = JSON.stringify({ name: draft.name.trim(), spec: checked.spec });
      const json = draft.id
        ? await api(`/api/quants/strategies/${draft.id}`, { method: 'PATCH', body })
        : await api('/api/quants/strategies', { method: 'POST', body });
      const id = json.strategy.id;
      setDraft((d) => ({ ...d, id }));
      setSavedHash(draftHash);
      const v = json.version?.version ?? json.strategy.version?.version;
      setNotice(v ? `Saved as version ${v}.` : 'Saved.');
      loadStrategies();
      return id;
    } catch (err) {
      setError({ message: err.message, details: err.details || [] });
      return null;
    } finally {
      setBusy('');
    }
  };

  const runBacktest = async () => {
    const id = dirty || !draft.id ? await save() : draft.id;
    if (!id) return;
    setBusy('run');
    setError(null);
    try {
      const json = await api('/api/quants/backtests', {
        method: 'POST',
        body: JSON.stringify({
          strategyId: id,
          config: toApiConfig(config),
        }),
      });
      if (onRunComplete) {
        onRunComplete(json.run, id);
        return;
      }
      setRun(json.run);
      setNotice('');
      loadRuns(id);
      loadStrategies();
    } catch (err) {
      setError({ message: err.message, details: err.details || [] });
    } finally {
      setBusy('');
    }
  };

  const openRun = async (id) => {
    setError(null);
    try {
      const json = await api(`/api/quants/backtests/${id}`);
      setRun(json.run);
    } catch (err) {
      setError({ message: err.message, details: [] });
    }
  };

  const remove = async () => {
    if (!draft.id) return;
    setBusy('save');
    try {
      await api(`/api/quants/strategies/${draft.id}`, { method: 'DELETE' });
      startNew();
      loadStrategies();
    } catch (err) {
      setError({ message: err.message, details: [] });
    } finally {
      setBusy('');
    }
  };

  const tickerCount = spec.universe.length;

  return (
    <section className="ql-root" aria-label="Strategy lab and backtesting">
      <div className="ql-grid">
        {/* ── Left: saved strategies and starters ── */}
        <aside className="ql-rail">
          <div className="ql-rail-head">
            <h3 className="ql-eyebrow">My strategies</h3>
            <button type="button" className="ql-link" onClick={() => startNew()}>
              <i className="bi bi-plus-lg" aria-hidden /> New
            </button>
          </div>
          {loadState === 'loading' && <p className="ql-hint">Loading your strategies.</p>}
          {loadState === 'error' && (
            <p className="ql-hint">
              Your strategies could not be loaded.{' '}
              <button type="button" className="ql-link" onClick={loadStrategies}>
                Retry
              </button>
            </p>
          )}
          {loadState === 'ready' && strategies.length === 0 && (
            <p className="ql-hint">
              Nothing saved yet. Build a strategy on the right, or start from a template below.
            </p>
          )}
          <ul className="ql-list">
            {strategies.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={`ql-list-item${draft.id === s.id ? ' is-active' : ''}`}
                  onClick={() => openStrategy(s)}
                >
                  <span className="ql-list-name">{s.name}</span>
                  <span className="ql-list-meta">
                    v{s.latest_version}
                    {s.latestRun?.status === 'completed' &&
                    typeof s.latestRun.metrics?.totalReturn === 'number'
                      ? ` · last test ${(s.latestRun.metrics.totalReturn * 100).toFixed(1)}%`
                      : ' · not tested yet'}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <h3 className="ql-eyebrow ql-eyebrow--spaced">Start from a template</h3>
          <ul className="ql-list">
            {LAB_TEMPLATES.map((t) => (
              <li key={t.id}>
                <button type="button" className="ql-list-item" onClick={() => startNew(t)}>
                  <span className="ql-list-name">{t.name}</span>
                  <span className="ql-list-meta">{t.summary}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="ql-hint">
            Templates are rule sets only. They carry no performance figures until you test them.
          </p>
        </aside>

        {/* ── Right: builder ── */}
        <div className="ql-builder">
          <div className="ql-row">
            <label className="ql-field ql-field--grow">
              <span className="ql-label">Strategy name</span>
              <input
                className="ql-input"
                type="text"
                maxLength={80}
                value={draft.name}
                placeholder="Name this strategy"
                onChange={(e) => set({ name: e.target.value })}
              />
            </label>
            <label className="ql-field">
              <span className="ql-label">Direction</span>
              <select
                className="ql-input"
                value={draft.side}
                onChange={(e) => set({ side: e.target.value })}
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </label>
          </div>

          <div className="ql-row">
            <label className="ql-field ql-field--grow">
              <span className="ql-label">
                Universe ({tickerCount} of {MAX_UNIVERSE} tickers)
              </span>
              <input
                className="ql-input"
                type="text"
                value={draft.tickers}
                placeholder="AAPL, MSFT, NVDA"
                onChange={(e) => set({ tickers: e.target.value.toUpperCase() })}
              />
            </label>
            <label className="ql-field">
              <span className="ql-label">Benchmark</span>
              <input
                className="ql-input ql-input--short"
                type="text"
                maxLength={10}
                value={draft.benchmark}
                onChange={(e) => set({ benchmark: e.target.value.toUpperCase() })}
              />
            </label>
          </div>

          <fieldset className="ql-block">
            <legend className="ql-eyebrow">Entry rules</legend>
            <div className="ql-seg" role="group" aria-label="How entry conditions combine">
              {[
                ['and', 'All must be true'],
                ['or', 'Any can be true'],
              ].map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  className={`ql-seg-btn${draft.entryMode === v ? ' is-active' : ''}`}
                  aria-pressed={draft.entryMode === v}
                  onClick={() => set({ entryMode: v })}
                >
                  {label}
                </button>
              ))}
            </div>
            <ConditionRows
              idPrefix="entry"
              rows={draft.entry}
              onChange={(entry) => set({ entry })}
              emptyLabel="Add at least one entry condition."
            />
          </fieldset>

          <fieldset className="ql-block">
            <legend className="ql-eyebrow">Exit rules</legend>
            <p className="ql-hint">A position closes when any exit condition or stop is hit.</p>
            <ConditionRows
              idPrefix="exit"
              rows={draft.exit}
              onChange={(exit) => set({ exit })}
              emptyLabel="No rule-based exit. Add one, or rely on the stops below."
            />
            <div className="ql-row ql-row--tight">
              <NumField
                label="Stop loss"
                suffix="%"
                min={0}
                max={90}
                step="any"
                value={draft.stopLossPct}
                onChange={(v) => set({ stopLossPct: v })}
              />
              <NumField
                label="Trailing stop"
                suffix="%"
                min={0}
                max={90}
                step="any"
                value={draft.trailingStopPct}
                onChange={(v) => set({ trailingStopPct: v })}
              />
              <NumField
                label="Take profit"
                suffix="%"
                min={0}
                max={1000}
                step="any"
                value={draft.takeProfitPct}
                onChange={(v) => set({ takeProfitPct: v })}
              />
              <NumField
                label="Max hold"
                suffix="days"
                min={0}
                max={3650}
                step={1}
                value={draft.maxHoldDays}
                onChange={(v) => set({ maxHoldDays: v })}
              />
            </div>
          </fieldset>

          <fieldset className="ql-block">
            <legend className="ql-eyebrow">Position sizing</legend>
            <div className="ql-row ql-row--tight">
              <label className="ql-field">
                <span className="ql-label">Method</span>
                <select
                  className="ql-input"
                  value={draft.sizingType}
                  onChange={(e) => set({ sizingType: e.target.value })}
                >
                  <option value="equal_weight">Equal weight</option>
                  <option value="pct_equity">Percent of equity</option>
                </select>
              </label>
              {draft.sizingType === 'pct_equity' && (
                <NumField
                  label="Per position"
                  suffix="%"
                  min={0.1}
                  max={100}
                  step="any"
                  value={draft.sizingPct}
                  onChange={(v) => set({ sizingPct: v })}
                />
              )}
              <NumField
                label="Max positions"
                min={1}
                max={MAX_UNIVERSE}
                step={1}
                value={draft.maxPositions}
                onChange={(v) => set({ maxPositions: v })}
              />
            </div>
          </fieldset>

          <details className="ql-details">
            <summary>Signals that cannot be backtested yet</summary>
            <ul className="ql-plain">
              {Object.entries(UNSUPPORTED_CONDITIONS).map(([id, reason]) => (
                <li key={id}>
                  <strong>{UNSUPPORTED_LABELS[id] || id}.</strong> {reason}
                </li>
              ))}
            </ul>
            <p className="ql-hint">
              Congress and insider disclosures are available under Disclosures: they use the date a
              trade was made public, never the date it happened. The signals listed here stay
              switched off until the same kind of public date is on record for them.
            </p>
          </details>

          {explanation.length > 0 && (
            <div className="ql-explain">
              <h4 className="ql-eyebrow">What this strategy does</h4>
              <ul className="ql-plain">
                {explanation.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          <fieldset className="ql-block">
            <legend className="ql-eyebrow">Backtest settings</legend>
            <div className="ql-row ql-row--tight">
              <label className="ql-field">
                <span className="ql-label">Start</span>
                <input
                  className="ql-input"
                  type="date"
                  value={config.startDate}
                  onChange={(e) => setConfig((c) => ({ ...c, startDate: e.target.value }))}
                />
              </label>
              <label className="ql-field">
                <span className="ql-label">End</span>
                <input
                  className="ql-input"
                  type="date"
                  value={config.endDate}
                  onChange={(e) => setConfig((c) => ({ ...c, endDate: e.target.value }))}
                />
              </label>
              <NumField
                label="Starting capital"
                suffix="USD"
                min={1000}
                step={1000}
                value={config.initialCapital}
                onChange={(v) => setConfig((c) => ({ ...c, initialCapital: v }))}
              />
              <NumField
                label="Slippage"
                suffix="bps"
                min={0}
                max={200}
                step="any"
                value={config.slippageBps}
                onChange={(v) => setConfig((c) => ({ ...c, slippageBps: v }))}
              />
              <NumField
                label="Commission"
                suffix="USD/share"
                min={0}
                max={1}
                step="any"
                value={config.commissionPerShare}
                onChange={(v) => setConfig((c) => ({ ...c, commissionPerShare: v }))}
              />
              <NumField
                label="Risk-free rate"
                suffix="%"
                min={0}
                max={20}
                step="any"
                value={config.riskFreeRate}
                onChange={(v) => setConfig((c) => ({ ...c, riskFreeRate: v }))}
              />
            </div>
          </fieldset>

          {!checked.ok && draft.entry.length > 0 && (
            <ul className="ql-errors" role="status">
              {checked.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {error && (
            <div className="ql-errors" role="alert">
              <p>{error.message}</p>
              {error.details?.length > 0 && (
                <ul>
                  {error.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="ql-actions">
            <button
              type="button"
              className="ql-btn ql-btn--primary"
              disabled={!!busy || !checked.ok}
              onClick={runBacktest}
            >
              <i className="bi bi-play-fill" aria-hidden />
              {busy === 'run'
                ? 'Running backtest'
                : dirty
                  ? 'Save and run backtest'
                  : 'Run backtest'}
            </button>
            <button type="button" className="ql-btn" disabled={!!busy || !dirty} onClick={save}>
              {busy === 'save' ? 'Saving' : draft.id ? 'Save new version' : 'Save strategy'}
            </button>
            {draft.id && (
              <button
                type="button"
                className="ql-btn ql-btn--quiet"
                disabled={!!busy}
                onClick={remove}
              >
                Delete
              </button>
            )}
            <button
              type="button"
              className="ql-btn ql-btn--quiet"
              disabled
              title="Paper trading opens once out-of-sample validation is available"
            >
              <i className="bi bi-lock" aria-hidden /> Paper trade
            </button>
            {notice && (
              <span className="ql-notice" role="status">
                {notice}
              </span>
            )}
          </div>
        </div>
      </div>

      {!buildOnly && runs.length > 0 && (
        <div className="ql-history">
          <h3 className="ql-eyebrow">Run history</h3>
          <div className="ql-table-wrap">
            <table className="ql-table">
              <thead>
                <tr>
                  <th scope="col">Run</th>
                  <th scope="col">Window</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="ql-num">
                    Return
                  </th>
                  <th scope="col" className="ql-num">
                    Sharpe
                  </th>
                  <th scope="col" className="ql-num">
                    Max drawdown
                  </th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className={run?.id === r.id ? 'is-active' : ''}>
                    <td>{String(r.created_at).slice(0, 16).replace('T', ' ')}</td>
                    <td>
                      {r.config?.startDate} to {r.config?.endDate}
                    </td>
                    <td>{r.status}</td>
                    <td className="ql-num">
                      {typeof r.metrics?.totalReturn === 'number'
                        ? `${(r.metrics.totalReturn * 100).toFixed(2)}%`
                        : 'n/a'}
                    </td>
                    <td className="ql-num">
                      {typeof r.metrics?.sharpe === 'number' ? r.metrics.sharpe.toFixed(2) : 'n/a'}
                    </td>
                    <td className="ql-num">
                      {typeof r.metrics?.maxDrawdown === 'number'
                        ? `${(r.metrics.maxDrawdown * 100).toFixed(2)}%`
                        : 'n/a'}
                    </td>
                    <td>
                      {r.status === 'completed' ? (
                        <button type="button" className="ql-link" onClick={() => openRun(r.id)}>
                          Open
                        </button>
                      ) : (
                        <span className="ql-hint">{r.error || ''}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {buildOnly ? null : run ? (
        <BacktestReport run={run} />
      ) : (
        <div className="ql-empty">
          <i className="bi bi-graph-up" aria-hidden />
          <p>
            No backtest open. Results appear here after a run: equity curve against the benchmark,
            drawdowns, monthly returns, every trade, and the assumptions behind the numbers.
          </p>
        </div>
      )}

      {!buildOnly && (
        <ValidationPanel
          strategyId={draft.id}
          dirty={dirty}
          spec={checked.ok && !checked.unsupported.length ? checked.spec : null}
          config={config}
        />
      )}

      <p className="ql-disclaimer">
        For educational and informational purposes only. Not financial advice. Past performance does
        not guarantee future results.
      </p>
    </section>
  );
}

export default QuantLabWorkbench;
