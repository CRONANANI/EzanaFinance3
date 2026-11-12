'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MAX_AXES,
  MAX_COMBOS,
  MAX_FOLDS,
  MIN_FOLDS,
  OBJECTIVES,
  tunableParams,
} from '@/lib/quants/validation';
import { fmtRatio, fmtSignedPct, parseValues, suggestValues, toApiConfig } from './lab-format';
import { ValidationReport } from './ValidationReport';

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

/**
 * Validation for one saved strategy: the settings form, past reports and the
 * open report.
 *
 * @param {string|null} strategyId  null until the strategy is saved
 * @param {boolean} dirty           the builder has unsaved changes
 * @param {object|null} spec        the validated spec currently in the builder
 * @param {object} config           the workbench run settings (form shape)
 */
export function ValidationPanel({ strategyId, dirty, spec, config }) {
  const [splitPct, setSplitPct] = useState(70);
  const [folds, setFolds] = useState(4);
  const [mode, setMode] = useState('rolling');
  const [objective, setObjective] = useState('sharpe');
  const [axes, setAxes] = useState([]); // [{ path, text }]
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [open, setOpen] = useState(null);

  const params = useMemo(() => (spec ? tunableParams(spec) : []), [spec]);
  const byPath = useMemo(() => new Map(params.map((p) => [p.path, p])), [params]);

  /* A parameter that no longer exists on the strategy leaves the sweep. */
  useEffect(() => {
    setAxes((list) => list.filter((a) => byPath.has(a.path)));
  }, [byPath]);

  const loadHistory = useCallback(async (id) => {
    try {
      const json = await api(`/api/quants/validations?strategyId=${id}`);
      setHistory(json.validations || []);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    setOpen(null);
    setError(null);
    if (strategyId) loadHistory(strategyId);
    else setHistory([]);
  }, [strategyId, loadHistory]);

  const combos = axes.reduce((acc, a) => acc * Math.max(parseValues(a.text).length, 1), 1);
  const canAddAxis =
    axes.length < MAX_AXES && params.some((p) => !axes.some((a) => a.path === p.path));

  const addAxis = () => {
    const next = params.find((p) => !axes.some((a) => a.path === p.path));
    if (next)
      setAxes((list) => [...list, { path: next.path, text: suggestValues(next).join(', ') }]);
  };
  const setAxis = (i, patch) =>
    setAxes((list) => list.map((a, k) => (k === i ? { ...a, ...patch } : a)));

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const json = await api('/api/quants/validations', {
        method: 'POST',
        body: JSON.stringify({
          strategyId,
          config: toApiConfig(config),
          options: {
            splitPct,
            folds,
            mode,
            objective,
            axes: axes.map((a) => ({ path: a.path, values: parseValues(a.text) })),
          },
        }),
      });
      setOpen(json.validation);
      loadHistory(strategyId);
    } catch (err) {
      setError({ message: err.message, details: err.details || [] });
    } finally {
      setBusy(false);
    }
  };

  const openReport = async (id) => {
    setError(null);
    try {
      const json = await api(`/api/quants/validations/${id}`);
      setOpen(json.validation);
    } catch (err) {
      setError({ message: err.message, details: [] });
    }
  };

  const blocked = !strategyId
    ? 'Save the strategy to validate it.'
    : dirty
      ? 'Save your changes first. A validation always runs on a saved version.'
      : !spec
        ? 'Fix the strategy definition first.'
        : '';

  return (
    <div className="ql-history">
      <div className="ql-section-head">
        <h3 className="ql-eyebrow">Validation</h3>
      </div>
      <p className="ql-hint">
        A backtest shows what would have happened. Validation asks whether to believe it: the same
        strategy is scored on data it was not tuned to, with higher costs, and across separate
        periods. It uses the dates and costs from the backtest settings.
      </p>

      <div className="ql-row ql-row--tight">
        <label className="ql-field">
          <span className="ql-label">In-sample share</span>
          <select
            className="ql-input"
            value={splitPct}
            onChange={(e) => setSplitPct(Number(e.target.value))}
          >
            {[50, 60, 70, 80].map((v) => (
              <option key={v} value={v}>
                {v}% in sample, {100 - v}% held out
              </option>
            ))}
          </select>
        </label>
        <label className="ql-field">
          <span className="ql-label">Walk-forward folds</span>
          <select
            className="ql-input"
            value={folds}
            onChange={(e) => setFolds(Number(e.target.value))}
          >
            {Array.from({ length: MAX_FOLDS - MIN_FOLDS + 1 }, (_, i) => i + MIN_FOLDS).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="ql-field">
          <span className="ql-label">Training window</span>
          <select className="ql-input" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="rolling">Rolling (fixed length)</option>
            <option value="anchored">Anchored (grows from the start)</option>
          </select>
        </label>
        <label className="ql-field">
          <span className="ql-label">Select parameters by</span>
          <select
            className="ql-input"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          >
            {Object.entries(OBJECTIVES).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="ql-block ql-block--inner">
        <legend className="ql-eyebrow">Parameters to test (optional)</legend>
        <p className="ql-hint">
          Leave this empty to validate the strategy as saved. Add a parameter to try several values:
          each is fitted on the training data and judged on later data. The more you try, the more
          likely the best one is luck, and the report says by how much.
        </p>
        {axes.map((axis, i) => {
          const def = byPath.get(axis.path);
          return (
            <div key={axis.path} className="ql-cond">
              <select
                className="ql-input"
                aria-label="Parameter"
                value={axis.path}
                onChange={(e) => {
                  const next = byPath.get(e.target.value);
                  setAxis(i, { path: next.path, text: suggestValues(next).join(', ') });
                }}
              >
                {params
                  .filter((p) => p.path === axis.path || !axes.some((a) => a.path === p.path))
                  .map((p) => (
                    <option key={p.path} value={p.path}>
                      {p.label} (now {p.current})
                    </option>
                  ))}
              </select>
              <label className="ql-param ql-param--wide">
                <span>
                  Values, {def?.min} to {def?.max}
                </span>
                <input
                  className="ql-input"
                  type="text"
                  inputMode="decimal"
                  value={axis.text}
                  onChange={(e) => setAxis(i, { text: e.target.value })}
                />
              </label>
              <button
                type="button"
                className="ql-icon-btn"
                aria-label="Remove parameter"
                onClick={() => setAxes((list) => list.filter((_, k) => k !== i))}
              >
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>
          );
        })}
        <div className="ql-row ql-row--tight">
          {canAddAxis && (
            <button type="button" className="ql-link" onClick={addAxis}>
              <i className="bi bi-plus-lg" aria-hidden /> Add a parameter
            </button>
          )}
          {axes.length > 0 && (
            <span className={`ql-hint${combos > MAX_COMBOS ? ' negative' : ''}`}>
              {combos} combinations (limit {MAX_COMBOS})
            </span>
          )}
        </div>
      </fieldset>

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

      <div className="ql-actions ql-actions--plain">
        <button
          type="button"
          className="ql-btn ql-btn--primary"
          disabled={busy || !!blocked || combos > MAX_COMBOS}
          onClick={run}
        >
          <i className="bi bi-shield-check" aria-hidden />
          {busy ? 'Running validation' : 'Run validation'}
        </button>
        {blocked && <span className="ql-hint">{blocked}</span>}
        {busy && <span className="ql-hint">This can take up to a minute.</span>}
      </div>

      {history.length > 0 && (
        <div className="ql-table-wrap">
          <table className="ql-table">
            <thead>
              <tr>
                <th scope="col">Validated</th>
                <th scope="col">Window</th>
                <th scope="col">Status</th>
                <th scope="col" className="ql-num">
                  Combinations
                </th>
                <th scope="col" className="ql-num">
                  Out-of-sample Sharpe
                </th>
                <th scope="col" className="ql-num">
                  Walk-forward return
                </th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {history.map((v) => (
                <tr key={v.id} className={open?.id === v.id ? 'is-active' : ''}>
                  <td>{String(v.created_at).slice(0, 16).replace('T', ' ')}</td>
                  <td>
                    {v.config?.startDate} to {v.config?.endDate}
                  </td>
                  <td>{v.status}</td>
                  <td className="ql-num">{v.summary?.combinations || 'none'}</td>
                  <td className="ql-num">{fmtRatio(v.summary?.outOfSampleSharpe)}</td>
                  <td className="ql-num">{fmtSignedPct(v.summary?.walkForwardReturn)}</td>
                  <td>
                    {v.status === 'completed' ? (
                      <button type="button" className="ql-link" onClick={() => openReport(v.id)}>
                        Open
                      </button>
                    ) : (
                      <span className="ql-hint">{v.error || ''}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && <ValidationReport validation={open} />}
    </div>
  );
}

export default ValidationPanel;
